$(function(){
  $('.action-toolbar button').on('click',function(e){
    var t = $(e.target);
    console.log("Setting mode to " + t.data('mode'));
    mode = t.data('mode');
  });
  $('.action-toolbar').on('mouseover',function(e){
    $(this).animate({opacity: 1});
  }).on('mouseleave',function(e){
    $(this).animate({opacity: .15});
  });
});
