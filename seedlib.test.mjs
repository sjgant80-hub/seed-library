// seedlib.test.mjs — pins the ribosome tight enough that a single flipped operator (witness mutation) is caught.
// Uses the synthetic triage domain (no CSV needed) so the test is self-contained; the real shopper path is
// exercised by run.mjs / the seal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTriage } from './domains.mjs';
import {
  makeSeed, encodeSeed, decodeSeed, guard, germinate, grow, fit, scoreRow, fires, auc, quantile,
  packGenome, unpackGenome, toHex, fromHex, stemGenome, ratioOf, probeOffline, heldAccuracy,
  GENOME_BITS, GENOME_BYTES, MAXRULES, QGRID, WGRID, MAXFEATS, bitsFor, utf8Bytes, round6,
  crossGenome, rng,
} from './seedlib.mjs';

const tiny = {
  ok: true, name: 't', features: ['a', 'b'], n: 6,
  cols: { a: Float64Array.from([1, 2, 3, 4, 5, 6]), b: Float64Array.from([10, 10, 20, 20, 30, 30]) },
  y: Uint8Array.from([0, 0, 0, 1, 1, 1]), trainRows: [0, 1, 2, 3, 4, 5], heldRows: [0, 1, 2, 3, 4, 5],
};
const handGenome = { on: 1, f0: 0, q0: 7, d0: 1, w0: 6, f1: 0, q1: 0, d1: 0, w1: 0, f2: 0, q2: 0, d2: 0, w2: 0, f3: 0, q3: 0, d3: 0, w3: 0, f4: 0, q4: 0, d4: 0, w4: 0, f5: 0, q5: 0, d5: 0, w5: 0 };

test('genome layout is fixed', () => {
  assert.equal(MAXRULES, 6);
  assert.equal(GENOME_BITS, 78);
  assert.equal(GENOME_BYTES, 10);
  assert.equal(bitsFor(16), 4);
  assert.equal(bitsFor(15), 4);
  assert.equal(bitsFor(8), 3);
  assert.equal(bitsFor(1), 1);
  assert.equal(QGRID.length, 15);
  assert.equal(WGRID.length, 8);
  assert.equal(MAXFEATS, 16);
});

test('packGenome/unpackGenome round-trip and are byte-stable', () => {
  assert.deepEqual(unpackGenome(packGenome(handGenome)), handGenome);
  assert.deepEqual(unpackGenome(packGenome(stemGenome())), stemGenome());
  assert.equal(toHex(packGenome(stemGenome())), '3fdcc6addcce2dddd62d');
  assert.equal(packGenome(stemGenome()).length, 10);
  // overlong fields are clamped into their width, never overflowing the next field
  const big = { ...stemGenome(), on: 999, f0: 999 };
  assert.deepEqual(unpackGenome(packGenome(big)), { ...stemGenome(), on: 999 & 63, f0: 999 & 15 });
});

test('fromHex / toHex total and inverse', () => {
  assert.equal(toHex(fromHex('00ff10')), '00ff10');
  assert.deepEqual(Array.from(fromHex('zz')), []);
  assert.deepEqual(Array.from(fromHex('ab')), [0xab]);
});

test('encode/decode seed round-trips for grow and fixed seeds', () => {
  const gs = makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } });
  const gstr = encodeSeed(gs);
  assert.match(gstr, /^◊ seed\.v1 triage 21 g:16\.2\.14 [0-9a-f]{12}$/);
  const dg = decodeSeed(gstr);
  assert.equal(dg.ok, true);
  assert.deepEqual(dg.seed.grow, { population: 16, elites: 2, generations: 14 });
  assert.equal(dg.seed.genome, null);

  const fs = makeSeed({ domain: 'triage', seed: 21, genome: handGenome });
  const fstr = encodeSeed(fs);
  assert.match(fstr, /^◊ seed\.v1 triage 21 f:[0-9a-f]+ [0-9a-f]{12}$/);
  const df = decodeSeed(fstr);
  assert.equal(df.ok, true);
  assert.deepEqual(df.seed.genome, handGenome);
});

