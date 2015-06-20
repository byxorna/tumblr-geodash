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
        setStatus('Home, James!');
        zoomToGeo(geoLocation);
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

  // lets try and get current position to center the map around
  /*
  if (navigator.geolocation){
    setStatus('Acquiring geo lock');
    navigator.geolocation.getCurrentPosition(function(e){
      setStatus('Fix acquired');
      geoLocation = e;
      //var geo = {lon: e.coords.longitude, lat: e.coords.latitude};
      console.log('geo fix:',e);
      zoomToGeo(geoLocation);
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
