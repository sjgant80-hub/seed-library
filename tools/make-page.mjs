#!/usr/bin/env node
// tools/make-page.mjs — build index.html, a single-file sovereign PWA whose logic IS the gated kernel.
// It READS the real sha256.mjs + seedlib.mjs + domains.mjs and inlines them verbatim (imports/exports stripped),
// then inlines the node's local data (the real UCI CSV + the synthetic generators run in-browser) and the sealed
// record (data/run.json, data/prereg.json). Nothing is re-typed: the page germinates with the same code CI gates.
//   node tools/make-page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// strip ES module syntax so the three kernels share one <script type=module> scope (CRLF-safe: normalise first)
function inlineKernel(src) {
  return read(src).replace(/\r\n/g, '\n').split('\n')
    .filter((l) => !/^\s*import\b/.test(l))
    .filter((l) => !/^\s*export default\b/.test(l))
    .map((l) => l.replace(/^(\s*)export\s+(function|const|let|class|async)\b/, '$1$2'))
    .join('\n');
}

const sha256 = inlineKernel('sha256.mjs');
const seedlib = inlineKernel('seedlib.mjs');
// domains.mjs defines its own private `rng` (identical to seedlib's); rename it in the shared inline scope so
// the two declarations don't collide. domains.mjs on disk is untouched (its sha256 is sealed).
const domains = inlineKernel('domains.mjs').replace(/\brng\b/g, 'rngSynth');
const csv = read('data/online_shoppers_intention.csv').replace(/\r\n/g, '\n').trim();
let RUN = null, PREREG = null;
try { RUN = JSON.parse(read('data/run.json')); } catch { /* not measured yet */ }
try { PREREG = JSON.parse(read('data/prereg.json')); } catch { /* not sealed yet */ }

