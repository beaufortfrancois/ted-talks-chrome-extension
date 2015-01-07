function fetchTalks() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://feeds.feedburner.com/tedtalksHD');
  xhr.onload = function() {

    var items = parseFeed(xhr.responseXML);
    for (var item of items) {

      var title = item.title;
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
        url: item.enclosure.url
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
  console.debug('onGetMetadataRequested', options.entryPath);

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
  console.debug('onReadDirectoryRequested', options);
  // TODO: Remove ugly code below.
  chrome.storage.local.get(null, function(localMetadata) {
    var videos = Object.keys(localMetadata).filter(function(entryPath) { return (entryPath !== '/'); }).map(function(entryPath) { return sanitizeMetadata(localMetadata[entryPath]); });
    onSuccess(videos, false /* Last call. */);
  });
}

// A map with currently opened files. As key it has requestId of
// openFileRequested and as a value the file path.
var openedFiles = {};

function onOpenFileRequested(options, onSuccess, onError) {
  console.debug('onOpenFileRequested', options);
  if (options.mode != 'READ' || options.create) {
    onError('INVALID_OPERATION');
  } else {
    chrome.storage.local.get(null, function(metadata) {
      openedFiles[options.requestId] = options.filePath;
      onSuccess();
    });
  }
}

function onReadFileRequested(options, onSuccess, onError) {
  console.debug('onReadFileRequested', options);
  chrome.storage.local.get(null, function(localMetadata) {

    var filePath = openedFiles[options.openRequestId];
    if (!filePath) {
      onError('SECURITY');
      return;
    }

    console.log( 'bytes=' + options.offset + '-' + (options.length + options.offset -1));

    var xhr = new XMLHttpRequest();
    xhr.open('GET', localMetadata[filePath].url);
    xhr.responseType = 'arraybuffer';
    xhr.setRequestHeader('Range', 'bytes=' + options.offset + '-' + (options.length + options.offset - 1));
    xhr.onload = function() {
      if (xhr.readyState === 4 && xhr.status === 206) {
        onSuccess(xhr.response, false /* last call */);
      } else {
        onError('NOT_FOUND');
      }
    }
    xhr.onerror = function() {
      onError('NOT_FOUND');
    }
    xhr.send();
  });
}

function onCloseFileRequested(options, onSuccess, onError) {
  console.debug('onCloseFileRequested', options);
  if (!openedFiles[options.openRequestId]) {
    onError('INVALID_OPERATION');
    return;
  }

  delete openedFiles[options.openRequestId];
  onSuccess();
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
chrome.fileSystemProvider.onOpenFileRequested.addListener(onOpenFileRequested);
chrome.fileSystemProvider.onReadFileRequested.addListener(onReadFileRequested);
chrome.fileSystemProvider.onCloseFileRequested.addListener(onCloseFileRequested);

chrome.alarms.onAlarm.addListener(fetchTalks)

chrome.runtime.onInstalled.addListener(onInstalled);