const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractDirectImageUrl,
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
    'https://res.cloudinary.com/drkxqkguu/image/upload/q_auto,f_auto,h_520/yugioh/46986414.jpg';

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
