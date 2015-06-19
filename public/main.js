var colorClasses = ['yellow','orange','red','magenta','violet','blue','cyan','green'];
var colorClassesBase = ['base03','base02','base01'];
    // how large the hexagon bins are
var hexsize = 2,
    // what the upper bucket size for coloration (most red)
    maxbinsize = 8,
    // how many seconds before we expire any requests
    eventExpirationSeconds = 10,
    coldcolor = "green", //green
    hotcolor = "red";  //red
// how to determine hexbin color with interpolation
var shootNukes = false;
var color = function(i){
  var domain = [1,3,5,10];
  // green, yellow, orange, red, magenta
  var colors = ["#859900","#b58900","#cb4b16","#dc322f","#d33682"]
  for(var x = 0 ; x < domain.length ; x++){
    if (i <= domain[x])
      return colors[x];
  }
};
/*
var color = d3.scale.linear()
    .map(d3.interpolate(0,10))
    .range(["#2aa198","#2aa198","#6c71c4","#d44682","#dc322f"])
    .clamp(true);
    //.interpolate(d3.interpolateLab);
    */

/*
var color = d3.scale.ordinal()
    .domain(d3.range(0, maxbinsize))
    .range(colorbrewer.PuBu[8].reverse());
    */

function randomBaseColor(id) {
  return _randomVal(id,colorClassesBase);
};
function randomColor(id) {
  return _randomVal(id,colorClasses);
};
function _randomVal(id,arr){
  if (id === null || id === undefined) {
    return arr[Math.floor(Math.random()*arr.length)];
  } else {
    return arr[id.hashCode()%arr.length];
  }
};
String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length == 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
function changeviewport(){
  // translates and scales the map in response to zoom/drag inputs
  map.attr('transform','translate(' + d3.event.translate.join(',') + ') scale(' + d3.event.scale + ')');
  //scale the hexmesh stroke width to keep it the same width at all zoom levels
  map.select('.hexmesh').style('stroke-width', 1/d3.event.scale + "px");
}

// generates random points in geo coordinates
function randomLatLong(){
  return {
    lat: Math.random()*180-90,
    lon: Math.random()*360-180
  };
}

var width = window.innerWidth,
    height = window.innerHeight;

var svg = d3.select('body').append('svg')
	.attr('width',width)
	.attr('height',height);
var attacks = [];
var map = svg.append('g').attr('class','map');
var topo = map.append('g').attr('class','topology');

/* for hex binning */
//features to be bucketed by hexbin(). list of features
var hexfeatures = [];
//binned hex data, generated when adding features into hexfeatures
var hexpoints = [];
var hexbin = d3.hexbin().size([width,height]).radius(hexsize);
var hexmap = map.append('g').attr('class','hexmap').selectAll('.hex');
/*
//not necessary
svg.append('clipPath')
    .attr('id','clip')
  .append('rect')
    .attr('class','mesh')
    .attr('width',width)
    .attr('height',height);
// create clippath
map.append('g').attr('clip-path','url(#clip)');
*/

/* end hex binning */

var blipsgroup = map.append('g').attr('class','blips').selectAll('.blips');

var projection = d3.geo.mercator().translate([width/2,height/2]);
var zoom = d3.behavior.zoom().scaleExtent([1,15]).on('zoom',changeviewport);
var path = d3.geo.path().projection(projection);
var mode = 'none';
var geoLocation = null;
var places;

function zoomCurrentLocation(geo){
  svg.transition().duration(2000).call(zoomTo(geo, 6).event);
}
function zoomTo(geo, scale) {
  // handle AmundsenScott South Pole Station lat:177.01170117011702 lon:-90
  // pull in the coord just a bit so we dont try to translate to Infinity
  if (geo.coords.latitude <= -90){
    var v  = geo.coords.latitude;
    console.log("Adjusting ",v,geo.coords.latitude);
    geo.coords.latitude = geo.coords.latitude + 0.000001;
  }
  if (geo.coords.latitude >= 90){
    var v  = geo.coords.latitude;
    console.log("Adjusting ",v,geo.coords.latitude);
    geo.coords.latitude = geo.coords.latitude - 0.000001;
  }
  // this should be in [long, lat] NOT [lat,long]!!
  // takes output of navigator.geolocation.getCurrentPosition(f(e){});
  var point = projection([geo.coords.longitude,geo.coords.latitude]);
  var tr_x = width / 2 - point[0] * scale,
      tr_y = height / 2 - point[1] * scale;
  if (isFinite(tr_x) && isFinite(tr_y)){
    return zoom
        .translate([tr_x, tr_y])
        .scale(scale);
  } else {
    console.log("Something went wrong zooming to",geo.coords.longitude,geo.coords.latitude,": computed point ",point[0],point[1]);
    return zoom;
  }
}


