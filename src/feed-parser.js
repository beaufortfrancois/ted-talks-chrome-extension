function parseFeed(doc) {
  var walker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT);
  var fragment = null;

  do {
    fragment = walker.nextNode();
  } while (fragment.tagName.toLowerCase() != 'channel');

  var items = [];
  var itemFragments = fragment.getElementsByTagName('item');
  for (var i = 0; i < itemFragments.length; i++) {
    items.push(parseFeedItem(itemFragments[i]));
  }

  return items;
}

function parseFeedItem(fragment) {
  var item = {};

  for (var i = 0; i < fragment.childNodes.length; i++) {
    var node = fragment.childNodes[i];
    switch (node.tagName) {
      case 'guid':
      case 'pubDate':
        item[node.tagName] = node.textContent;
        break;
      case 'itunes:subtitle':
        item['title'] = node.textContent.normalize('NFKC');
        break;
      case 'media:thumbnail':
        item['imageUrl'] = node.getAttribute('url');
        break;
      case 'enclosure':
        var o = {};
        [ 'length', 'type', 'url' ].forEach(function(attr) {
          o[attr] = node.getAttribute(attr);
        });
        item[node.tagName] = o;
        break;
    }
  }

  return item;
}