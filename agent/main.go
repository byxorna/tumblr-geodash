package main

import (
	"encoding/json"
	"flag"
	redis "gopkg.in/redis.v3"
	"log"
	"math/rand"
	"time"
)

var (
	channel   string
	redisHost string
)

type Geo struct {
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lon"`
	Timestamp int32   `json:"ts"`
}

func init() {
	flag.StringVar(&channel, "channel", "geo", "channel to spam geoevents into")
	flag.StringVar(&redisHost, "redis-host", ":6379", "redis host:port to attach to and publish to")
	flag.Parse()
}

func randomGeo() Geo {
	return Geo{
		Latitude:  rand.Float64()*180 - 90,
		Longitude: rand.Float64()*360 - 180,
		Timestamp: int32(time.Now().Unix()),
	}
}

func main() {
	rclient := redis.NewClient(&redis.Options{
		Addr: redisHost,
	})
	_, err := rclient.Ping().Result()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Pong received from %s", redisHost)
	defer rclient.Close()
	for {
		geo := randomGeo()
		j, err := json.Marshal(geo)
		if err != nil {
			log.Printf("%s", err)
		}
		rclient.Publish(channel, string(j[:]))
		log.Printf("PUBLISH %s %s", channel, j)
		time.Sleep(100 * time.Millisecond)
	}
}
