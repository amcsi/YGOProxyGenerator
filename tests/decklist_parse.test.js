const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractDirectImageUrl } = require('../js/decklist_parse.js');

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
