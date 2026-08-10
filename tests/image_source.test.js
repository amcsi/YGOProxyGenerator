const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  passcodeFromRow,
  unpadPasscodeForYpd,
  ypdDirectUrl,
  resolveAttempts
} = require('../js/image_source.js');
const {
  buildIndexes,
  findMatches,
  imageUrlForRow
} = require('../js/duelingbook.js');

const fixtureCards = [
  { id: 6, n: '4-Starred Ladybug of Doom', s: 83994646 },
  { id: 513, n: 'Blue-Eyes White Dragon', s: 89631139 },
  { id: 4916, n: 'Blue-Eyes White Dragon', s: 89631139, s2: '89631140' }
];
const indexes = buildIndexes(fixtureCards);
const dbOpts = { findMatches, imageUrlForRow };

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

describe('resolveAttempts', () => {
  it('preferDb: duelingbook then ypd-direct then ypd-api for art 0', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: true,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['duelingbook', 'ygoprodeck-direct', 'ygoprodeck-api']
    );
    assert.equal(attempts[0].url, 'https://images.duelingbook.com/cards/6.jpg');
    assert.equal(
      attempts[1].url,
      'https://images.ygoprodeck.com/images/cards/83994646.jpg'
    );
    assert.equal(attempts[2].cardNameOrId, '4-Starred Ladybug of Doom');
    assert.equal(attempts[2].artIndex, 0);
  });

  it('prefer YPD: direct then api then duelingbook for art 0', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: false,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['ygoprodeck-direct', 'ygoprodeck-api', 'duelingbook']
    );
  });

  it('override ypd beats preferDb', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: true,
      override: 'ypd',
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.equal(attempts[0].type, 'ygoprodeck-direct');
  });

  it('override db beats prefer YPD', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: false,
      override: 'db',
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.equal(attempts[0].type, 'duelingbook');
  });

  it('artIndex > 0 skips ypd-direct and uses api', () => {
    const attempts = resolveAttempts({
      cardNameOrId: 'Blue-Eyes White Dragon',
      artIndex: 1,
      preferDb: true,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['duelingbook', 'ygoprodeck-api']
    );
    assert.equal(attempts[0].url, 'https://images.duelingbook.com/cards/4916.jpg');
    assert.equal(attempts[1].artIndex, 1);
  });

  it('missing dbIndexes omits db and direct', () => {
    const attempts = resolveAttempts({
      cardNameOrId: 'Dark Magician',
      artIndex: 0,
      preferDb: true,
      override: null,
      dbIndexes: null,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['ygoprodeck-api']
    );
  });

  it('no DB match omits db and direct, keeps api', () => {
    const attempts = resolveAttempts({
      cardNameOrId: 'Not A Real Card',
      artIndex: 0,
      preferDb: false,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['ygoprodeck-api']
    );
  });
});
