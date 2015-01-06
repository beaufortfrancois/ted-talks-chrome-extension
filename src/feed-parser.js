function error(str) {
  console.error("PARRRS (Mounir) (Always him...): " + str);
}

// Parse a given RSS document. Returns a JS object.
function parseDocument(doc) {
  doc.charset = 'UTF-8';
  var walker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT);
  var fragment = null;

  do {
    fragment = walker.nextNode();
  } while (fragment.tagName.toLowerCase() != 'channel');

  var feed = _parseFeedInfo(fragment);
  feed.items = _parseFeedItems(fragment);

  // TODO: Remove parseFeedInfo if not used.
  return feed.items;
}

function _parseFeedInfo(fragment) {
  var object = {};

  for (var i = 0; i < fragment.childNodes.length; ++i) {
    var node = fragment.childNodes[i];
    switch (node.tagName) {
      case 'title':
      case 'link':
      case 'description':
      case 'copyright':
      case 'language':
        object[node.tagName] = node.textContent;
        break;
      case 'lastBuildDate':
        object[node.tagName] = new Date(node.textContent);
        break;
      case 'item':
        // We ignore that one on purpose.
        break;
      default:
        //console.log('Ignoring ' + node.tagName);
    }
  }

  return object;
}

function _parseFeedItems(fragment) {
  var items = [];
  var itemFragments = fragment.getElementsByTagName('item');
  for (var i = 0; i < itemFragments.length; ++i) {
    items.push(_parseFeedItem(itemFragments[i]));
  }

  return items;
}

function _parseFeedItem(fragment) {
  var item = {};

  for (var i = 0; i < fragment.childNodes.length; ++i) {
    var node = fragment.childNodes[i];
    switch (node.tagName) {
      case 'link':
      case 'description':
      case 'author':
      case 'guid':
      case 'pubDate':
        item[node.tagName] = node.textContent;
        break;
      case 'feedburner:origEnclosureLink':
        item['url'] = node.textContent;
        break;
      case 'itunes:subtitle':
        item['title'] = node.textContent;
        break;        
      case 'media:thumbnail':
        try {
          item['imageUrl'] = node.getAttribute('url');
        } catch (e) {
          error("malformed image section")
        }
        break;
      case 'enclosure':
        var o = {};
        [ 'url', 'length', 'type' ].forEach(function(attr) {
          o[attr] = node.getAttribute(attr);
        });
        item[node.tagName] = o;
        break;
      default:
        //console.log('Ignoring ' + node.tagName);
    }
  }

  return item;
}