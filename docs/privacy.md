# Privacy

## Principle

If a piece of data isn't necessary to run the model, generate the evaluation, or show the result,
CheckCare doesn't store it. There is no cloud analytics pipeline for medical data anywhere in this
codebase.

## What never leaves this device

- Selected and free-text symptoms
- Adaptive-question answers
- The prompts built for MedPsy
- MedPsy's raw and structured responses
- Assessment results and history
- Follow-up entries

All of the above are written only to a local SQLite file at `data/checkcare.db` (git-ignored,
never committed) and are read back only by `apps/edge` for this same machine's `apps/web`
instance.

## Network boundary

- `apps/web` (the browser) talks **only** to `apps/edge` at `http://127.0.0.1:4111` /
  `http://localhost:4111`. The edge server binds explicitly to `127.0.0.1` (see
  `apps/edge/src/index.ts`), never `0.0.0.0`, so it isn't reachable from other devices on the same
  network.
- CORS on the edge server allows exactly two origins — `http://localhost:3000` and
  `http://127.0.0.1:3000` (the dev web app) — no wildcard.
- `apps/edge` never sends symptom data, prompts, or model output anywhere over the network. The
  only network calls QVAC itself makes are: (a) the one-time model/embedding-model download from
  Hugging Face / QVAC's registry during `npm run setup-model`, cached to disk afterward, and (b) a
  registry-availability check QVAC's SDK performs on `loadModel()` for registry-sourced models —
  loading MedPsy from a **local file path** with an explicit `modelType` (as this project does)
  does not require that.
- Nothing in `apps/web` or `apps/edge` calls OpenAI, Anthropic, Gemini, OpenRouter, Ollama, or any
  other third-party AI API.

## Logs

`apps/edge/src/logger.ts` emits structured JSON logs for operational events only — model
load/unload, inference start/end timing, RAG retrieval counts, safety-rule ids triggered,
validator pass/fail categories, HTTP method/path. **No symptom text, free-text notes, prompts, or
model output content is ever logged.**

## Verifying it yourself

1. `npm run setup-model` (needs internet once).
2. `npm run dev`.
3. Turn off Wi-Fi.
4. Complete an evaluation in the browser — it still works, and the "IA local" indicator in the
   header stays green (it's checking `apps/edge`'s own `/health`, which itself makes no outbound
   call).
5. Optional: run `nettop` / Little Snitch / Wireshark while completing an evaluation to confirm
   `apps/edge`'s Node process makes no outbound connections during inference.
