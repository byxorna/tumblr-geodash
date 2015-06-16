var colorClasses = ['yellow','orange','red','magenta','violet','blue','cyan','green'];
var colorClassesBase = ['base03','base02','base01'];

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
var impacts = [];
var map = svg.append('g').attr('class','map');
var topo = map.append('g').attr('class','topology');
var blipsgroup = map.append('g').attr('class','blips').selectAll('.blips');
var projection = d3.geo.mercator().translate([width/2, height/2]);
var zoom = d3.behavior.zoom().scaleExtent([1,10]).on('zoom',changeviewport);
var path = d3.geo.path().projection(projection);
var mode = 'none';
d3.json('geo.json', function(error, geo){
  if (error) return console.error(error);
  console.log(geo);
  //var subunits = topojson.feature(geo, geo.objects.subunits);
  var places = topojson.feature(geo, geo.objects.places);
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
    // old elements
    //blips.attr();
    // new elements
    blipsgroup.data(impacts).enter()
      .insert('circle').attr('class','shockwave').attr('r',2)
      .attr('transform', function(d){ return "translate("+projection([d.geometry.coordinates[0],d.geometry.coordinates[1]])+")"; })
      .transition().duration(1500).ease('cubic-in-out').attr('r',25).style('opacity',0).remove();
    blipsgroup.data(impacts).enter()
      .insert('circle')
      .attr('class','blip').attr('r',5)
      .attr('transform', function(d){ return "translate("+projection([d.geometry.coordinates[0],d.geometry.coordinates[1]])+")"; })
      .transition().duration(700).ease('cubic-in-out').attr('r',2).style('opacity',0).remove();
    // update new and old elements
    //blips.attr(..)
    // finish up enter-update-exit pattern
    blipsgroup.data(impacts).exit().remove();
  }

  updateMap();

  //blow up a city every second
  setInterval(function(){
    if (mode === 'nukes'){
      // select a random place from places and blip it
      var city = places.features[Math.floor(places.features.length*Math.random())];
      // figure out what country this is in

      //TODO need to figure out what country this impact falls in
      //var coord = projection([city.geometry.coordinates[0],city.geometry.coordinates[1]]);
      //var intersection = findIntersection(subunits, coord[0],coord[1]);
      //console.log(city.properties.name + " is in " + intersection.attr('data-country'));

      impacts.push(city);
      updateMap();
      //remove the city from the list once its rendered
      impacts.splice(impacts.indexOf(city),1);
    }
  },100);




});


function findIntersection(elements, x,y){
  //TODO this is mad broken
  //TODO replace with hexbinning?
  var coarsematches = [];
  /*
    if you are inside the bounding box, you are a candidate.
    the country you are in is the one whose bounding box contains the point
    as well as has the shortest distance to the centroid? I know this is fucked
    but its as good as i can come up with to detect what country a point falls in
  */
  elements.each(function(d){
    var box = path.bounds(this); //this.getBBox();
    var center = path.centroid(this); //this.getBBox();
    // height width x y
      //console.log(box.x + " " + box.y + " .. " + x + ","+y);
    console.log(box, center);
    if (x >= box.x && x <= box.x+height && y >= box.y && y <= box.y+height) {
      coarsematches.push(this);
      console.log("coarsematch: " + this);
    }
  });

}

