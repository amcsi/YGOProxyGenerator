(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YGOImageSource = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
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

  return {
    passcodeFromRow: passcodeFromRow,
    unpadPasscodeForYpd: unpadPasscodeForYpd,
    ypdDirectUrl: ypdDirectUrl
  };
});