test('the SENTINEL guard accepts valid seeds and rejects tampered / forged ones', () => {
  const str = encodeSeed(makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  assert.equal(guard(str), true);
  // flip the domain but keep the old MAC → guard must fail
  const tampered = str.replace('triage', 'water');
  assert.equal(guard(tampered), false);
  assert.equal(decodeSeed(tampered).ok, false);
  // a seed with no MAC at all → rejected under the guard, accepted only when the guard is explicitly off
  const noMac = str.split(' ').slice(0, 5).join(' ');
  assert.equal(guard(noMac), false);
  assert.equal(decodeSeed(noMac).ok, false);
  assert.equal(decodeSeed(noMac, { guard: false }).ok, true);
  for (const bad of [null, undefined, 42, '', 'hello', '◊ seed.v1']) assert.equal(guard(bad), false);
});

test('decodeSeed rejects malformed seeds (total)', () => {
  assert.equal(decodeSeed('not a seed', { guard: false }).ok, false);
  assert.equal(decodeSeed('◊ seed.v1  0 g:1.1.1', { guard: false }).ok, false);          // seed < 1
  assert.equal(decodeSeed('◊ seed.v1 triage 0 g:1.1.1', { guard: false }).ok, false);     // seed < 1
  assert.equal(decodeSeed('◊ seed.v1 triage 1 g:2.2.2', { guard: false }).ok, false);     // elites >= population
  assert.equal(decodeSeed('◊ seed.v1 triage 1 g:1.0.1', { guard: false }).ok, false);     // elites < 1
  assert.equal(decodeSeed('◊ seed.v1 triage 1 x:nope', { guard: false }).ok, false);      // bad body
  for (const v of [null, undefined, 42, {}, []]) assert.equal(decodeSeed(v).ok, false);
});

test('quantile is exact', () => {
  assert.equal(quantile(tiny, 'a', [0, 1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(quantile(tiny, 'a', [0, 1, 2, 3, 4, 5], 14 / 16), 5);
  assert.equal(quantile(tiny, 'a', [0, 1, 2, 3, 4, 5], 1 / 16), 1);
  assert.equal(quantile(tiny, 'a', [0, 1, 2, 3, 4, 5], 0.999), 5);  // floor(0.999*5)=4 → xs[4]=5
  assert.equal(quantile(tiny, 'a', [0, 1, 2, 3, 4, 5], 1), 6);      // floor(1*5)=5 → the top value
  assert.equal(quantile(tiny, 'a', [0, 1, 2, 3, 4, 5], 2), 6);      // clamps to the top index, never past it
  assert.equal(quantile(tiny, 'a', [], 0.5), 0);                    // empty → 0, total
});

test('auc is exact on known orderings and ties', () => {
  assert.equal(auc([1, 2, 3, 4], [0, 0, 1, 1]), 1);
  assert.equal(auc([4, 3, 2, 1], [0, 0, 1, 1]), 0);
  assert.equal(auc([5, 5, 5, 5], [0, 1, 0, 1]), 0.5);
  assert.equal(auc([1, 2, 3], [0, 0, 0]), 0.5);   // one class → 0.5
});

test('fit builds the right rule and score/fires are exact', () => {
  const card = fit(tiny, [0, 1, 2, 3, 4, 5], handGenome);
  assert.deepEqual(card.rules, [{ feat: 'a', op: '>', v: 3, w: 1 }]);
  assert.equal(card.base, 0.5);
  assert.equal(scoreRow(card, tiny, 5), 1);   // a=6 > 3 → fires, w=+1
  assert.equal(scoreRow(card, tiny, 0), 0);   // a=1 ≤ 3 → does not fire
  assert.equal(fires({ op: '>', v: 3 }, 4), true);
  assert.equal(fires({ op: '>', v: 3 }, 3), false);
  assert.equal(fires({ op: '<=', v: 3 }, 3), true);
  assert.equal(fires({ op: '<=', v: 3 }, 4), false);
});

test('a genome with no active rule is treated as all-equal (auc 0.5)', () => {
  const off = { ...handGenome, on: 0 };
  const card = fit(tiny, [0, 1, 2, 3, 4, 5], off);
  assert.equal(card.rules.length, 0);
  assert.equal(auc([0, 1, 2, 3, 4, 5].map((i) => scoreRow(card, tiny, i)), [0, 0, 0, 1, 1, 1]), 0.5);
});

test('grow is deterministic and pins its champion (kills search mutants)', () => {
  const d = loadTriage();
  const cfg = { population: 16, elites: 2, generations: 14 };
  const g1 = grow(d, d.trainRows, 21, cfg);
  const g2 = grow(d, d.trainRows, 21, cfg);
  assert.deepEqual(g1.champion, g2.champion);
  assert.equal(g1.evals, 198);
  assert.equal(g1.fitness, 0.91685);
  assert.equal(g1.champion.on, 54);
  assert.deepEqual(g1.champion, { on: 54, f0: 5, q0: 14, d0: 1, w0: 1, f1: 8, q1: 11, d1: 0, w1: 1, f2: 0, q2: 7, d2: 0, w2: 1, f3: 2, q3: 6, d3: 1, w3: 6, f4: 1, q4: 5, d4: 0, w4: 7, f5: 4, q5: 9, d5: 1, w5: 4 });
  assert.equal(g1.history.length, 14);
  assert.ok(g1.history[13] >= g1.history[0]);   // evolution never loses the best
});

test('germinate grows a working build graded on held-out it never grew on (pinned)', () => {
  const d = loadTriage();
  const g = germinate(d, makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  assert.equal(g.ok, true);
  assert.equal(g.grownFrom.grown, true);
  assert.equal(g.heldAuc, 0.952127);
  assert.equal(g.heldAcc, 0.983333);
  assert.equal(g.base, 0.018056);
  assert.ok(g.heldAuc > 0.5);
  assert.equal(g.train, d.trainRows.length);
  assert.equal(g.held, d.heldRows.length);
  // disjoint: no held row is a train row
  const t = new Set(d.trainRows);
  assert.ok(d.heldRows.every((i) => !t.has(i)));
});

test('a fixed seed (shipped genome) germinates to the same held-out AUC as the grown one', () => {
  const d = loadTriage();
  const grown = germinate(d, makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  const fixedSeed = makeSeed({ domain: 'triage', seed: 21, genome: grown.genome });
  const fixed = germinate(d, encodeSeed(fixedSeed));
  assert.equal(fixed.ok, true);
  assert.equal(fixed.grownFrom.grown, false);
  assert.equal(fixed.heldAuc, grown.heldAuc);
});

test('germinate is total on bad input and bad seeds', () => {
  const d = loadTriage();
  assert.equal(germinate(null, 'x').ok, false);
  assert.equal(germinate({ ok: false }, 'x').ok, false);
  assert.equal(germinate(d, 'garbage').ok, false);                       // fails the guard/decoding
  assert.equal(germinate(d, makeSeed({ domain: 'triage', seed: 1, grow: { population: 2, elites: 2, generations: 2 } })).ok, false); // elites>=pop
  assert.equal(germinate({ ...d, trainRows: [], heldRows: [] }, makeSeed({ domain: 'triage', seed: 1, genome: stemGenome() })).ok, false);
});

test('ratioOf: the seed is smaller than the grown body', () => {
  const d = loadTriage();
  const seed = makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } });
  const g = germinate(d, seed);
  const r = ratioOf(encodeSeed(seed), g.scorecard);
  assert.ok(r.seedBytes > 0);
  assert.ok(r.grownBytes > r.seedBytes);
  assert.ok(r.ratio > 1);
  assert.equal(utf8Bytes('◊'), 3);
  assert.equal(utf8Bytes('ab'), 2);
});

test('heldAccuracy is a proper fraction and total on empty', () => {
  const d = loadTriage();
  const card = fit(d, d.trainRows, stemGenome());
  const acc = heldAccuracy(card, d, d.trainRows, d.heldRows);
  assert.ok(acc >= 0 && acc <= 1);
  assert.equal(heldAccuracy(card, d, d.trainRows, []), 0);
  assert.equal(round6(1 / 3), 0.333333);
});

test('probeOffline germinates with the network trapped and restores globals', () => {
  const d = loadTriage();
  const seed = encodeSeed(makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  const before = globalThis.fetch;
  const off = probeOffline(() => germinate(d, seed));
  assert.equal(off.ok, true);
  assert.equal(off.networkTouched, false);
  assert.equal(off.result.ok, true);
  assert.equal(globalThis.fetch, before);   // restored
  // a function that tries the network is caught, with the exact message (pins the e&&e.message||e formatting)
  const bad = probeOffline(() => globalThis.fetch('http://example.com'));
  assert.equal(bad.ok, false);
  assert.equal(bad.networkTouched, true);
  assert.equal(bad.error, 'network blocked during germination: fetch');
});

// ── edge pins added to kill surviving mutants (tightened boundaries) ──────────────────────────────────────────
test('auc is 0.5 when a class is absent (both all-negative and all-positive)', () => {
  assert.equal(auc([1, 2, 3], [0, 0, 0]), 0.5);   // pins pos>0
  assert.equal(auc([1, 2, 3], [1, 1, 1]), 0.5);   // pins neg>0
});

test('utf8Bytes is exact at the 1/2/3/4-byte boundaries', () => {
  assert.equal(utf8Bytes('\u0080'), 2);
  assert.equal(utf8Bytes('ࠀ'), 3);
  assert.equal(utf8Bytes('\u{10000}'), 4);
  assert.equal(utf8Bytes('\u007f'), 1);
});

test('round6 is 0 on non-finite / non-number input', () => {
  assert.equal(round6(NaN), 0);
  assert.equal(round6(Infinity), 0);
  assert.equal(round6('x'), 0);
  assert.equal(round6(2.1234567), 2.123457);
});

test('fromHex stops before a trailing half-byte', () => {
  assert.deepEqual(Array.from(fromHex('abc')), [0xab]);   // odd length: the lone 'c' is not a byte
  assert.deepEqual(Array.from(fromHex('abcd')), [0xab, 0xcd]);
});

test('packGenome clamps non-integer and negative fields to 0', () => {
  assert.equal(unpackGenome(packGenome({ ...stemGenome(), on: 2.5 })).on, 0);
  assert.equal(unpackGenome(packGenome({ ...stemGenome(), on: -1 })).on, 0);
});

test('the guard rejects a valid MAC under a wrong tag (verify-before-parse)', () => {
  const str = encodeSeed(makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  assert.equal(guard(str.replace('◊', 'X')), false);   // mac is valid but the ◊ tag is gone → refused
});

test('decodeSeed accepts a one-generation config and seed=1, rejects seed=0 with a valid config', () => {
  assert.equal(decodeSeed('◊ seed.v1 triage 1 g:2.1.1', { guard: false }).ok, true);   // generations=1, seed=1 valid
  assert.equal(decodeSeed('◊ seed.v1 triage 0 g:2.1.1', { guard: false }).ok, false);  // seed=0 rejected even with a valid config
});

test('crossGenome never produces an all-off genome (the ||1 fallback)', () => {
  const zero = { on: 0 };
  for (let k = 0; k < 6; k++) { zero[`f${k}`] = 0; zero[`q${k}`] = 0; zero[`d${k}`] = 0; zero[`w${k}`] = 0; }
  assert.ok(crossGenome(zero, zero, rng(1)).on >= 1);
});

test('ratioOf uses a string seed verbatim (no re-encoding)', () => {
  const d = loadTriage();
  const str = encodeSeed(makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  const g = germinate(d, str);
  assert.equal(ratioOf(str, g.scorecard).seedBytes, utf8Bytes(str));
});

test('germinate blocks malformed datasets and seeds with the right branch', () => {
  const d = loadTriage();
  const str = encodeSeed(makeSeed({ domain: 'triage', seed: 21, grow: { population: 16, elites: 2, generations: 14 } }));
  assert.match(germinate({ ok: true, n: 0 }, str).error, /needs a loaded dataset/);  // n=0 caught before anything else
  assert.equal(germinate(d, null).ok, false);                                        // non-string falsy seed
  assert.equal(germinate(d, 42).ok, false);                                          // non-object seed
  assert.equal(germinate({ ...d, trainRows: null }, str).ok, false);                 // train not an array
  assert.equal(germinate({ ...d, heldRows: null }, str).ok, false);                  // held not an array
  assert.equal(germinate({ ...d, trainRows: [] }, str).ok, false);                   // empty train
  assert.equal(germinate({ ...d, heldRows: [] }, str).ok, false);                    // empty held
});

test('heldAccuracy operating point is exact when the train base rate is 0', () => {
  // train all-negative (base 0); the held row fires both rules → scores above every train score → predicted positive
  const ds = {
    ok: true, name: 'z', features: ['a', 'b'], n: 4,
    cols: { a: Float64Array.from([5, 0, 0, 5]), b: Float64Array.from([0, 5, 0, 5]) },
    y: Uint8Array.from([0, 0, 0, 1]), trainRows: [0, 1, 2], heldRows: [3],
  };
  const genome = { on: 3, f0: 0, q0: 0, d0: 1, w0: 6, f1: 1, q1: 0, d1: 1, w1: 6, f2: 0, q2: 0, d2: 0, w2: 0, f3: 0, q3: 0, d3: 0, w3: 0, f4: 0, q4: 0, d4: 0, w4: 0, f5: 0, q5: 0, d5: 0, w5: 0 };
  const card = fit(ds, ds.trainRows, genome);
  assert.equal(card.base, 0);
  assert.equal(heldAccuracy(card, ds, ds.trainRows, ds.heldRows), 1);
});
