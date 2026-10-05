#!/usr/bin/env node
// tools/seal.mjs — writes data/prereg.json, the pre-registration of the Seed Library measurement, from the
// committed files: the real sessions', the ribosome's, the hash's, the domains' and the runner's sha256, the
// config, the fresh grading seeds, the rules and a prediction for each. Committed and pushed BEFORE any seed is
// graded on fresh seeds. CI re-derives the record from this seal.
//   node tools/seal.mjs            write it (refuses to overwrite)
//   node tools/seal.mjs --check    exit 1 unless the committed file is exactly what this writes
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CONFIG, SEEDS, DATA, DOMAINS, sha } from './run.mjs';
import { GENOME_BITS, GENOME_BYTES, encodeSeed, makeSeed, stemGenome } from '../seedlib.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const OUT = join(ROOT, 'data', 'prereg.json');
const text = (f) => readFileSync(join(ROOT, f), 'utf8');

export function prereg() {
  const exampleGrow = encodeSeed(makeSeed({ domain: 'triage', seed: SEEDS[0], grow: CONFIG }));
  const exampleFixed = encodeSeed(makeSeed({ domain: 'triage', seed: SEEDS[0], genome: stemGenome() }));
  return {
    kind: 'seed-library-prereg', v: 1, written: '2026-10-05',
    approvedBy: 'Simon, relayed: build the SEED LIBRARY — proving grow-not-install + knowledge-lives-in-seeds-not-weights + survival-triage. Spec, verbatim: knowledge stored as tiny readable seeds (the compressed genome) rather than smeared across billion-parameter weights; the small models grow/apply from the seeds; the giant LLM becomes unnecessary FOR STORING KNOWLEDGE; a small LLM survives only for IMAGINATION; the architecture survives the internet going down (local, tiny, distributed, low-power, comms-agnostic); curate a survival-seed-library for survival-critical domains; grow only what is needed. Measure the real claims and report whichever way each lands; be honest this is a proof on a few curated domains, not a full civilizational library.',
    statement: 'Sealed, committed and pushed before any seed is graded on the fresh seeds ' + JSON.stringify(SEEDS) + '. This fixes, in advance: the real sessions, the ribosome (seedlib.mjs), the hash (sha256.mjs), the domains (domains.mjs), the runner (tools/run.mjs), the grow-config, the seeds, the rules and a prediction for each. The record is published whichever way it lands.',
    claim: 'A seed library is a handful of TINY konomi tags — one per domain, carrying no weights, only a recipe pointer, a seed and a packed ' + GENOME_BYTES + '-byte (' + GENOME_BITS + '-bit) genome. A universal ribosome germinates each locally on the node\'s own data, with no network. Does (a) the WHOLE library weigh under a kilobyte, (b) EVERY seed grow a build that predicts on held-out cases it never grew on, (c) each grown body outweigh its seed, (d) a single domain grow on demand without touching the others, (e) every germination run offline, and (f) a tampered seed be refused germination by the guard?',
    honesty: 'Germination is DETERMINISTIC ASSEMBLY — a decoder plus a seeded evolutionary search over an interpretable scorecard (a sum of single-feature threshold rules). No language model of any size runs inside anything graded here. A small LLM (real, optional) is offered on the live page for IMAGINATION only — proposing a seed from a free-text domain description — and is kept out of every rule. This is a proof on FOUR curated domains, one real and three realistic-synthetic, NOT a full civilizational library; resilience is architectural (local + tiny + distributed + offline), and the degree of survival in a real collapse scales with scenario severity and how well the library is curated.',
    sealed: {
      [DATA]: sha(text(DATA)),
      'seedlib.mjs': sha(text('seedlib.mjs')),
      'sha256.mjs': sha(text('sha256.mjs')),
      'domains.mjs': sha(text('domains.mjs')),
      'tools/run.mjs': sha(text('tools/run.mjs')),
    },
    domains: {
      shopper: 'REAL — UCI Online Shoppers Purchasing Intention (Sakar & Kastro, 2018, DOI 10.24432/C5F88Q, CC BY 4.0), 12,330 sessions; held-out = November + December, grown only on Feb–Oct.',
      triage: 'REALISTIC-SYNTHETIC — field medical triage; critical=1 by a known early-warning rule + seeded Gaussian noise; 30% held out.',
      water: 'REALISTIC-SYNTHETIC — drinking-water potability; potable=1 by a known pH/turbidity/E.coli rule + noise; 30% held out.',
      crop: 'REALISTIC-SYNTHETIC — crop plant-now; plant=1 by a known soil/weather/frost rule + noise; 30% held out.',
    },
    seedFormat: {
      grow: '"◊ seed.v1 <domain> <seed> g:<population>.<elites>.<generations> <mac12>" — grow the scorecard from the node\'s data on arrival. Example: "' + exampleGrow + '" (' + Buffer.byteLength(exampleGrow, 'utf8') + ' bytes).',
      fixed: '"◊ seed.v1 <domain> <seed> f:<hex of ' + GENOME_BYTES + ' packed bytes> <mac12>" — express a shipped genome directly (the learned knowledge, baked tiny). The shipped library uses FIXED seeds: each domain\'s champion genome grown once at seed ' + SEEDS[0] + ', then baked. Example: "' + exampleFixed + '".',
      guard: 'The last field is a 12-hex HMAC-SHA256 over "<domain> <seed> <body>" under a library key — the SENTINEL-style defense: a tampered/forged seed fails the guard and never germinates. (Symmetric HMAC, weaker than SENTINEL\'s Ed25519; stated plainly.)',
      konomi: 'A konomi-family tag. Powered by the Konomi architecture, created by Thomas Frumkin.',
    },
    config: CONFIG, seeds: SEEDS,
    grade: 'Each domain\'s FIXED library seed is expressed on all its training rows and graded ONCE on its held-out rows (AUC, ties half; plus accuracy at a train-fixed operating point). Grow-on-demand germinates one grow-seed in isolation, timed. Stability (disclosed): the median held-out AUC of a grow-seed across all ' + SEEDS.length + ' seeds.',
    rules: [
      { id: 'library-is-tiny', rule: 'the whole library (sum of all ' + DOMAINS.length + ' seed tags, in bytes) is under 1024 bytes' },
      { id: 'each-grows-working-build', rule: 'every domain\'s library seed germinates to a held-out AUC above 0.5 (it predicts on cases it never grew on)' },
      { id: 'seeds-smaller-than-grown', rule: 'every domain\'s grown body is larger than its seed (ratio > 1)' },
      { id: 'grow-on-demand', rule: 'one chosen domain germinates a working build (held-out AUC > 0.5) touching only that domain\'s data' },
      { id: 'germinates-offline', rule: 'every germination runs with fetch, XMLHttpRequest and WebSocket trapped, touching none' },
      { id: 'defense-grows-in', rule: 'every library seed passes the SENTINEL guard, and every tampered copy is refused germination' },
      { id: 'reproducible', rule: 're-running from this seal gives an identical record — CI re-derives it on every push' },
    ],
    predictions: {
      said: 'before any fresh seed was graded, by Kar, from a pilot on seed 11 (disclosed below)',
      'library-is-tiny': 'pass, comfortably — four fixed seeds of ~55 bytes each ≈ ~220 bytes, well under 1 KB',
      'each-grows-working-build': 'pass for all four — the pilot grew held-out AUCs of shopper 0.78, triage 0.89, water 0.66, crop 0.81; fresh seeds should land in similar ranges, water the weakest (its generator is the noisiest) but still above 0.5',
      'seeds-smaller-than-grown': 'pass — the pilot showed grown bodies 4.7–8.9× the seed; all above 1',
      'grow-on-demand': 'pass — a single domain germinates in well under a second, loading only its own data',
      'germinates-offline': 'pass — the kernel makes no network call; the trap is a formality that proves it',
      'defense-grows-in': 'pass — the HMAC guard is deterministic; the pilot showed a tampered seed refused germination',
      reproducible: 'pass — the kernel is deterministic; only wall-clock timing varies and is excluded from the comparison',
    },
    disclosures: [
      'Before the seal the pipeline was run once as a pilot on seed 11 across all four domains, to size the config and sanity-check the claims; those pilot numbers are quoted in the predictions. The sealed grading seeds are ' + JSON.stringify(SEEDS) + ' — fresh, never graded before this seal.',
      'The grow→fit→grade-on-held-out protocol, the seeded RNG, the stratified split and the AUC are the pattern of fall-spore and pattern-organs (sjgant80-hub), vendored in vendor/fall-spore and reused verbatim for a BONUS: fall-spore\'s own engine germinated on the real UCI data, offline, reported in the record (not a graded rule here).',
      'Three of the four domains (triage, water, crop) are realistic-synthetic: generated deterministically from a known ground-truth rule plus seeded noise. They are an honest stand-in for survival-critical domains, not real-world measurements; the one real dataset is shopper.',
      'The SENTINEL-style guard is a shared-secret HMAC baked into the ribosome — it proves integrity and refuses tampering, but anyone holding the key can mint a seed; it is NOT the Ed25519 public-key signatures of sjgant80-hub/sentinel.',
      'A small LLM is offered on the live page for imagination only (proposing a seed from a free-text description); it is run on a local model and is not part of any rule or any graded number.',
    ],
  };
}

const stable = (o) => JSON.stringify(o, null, 1) + '\n';
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/seal.mjs')) {
  if (process.argv.includes('--check')) {
    const same = existsSync(OUT) && text('data/prereg.json') === stable(prereg());
    console.log(same ? 'the pre-registration matches its inputs' : 'data/prereg.json differs from what the committed inputs give');
    process.exitCode = same ? 0 : 1;
  } else if (existsSync(OUT)) { console.error('data/prereg.json exists — it is sealed'); process.exitCode = 1; }
  else { writeFileSync(OUT, stable(prereg())); console.log('sealed data/prereg.json · sha256 ' + sha(stable(prereg()))); }
}
