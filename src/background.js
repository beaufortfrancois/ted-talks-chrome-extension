function fetchTalks() {    
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://feeds.feedburner.com/TEDTalks_video');
  xhr.onload = function() {

    var items = parseDocument(xhr.responseXML);
    for (var item of items) {

      var title = item.title + '.mp4';
      // TODO: WTF?!
      if (item.guid == 'eng.video.talk.ted.com:2063') {
        title = 'Ziyah Gafić: Everyday objects, tragic histories.mp4';
      }

      var metadata = {};
      metadata['/' + title] = {
        isDirectory: false,
        name: title,
        size: parseInt(item.enclosure.length),
        modificationTime: item.pubDate,
        mimeType: item.enclosure.type,
        imageUrl: item.imageUrl,
        url: item.url
      };
      // Save talk metadata locally.
      chrome.storage.local.set(metadata);

      // TODO: Fetch thumbnail if we don't have it already.
      worker.postMessage(metadata);

    }
  }
  var worker = new Worker('fetch-thumbnail.js');
  worker.addEventListener('message', function(e) {
    var updatedMetadata = e.data; 
    chrome.storage.local.set(updatedMetadata);
  });
  xhr.send(); 
}

function sanitizeMetadata(metadata) {
  metadata.modificationTime = new Date(metadata.modificationTime);
  return metadata;
}

function onGetMetadataRequested(options, onSuccess, onError) {
  console.log('onGetMetadataRequested', options.entryPath);
   
  chrome.storage.local.get(options.entryPath, function(localMetadata) {
    if (!localMetadata[options.entryPath]) {
      onError('NOT_FOUND');
    } else {
      // If no thumbnail are requested, make sure the metadata don't include one.
      if (!options.thumbnail) {
        delete(localMetadata[options.entryPath].thumbnail);
      }
      localMetadata[options.entryPath] = sanitizeMetadata(localMetadata[options.entryPath]);
      onSuccess(localMetadata[options.entryPath]);
    }
  });  
}

function onReadDirectoryRequested(options, onSuccess, onError) {
  console.log('onReadDirectoryRequested', options); 
  // TODO: Remove ugly code below.
  chrome.storage.local.get(null, function(localMetadata) {
    var videos = Object.keys(localMetadata).filter(function(entryPath) { return (entryPath !== '/'); }).map(function(entryPath) { return sanitizeMetadata(localMetadata[entryPath]); });
    onSuccess(videos, false /* Last call. */);
  });
}

function onInstalled() {
  
  // Save root metadata.
  chrome.storage.local.set({'/': {
    isDirectory: true,
    name: '/',
    size: 0,
    modificationTime: new Date().toString()
  }});
  
  // Mount the file system.
  var options = { fileSystemId: 'tedtalks', displayName: 'TED Talks' };
  chrome.fileSystemProvider.mount(options, function() {    
    if (!chrome.runtime.lastError)
      fetchTalks();
  });
  
  // Fetch Talks periodically.
  chrome.alarms.create('fetchTalks', { 'periodInMinutes': 1 });
}

chrome.fileSystemProvider.onGetMetadataRequested.addListener(onGetMetadataRequested);
chrome.fileSystemProvider.onReadDirectoryRequested.addListener(onReadDirectoryRequested);

chrome.alarms.onAlarm.addListener(fetchTalks)

chrome.runtime.onInstalled.addListener(onInstalled);