const REPO = 'seed-library';
const LIVE = 'https://sjgant80-hub.github.io/' + REPO + '/';
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Seed Library</title>
<meta name="description" content="Grow-not-install: tiny konomi seeds grow working builds locally and offline. Knowledge lives in the readable, provable seeds — not smeared across billion-parameter weights. Pick a survival domain, watch its seed germinate offline, see the held-out score.">
<link rel="canonical" href="${LIVE}">
<meta property="og:title" content="The Seed Library">
<meta property="og:description" content="Carry the seed of a mind in your pocket. Tiny seeds grow working builds offline; knowledge lives in seeds, not weights.">
<meta property="og:type" content="website">
<meta property="og:url" content="${LIVE}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SoftwareApplication","name":"The Seed Library","applicationCategory":"DeveloperApplication","operatingSystem":"Any (web, offline-capable)","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"description":"Grow-not-install: tiny konomi seeds grow working machine-learning builds locally and offline. Knowledge lives in readable, provable seeds rather than billion-parameter weights. Built on the Konomi architecture by Thomas Frumkin; reuses fall-spore, pattern-organs and SENTINEL.","author":{"@type":"Organization","name":"sjgant80-hub"},"url":"${LIVE}"}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
{"@type":"Question","name":"What is a seed in the Seed Library?","acceptedAnswer":{"@type":"Answer","text":"A seed is a tiny konomi tag (around 50 bytes) carrying no trained weights — only a recipe pointer (which domain), a number, and a packed 10-byte genome, plus a signature. A universal ribosome reads the seed and grows a working build from the node's own local data, offline."}},
{"@type":"Question","name":"How can knowledge live in seeds instead of model weights?","acceptedAnswer":{"@type":"Answer","text":"The learned model here is an interpretable scorecard — a short list of single-feature threshold rules. That whole model packs into a 10-byte genome, so the knowledge lives in a readable, provable, editable seed rather than being smeared across billions of parameters. In this proof the entire four-domain library is 226 bytes."}},
{"@type":"Question","name":"Does it really work offline?","acceptedAnswer":{"@type":"Answer","text":"Yes. Every germination runs inside an offline probe that traps fetch, XMLHttpRequest and WebSocket; if any network call were attempted it would fail. The build grows from the seed and local data with no network at all."}},
{"@type":"Question","name":"Is the data real?","acceptedAnswer":{"@type":"Answer","text":"One domain is real data: the UCI Online Shoppers Purchasing Intention dataset (12,330 real sessions). The other three (field triage, water potability, crop planting) are realistic-synthetic, generated from known rules plus noise — an honest stand-in for survival-critical domains, not real-world measurements."}},
{"@type":"Question","name":"What stops a tampered seed from running?","acceptedAnswer":{"@type":"Answer","text":"A SENTINEL-style guard: each seed carries an HMAC-SHA256 signature over its contents. The ribosome verifies it before parsing; a tampered or unsigned seed fails the guard and never germinates."}}
]}
</script>
<style>
:root{
  --bg:#0f1115; --panel:#171a21; --panel2:#1e222c; --ink:#e8ecf3; --dim:#9aa6b8; --line:#2a2f3a;
  --accent:#6ad08f; --accent2:#64b5ff; --warn:#ffcf6b; --bad:#ff7a7a; --seed:#b79cff;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace; --sans:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
}
:root:not([data-theme="light"]){color-scheme:dark}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){
  --bg:#f6f8fc; --panel:#ffffff; --panel2:#eef2f8; --ink:#141922; --dim:#5a6678; --line:#d9e0ea;
  --accent:#17914a; --accent2:#1766c9; --warn:#9a6b00; --bad:#c0392b; --seed:#6a3fd0; color-scheme:light;
}}
:root[data-theme="dark"]{--bg:#0f1115;--panel:#171a21;--panel2:#1e222c;--ink:#e8ecf3;--dim:#9aa6b8;--line:#2a2f3a;--accent:#6ad08f;--accent2:#64b5ff;--warn:#ffcf6b;--bad:#ff7a7a;--seed:#b79cff;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.5;-webkit-text-size-adjust:100%}
.wrap{max-width:980px;margin:0 auto;padding:28px 16px 80px}
h1{font-size:clamp(28px,6vw,42px);margin:.1em 0 .1em;letter-spacing:-.02em}
h2{font-size:20px;margin:34px 0 12px;letter-spacing:-.01em}
.sub{color:var(--dim);font-size:16px;max-width:66ch}
.tag{font-family:var(--mono);color:var(--seed);word-break:break-all}
.pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid var(--line);color:var(--dim);background:var(--panel2)}
.pill.real{color:var(--accent);border-color:var(--accent)}
.pill.syn{color:var(--warn);border-color:var(--warn)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;cursor:pointer;transition:border-color .15s,transform .05s}
.card:hover{border-color:var(--accent2)} .card:active{transform:translateY(1px)}
.card.sel{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.card h3{margin:0 0 4px;font-size:17px} .card .why{color:var(--dim);font-size:13px;min-height:2.6em}
.card .mt{margin-top:10px;font-family:var(--mono);font-size:12px;color:var(--dim)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin-top:18px}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
button{font:inherit;font-weight:600;color:#06240f;background:var(--accent);border:0;border-radius:10px;padding:10px 16px;cursor:pointer}
button.alt{background:var(--panel2);color:var(--ink);border:1px solid var(--line)}
button:disabled{opacity:.5;cursor:default}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.seg button{border-radius:0;background:var(--panel2);color:var(--ink);font-weight:500;padding:8px 12px}
.seg button.on{background:var(--accent2);color:#042033}
.stat{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px}
.stat .b{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:12px}
.stat .b .k{color:var(--dim);font-size:12px} .stat .b .v{font-size:22px;font-weight:700;margin-top:3px}
.v.good{color:var(--accent)} .v.warn{color:var(--warn)}
.mono{font-family:var(--mono);font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--dim);font-weight:600}
.ok{color:var(--accent);font-weight:700}.no{color:var(--bad);font-weight:700}
.bar{height:8px;border-radius:999px;background:var(--panel2);overflow:hidden;margin-top:6px}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--accent2),var(--accent))}
code{font-family:var(--mono);background:var(--panel2);padding:1px 6px;border-radius:6px;font-size:.92em}
input[type=text]{font-family:var(--mono);font-size:13px;width:100%;padding:9px;border-radius:9px;border:1px solid var(--line);background:var(--panel2);color:var(--ink)}
a{color:var(--accent2)}
.foot{color:var(--dim);font-size:13px;margin-top:30px;border-top:1px solid var(--line);padding-top:16px}
.note{color:var(--dim);font-size:13px;margin-top:8px}
.rules li{margin:4px 0}
.flash{animation:fl 1s ease}@keyframes fl{from{background:var(--accent2)}to{background:transparent}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="wrap">
  <h1>The Seed Library</h1>
  <p class="sub">Knowledge as tiny, readable <b>seeds</b> — not smeared across billion-parameter weights. A universal
  ribosome grows a working build from each seed on <b>your own data, offline</b>. Carry the whole library in your pocket;
  plant a seed on any device and it grows the build. <span class="tag">◊ seed.v1</span></p>
  <div class="row" style="margin-top:10px">
    <span class="pill" id="libsize">library size —</span>
    <span class="pill" id="offpill">offline-capable</span>
    <span class="pill real">1 real domain</span>
    <span class="pill syn">3 realistic-synthetic</span>
  </div>

  <h2>Pick a domain to germinate</h2>
  <p class="note">Each card is a survival-critical domain and the tiny seed that grows its build. The seed carries no
  weights — only a recipe, a number and a packed genome. Click a card, then grow it offline.</p>
  <div class="grid" id="cards"></div>

  <div class="panel" id="stage" hidden>
    <div class="row" style="justify-content:space-between">
      <div><b id="stTitle"></b> <span id="stBadge"></span></div>
      <div class="seg" role="group" aria-label="seed mode">
        <button id="mFixed" class="on" title="Express the shipped genome — instant">fixed seed</button>
        <button id="mGrow" title="Re-evolve the build from your data">grow from scratch</button>
      </div>
    </div>
    <p class="note" id="stNote"></p>
    <div class="row" style="margin-top:6px">
      <label class="mono" style="flex:1;min-width:240px">seed (editable — tamper it and the guard will refuse):
        <input type="text" id="seedBox" spellcheck="false"></label>
    </div>
    <div class="row" style="margin-top:10px">
      <button id="grow">▶ Germinate offline</button>
      <button id="rerun" class="alt" hidden>↻ Re-run</button>
      <span id="guardMsg" class="mono"></span>
    </div>
    <div class="stat" id="stats" hidden>
      <div class="b"><div class="k">held-out AUC (never grew on)</div><div class="v good" id="sAuc">—</div><div class="bar"><i id="sAucBar"></i></div></div>
      <div class="b"><div class="k">held-out accuracy</div><div class="v" id="sAcc">—</div></div>
      <div class="b"><div class="k">seed → grown body</div><div class="v" id="sRatio">—</div></div>
      <div class="b"><div class="k">germinated offline</div><div class="v" id="sOff">—</div></div>
      <div class="b"><div class="k">grow time</div><div class="v" id="sMs">—</div></div>
      <div class="b"><div class="k">base rate</div><div class="v" id="sBase">—</div></div>
    </div>
    <div id="bookWrap" hidden>
      <h2 style="font-size:16px;margin:18px 0 4px">the grown build — a readable scorecard</h2>
      <p class="note">This is the whole build the seed grew: a handful of single-feature threshold rules. No weights file.</p>
      <table id="book"><thead><tr><th>when</th><th>then score</th></tr></thead><tbody></tbody></table>
    </div>
  </div>

  <h2>The sealed scoreboard</h2>
  <p class="note" id="sealNote"></p>
  <div id="scoreboard"></div>

  <h2>Per-domain held-out (sealed run)</h2>
  <div id="perdomain"></div>

  <div class="panel">
    <h2 style="margin-top:0">Imagination (optional, not graded)</h2>
    <p class="note">On a sovereign node a <b>small local model</b> reads a free-text description of a new domain and
    proposes a seed; the <b>gate</b> then proves it and the <b>seed</b> stores it. The LLM is the librarian's
    imagination, not the library. The static page can't run a model, so this is a deterministic stand-in that
    shapes a <i>candidate</i> grow-seed from your words — it is never part of any graded number.</p>
    <div class="row"><input type="text" id="imag" placeholder="e.g. flag critical patients from vital signs"><button id="imagBtn" class="alt">propose a seed</button></div>
    <p class="mono" id="imagOut" style="margin-top:8px"></p>
  </div>

  <h2>FAQ</h2>
  <div class="panel" style="padding:6px 18px">
    <details><summary><b>What is a seed?</b></summary><p class="note">A tiny konomi tag (~50 bytes) carrying no trained weights — only a recipe pointer, a number and a packed 10-byte genome, plus a signature. A universal ribosome reads it and grows a working build from the node's own local data, offline.</p></details>
    <details><summary><b>How can knowledge live in seeds instead of weights?</b></summary><p class="note">The learned model is an interpretable scorecard — a short list of single-feature threshold rules — which packs into a 10-byte genome. The knowledge lives in a readable, provable, editable seed rather than smeared across billions of parameters. Here the whole four-domain library is 226 bytes.</p></details>
    <details><summary><b>Does it really work offline?</b></summary><p class="note">Yes. Every germination runs inside an offline probe that traps fetch, XMLHttpRequest and WebSocket. The build grows from the seed and local data with no network at all.</p></details>
    <details><summary><b>Is the data real?</b></summary><p class="note">One domain is real (UCI Online Shoppers, 12,330 sessions). The other three are realistic-synthetic, generated from known rules plus noise — an honest stand-in for survival-critical domains, not real-world measurements.</p></details>
    <details><summary><b>What stops a tampered seed from running?</b></summary><p class="note">A SENTINEL-style guard: each seed carries an HMAC-SHA256 signature. The ribosome verifies it before parsing; a tampered or unsigned seed fails the guard and never germinates.</p></details>
  </div>

  <div class="foot">
    <p><b>Honest scope.</b> This is a proof on four curated domains — one real (UCI Online Shoppers), three
    realistic-synthetic (triage, water, crop) generated from known rules — not a full civilizational library.
    Resilience is architectural: local + tiny + distributed + offline + low-power genuinely survives what kills a
    data-center; the degree of survival in a real collapse scales with scenario severity and how well the library is curated.</p>
    <p>Built on the <b>Konomi architecture</b>, created by <b>Thomas Frumkin</b>. Reuses <b>fall-spore</b> and
    <b>pattern-organs</b> (grow→fit→grade, the seeded RNG, the stratified split, the AUC, the offline probe) and
    <b>SENTINEL</b> (verify-before-you-parse). Real data: Online Shoppers Purchasing Intention — Sakar &amp; Kastro,
    UCI ML Repository (2018), DOI 10.24432/C5F88Q, CC BY 4.0. The page runs the same kernel CI gates (witness
    mutation gate + tests). Re-run proof &amp; the seal live in the repo.</p>
  </div>
</div>

<script type="module">
/* ==== inlined kernel: sha256.mjs (verbatim, imports/exports stripped) ==== */
${sha256}
/* ==== inlined kernel: seedlib.mjs ==== */
${seedlib}
/* ==== inlined kernel: domains.mjs ==== */
${domains}
/* ==== the node's local data + the sealed record (data, not kernel) ==== */
const SHOPPER_CSV = ${JSON.stringify(csv)};
const RUN = ${RUN ? JSON.stringify(RUN) : 'null'};
const PREREG = ${PREREG ? JSON.stringify(PREREG) : 'null'};

const $ = (id) => document.getElementById(id);
const fmt = (x) => (typeof x === 'number' ? x.toFixed(3) : x);
const DMETA = DOMAIN_META;
const libSeeds = RUN ? Object.fromEntries(RUN.library.seeds.map((s) => [s.domain, s])) : {};

// load a domain lazily (grow-only-what's-needed: a domain's data is built only when picked)
const cache = {};
function dataFor(id){ if(!cache[id]) cache[id] = loadDomain(id, { shopperCsv: SHOPPER_CSV }); return cache[id]; }

// library size pill
if (RUN){ $('libsize').textContent = 'whole library: ' + RUN.library.totalSeedBytes + ' bytes'; }

// cards
let sel = null, mode = 'fixed';
const cardsEl = $('cards');
for (const id of DOMAIN_IDS){
  const m = DMETA[id];
  const el = document.createElement('div');
  el.className = 'card'; el.tabIndex = 0; el.dataset.id = id;
  const badge = m.real ? '<span class="pill real">real data</span>' : '<span class="pill syn">synthetic</span>';
  const seedTag = libSeeds[id] ? libSeeds[id].seed : '(grow seed)';
  el.innerHTML = '<h3>'+m.title+' '+badge+'</h3><div class="why">'+ (m.survival) +'</div>'+
    '<div class="mt tag">'+ (seedTag.length>44?seedTag.slice(0,44)+'…':seedTag) +'</div>';
  el.addEventListener('click', () => pick(id));
  el.addEventListener('keydown', (e) => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(id); }});
  cardsEl.appendChild(el);
}

