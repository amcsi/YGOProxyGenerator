const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  passcodeFromRow,
  unpadPasscodeForYpd,
  ypdDirectUrl
} = require('../js/image_source.js');

describe('passcodeFromRow', () => {
  it('prefers s over s2', () => {
    assert.equal(passcodeFromRow({ s: 6637331, s2: '999' }), '6637331');
  });

  it('uses s2 when s is missing or zero', () => {
    assert.equal(passcodeFromRow({ s: 0, s2: '89631140' }), '89631140');
    assert.equal(passcodeFromRow({ s2: '89631140' }), '89631140');
  });

  it('returns null when neither usable', () => {
    assert.equal(passcodeFromRow({ s: 0 }), null);
    assert.equal(passcodeFromRow({}), null);
  });
});

describe('unpadPasscodeForYpd', () => {
  it('strips leading zeros', () => {
    assert.equal(unpadPasscodeForYpd('06637331'), '6637331');
    assert.equal(unpadPasscodeForYpd(6637331), '6637331');
  });

  it('returns empty string when all zeros', () => {
    assert.equal(unpadPasscodeForYpd('0'), '');
    assert.equal(unpadPasscodeForYpd('000'), '');
  });
});

describe('ypdDirectUrl', () => {
  it('builds unpadded YGOProDeck card image URL', () => {
    assert.equal(
      ypdDirectUrl('06637331'),
      'https://images.ygoprodeck.com/images/cards/6637331.jpg'
    );
  });

  it('returns null when passcode unpads to empty', () => {
    assert.equal(ypdDirectUrl('0'), null);
    assert.equal(ypdDirectUrl(null), null);
  });
});
