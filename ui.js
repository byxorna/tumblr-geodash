function clearStatus(t){
  if (t == undefined || t == null){
    t = 5000;
  }
  setTimeout(function(){ $('span#status').text('').removeClass(); },t);
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
      unsubscribe();
    }
    // turn on whatever should be active
    switch(mode){
      case "live":
        subscribe();
        break;
    }
  });
  $('.action-toolbar button.action').on('click',function(e){
    if ($(e.target).data('action') == "home") {
      setStatus('Home, James!');
      zoomCurrentLocation(geoLocation);
      clearStatus('1500');
    }
  });
  $('.action-toolbar').on('mouseenter',function(e){
    $(this).animate({opacity: 1});
  }).on('mouseleave',function(e){
    $(this).stop().delay(2000).animate({opacity: .15});
  });


});
