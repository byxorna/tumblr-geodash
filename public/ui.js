var clearPending = false;
function clearStatus(t){
  if (t == undefined || t == null){
    t = 5000;
  }
  if (!clearPending){
    clearPending = true;
    setTimeout(function(){ $('span#status').text('').removeClass(); clearPending = false; },t);
  }
}
function setStatus(m,c){
  if (c == undefined || c == null){
    c = 'ok';
  }
  console.log(m);
  $('span#status').text(m).removeClass().addClass(c);
}

function drawPing(pixelcoords){
  blipsgroup.data([pixelcoords])
    .enter()
    .append('circle')
      .attr("r", 1e-6/zoom.scale())
      .attr('fill','none')
      .style("stroke", '#fff')
      .style("stroke-width", 3/zoom.scale() + "px")
      .style("stroke-opacity", 1)
      .attr('transform',"translate("+pixelcoords[0]+","+pixelcoords[1]+")")
    .transition()
      .duration(2000)
      .ease(Math.sqrt)
      .attr("r", 35/zoom.scale())
      .style("stroke-opacity", 1e-6)
      .remove();
}


$(function(){
  $('.action-toolbar button.mode').on('click',function(e){
    var t = $(e.target);
    console.log("Setting mode to " + t.data('mode'));
    mode = t.data('mode');
    // turn off anything that shouldn't be active
    if (mode !== 'showposts'){
      setStatus("Unsubscribing");
      setParameter('showposts',false);
      unsubscribe();
      clearStatus();
    }
    // turn on whatever should be active
    switch(mode){
      case "showposts":
        setParameter('showposts',true);
        subscribe();
        break;
    }
  });
  $('.action-toolbar button.action').on('click',function(e){
    switch($(e.target).data('action')) {
      case "home":
        if (geolocation){
          //TODO this doesnt work if we never got getlocation on load
          setStatus('Home, James!');
          setParameter('go',null);
          zoomToGeo(geolocation);
        } else {
          setStatus('Geolocation not enabled!','error');
        }
        clearStatus('1500');
        break;
      case "jumpcities":
        setStatus("Turning " + ((params.jumpcities) ? "off" : "on") + " jumping");
        setParameter('jumpcities',!params.jumpcities);
        if (params.jumpcities) {
          setParameter('shootnukes',false);
        }
        clearStatus();
        break;
      case "nukes":
        console.log($(e.target).data('action'));
        setParameter('shootnukes',!params.shootnukes);
        if (params.shootnukes){
          setStatus("Shall we play a game?","error");
          setParameter('jumpcities',false);
        } else {
          setStatus("Wouldn't you prefer a nice game of chess?");
          clearStatus();
        }
    }
  });
  $('.action-toolbar').on('mouseenter',function(e){
    $(this).animate({opacity: 1});
  }).on('mouseleave',function(e){
    $(this).stop().delay(2000).animate({opacity: .15});
  });

  map.on('click',function(e){
    var pixelcoords = d3.mouse(this);
    var lonlat = projection.invert(pixelcoords);
    console.log("click at "+lonlat[1]+","+lonlat[0]);
    setParameter('go',lonlat[1]+","+lonlat[0]);
    drawPing(pixelcoords);
  });

});
