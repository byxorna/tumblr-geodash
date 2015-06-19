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


$(function(){
  $('.action-toolbar button.mode').on('click',function(e){
    var t = $(e.target);
    console.log("Setting mode to " + t.data('mode'));
    mode = t.data('mode');
    // turn off anything that shouldn't be active
    if (mode !== 'live'){
      setStatus("Unsubscribing");
      unsubscribe();
      clearStatus();
    }
    // turn on whatever should be active
    switch(mode){
      case "live":
        subscribe();
        break;
    }
  });
  $('.action-toolbar button.action').on('click',function(e){
    switch($(e.target).data('action')) {
      case "home":
        setStatus('Home, James!');
        zoomCurrentLocation(geoLocation);
        clearStatus('1500');
        break;
      case "jumpcities":
        setStatus("Turning " + ((zoomcities) ? "off" : "on") + " jumping");
        zoomcities = !zoomcities;
        if (zoomcities) {
          shootNukes = false;
        }
        clearStatus();
        break;
      case "nukes":
        console.log($(e.target).data('action'));
        shootNukes = !shootNukes
        if (shootNukes){
          setStatus("Shall we play a game?","error");
          zoomcities = false;
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

  // lets try and get current position to center the map around
  /*
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
  */

});
