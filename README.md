## WTF IS THIS

There are 3 (or 4) parts to this:

1. `server/`: Golang server that serves up a map of realtime events, broken out by geo. `/` serves the dashboard, and `/events/*` is a EventStream that comes from a Tumblr firehose consumer (or an haproxy log tailer) that is published into redis' pubsub mechanism, and consumed by each http server to stream to clients.

2. `firehose-agent/`: Tumblr Firehose agent that pulls out Post info and pushes it into redis. Easy peasy.

3. `agent/`: Ghetto haproxy log replayer or tailer that performs the geoip lookups for each remote IP and generates a event which is PUBLISHed into redis.

4. Redis, to support PUBSUB from firehose to servers, and eventually stream out to the clients.

## Run via Docker

A docker image is available. It includes the binaries to run the server, firehose-agent, and regular agent.

### Run a redis instance

```docker run -d --name redis -p 6379:6379 redis```

### Run Server

```docker run -d --name tumblr-geo-map-server -p 8080:8080 byxorna/tumblr-geodash server -redis-host=<REDISHOST>:6379```

### Run the firehose consumer

```docker run -d --name tumblr-geo-map-firehose byxorna/tumblr-geodash firehose-agent -redis-host=<REDISHOST>:6379 -host=<tumblrfirehoseendpoint:port> -username=user -password=pw -stream=clientid```

Go to `:8080` and click the Posts button.

## Build and run the thing oldschool style

To build the agent, you will need `libgeoip` (https://github.com/maxmind/geoip-api-c). On OSX: `sudo port install libgeoip`. You will also need the `GeoIPCity.dat` database (pass to `-geoip-db`)

You need `godep` to build this.

```
./build.sh
```

Start up a redis instance (to support the pubsub mechanics)
```
docker run -d --name redis -p 6379:6379 redis
```

Run the webserver
```
cd public && ../server/server -redis-host=192.168.59.103:6379 -listen=:8080
```

Open up localhost:8080

### Run the firehose agent

```
./firehose-agent/firehose-agent -username gabe -password pwd -host service-firehose.tumblr.net:8080 -stream radiator -redis-host=192.168.59.103:6379 -channel firehose
```

### Run the ghetto log tailing agent

Run the agent to generate some geoevents from haproxy logs
```
./agent/agent -geoip-db geoip/GeoIPCity.dat -redis-host=192.168.59.103:6379 -replay-log tmp/haproxy_16\:00-06172015.log -field 4
```


## TopoJSON and OGR stuff

install gdal
Install `npm install topojson`

* admin0: http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_admin_0_countries.zip
* admin0 subunits: http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_admin_0_map_subunits.zip
http://bost.ocks.org/mike/map/

convert from shapefile into GeoJSON: `ogr2ogr -f GeoJSON subunits.json ne_50m_admin_0_map_subunits.shp`

Grab populated places from http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_populated_places.zip and filter for only sufficiently populated places:

```
wget http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_populated_places.zip
unzip ne_50m_populated_places.zip
ogr2ogr -f GeoJSON -where 'SCALERANK < 8' places.json ne_50m_populated_places.shp
```

Merge the 2 geojson files into a topojson file:
```
-> $ node_modules/.bin/topojson -o geo.json --properties name=admin -p city=NAME -p country=ADM0NAME --id-property adm0_a3 -- subunits.json places.json 
bounds: -180 -90 180 83.59960937500006 (spherical)
pre-quantization: 40.0m (0.000360°) 19.3m (0.000174°)
topology: 2006 arcs, 80748 points
post-quantization: 4.003km (0.0360°) 1.931km (0.0174°)
prune: retained 2002 / 2006 arcs (100%)

```


## Generate Godeps

```
godep save ./agent ./server
```

## TODO

* Need to test throughput of redis pubsub
* How fast is the geoip lookup? Should it be in a goroutine?
* set params.zoom whenever you zoom in
* have circle show up on hover for cities?
* add mode to show each post as a ping instead of bucketing them into hexbins
