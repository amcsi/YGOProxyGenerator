const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildIndexes,
  findMatches,
  imageUrlForRow,
  padPasscode8
} = require('../js/duelingbook.js');

const fixtureCards = [
  { id: 6, n: '4-Starred Ladybug of Doom', s: 83994646 },
  { id: 513, n: 'Blue-Eyes White Dragon', s: 89631139 },
  { id: 4916, n: 'Blue-Eyes White Dragon', s: 89631139, s2: '89631140' },
  { id: 10756, n: 'Blue-Eyes White Dragon', s: 0, rush: 2 },
  { id: 12, n: 'A Deal with Dark Ruler', s: 6850209 },
  { id: 6801, n: 'A Deal with Dark Ruler', s: 6850209, h: 1 }
];

describe('padPasscode8', () => {
  it('left-pads to 8 digits', () => {
    assert.equal(padPasscode8('6850209'), '06850209');
    assert.equal(padPasscode8(6850209), '06850209');
  });
});

describe('findMatches', () => {
  const indexes = buildIndexes(fixtureCards);

  it('matches every row with the exact name, in catalog order', () => {
    const matches = findMatches(indexes, 'Blue-Eyes White Dragon');
    assert.deepEqual(matches.map((r) => r.id), [513, 4916, 10756]);
  });

  it('matches by main passcode s', () => {
    const matches = findMatches(indexes, '83994646');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 6);
  });

  it('matches by s2 alt passcode', () => {
    const matches = findMatches(indexes, '89631140');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 4916);
  });

  it('matches zero-padded passcode forms', () => {
    const matches = findMatches(indexes, '6850209');
    assert.deepEqual(matches.map((r) => r.id), [12, 6801]);
    const padded = findMatches(indexes, '06850209');
    assert.deepEqual(padded.map((r) => r.id), [12, 6801]);
  });

  it('returns empty array when nothing matches', () => {
    assert.deepEqual(findMatches(indexes, 'Not A Real Card'), []);
  });
});

describe('imageUrlForRow', () => {
  it('builds the DuelingBook cards image URL', () => {
    assert.equal(
      imageUrlForRow({ id: 6 }),
      'https://images.duelingbook.com/cards/6.jpg'
    );
  });
});
