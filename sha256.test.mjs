// sha256.test.mjs — proves the hand-rolled SHA-256/HMAC against known vectors AND against Node's own crypto
// (gate-the-edges: the digest is proven, not trusted). Also pins the UTF-8 byte boundaries so a mutant that
// mis-classifies a 1/2/3/4-byte codepoint is killed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { sha256Hex, hmacSha256Hex, utf8, toHexStr, sha256Bytes } from './sha256.mjs';

test('sha256 matches known FIPS vectors', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex('◊ seed.v1'), '671977d2c4e65573fff956bb9a132998ddf4c322bbe68fa16af8d680bcf6546a');
});

test('sha256 matches Node crypto across lengths and multi-block inputs', () => {
  const cases = ['', 'a', 'ab', 'abc', 'message digest', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(63),
    'x'.repeat(64), 'x'.repeat(65), 'x'.repeat(1000), '◊ seed.v1 shopper 21 g:16.2.14', JSON.stringify({ a: 1, b: [2, 3] })];
  for (const s of cases) assert.equal(sha256Hex(s), createHash('sha256').update(s).digest('hex'), 'mismatch on len ' + s.length);
});

test('utf8 byte boundaries are exact (1/2/3/4-byte codepoints)', () => {
  // every boundary codepoint; a mutant on the <0x80 / <0x800 / <0x10000 cutoffs changes the encoding → the digest diverges from Node
  for (const ch of ['\u0000', '\u007f', '\u0080', '߿', 'ࠀ', '￿', '\u{10000}', '\u{10ffff}', '◊', 'é', '中']) {
    assert.equal(sha256Hex(ch), createHash('sha256').update(ch).digest('hex'), 'utf8 boundary ' + ch.codePointAt(0).toString(16));
  }
  assert.deepEqual(Array.from(utf8('\u0080')), [0xc2, 0x80]);
  assert.deepEqual(Array.from(utf8('ࠀ')), [0xe0, 0xa0, 0x80]);
  assert.deepEqual(Array.from(utf8('\u{10000}')), [0xf0, 0x90, 0x80, 0x80]);
  assert.deepEqual(Array.from(utf8('A')), [0x41]);
});

test('hmac-sha256 matches known vector and Node crypto', () => {
  assert.equal(hmacSha256Hex('seed-library.v1/konomi/thomas-frumkin', 'triage 11 g:16.2.14'),
    'ffff610090156d6b91ee6103f6dc3e60a21e37d108a51d8b082215336109a92c');
  for (const [k, m] of [['key', 'msg'], ['', ''], ['x'.repeat(64), 'y'], ['x'.repeat(65), 'z'], ['short', 'x'.repeat(200)]]) {
    assert.equal(hmacSha256Hex(k, m), createHmac('sha256', k).update(m).digest('hex'), 'hmac mismatch ' + k.length + '/' + m.length);
  }
});

test('total on hostile input (never throws)', () => {
  for (const v of [null, undefined, 123, {}, [], NaN, true]) {
    assert.doesNotThrow(() => sha256Hex(v));
    assert.doesNotThrow(() => hmacSha256Hex(v, v));
  }
  assert.equal(sha256Bytes('not-bytes').length, 32);   // coerces to empty byte array, still a 32-byte digest
  assert.equal(toHexStr(Uint8Array.from([0, 255, 16])), '00ff10');
});
