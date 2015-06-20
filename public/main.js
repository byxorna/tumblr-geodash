// extract a query parameter out of the URL, and use default if not present
function getParameterURL(name, def) {
    if (def == undefined) { def = null; }
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    var x = def;
    if (match){
      var v = decodeURIComponent(match[1].replace(/\+/g, ' '));
      // this sucks, but convert to real types
      // this totally wont handle any strings, but... whatever
      // numbers and booleans will work fine
      try {
        x = JSON.parse(v);
      } catch (e) {
        console.log("Unable to parse " + name + " value " + v + ": " + e);
        x = v;
      }
    }
    console.log(name,x);
    return x;
}

function setParameter(name, val){
  // update name in our params map
  params[name] = val;

  // construct the new url params string
  var key = escape(name);
  var value = escape(val);
  var kvp = document.location.search.substr(1).split('&');
  var newquerystring = '';
  if (kvp == '') {
      newquerystring = '?' + key + '=' + value;
  }
  else {
      var i = kvp.length; var x; while (i--) {
          x = kvp[i].split('=');
          if (x[0] == key) {
              x[1] = value;
              kvp[i] = x.join('=');
              break;
          }
      }
      if (i < 0) { kvp[kvp.length] = [key, value].join('='); }
      newquerystring = kvp.join('&');
  }

  // now use pushstate to populate the url
  window.history.pushState(params,"", window.location.pathname + "?" + newquerystring);
}


var colorClasses = ['yellow','orange','red','magenta','violet','blue','cyan','green'];
var colorClassesBase = ['base03','base02','base01'];

/*
These variables can be parameterized via URL query string
*/
var params = {
  hexsize: getParameterURL('hexsize',2), //how large the hexagon bins are
  showposts: getParameterURL('showposts',true),
  eventexpirationseconds: getParameterURL('eventexpirationseconds',10),  // expire an event from bucket after this delay
  nukecamdelay: 3000, //ms after positioning camera to trigger nuke
  shootnukes: getParameterURL('shootnukes',false),  // run nuke sim
  jumpcities: getParameterURL('jumpcities',true),    // automatically jump between cities
  go: getParameterURL('go',null), // string of lat,lon
  zoom: getParameterURL('zoom',6) // default zoom level for geolocation fix, and initial focus
};

var coldcolor = "green", //green
    hotcolor = "red";  //red
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
  //map.select('.hexmesh').style('stroke-width', 1/d3.event.scale + "px");
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
var hexbin = d3.hexbin().size([width,height]).radius(params.hexsize);
var hexmap = map.append('g').attr('class','hexmap').selectAll('.hex');
/* end hex binning */

var blipsgroup = map.append('g').attr('class','blips').selectAll('.blips');

var projection = d3.geo.mercator().translate([width/2,height/2]);
var zoom = d3.behavior.zoom().scaleExtent([1,15]).on('zoom',changeviewport);
var path = d3.geo.path().projection(projection);
var mode = 'none';
var geolocation = null;
var places;

function zoomToGeo(geo, scale){
  if (scale == undefined || scale == null){
    scale = 6;
  }
  svg.interrupt().transition(); //interrupt any inflight and scheduled animations
  svg.transition().duration(2000).call(_zoomTo(geo, scale).event);
}
function _zoomTo(geo, scale) {
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

function zoomRandomCity(timeout){
  if (timeout == undefined || timeout == null){
    timeout = 2000;
  }
  var city = places.features[Math.floor(places.features.length*Math.random())];
  setStatus(city.properties.city + ", " + city.properties.country);
  clearStatus(timeout);
  zoomToGeo({
    coords: {
      longitude: city.geometry.coordinates[0],
      latitude: city.geometry.coordinates[1],
    }
  });
}
  function renderNukes(){
    var blipsgroupenter = blipsgroup.data(attacks).enter().append('g');
    blipsgroupenter.each(function(d){
      setStatus(d.victim.properties.city + ', ' + d.victim.properties.country + 
        " was nuked by " + d.agressor.properties.country,"error");
      clearStatus(10000);
      zoomToGeo({
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
      },params.nukecamdelay);

    });
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
    hexfeatures = _.reject(hexfeatures,function(e){ return e.entrytime < (currentTime-params.eventexpirationseconds*1000); });

    //*** update the map ***//
    updateMap();

  },200);

  setTimeout(function(){
    //once we have rendered...
    // start subscribing to events after 2 seconds
    if (params.showposts) {
      subscribe();
    }

    // try and zoom in on our current location
    if (params.go) {
      // parse go as lat,lon: 41.125447,-73.402501
      var x = params.go.split(",");
      var g = {
        coords: {
          latitude: x[0],
          longitude: x[1],
        }
      };
      setStatus('Going to ' + x[0] + ", " + x[1]);
      zoomToGeo(g, params.zoom);
      clearStatus();
    } else if (navigator.geolocation){
      setStatus('Acquiring geo lock');
      navigator.geolocation.getCurrentPosition(function(e){
        setStatus('Fix acquired');
        geolocation = e;
        console.log('geo fix:',e);
        zoomToGeo(geolocation, params.zoom);
        clearStatus();
      }, function(err){
        setStatus('Error getting geo lock','error');
        clearStatus();
      });
    }

    // either render nukes, or camera jumping around
    setInterval(function(){
      if (params.shootnukes) {
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
      if (params.jumpcities) {
        zoomRandomCity();
      }
    },5000);
  },2000);



});


