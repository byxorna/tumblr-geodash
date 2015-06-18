package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"github.com/abh/geoip"
	redis "gopkg.in/redis.v3"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"
)

var (
	channel   string
	redisHost string
	replayLog string
	geoFile   string
)

type GeoMessage struct {
	Latitude  float32 `json:"lat"`
	Longitude float32 `json:"lon"`
	Type      string  `json:"type"`
}

func init() {
	flag.StringVar(&channel, "channel", "geo", "channel to spam geoevents into")
	flag.StringVar(&redisHost, "redis-host", ":6379", "redis host:port to attach to and publish to")
	flag.StringVar(&replayLog, "replay-log", "", "replay a haproxy log (simulate live events)")
	flag.StringVar(&geoFile, "geoip-db", "/usr/share/GeoIP/GeoIPCity.dat", "use the MaxMind GeoIP database to perform lookups")
	flag.Parse()
}

func randomGeo() GeoMessage {
	return GeoMessage{
		Latitude:  rand.Float32()*180 - 90,
		Longitude: rand.Float32()*360 - 180,
	}
}

func main() {
	geodb, err := geoip.Open(geoFile)
	if err != nil {
		log.Fatal(err)
	}

	rclient := redis.NewClient(&redis.Options{
		Addr: redisHost,
	})
	_, err = rclient.Ping().Result()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Pong received from %s", redisHost)
	defer rclient.Close()
	if replayLog != "" {
		log.Printf("Replaying log %s", replayLog)
		f, err := os.Open(replayLog)
		if err != nil {
			log.Fatal(err)
		}
		s := bufio.NewScanner(f)
		var geo GeoMessage
		tStart := time.Now().Unix()
		var tOffset int64
		var record *geoip.GeoIPRecord
		for s.Scan() {
			raw := s.Text()
			fields := strings.Split(raw, " ")
			remoteip := strings.Split(fields[4], ":")[0]
			ts := fields[0]
			tlog, err := time.Parse(time.RFC3339, ts)
			tLog_u := tlog.Unix()
			if err != nil {
				log.Printf("Error parsing timestamp: %s", err)
				continue
			}
			// compute our time offset for the first record
			if tOffset == 0 {
				tOffset = tStart - tLog_u
			}
			record = geodb.GetRecord(remoteip)
			if record == nil {
				log.Printf("FUCK! Couldnt lookup %s", remoteip)
				continue
			}
			geo.Latitude = record.Latitude
			geo.Longitude = record.Longitude
			j, err := json.Marshal(geo)
			if err != nil {
				log.Printf("%s", err)
			}
			rclient.Publish(channel, string(j[:]))

			//figure out if we should chill out for a second to replay things at the correct time
			//log.Printf("diff: %d %d %b", time.Now().Unix()-tOffset, tLog_u, time.Now().Unix()-tOffset > tLog_u)
			if time.Now().Unix()-tOffset <= tLog_u {
				// we should chillout for a second, we are caught up with playback
				time.Sleep(time.Second)
			}
		}

	} else {
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
}
