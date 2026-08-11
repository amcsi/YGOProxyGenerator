const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractDirectImageUrl,
  parseDecklistLine,
  rewriteYgoProDeckImageUrl
} = require('../js/decklist_parse.js');

describe('extractDirectImageUrl', () => {
  it('returns null when there is no URL', () => {
    assert.equal(extractDirectImageUrl('Dark Magician'), null);
    assert.equal(extractDirectImageUrl('74677422'), null);
  });

  it('returns a lone URL', () => {
    assert.equal(
      extractDirectImageUrl('https://example.com/art.jpg'),
      'https://example.com/art.jpg'
    );
  });

  it('returns URL when optional name precedes it', () => {
    assert.equal(
      extractDirectImageUrl('Dark Magician https://example.com/art.jpg'),
      'https://example.com/art.jpg'
    );
  });

  it('supports http as well as https', () => {
    assert.equal(
      extractDirectImageUrl('http://example.com/art.png'),
      'http://example.com/art.png'
    );
  });

  it('returns the first URL if multiple appear', () => {
    assert.equal(
      extractDirectImageUrl('https://a.example/x.jpg https://b.example/y.jpg'),
      'https://a.example/x.jpg'
    );
  });
});

describe('rewriteYgoProDeckImageUrl', () => {
  const ygoUrl = 'https://images.ygoprodeck.com/images/cards/46986414.jpg';
  const cloudinaryUrl =
    'https://res.cloudinary.com/drkxqkguu/image/upload/yugioh/46986414.jpg';

  it('rewrites YGOProDeck card images off the original host', () => {
    assert.equal(
      rewriteYgoProDeckImageUrl(ygoUrl, { hostname: 'localhost' }),
      cloudinaryUrl
    );
    assert.equal(
      rewriteYgoProDeckImageUrl(ygoUrl, { hostname: 'amcsi.github.io' }),
      cloudinaryUrl
    );
  });

  it('keeps YGOProDeck card images on dejauxvue.github.io', () => {
    assert.equal(
      rewriteYgoProDeckImageUrl(ygoUrl, { hostname: 'dejauxvue.github.io' }),
      ygoUrl
    );
  });

  it('leaves unrelated URLs unchanged', () => {
    assert.equal(
      rewriteYgoProDeckImageUrl('https://example.com/art.jpg', {
        hostname: 'localhost'
      }),
      'https://example.com/art.jpg'
    );
  });
});

describe('parseDecklistLine', () => {
  it('parses name and default art index', () => {
    assert.deepEqual(parseDecklistLine('Dark Magician'), {
      amount: 1,
      cardNameOrId: 'Dark Magician',
      artIndex: 0,
      override: null,
      directUrl: null
    });
  });

  it('parses qty, art index, and ypd override with spaces', () => {
    assert.deepEqual(parseDecklistLine('2 Card Name [ypd] [0]'), {
      amount: 2,
      cardNameOrId: 'Card Name',
      artIndex: 0,
      override: 'ypd',
      directUrl: null
    });
  });

  it('accepts either tag order without spaces', () => {
    assert.deepEqual(parseDecklistLine('Card [1][db]'), {
      amount: 1,
      cardNameOrId: 'Card',
      artIndex: 1,
      override: 'db',
      directUrl: null
    });
    assert.deepEqual(parseDecklistLine('Card [db][1]'), {
      amount: 1,
      cardNameOrId: 'Card',
      artIndex: 1,
      override: 'db',
      directUrl: null
    });
  });

  it('last source tag wins', () => {
    assert.equal(parseDecklistLine('Card [db] [ypd]').override, 'ypd');
  });

  it('leaves unknown brackets in the name', () => {
    const parsed = parseDecklistLine('Card [foo]');
    assert.equal(parsed.cardNameOrId, 'Card [foo]');
    assert.equal(parsed.override, null);
  });

  it('ignores source tags for direct URL lines', () => {
    const parsed = parseDecklistLine(
      '3 Dark Magician https://example.com/art.jpg'
    );
    assert.equal(parsed.directUrl, 'https://example.com/art.jpg');
    assert.equal(parsed.override, null);
    assert.equal(parsed.artIndex, 0);
    assert.equal(parsed.amount, 3);
  });

  it('treats bare passcode plus tags as id, not quantity', () => {
    assert.deepEqual(parseDecklistLine('35844557 [ypd]'), {
      amount: 1,
      cardNameOrId: '35844557',
      artIndex: 0,
      override: 'ypd',
      directUrl: null
    });
    assert.deepEqual(parseDecklistLine('35844557 [1]'), {
      amount: 1,
      cardNameOrId: '35844557',
      artIndex: 1,
      override: null,
      directUrl: null
    });
    assert.deepEqual(parseDecklistLine('74677422 [db] [0]'), {
      amount: 1,
      cardNameOrId: '74677422',
      artIndex: 0,
      override: 'db',
      directUrl: null
    });
  });

  it('keeps real qty when passcode follows the count', () => {
    assert.deepEqual(parseDecklistLine('3 35844557 [ypd]'), {
      amount: 3,
      cardNameOrId: '35844557',
      artIndex: 0,
      override: 'ypd',
      directUrl: null
    });
  });
});