d3.json('geo.json', function(error, geo){
  if (error) return console.error(error);
  console.log(geo);
  //var subunits = topojson.feature(geo, geo.objects.subunits);
  places = topojson.feature(geo, geo.objects.places);
  // set up zooming and panning
  svg.call(zoom); // bind zoom to the doc

  // pull out each subunit feature as a separate path
  // this will draw a path for each country
  var subunits = topo.selectAll('.subunit').data(topojson.feature(geo, geo.objects.subunits).features)
	  .enter().append('path')
	  .attr('class',function(d){ return "subunit " + d.id + " " + randomBaseColor(d.id); })
    .attr('data-country',function(d){ return d.id; })
	  .attr('d',path)
    .on('click',function(d,i){
      console.log('got click on ' + d.properties.name);
    });

  // lets try and get current position to center the map around
  if (navigator.geolocation){
    setStatus('Acquiring geo lock');
    navigator.geolocation.getCurrentPosition(function(e){
      setStatus('Fix acquired');
      geoLocation = e;
      //var geo = {lon: e.coords.longitude, lat: e.coords.latitude};
      console.log('geo fix:',e);
      zoomCurrentLocation(geoLocation);
      clearStatus();
    }, function(err){
      setStatus('Error getting geo lock','error');
      clearStatus();
    });
  } else {
    setStatus('Geo lock refused','warning');
    clearStatus();
  }



  function renderNukes(){
    // var blipsgroup = map.append('g').attr('class','blips').selectAll('.blips');
    //d3.select('#parent').selectAll('p').data(data).enter()
    var blipsgroupenter = blipsgroup.data(attacks).enter().append('g');
    var camPositionDelay = 3000;
    blipsgroupenter.each(function(d){
      setStatus(d.victim.properties.city + ', ' + d.victim.properties.country + 
        " was nuked by " + d.agressor.properties.country,"error");
      clearStatus(10000);
      zoomCurrentLocation({
        coords: {
          longitude: d.victim.geometry.coordinates[0],
          latitude: d.victim.geometry.coordinates[1],
        }
      });
      setTimeout(function(){
        blipsgroupenter.append('circle')
          .attr('class','shockwave')
          .attr('r',2)
          .attr('transform', function(d){ return "translate("+projection([d.victim.geometry.coordinates[0],d.victim.geometry.coordinates[1]])+")"; })
          .transition()
            .duration(1500).ease('cubic-in-out').attr('r',25).style('opacity',0).remove();
        blipsgroupenter.append('circle')
          .attr('r',5)
          .attr('class','blip')
          .attr('transform', function(d){ return "translate("+projection([d.victim.geometry.coordinates[0],d.victim.geometry.coordinates[1]])+")"; })
          .transition().duration(700).ease('cubic-in-out').attr('r',2).style('opacity',0).remove();
        blipsgroupenter.append('circle')
          .attr('r',2)
          .attr('class','orange')
          .attr('transform', function(d){ return "translate("+projection([d.victim.geometry.coordinates[0],d.victim.geometry.coordinates[1]])+")"; })
          .transition().duration(1000).ease('cubic-in-out').attr('r',10).style('opacity',0).remove();
        blipsgroup.data(attacks).exit().remove();
      },camPositionDelay);

    });
  }
  function updateMap(){
    //for use with random cities
    //hexpoints = hexbin(_.map(hexfeatures, function(x){ return projection([x.geometry.coordinates[0], x.geometry.coordinates[1]]); } ));
    hexpoints = hexbin(_.map(hexfeatures, function(x){ return projection([x.lon, x.lat]); } ));
    hexmap = hexmap.data(hexpoints, function(e){
        if (e == undefined){
          return "fuck";
        } else {
          return e.i + "," + e.j;
        }
      });
    // when hexes leave, "pop" them by scaling them up and make opaque
    hexmap.exit()
      .transition()
      .attr('transform', function(d){ return "translate("+d.x+","+d.y+") scale(1.5)"; })
      .style('opacity',0)
      .remove();
    hexmap.enter().append('path')
        .attr('class','hex')
        .attr('d',hexbin.hexagon())
        .style('opacity',0)
        .style('fill',function(d){ return color(d.length);})
        .attr('transform',function(d){return "translate("+d.x +","+d.y+")";});
    //update colors of all new+updated data
    hexmap.transition().duration(200)
        .style('opacity',1)
        .style('fill',function(d){ return color(d.length);});


  }

  updateMap();

  setInterval(function(){
    //*** update data ***//
   // always prune expired events from hexfeatures
    var currentTime = Date.now();
    hexfeatures = _.reject(hexfeatures,function(e){ return e.entrytime < (currentTime-eventExpirationSeconds*1000); });

    //*** update the map ***//
    updateMap();

  },200);
  setInterval(function(){
    if (shootNukes) {
      // select a random place from places and blip it
      var victimindex = Math.floor(places.features.length*Math.random());
      // if you dont want a city to be nuked twice, uncomment
      //var victimcity = places.features.splice(victimindex,1)[0];
      var victimcity = places.features[victimindex];
      var agressorcity = places.features[Math.floor(places.features.length*Math.random())];
      var attack = {
        victim: victimcity,
        agressor: agressorcity,
      };
      attacks.push(attack);
      renderNukes();
      //remove the city from the list once its rendered
      attacks.splice(attacks.indexOf(attack),1);
    }
  },5000);




});


