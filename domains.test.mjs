// domains.test.mjs — the domains are a deterministic data layer (frozen by the seal's sha256, re-derived by CI).
// Not in the mutation set; these tests prove determinism, the real shopper parse, and basic sanity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDomain, loadShopper, loadTriage, DOMAIN_IDS, SHOPPER_FEATURES } from './domains.mjs';

const csv = readFileSync(new URL('./data/online_shoppers_intention.csv', import.meta.url), 'utf8');

test('every domain loads with disjoint train/held and a label present', () => {
  for (const id of DOMAIN_IDS) {
    const d = loadDomain(id, { shopperCsv: csv });
    assert.equal(d.ok, true, id);
    assert.ok(d.features.length >= 1 && d.features.length <= 16, id + ' feature count');
    assert.ok(d.trainRows.length > 0 && d.heldRows.length > 0, id + ' splits');
    const t = new Set(d.trainRows);
    assert.ok(d.heldRows.every((i) => !t.has(i)), id + ' disjoint');
    assert.equal(d.trainRows.length + d.heldRows.length, d.n, id + ' partition');
    const pos = [...d.trainRows, ...d.heldRows].reduce((a, i) => a + d.y[i], 0);
    assert.ok(pos > 0 && pos < d.n, id + ' has both classes');
    for (const f of d.features) assert.ok(d.cols[f] && d.cols[f].length === d.n, id + ' col ' + f);
  }
});

test('synthetic generators are deterministic (byte-identical columns on reload)', () => {
  const a = loadTriage(), b = loadTriage();
  assert.deepEqual(Array.from(a.cols.spO2), Array.from(b.cols.spO2));
  assert.deepEqual(Array.from(a.y), Array.from(b.y));
});

test('shopper is the real UCI dataset: 12,330 sessions, Nov+Dec held out', () => {
  const d = loadShopper(csv);
  assert.equal(d.ok, true);
  assert.equal(d.real, true);
  assert.equal(d.n, 12330);
  assert.deepEqual(d.features, SHOPPER_FEATURES);
  assert.equal(d.trainRows.length + d.heldRows.length, 12330);
  assert.ok(d.heldRows.length > 0);
  // the overall buyer rate on the real data is ~15.5%
  const buyers = Array.from(d.y).reduce((a, v) => a + v, 0);
  assert.equal(buyers, 1908);
});

test('loadDomain is total on bad input', () => {
  assert.equal(loadDomain('nope').ok, false);
  assert.equal(loadShopper(null).ok, false);
  assert.equal(loadShopper('Administrative\n1').ok, false);  // missing columns
});
