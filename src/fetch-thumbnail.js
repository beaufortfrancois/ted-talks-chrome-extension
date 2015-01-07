self.addEventListener('message', function(e) {
  var metadata = e.data;
  var key = Object.keys(metadata)[0];
  var xhr = new XMLHttpRequest();
  xhr.open('GET', metadata[key].imageUrl);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var fileReader = new FileReader();
      var blob = new Blob([xhr.response], {type: xhr.getResponseHeader('content-type')});
      fileReader.onload = function(e) {
        metadata[key].thumbnail = e.target.result;
        self.postMessage(metadata);
      }
      fileReader.readAsDataURL(blob);
    }
  }
  xhr.send();
});