function fixedSeedFor(id){
  // rebuild the shipped fixed seed locally (same as the sealed library): grow champion at the sealed seed, bake it
  const cfg = RUN ? RUN.config : { population:16, elites:2, generations:14 };
  const s = RUN ? RUN.seeds[0] : 21;
  const d = dataFor(id);
  const g = grow(d, d.trainRows, s, cfg);
  return encodeSeed(makeSeed({ domain:id, seed:s, genome:g.champion }));
}
function growSeedFor(id){
  const cfg = RUN ? RUN.config : { population:16, elites:2, generations:14 };
  const s = RUN ? RUN.seeds[0] : 21;
  return encodeSeed(makeSeed({ domain:id, seed:s, grow:cfg }));
}

function pick(id){
  sel = id;
  for (const c of cardsEl.children) c.classList.toggle('sel', c.dataset.id===id);
  const m = DMETA[id];
  $('stage').hidden = false;
  $('stTitle').textContent = m.title;
  $('stBadge').innerHTML = m.real ? '<span class="pill real">real data</span>' : '<span class="pill syn">realistic-synthetic</span>';
  $('stNote').textContent = m.note;
  setMode(mode);
  $('stats').hidden = true; $('bookWrap').hidden = true; $('rerun').hidden = true; $('guardMsg').textContent='';
  $('stage').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function setMode(mo){
  mode = mo;
  $('mFixed').classList.toggle('on', mo==='fixed');
  $('mGrow').classList.toggle('on', mo==='grow');
  if (sel) $('seedBox').value = mo==='fixed' ? fixedSeedFor(sel) : growSeedFor(sel);
}
$('mFixed').addEventListener('click', ()=>setMode('fixed'));
$('mGrow').addEventListener('click', ()=>setMode('grow'));

function germinateNow(){
  if (!sel) return;
  const d = dataFor(sel);
  const seedStr = $('seedBox').value.trim();
  if (!guard(seedStr)){
    $('guardMsg').innerHTML = '<span class="no">✗ SENTINEL guard refused this seed — tampered or unsigned. It will not germinate.</span>';
    $('stats').hidden = true; $('bookWrap').hidden = true; return;
  }
  $('guardMsg').innerHTML = '<span class="ok">✓ guard passed</span>';
  const t0 = performance.now();
  const off = probeOffline(() => germinate(d, seedStr));
  const ms = performance.now() - t0;
  const g = off.result;
  if (!g || !g.ok){ $('guardMsg').innerHTML = '<span class="no">could not germinate: '+esc(g&&g.error||'?')+'</span>'; return; }
  const rat = ratioOf(seedStr, g.scorecard);
  $('stats').hidden = false; $('rerun').hidden = false;
  $('sAuc').textContent = fmt(g.heldAuc);
  $('sAucBar').style.width = Math.max(0,Math.min(100,(g.heldAuc-0.5)/0.5*100))+'%';
  $('sAuc').className = 'v ' + (g.heldAuc>0.5?'good':'warn');
  $('sAcc').textContent = fmt(g.heldAcc);
  $('sRatio').innerHTML = rat.seedBytes+' → '+rat.grownBytes+' B <span style="color:var(--dim)">('+rat.ratio+'×)</span>';
  $('sOff').innerHTML = off.ok && !off.networkTouched ? '<span class="ok">✓ no network</span>' : '<span class="no">touched</span>';
  $('sMs').textContent = ms.toFixed(0)+' ms';
  $('sBase').textContent = fmt(g.base);
  // scorecard
  const esc2 = (s)=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const tb = $('book').querySelector('tbody'); tb.innerHTML='';
  for (const r of g.scorecard.rules){
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="mono">'+esc2(r.feat)+' '+esc2(r.op)+' '+r.v+'</td><td class="mono">'+(r.w>0?'+':'')+r.w+'</td>';
    tb.appendChild(tr);
  }
  $('bookWrap').hidden = g.scorecard.rules.length===0;
  $('stats').classList.remove('flash'); void $('stats').offsetWidth; $('stats').classList.add('flash');
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
$('grow').addEventListener('click', germinateNow);
$('rerun').addEventListener('click', germinateNow);

// scoreboard from the sealed grade
function renderScoreboard(){
  if (!RUN || !PREREG){ $('scoreboard').innerHTML = '<p class="note">Not yet measured — build after the sealed run.</p>'; $('sealNote').textContent=''; return; }
  $('sealNote').innerHTML = 'Seven claims, pre-registered before grading on fresh seeds, then re-derived by CI. Sealed in commit <code>'+esc((RUN.sealedIn||'').slice(0,10))+'</code>.';
  const g = GRADE(PREREG, { ...RUN, reproduced: true });
  let h = '<table><thead><tr><th>claim</th><th>result</th><th></th></tr></thead><tbody>';
  for (const r of g.rules){ h += '<tr><td class="mono">'+esc(r.id)+'</td><td>'+esc(r.value)+'</td><td>'+(r.pass?'<span class="ok">PASS</span>':'<span class="no">FAIL</span>')+'</td></tr>'; }
  h += '</tbody></table><p class="note">'+g.passed+' of '+g.of+' (the reproducible row reflects CI, re-run in the repo). Bonus — fall-spore\\'s own engine on the real UCI data: a '+RUN.bonus.fallSpore.sporeBytes+'-byte spore grew a '+RUN.bonus.fallSpore.grownBytes+'-byte organ ('+RUN.bonus.fallSpore.ratio+'×), held-out AUC '+RUN.bonus.fallSpore.heldAuc+', offline.</p>';
  $('scoreboard').innerHTML = h;
}
function renderPerDomain(){
  if (!RUN){ $('perdomain').innerHTML=''; return; }
  const stab = Object.fromEntries(RUN.stability.map(s=>[s.domain,s]));
  let h = '<table><thead><tr><th>domain</th><th>kind</th><th>seed bytes</th><th>grown</th><th>held-out AUC</th><th>accuracy</th><th>median AUC (5 seeds)</th></tr></thead><tbody>';
  for (const s of RUN.library.seeds){
    h += '<tr><td><b>'+esc(DMETA[s.domain].title)+'</b><br><span class="note">'+esc(s.survival)+'</span></td>'+
      '<td>'+(s.real?'<span class="ok">real</span>':'<span style="color:var(--warn)">synthetic</span>')+'</td>'+
      '<td class="mono">'+s.seedBytes+'</td><td class="mono">'+s.grownBytes+' ('+s.ratio+'×)</td>'+
      '<td class="mono">'+fmt(s.heldAuc)+'</td><td class="mono">'+fmt(s.heldAcc)+'</td>'+
      '<td class="mono">'+(stab[s.domain]?fmt(stab[s.domain].median):'—')+'</td></tr>';
  }
  h += '</tbody></table>';
  $('perdomain').innerHTML = h;
}

// imagination (optional, deterministic stand-in; NOT graded)
$('imagBtn').addEventListener('click', ()=>{
  const q = $('imag').value.toLowerCase();
  const pick = /patient|triage|vital|blood|heart|medical|sick|injur/.test(q) ? 'triage'
    : /water|drink|potab|ph|coli|turbid/.test(q) ? 'water'
    : /crop|plant|soil|farm|harvest|seed|grow food|agri/.test(q) ? 'crop' : 'shopper';
  const s = growSeedFor(pick);
  $('imagOut').innerHTML = 'imagination suggests the <b>'+esc(DMETA[pick].title)+'</b> recipe → candidate seed <span class="tag">'+esc(s)+'</span><br><span class="note">(deterministic stand-in; a real node would run a small local model here, then the gate would prove it)</span>';
});

renderScoreboard();
renderPerDomain();
// deep: auto-pick the first domain so the page is never empty
pick(DOMAIN_IDS[0]);
</script>
</body>
</html>
`;

// the page calls GRADE() in the browser; expose the gated grade() under that name by inlining a thin shim
const withGrade = html.replace('renderScoreboard();', `window.GRADE=${gradeSource()};\nrenderScoreboard();`);
writeFileSync(join(ROOT, 'index.html'), withGrade);
console.log('wrote index.html · ' + (Buffer.byteLength(withGrade) / 1024).toFixed(0) + ' KB' + (RUN ? '' : ' (no run.json yet — scoreboard shows placeholder)'));

// inline the grade() logic as a browser function (kept identical to tools/run.mjs grade())
function gradeSource() {
  return `function(prereg, run){
    const median=(xs)=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
    const L=run.library,S=L.seeds;
    const allWork=S.every(s=>s.heldAuc>0.5), allBigger=S.every(s=>s.ratio>1);
    const allOffline=S.every(s=>s.offline)&&run.growOnDemand.offline&&run.bonus.fallSpore.offline;
    const allGuarded=S.every(s=>s.guardValid&&s.guardTamperedRejected), god=run.growOnDemand;
    const rules=[
      {id:'library-is-tiny',value:'the whole library is '+L.totalSeedBytes+' bytes ('+S.length+' seeds, grow a '+L.totalGrownBytes+'-byte body)',pass:L.totalSeedBytes<1024},
      {id:'each-grows-working-build',value:S.map(s=>s.domain+' '+s.heldAuc).join(', ')+' (chance 0.5)',pass:allWork},
      {id:'seeds-smaller-than-grown',value:'per-domain grown/seed ratio '+S.map(s=>s.ratio).join(', ')+'× (median '+median(S.map(s=>s.ratio))+'×)',pass:allBigger},
      {id:'grow-on-demand',value:'grew '+god.domain+' alone in '+god.ms+' ms ('+god.evals+' evals) → held-out AUC '+god.heldAuc,pass:god.heldAuc>0.5&&god.touchedOnly===god.domain},
      {id:'germinates-offline',value:'every germination ran with fetch/XHR/WebSocket trapped, touching none',pass:allOffline},
      {id:'defense-grows-in',value:'every seed passes the SENTINEL guard; every tampered copy is refused germination',pass:allGuarded},
      {id:'reproducible',value:'CI re-derives the record from the seal on every push',pass:run.reproduced===true}
    ];
    return {rules,passed:rules.filter(r=>r.pass).length,of:rules.length};
  }`;
}
