// grabbed from https://gist.github.com/jweir/4528042
package main

import (
	eventsource "github.com/antage/eventsource"
	"github.com/vmihailenco/redis"
	"log"
	"net/http"
)

func haltOnErr(err error) {
	if err != nil {
		panic(err)
	}
}

type subscriptionHandler struct {
	index map[string]subscription
}

// maps a url to a redis Subscribe channel
type subscription struct {
	pubsub  *redis.PubSubClient
	es      eventsource.EventSource
	ch      chan *redis.Message
	pubChan string
}

func createSubscription(sh *subscriptionHandler, pubChan *string) {
	log.Printf("creating channel %s", *pubChan)

	pubsub, err := redis.NewTCPClient(":6379", "", -1).PubSubClient()
	haltOnErr(err)

	ch, err := pubsub.Subscribe(*pubChan)
	haltOnErr(err)

	es := eventsource.New(nil, nil)

	sh.index[*pubChan] = subscription{pubsub, es, ch, *pubChan}
}

// listen for published events and send to the EventSource
func listen(index subscription) {
	for {
		msg := <-index.ch
		index.es.SendEventMessage(msg.Message, "", "")
		log.Printf("message has been sent on %s (consumers: %d)", index.pubChan, index.es.ConsumersCount())
	}
}

func (sh *subscriptionHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	pubChan := req.URL.Path[1:]
	_, ok := sh.index[pubChan]

	if !ok {
		createSubscription(sh, &pubChan)
		defer sh.index[pubChan].pubsub.Close()
		defer sh.index[pubChan].es.Close()
	}

	log.Printf("subscribed to %s", pubChan)

	go listen(sh.index[pubChan])

	sh.index[pubChan].es.ServeHTTP(resp, req)
}

func main() {
	streamer := new(subscriptionHandler)
	streamer.index = make(map[string]subscription)

	http.Handle("/", http.FileServer(http.Dir("./")))
	http.Handle("/events/", streamer)

	err := http.ListenAndServe(":8080", nil)
	haltOnErr(err)
}
