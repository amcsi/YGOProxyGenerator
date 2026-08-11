(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.YGOImageSource = factory(root);
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  var db = root && root.YGODuelingBook;
  var defaultFindMatches = db ? db.findMatches : null;
  var defaultImageUrlForRow = db ? db.imageUrlForRow : null;
  var PREFER_DB_STORAGE_KEY = 'preferDuelingBookImages';

  function readPreferDb(storage) {
    try {
      var raw = storage.getItem(PREFER_DB_STORAGE_KEY);
      if (raw === 'true') {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function writePreferDb(storage, value) {
    storage.setItem(PREFER_DB_STORAGE_KEY, value ? 'true' : 'false');
  }

  function isMissingPasscode(value) {
    return value === undefined || value === null || value === '' || value === 0;
  }

  function passcodeFromRow(row) {
    if (!row) {
      return null;
    }
    if (!isMissingPasscode(row.s)) {
      return String(row.s);
    }
    if (!isMissingPasscode(row.s2)) {
      return String(row.s2);
    }
    return null;
  }

  function unpadPasscodeForYpd(passcode) {
    if (passcode === undefined || passcode === null || passcode === '') {
      return '';
    }
    return String(passcode).replace(/^0+/, '');
  }

  function ypdDirectUrl(passcode) {
    var unpadded = unpadPasscodeForYpd(passcode);
    if (!unpadded) {
      return null;
    }
    return 'https://images.ygoprodeck.com/images/cards/' + unpadded + '.jpg';
  }

  function parseYgoProDeckCardInfo(result) {
    var data = JSON.parse(result);
    if (!data || !Array.isArray(data.data) || !data.data[0]) {
      return null;
    }
    return data;
  }

  function resolveAttempts(options) {
    var cardNameOrId = options.cardNameOrId;
    var artIndex = options.artIndex == null ? 0 : options.artIndex;
    var preferDb = options.preferDb;
    var override = options.override || null;
    var dbIndexes = options.dbIndexes;
    var findMatchesFn = options.findMatches || defaultFindMatches;
    var imageUrlForRowFn = options.imageUrlForRow || defaultImageUrlForRow;

    var effectivePreferDb =
      override === 'db' ? true : override === 'ypd' ? false : preferDb;

    var row = null;
    if (dbIndexes && findMatchesFn) {
      var matches = findMatchesFn(dbIndexes, cardNameOrId);
      row = matches[artIndex] || null;
    }

    var dbAttempt = null;
    if (row && imageUrlForRowFn) {
      dbAttempt = { type: 'duelingbook', url: imageUrlForRowFn(row) };
    }

    var ypdAttempts = [];
    if (artIndex === 0 && row) {
      var direct = ypdDirectUrl(passcodeFromRow(row));
      if (direct) {
        ypdAttempts.push({ type: 'ygoprodeck-direct', url: direct });
      }
    }
    ypdAttempts.push({
      type: 'ygoprodeck-api',
      cardNameOrId: cardNameOrId,
      artIndex: artIndex
    });

    if (!dbIndexes) {
      return [{ type: 'ygoprodeck-api', cardNameOrId: cardNameOrId, artIndex: artIndex }];
    }

    if (effectivePreferDb) {
      return (dbAttempt ? [dbAttempt] : []).concat(ypdAttempts);
    }
    return ypdAttempts.concat(dbAttempt ? [dbAttempt] : []);
  }

  return {
    PREFER_DB_STORAGE_KEY: PREFER_DB_STORAGE_KEY,
    readPreferDb: readPreferDb,
    writePreferDb: writePreferDb,
    passcodeFromRow: passcodeFromRow,
    unpadPasscodeForYpd: unpadPasscodeForYpd,
    ypdDirectUrl: ypdDirectUrl,
    parseYgoProDeckCardInfo: parseYgoProDeckCardInfo,
    resolveAttempts: resolveAttempts
  };
});
