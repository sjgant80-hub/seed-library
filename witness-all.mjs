#!/usr/bin/env node
// witness-all.mjs — the re-runnable mutation gate over the Seed Library's decision kernels. Local and CI run
// the SAME thing: `node witness-all.mjs`. Exit 0 only if every kernel is clean (no unreviewed survivors).
// Vendored witness engine (.witness/witness.mjs) from claudedidy / sjgant80-hub, credited.
//
// Each kernel is paired with the test file that imports it. Not gated here, with the reason:
//   · domains.mjs — a deterministic DATA layer (CSV parse + synthetic generators). Its outputs are frozen by
//     the seal's sha256 and re-derived identically by CI, so a changed byte breaks the seal; domains.test.mjs
//     pins determinism, the real shopper parse and sanity. It mints fixtures, not decisions.
//   · vendor/** — fall-spore and the witness engine, vendored and gated in their own repos.
//   · tools/** — I/O shells (git, disk, argv) around the kernels below, which ARE gated.
// Reviewed-equivalent survivors live in witness.baseline.json, each with its argued reason.
import { runMutations } from './.witness/witness.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PAIRS = [
  ['sha256.mjs', 'sha256.test.mjs'],
  ['seedlib.mjs', 'seedlib.test.mjs'],
];

const only = process.argv.slice(2);
let allClean = true;
const rows = [];
for (const [src, test] of PAIRS) {
  if (only.length && !only.includes(src)) continue;
  const t0 = Date.now();
  const r = runMutations(join(HERE, src), { cwd: HERE, cap: 5000, timeout: 120000, testCmd: ['node', '--test', test] });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  rows.push({ src, killed: r.killed, total: r.total, survived: r.survived.length, ignored: r.ignored.length, capped: r.capped, secs });
  console.log(`${r.clean && !r.capped ? '✓' : '✗'} ${src.padEnd(14)} ${String(r.killed).padStart(4)}/${String(r.total).padEnd(4)} killed` +
    `${r.ignored.length ? ` · ${r.ignored.length} reviewed-equivalent` : ''}${r.capped ? ` · CAPPED at ${r.capped}` : ''} · ${secs}s  (${test})`);
  for (const s of r.survived) console.log(`    SURVIVED line ${s.line}: ${s.mutation} :: ${s.snippet}`);
  if (!r.clean || r.capped) allClean = false;
}
const k = rows.reduce((a, r) => a + r.killed, 0), n = rows.reduce((a, r) => a + r.total, 0);
console.log(`\n${allClean ? 'WITNESS CLEAN' : 'WITNESS NOT CLEAN'} — ${k}/${n} mutants killed across ${rows.length} kernel(s)`);
process.exit(allClean ? 0 : 1);
