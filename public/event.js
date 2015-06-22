var source;
function subscribe(){
  setStatus('Initializing event streaming');
  clearStatus();
  if (source) {
    source.close();
  }
  source = new EventSource("/events/firehose");
  source.onmessage = function(e){
    // this will only capture events that have no event field
    console.log("got message",e);
  };
  source.onerror = function(e){
    console.log('eventsource error',e);
  };
  source.addEventListener('firehose',handleEventStreamData);
}
function unsubscribe(){
  if (source) {
    console.log("Unsubscribing from events");
    source.close();
    source = null;
  }
}
