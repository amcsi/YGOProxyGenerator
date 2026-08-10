(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YGODuelingBook = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function normalizePasscode(value) {
    return String(value);
  }

  function padPasscode8(value) {
    var s = normalizePasscode(value);
    while (s.length < 8) {
      s = '0' + s;
    }
    return s;
  }

  function pushIndex(map, key, row) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) {
      map[key] = [];
    }
    map[key].push(row);
  }

  function buildIndexes(cards) {
    var byName = {};
    var byPasscode = {};
    for (var i = 0; i < cards.length; i++) {
      var row = cards[i];
      pushIndex(byName, row.n, row);
      if (row.s !== undefined && row.s !== null && row.s !== '') {
        var sKey = normalizePasscode(row.s);
        pushIndex(byPasscode, sKey, row);
        var sPad = padPasscode8(sKey);
        if (sPad !== sKey) {
          pushIndex(byPasscode, sPad, row);
        }
      }
      if (row.s2 !== undefined && row.s2 !== null && row.s2 !== '') {
        var s2Key = normalizePasscode(row.s2);
        pushIndex(byPasscode, s2Key, row);
        var s2Pad = padPasscode8(s2Key);
        if (s2Pad !== s2Key) {
          pushIndex(byPasscode, s2Pad, row);
        }
      }
    }
    return { byName: byName, byPasscode: byPasscode };
  }

  function findMatches(indexes, cardNameOrId) {
    var token = String(cardNameOrId);
    if (Object.prototype.hasOwnProperty.call(indexes.byName, token)) {
      return indexes.byName[token];
    }
    if (Object.prototype.hasOwnProperty.call(indexes.byPasscode, token)) {
      return indexes.byPasscode[token];
    }
    var padded = padPasscode8(token);
    if (padded !== token && Object.prototype.hasOwnProperty.call(indexes.byPasscode, padded)) {
      return indexes.byPasscode[padded];
    }
    return [];
  }

  function imageUrlForRow(row) {
    return 'https://images.duelingbook.com/cards/' + row.id + '.jpg';
  }

  return {
    normalizePasscode: normalizePasscode,
    padPasscode8: padPasscode8,
    buildIndexes: buildIndexes,
    findMatches: findMatches,
    imageUrlForRow: imageUrlForRow
  };
});
