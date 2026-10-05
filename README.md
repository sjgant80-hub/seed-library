# The Seed Library

### ▶ LIVE: https://sjgant80-hub.github.io/seed-library/

Pick a survival domain, watch its **tiny seed germinate a working build offline**, and see the per-domain
held-out score. The live page runs the same kernel CI gates.

---

**Grow-not-install. Knowledge lives in seeds, not weights.**

Knowledge here is stored as tiny, readable **seeds** — a compressed genome in a konomi tag — not smeared across
billion-parameter weights. A universal **ribosome** grows a working build from each seed on the node's **own data,
offline**. You don't need a 70B model holding everything in weights, because the knowledge lives in the readable,
provable, editable, tiny seed-library. The small model survives only for **imagination** (proposing new patterns,
reading messy input); the **gate** proves, the **seed** stores. Carry the whole library in your pocket; plant a
seed on any device and it grows the build. The mesh is distributed; any node can go offline and the rest continue.

A seed looks like this — no weights, ~50 bytes:

```
◊ seed.v1 triage 21 f:5f3a… 4b9c7e21a0d8
     tag   domain seed  packed genome   SENTINEL guard (HMAC)
```

## What this build proves (sealed, re-derived by CI)

Four curated domains — **one real** (UCI Online Shoppers) and **three realistic-synthetic survival domains**
(field triage, water potability, crop planting) generated from known rules. Seven claims were pre-registered
(predictions + sha256 of every input) in `data/prereg.json` and committed **before** any grading on fresh seeds;
the measurement in `data/run.json` is re-derived by CI on every push (`node tools/run.mjs --verify`).

<!-- RESULTS -->

Run the grade yourself: `node tools/run.mjs --grade`.

## Honesty / scope

- **Germination is deterministic assembly** — a decoder plus a seeded evolutionary search over an interpretable
  scorecard (a sum of single-feature threshold rules). **No language model runs in anything graded.** A small
  local LLM is offered on the page for *imagination* only (proposing a seed from free text) and is kept out of
  every measured number.
- **One domain is real data**; three are **realistic-synthetic**, generated deterministically from a known
  ground-truth rule plus seeded noise — an honest stand-in for survival-critical domains, **not** real-world
  measurements. Train and held-out are disjoint draws, so held-out generalisation is real.
- This is a **proof on a few curated domains, not a full civilizational library.** Resilience is architectural:
  local + tiny + distributed + offline + low-power genuinely survives what kills a data-center. The degree of
  survival in a real collapse scales with scenario severity and how well the library is curated.

## Reproduce / verify

```bash
node --test                 # unit tests (kernels + domains)
node witness-all.mjs        # mutation gate over the decision kernels (CLEAN)
node tools/seal.mjs --check # the pre-registration matches its sealed inputs
node tools/run.mjs --verify # re-derive the record from the seal
node tools/run.mjs --grade  # the seven claims, graded
node tools/make-page.mjs    # rebuild index.html from the real kernel + data + record
```

## Provenance & credits

Powered by the **Konomi architecture**, created by **Thomas Frumkin**. Reuses **fall-spore** and
**pattern-organs** (the grow→fit→grade-on-held-out protocol, the seeded RNG, the stratified split, the AUC, the
offline probe — vendored in `vendor/fall-spore` and reused verbatim on the real UCI data), and **SENTINEL** (the
verify-before-you-parse defense; this library's seed guard is a shared-secret HMAC, weaker than SENTINEL's
Ed25519, and stated as such). Gated by **witness**. Real data: Online Shoppers Purchasing Intention — Sakar &
Kastro, UCI ML Repository (2018), DOI 10.24432/C5F88Q, CC BY 4.0. See `NOTICE`.
