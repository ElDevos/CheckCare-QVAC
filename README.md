# CheckCare

Local-first symptom orientation and early-awareness assistant. CheckCare helps a person register
symptoms, answer a short adaptive questionnaire, and understand whether the described symptoms
include warning signs that justify seeking professional or emergency care — using a specialized
medical language model that runs **entirely on-device**, with no medical data ever sent to a
server.

> **CheckCare is not a diagnostic tool.** It never states or implies a diagnosis, never prescribes
> medication, and never tells a user they are "fine" or "healthy." See [docs/safety.md](docs/safety.md).

## Overview

| | |
|---|---|
| **Model** | [MedPsy-1.7B](https://huggingface.co/qvac/MedPsy-1.7B) (Qwen3-1.7B fine-tune, Tether AI Research) |
| **Quantization** | Q4_K_M GGUF (imatrix), ~1.28 GB |
| **Runtime** | [`@qvac/sdk`](https://www.npmjs.com/package/@qvac/sdk) `0.19.0` → `llamacpp-completion` (`qvac-fabric-llm.cpp`) |
| **Execution** | 100% local — no cloud AI in the primary flow |
| **RAG** | QVAC's built-in vector store + `EmbeddingGemma-300M` (Q4_0), grounded in an NHS-sourced knowledge base |
| **Storage** | SQLite, local-only |
| **Frontend** | Next.js (App Router) + React, Spanish-first UI |
| **Backend** | Node.js + TypeScript (Express) |

## Problem

Many people ignore symptoms like fever, cough, pain, vomiting, diarrhea, fatigue, breathing
difficulty, or headache because they assume they're minor — sometimes delaying care when a real
warning sign was present. CheckCare provides a first layer of awareness and orientation, not a
replacement for a clinician.

## Solution

CheckCare combines three things that must all agree before a result reaches the user:

1. A **deterministic Safety Engine** (no LLM) that evaluates fixed, source-cited red-flag rules.
2. **MedPsy**, a specialized local LLM, for plain-language explanation grounded in retrieved
   NHS-sourced context (RAG).
3. A **Response Validator** that rejects any MedPsy output containing a diagnosis claim, a
   prescription, false certainty, or a contradiction of the Safety Engine's risk level.

The Safety Engine's risk level is the floor for the entire system — MedPsy's output type has no
`riskLevel` field, so it is structurally impossible for the model to lower it (see
[docs/safety.md § Risk precedence](docs/safety.md#risk-precedence)).

## Architecture

```text
                    ┌─────────────────────┐
                    │     CheckCare Web    │  Next.js / React, Spanish-first UI
                    │   (apps/web)         │
                    └──────────┬───────────┘
                               │ localhost HTTP (CORS-restricted to this app)
                               ▼
                    ┌─────────────────────┐
                    │ CheckCare Edge       │  Node.js + TypeScript (Express)
                    │ Runtime (apps/edge)  │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      Safety Engine       QVAC SDK          SQLite (local)
    (deterministic,     ┌───┴────┐
     no LLM,             │        │
     source-cited)    MedPsy   RAG (embed +
                     (llamacpp- vector search)
                      completion)
             │                 │
             └────────┬────────┘
                       ▼
              Response Validator
                       │
                       ▼
              Structured AssessmentResult
                       │
                       ▼
                     Web UI
```

See [docs/architecture.md](docs/architecture.md) for the full breakdown.

## Why Edge AI?

| | |
|---|---|
| **Privacy** | No medical data needs to leave the device |
| **Availability** | Works with no internet connection after setup |
| **Latency** | No round trip to a cloud AI provider — real-measured TTFT under 100ms on this hardware |
| **Cost** | No inference API cost |
| **Proof point** | A specialized 1.7B model, quantized to ~1.28GB, is genuinely useful for structured medical orientation on consumer Apple Silicon |

## Why MedPsy?

MedPsy-1.7B is a Qwen3-1.7B fine-tune from Tether AI Research specifically trained for medical and
healthcare orientation, published with GGUF weights and a documented benchmark
([model card](https://huggingface.co/qvac/MedPsy-1.7B-GGUF)) showing the Q4_K_M quantization loses
only ~1.1% relative score vs. the BF16 baseline on HealthBench/closed-ended medical benchmarks —
the right trade-off for on-device deployment.

## Why QVAC?

[QVAC](https://qvac.tether.io) (Tether) is a real, actively published local-AI SDK
(`@qvac/sdk`) built on a forked `llama.cpp`/`ggml` runtime ("Bare fabric"), with first-class
support for local model loading from disk, local embeddings, and a built-in local RAG vector
store — everything CheckCare's primary flow needs, with zero cloud dependency. All primary
inference and embeddings in this repo go through `@qvac/sdk`; no other AI provider is used in the
main flow.

## Hardware

Developed and measured on:

- **Device:** MacBook Pro, Apple M2 Pro
- **RAM:** 16 GB
- **OS:** macOS 26.6.2 (Darwin 25.6.0)
- **Architecture:** arm64
- **Node:** v20.18.0
- **QVAC SDK:** `@qvac/sdk@0.19.0`

See [docs/model-card.md](docs/model-card.md) and [docs/reproducibility.md](docs/reproducibility.md)
for full, measured numbers (not estimates).

## Installation

```bash
git clone <this-repo>
cd checkcare
npm install
```

> **Note on this machine's toolchain:** if `git`, `clang`, or native npm builds (e.g.
> `better-sqlite3`) fail with an Xcode/`xcodebuild` dylib error, your Xcode Command Line Tools
> install is corrupted independently of this project. Either run
> `sudo xcode-select -s /Library/Developer/CommandLineTools` (if that directory exists — check with
> `ls /Library/Developer/CommandLineTools`) or export `DEVELOPER_DIR=/Library/Developer/CommandLineTools`
> before installing. This repo does not modify your system Xcode configuration for you.

## Model Installation

```bash
npm run setup-model
```

This downloads `medpsy-1.7b-q4_k_m-imat.gguf` (~1.28 GB) from Hugging Face into `./models/`
(git-ignored — never committed), downloads the `EmbeddingGemma-300M` embedding model via QVAC's
registry, ingests the knowledge base into the local RAG store, and runs a real benchmark to
confirm everything works before you start the app. See
[docs/reproducibility.md](docs/reproducibility.md) for a manual step-by-step version.

## Running the Application

```bash
npm run dev
```

This starts the Edge Runtime (`http://127.0.0.1:4111`) and the web app
(`http://localhost:3000`). Open `http://localhost:3000`.

## Offline Mode

1. Run `npm run setup-model` once (requires internet, to download the model + knowledge base).
2. Start the app with `npm run dev`.
3. Turn off Wi-Fi / disconnect from the internet.
4. Complete a symptom evaluation — it still works. Every screen shows an "IA local" badge with a
   green dot confirming the Edge Runtime is reachable; the Edge Runtime itself makes zero outbound
   network calls once the model and knowledge base are installed.

## Privacy

Symptoms, free-text notes, prompts sent to MedPsy, MedPsy's responses, assessments, and history
are stored **only** in a local SQLite database (`data/checkcare.db`, git-ignored) and are never
sent to any external server. The web app talks only to `127.0.0.1`/`localhost` — see
[docs/privacy.md](docs/privacy.md).

## RAG

`scripts/ingest-knowledge.ts` chunks `knowledge/sources/*.json` (NHS-sourced clinical guidance)
and ingests it into QVAC's local RAG vector store (`ragIngest`/`ragSearch`, embedding model
`EmbeddingGemma-300M` Q4_0). Every citation shown to the user resolves to a real entry in
`knowledge/manifest.json` — the Response Validator will not surface a source that isn't in that
manifest. Run independently with `npm run ingest-knowledge`.

## Safety Architecture

`packages/safety-rules` holds a versioned, source-cited (NHS.uk) rule set. `apps/edge/src/safety/safety-engine.ts`
evaluates it deterministically — no LLM involved — and its output is the non-negotiable floor for
the final risk level. See [docs/safety.md](docs/safety.md) for the full rule list, sources, and
the Response Validator's rejection criteria.

## Evaluation

```bash
npm run evaluate
```

Runs all 12 cases in `evaluation/cases/*.json` through the **real** pipeline (Safety Engine → RAG
→ MedPsy → Validator) and reports Safety Recall, False Reassurance Rate, Appropriate Escalation
Rate, and Unsupported Claim Rate to `evaluation/reports/`. Last measured run on this machine:

| Metric | Result |
|---|---|
| Safety Recall | 100.0% (10/10 red-flag cases correctly escalated) |
| False Reassurance Rate | 0.0% (0/10) |
| Appropriate Escalation Rate | 100.0% (12/12 exact risk-level matches) |
| Unsupported Claim Rate | 0.0% (0/11 model-generated responses) |

See `evaluation/reports/` for the raw report this table was generated from.

## Benchmark

```bash
npm run benchmark
```

Last measured run on this machine (Apple M2 Pro, macOS, arm64, warm page cache):

| Metric | Result |
|---|---|
| Model load time | ~1.1–2.1s warm · ~11–14s cold (first load after boot) |
| Time to first token | 61–96 ms |
| Generation speed | ~96–106 tokens/sec |
| Backend | GPU (Metal, via QVAC's llama.cpp addon) |

See `evaluation/reports/benchmark-*.json` for raw records.

## Reproducibility

See [docs/reproducibility.md](docs/reproducibility.md) for exact commands, checksums, and expected
output at each step.

## Limitations

- MedPsy operates internally in English; the UI is Spanish-first (per project scope), so
  model-generated assessment text (summary, next steps, etc.) currently renders in English while
  the safety-rule-derived warning signs and all surrounding UI are Spanish. A local translation
  layer (e.g. `TranslatePsy`) was deliberately left out of this MVP to avoid unnecessary
  complexity — see master prompt section 40.
- The knowledge base currently covers 7 NHS-sourced topics (breathing difficulty, dehydration,
  fever, headache, GI symptoms, chest pain, cyanosis) — not full symptom coverage.
- QVAC's built-in RAG vector store is explicitly documented as "prototype, not production-grade";
  fine for this project's scope.
- The Safety Engine's rule set, while source-cited, is not a substitute for a clinically validated
  triage protocol and has not been reviewed by a licensed clinician.

## License

Apache License 2.0 — see [LICENSE](LICENSE).

## Attribution

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party models, SDKs, and data sources.

---

Generated in collaboration with Claude Code.
