package main

import (
	"compress/gzip"
	"encoding/json"
	"flag"
	"fmt"
	redis "gopkg.in/redis.v3"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"
)

var (
	host      string
	streamid  string
	user      string
	pass      string
	redisHost string
	channel   string
)

type FirehoseMessage struct {
	Id           string       `json:"id"`
	ActivityType string       `json:"activity_type"`
	Geo          FirehoseGeo  `json:"geo,omit-empty"`
	Post         FirehosePost `json:"post,omit-empty"`
}
type FirehoseGeo struct {
	Country   string `json:"country"`
	City      string `json:"city"`
	Longitude string `json:"longitude"`
	Latitude  string `json:"latitude"`
}
type FirehosePost struct {
	Type string `json:"type"`
}

//normalized wireformat that our eventsource consumers rely on
type EventMessage struct {
	Id           string  `json:"id"`
	ActivityType string  `json:"type"`
	PostType     string  `json:"post_type"`
	Country      string  `json:"country"`
	Longitude    float32 `json:"lon"`
	Latitude     float32 `json:"lat"`
}

func init() {
	flag.StringVar(&host, "host", "", "Firehose endpoint (i.e. host:8080)")
	flag.StringVar(&streamid, "stream", "radiator", "Firehose stream ID (unique client id)")
	flag.StringVar(&user, "username", "gabe", "Firehose stream username")
	flag.StringVar(&pass, "password", "", "Firehose stream password")
	flag.StringVar(&redisHost, "redis-host", ":6379", "redis host:port to attach to and publish to")
	flag.StringVar(&channel, "channel", "firehose", "channel to publish events into")
	flag.Parse()
}

func main() {
	// set up a redis connection
	rclient := redis.NewClient(&redis.Options{Addr: redisHost})
	_, err := rclient.Ping().Result()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Redis client %s active", redisHost)
	defer rclient.Close()

	url := fmt.Sprintf("http://%s/2.2/firehose/%s/stream", host, streamid)
	for {
		//get our http connection ready
		log.Printf("Attempting connection to %s", url)
		req, err := http.NewRequest("GET", url, nil)
		req.Header.Set("Accept-Encoding", "gzip")
		req.SetBasicAuth(user, pass)
		client := &http.Client{}
		resp, err := client.Do(req)
		gz, err := gzip.NewReader(resp.Body)
		if err != nil {
			//reconnect in a second
			log.Printf("%s", err)
			time.Sleep(time.Second)
			continue
		}
		decoder := json.NewDecoder(gz)
		defer gz.Close()
		log.Printf("Publishing posts to %s", channel)
		for {
			var m FirehoseMessage
			if err := decoder.Decode(&m); err == io.EOF {
				// we reached an EOF? lets reconnect...
				break
			} else if err != nil {
				// skip and keep going
				log.Printf("Error reading from body: %s", err)
				continue
			}
			//assemble the wireformat message now and send it
			if m.ActivityType == "post" {
				// only posts have geodata on them :/
				var lat float64
				var lon float64
				if m.Geo.Latitude != "" && m.Geo.Longitude != "" {
					// if the post didnt include geo data, skip
					lat, err = strconv.ParseFloat(m.Geo.Latitude, 32)
					if err != nil {
						log.Printf("%s", err)
						continue
					}
					lon, err = strconv.ParseFloat(m.Geo.Longitude, 32)
					if err != nil {
						log.Printf("%s", err)
						continue
					}
				}
				//TODO posttype isnt being parsed correctly, so we cant tell if its a photo or what
				w := &EventMessage{
					Id:           m.Id,
					ActivityType: m.ActivityType,
					PostType:     m.Post.Type,
					Country:      m.Geo.Country,
					Longitude:    float32(lon),
					Latitude:     float32(lat),
				}
				j, err := json.Marshal(w)
				if err != nil {
					log.Printf("%s", err)
				}
				rclient.Publish(channel, string(j[:]))
				//log.Printf("PUBLISH %s %s", channel, w)

			}
		}
	}
}
