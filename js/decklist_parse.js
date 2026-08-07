(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YGODecklistParse = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function extractDirectImageUrl(cardText) {
    var match = String(cardText).match(/https?:\/\/\S+/i);
    return match ? match[0] : null;
  }

  return {
    extractDirectImageUrl: extractDirectImageUrl
  };
});
