# Attributions

CheckCare is licensed under Apache License 2.0 (see [LICENSE](LICENSE)). This file lists the
models, SDKs, and content sources it depends on or was built from, with their own licenses.

## Models

| Model | Publisher | License | Used for |
|---|---|---|---|
| [MedPsy-1.7B-GGUF](https://huggingface.co/qvac/MedPsy-1.7B-GGUF) (base: [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B)) | Tether AI Research | Apache 2.0 | Primary local inference |
| [EmbeddingGemma-300M](https://huggingface.co/unsloth/embeddinggemma-300m-GGUF) (GGUF conversion of Google's EmbeddingGemma) | Google / Unsloth (GGUF conversion) | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) | Local text embeddings for RAG |

Both are downloaded at setup time (`npm run setup-model`), not vendored in this repository. Model
weights are excluded from git via `.gitignore`.

## SDKs and runtimes

| Package | Publisher | License |
|---|---|---|
| [`@qvac/sdk`](https://www.npmjs.com/package/@qvac/sdk) and related `@qvac/*` addons | Tether (tetherto/qvac) | Apache 2.0 |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) (via QVAC's `qvac-fabric-llm.cpp` fork) | ggml-org and contributors | MIT |

## Application dependencies

Core runtime dependencies and their licenses (see each package's own `LICENSE` in
`node_modules/<package>/` for the authoritative text; this table reflects what was declared at the
time this project was built and should be re-verified with `npx license-checker` before any
redistribution):

| Package | License |
|---|---|
| Next.js, React, React DOM | MIT |
| Express | MIT |
| better-sqlite3 | MIT |
| zod | MIT |
| Vitest | MIT |
| Playwright (`@playwright/test`) | Apache 2.0 |
| TypeScript | Apache 2.0 |
| tsx | MIT |

## Knowledge base content

`knowledge/sources/*.json` is derived from patient-guidance content published by the **NHS (UK
National Health Service)** at nhs.uk, retrieved 2026-09-10. NHS website content is published under
Crown copyright; NHS.uk's own terms permit re-use of health information content for non-commercial
purposes with attribution to the NHS and a link back to the original page — both of which every
entry in `knowledge/manifest.json` includes (`source` and `url` fields). No content was
paraphrased into a medical claim beyond what the cited page states; see `docs/safety.md` for the
full rule-to-source mapping. This project is a hackathon prototype, not a commercial product;
anyone adapting it for other use should independently confirm current NHS re-use terms at
<https://www.nhs.uk/using-the-nhs-website/nhs-website-terms-and-conditions/>.

## Hackathon sponsor

QVAC and the MedPsy model family are published by [Tether](https://qvac.tether.io). This project
was built as a demonstration of that stack and is not affiliated with or endorsed by Tether beyond
using their published, public SDK and model releases.
