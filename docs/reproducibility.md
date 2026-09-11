# Reproducibility

Every command below was actually run on the development machine while building this project; the
"expected output" sections show real (abbreviated) output from those runs, not hypothetical
examples.

## 0. Prerequisites

- macOS on Apple Silicon (developed on macOS 26.6.2 / Darwin 25.6.0, arm64)
- Node.js ≥ 20 (developed on v20.18.0)
- ~2 GB free disk for models, ~1 GB for `node_modules`
- A working C/C++ toolchain for the one native dependency (`better-sqlite3`). If
  `xcode-select -p` points at a broken Xcode.app (a corrupted `libxcodebuildLoader.dylib` error is
  a known, unrelated macOS issue independent of this project), either fix that pointer or run:
  ```bash
  export DEVELOPER_DIR=/Library/Developer/CommandLineTools
  ```
  before `npm install`, assuming that directory exists (`ls /Library/Developer/CommandLineTools`).

## 1. Install

```bash
git clone <this-repo>
cd checkcare
npm install
```

Expected: npm workspace install across `apps/web`, `apps/edge`, `packages/*`, no errors. `better-sqlite3`
compiles a native binary during this step.

## 2. Install the model + knowledge base

```bash
npm run setup-model
```

This runs, in order:

1. `scripts/download-model.sh` — downloads `medpsy-1.7b-q4_k_m-imat.gguf` (1,282,439,360 bytes)
   from `https://huggingface.co/qvac/MedPsy-1.7B-GGUF` into `./models/`, verifies size + SHA256
   (`41ee947d9cce72ec657577219fd1798fabeabf0d832217fe23c9d6d3d18d5880`).
2. `scripts/ingest-knowledge.ts` — chunks `knowledge/sources/*.json`, downloads the
   `EmbeddingGemma-300M` (Q4_0, ~278 MB) embedding model via QVAC's registry on first run, and
   ingests everything into QVAC's local RAG vector store. Expected tail of output:
   ```text
   ▸ Sanity check — searching for "difficulty breathing":
      - [source-001] Shortness of breath — when to get help (NHS (UK National Health Service))
   ▸ Done.
   ```
3. `apps/edge/src/qvac/benchmark.ts` — loads MedPsy and runs 3 real prompts. Expected shape:
   ```text
   ▸ Device: Apple M2 Pro | OS: macOS | Arch: arm64
   ▸ Model loaded in ~1200-14000ms depending on OS file cache state
   ▸ Prompt 1/3
      TTFT: ~60-350ms | gen: ~2500-3000ms | ~90-110 tok/s | backend: gpu
   ```

## 3. Run the tests

```bash
npm test --workspace=apps/edge
```

Expected: 4 test files, 20 tests, all passing, in ~2 seconds — includes a real (unmocked)
integration test against the actual QVAC embedding model and RAG store
(`src/qvac/rag.test.ts`), which is skipped automatically if the model hasn't been installed yet.

## 4. Run the evaluation

**Stop `npm run dev` first if it's running** — QVAC's local store takes an exclusive file lock and
only one process can hold it at a time (see docs/architecture.md § Process boundary note).

```bash
npm run evaluate
```

Expected: 12/12 cases printed with a `✓`/`✗` mark, then:

```text
▸ === Metrics ===
   Safety Recall:              100.0% (10/10 red-flag cases correctly escalated)
   False Reassurance Rate:      0.0% (0/10)
   Appropriate Escalation Rate: 100.0% (12/12 exact risk-level matches)
   Unsupported Claim Rate:      0.0% (0/11 model responses)
```

A report is written to `evaluation/reports/evaluation-<timestamp>.json`. The script exits non-zero
if the False Reassurance Rate is above 0% — this is intentional: that metric failing should block
a demo.

## 5. Run the app

```bash
npm run dev
```

Starts `apps/edge` on `http://127.0.0.1:4111` and `apps/web` on `http://localhost:3000`. Open the
latter in a browser.

## 6. Run the E2E test

With `npm run dev` running in another terminal:

```bash
cd apps/web
npx playwright install chromium   # first time only
npx playwright test
```

Expected: `1 passed` — drives the real browser through landing → disclaimer → symptom selection
→ adaptive questions → real MedPsy inference → EMERGENCY result screen with sources.

## 7. Verify offline operation

1. With the model and knowledge base already installed (step 2) and `npm run dev` running, turn
   off Wi-Fi / unplug ethernet.
2. Complete a new assessment in the browser. It should complete normally; the header's "IA local"
   indicator should remain green throughout (it polls `apps/edge`'s own `/health`, which makes no
   outbound network call).

## Known environment caveat encountered during development

On the development machine, the system `git` and `clang` (from `/Applications/Xcode.app`) were
broken by a corrupted `libxcodebuildLoader.dylib`, unrelated to this project — a working Command
Line Tools install existed separately at `/Library/Developer/CommandLineTools`. Fixed for this
project by exporting `DEVELOPER_DIR=/Library/Developer/CommandLineTools` and installing `git` via
Homebrew (`brew install git`) rather than modifying the system's `xcode-select` pointer (which
requires `sudo`). If you hit the same symptom (`xcodebuild ... Symbol not found: _XPCTypeBool`),
this is the fix.
