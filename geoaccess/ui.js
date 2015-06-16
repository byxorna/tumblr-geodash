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
