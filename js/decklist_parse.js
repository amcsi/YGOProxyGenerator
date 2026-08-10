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
    isOriginalDejauxvueHost: isOriginalDejauxvueHost,
    rewriteYgoProDeckImageUrl: rewriteYgoProDeckImageUrl
  };
});
