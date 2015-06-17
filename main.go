// grabbed from https://gist.github.com/jweir/4528042
package main

import (
	"flag"
	eventsource "github.com/antage/eventsource"
	redis "gopkg.in/redis.v3"
	"log"
	"net/http"
	"time"
)

var (
	redisHost string
	bind      string
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
	pubsub  *redis.PubSub
	es      eventsource.EventSource
	ch      chan *redis.Message
	pubChan string
}

func createSubscription(sh *subscriptionHandler, pubChan *string) {
	log.Printf("creating channel %s", *pubChan)

	rclient := redis.NewClient(&redis.Options{
		Addr:     redisHost,
		Password: "",
		DB:       0,
	})
	pong, err := rclient.Ping().Result()
	haltOnErr(err)
	log.Printf("Got pong from %s: %s", redisHost, pong)
	pubsub := rclient.PubSub()

	err = pubsub.Subscribe(*pubChan)
	haltOnErr(err)
	//TODO receive from this subscription and write into a channel
	//TODO: this channel is unbuffered. Will the timeout in the Receive() drop messages?
	// i think thats ok
	ch := make(chan *redis.Message)
	go func() {
		for {
			v, err := pubsub.Receive()
			if err != nil {
				log.Printf("Error: %s", err)
				break
			}
			switch v.(type) {
			case *redis.Message:
				log.Printf("Message: %+v", v)
				ch <- v.(*redis.Message)
			case *redis.Subscription:
				s := v.(*redis.Subscription)
				log.Printf("Subscription message: %s to %s", s.Kind, s.Channel)
			default:
				log.Printf("Unknown message type from redis: %T", v)
			}
		}
	}()

	es := eventsource.New(
		&eventsource.Settings{
			Timeout:        5 * time.Second,
			CloseOnTimeout: true,
			IdleTimeout:    30 * time.Minute,
		}, nil)

	sh.index[*pubChan] = subscription{pubsub, es, ch, *pubChan}
}

// listen for published events and send to the EventSource
func listen(index subscription) {
	log.Printf("Listening for events on channel %s", index.pubChan)
	for {
		msg := <-index.ch
		index.es.SendEventMessage(msg.Payload, "event1", "")
		log.Printf("message has been sent on %s (consumers: %d)", index.pubChan, index.es.ConsumersCount())
	}
}

func (sh *subscriptionHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	pubChan := req.URL.Path[1:]
	_, ok := sh.index[pubChan]

	if !ok {
		createSubscription(sh, &pubChan)
		/*
			      TODO: i need to close the connection to pubsub and eventsource
			      but this defer execs when leaving this function
						defer func() {
							log.Printf("Closing pubsub and eventsource for %s", pubChan)
							sh.index[pubChan].pubsub.Close()
							sh.index[pubChan].es.Close()
						}()
		*/
	}

	go listen(sh.index[pubChan])

	sh.index[pubChan].es.ServeHTTP(resp, req)
}

func init() {
	flag.StringVar(&redisHost, "redis-host", ":6379", "redis host to connect to for pubsub messaging")
	flag.StringVar(&bind, "listen", ":8080", "interface:port to bind to")
	flag.Parse()
}

func main() {
	streamer := new(subscriptionHandler)
	streamer.index = make(map[string]subscription)

	// whatever, serve everything in the current dir
	http.Handle("/", http.FileServer(http.Dir("./")))
	http.Handle("/events/", streamer)

	err := http.ListenAndServe(bind, nil)
	haltOnErr(err)
}
