## WTF IS THIS

Golang server that serves up a map of realtime events, broken out by geo. `/events/*` generates a stream a events that are published into redis (pubsub) and streamed into the client to render on the map.

Theres also a client that will break apart haproxy logs and do geoip lookups on the IP, and publish the events into redis.

## Run the thing

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
./server/server -redis-host=192.168.59.103:6379 -listen=:8080
```

Open up localhost:8080

Run the agent to generate some geoevents
```
./agent/agent -geoip-db geoip/GeoIPCity.dat -redis-host=192.168.59.103:6379 -replay-log tmp/haproxy_16\:00-06172015.log
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
-> $ node_modules/.bin/topojson -o geo.json --properties name=admin --id-property adm0_a3 -- subunits.json places.json 
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

