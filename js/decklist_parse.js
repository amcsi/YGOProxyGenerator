(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YGODecklistParse = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var YGOPRODECK_CARDS_PREFIX = 'https://images.ygoprodeck.com/images/cards/';
  var CLOUDINARY_UPLOAD_PREFIX = 'https://res.cloudinary.com/drkxqkguu/image/upload/yugioh/';

  function extractDirectImageUrl(cardText) {
    var match = String(cardText).match(/https?:\/\/\S+/i);
    return match ? match[0] : null;
  }

  function parseDecklistLine(line) {
    var trimmed = String(line).trim();
    var amount = 1;
    var rest = trimmed;
    var qtyMatch = trimmed.match(/^([1-9][0-9]*)\s+(.*)$/);
    if (qtyMatch) {
      amount = parseInt(qtyMatch[1], 10);
      rest = qtyMatch[2];
    }

    var directUrl = extractDirectImageUrl(rest);
    if (directUrl) {
      return {
        amount: amount,
        cardNameOrId: rest,
        artIndex: 0,
        override: null,
        directUrl: directUrl
      };
    }

    var tags = [];
    var tagMatch;
    var tagPattern = /^(.*?)\s*\[(db|ypd|\d+)\]\s*$/i;
    while ((tagMatch = rest.match(tagPattern))) {
      tags.unshift(tagMatch[2]);
      rest = tagMatch[1].replace(/\s+$/, '');
    }

    var artIndex = 0;
    var override = null;
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      var lower = tag.toLowerCase();
      if (lower === 'db' || lower === 'ypd') {
        override = lower;
      } else {
        artIndex = parseInt(tag, 10);
      }
    }

    var cardNameOrId = rest.replace(/^\s+|\s+$/g, '');
    // "35844557 [ypd]" looks like qty + tags with an empty name; the digits are the passcode.
    if (cardNameOrId === '' && qtyMatch) {
      cardNameOrId = qtyMatch[1];
      amount = 1;
    }

    return {
      amount: amount,
      cardNameOrId: cardNameOrId,
      artIndex: artIndex,
      override: override,
      directUrl: null
    };
  }

  function isOriginalDejauxvueHost(locationLike) {
    if (locationLike === undefined) {
      locationLike = typeof location !== 'undefined' ? location : null;
    }
    return !!(locationLike && locationLike.hostname === 'dejauxvue.github.io');
  }

  function rewriteYgoProDeckImageUrl(url, locationLike) {
    url = String(url);
    if (isOriginalDejauxvueHost(locationLike)) {
      return url;
    }
    if (url.indexOf(YGOPRODECK_CARDS_PREFIX) === 0) {
      return CLOUDINARY_UPLOAD_PREFIX + url.slice(YGOPRODECK_CARDS_PREFIX.length);
    }
    return url;
  }

  return {
    extractDirectImageUrl: extractDirectImageUrl,
    parseDecklistLine: parseDecklistLine,
    isOriginalDejauxvueHost: isOriginalDejauxvueHost,
    rewriteYgoProDeckImageUrl: rewriteYgoProDeckImageUrl
  };
});
