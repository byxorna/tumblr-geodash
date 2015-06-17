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
  $('.action-toolbar button').on('click',function(e){
    var t = $(e.target);
    console.log("Setting mode to " + t.data('mode'));
    mode = t.data('mode');
  });
  $('.action-toolbar').on('mouseenter',function(e){
    $(this).animate({opacity: 1});
  }).on('mouseleave',function(e){
    $(this).stop().delay(2000).animate({opacity: .15});
  });


});
