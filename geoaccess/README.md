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
gr2ogr -f GeoJSON -where 'SCALERANK < 8' places.json ne_50m_populated_places.shp
```

Merge the 2 geojson files into a topojson file:
```
-> $ node_modules/.bin/topojson -o geo.json --properties ADM0_A3=adm0_a3 --id-property adm0_a3 --properties name=NAME -- subunits.json places.json 
bounds: -180 -90 180 83.59960937500006 (spherical)
pre-quantization: 40.0m (0.000360°) 19.3m (0.000174°)
topology: 2006 arcs, 80748 points
post-quantization: 4.003km (0.0360°) 1.931km (0.0174°)
prune: retained 2002 / 2006 arcs (100%)

```

## Run the thing

`docker run -p 8080:80 -v $(pwd):/usr/share/nginx/html:ro -d nginx`
