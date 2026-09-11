# Model Card — MedPsy-1.7B (Q4_K_M GGUF)

## Model

| | |
|---|---|
| **Name** | MedPsy-1.7B |
| **Developer** | Tether AI Research |
| **Base model** | [Qwen/Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B) (Thinking variant) |
| **Source (safetensors)** | [qvac/MedPsy-1.7B](https://huggingface.co/qvac/MedPsy-1.7B) |
| **Source (GGUF)** | [qvac/MedPsy-1.7B-GGUF](https://huggingface.co/qvac/MedPsy-1.7B-GGUF) |
| **File used** | `medpsy-1.7b-q4_k_m-imat.gguf` |
| **Quantization** | Q4_K_M, imatrix-calibrated |
| **File size (measured)** | 1,282,439,360 bytes (1.28 GB) |
| **SHA256 (measured)** | `41ee947d9cce72ec657577219fd1798fabeabf0d832217fe23c9d6d3d18d5880` |
| **License** | Apache 2.0 |
| **Language** | English |
| **Context length** | 40,960 tokens (native); CheckCare loads it with `ctx_size: 4096` |

## Runtime

| | |
|---|---|
| **SDK** | `@qvac/sdk@0.19.0` |
| **Load path** | `loadModel({ modelSrc: <local path>, modelType: 'llamacpp-completion', modelConfig: { ctx_size: 4096, reasoning_budget: 0 } })` |
| **Backend** | `qvac-fabric-llm.cpp` (forked `llama.cpp`/`ggml`) |
| **Execution** | 100% local |
| **Remote AI** | None |

`reasoning_budget: 0` is set because MedPsy is a hybrid-thinking Qwen3 fine-tune that would
otherwise emit `<think>...</think>` reasoning blocks before its answer; disabling it produces
cleaner, faster structured output for CheckCare's JSON-schema completion calls.

## Hardware tested

| | |
|---|---|
| **Device** | MacBook Pro, Apple M2 Pro |
| **RAM** | 16 GB |
| **OS** | macOS 26.6.2 (Darwin 25.6.0) |
| **Architecture** | arm64 |
| **Node.js** | v20.18.0 |
| **Inference backend selected** | GPU (Metal) |

## Measured performance (this hardware)

From `npm run benchmark` (`evaluation/reports/benchmark-*.json`), 3 real prompts, warm page cache:

| Metric | Value |
|---|---|
| Model load time (warm) | 1,263 ms |
| Model load time (cold, first boot) | ~11–14 s (observed during development) |
| Time to first token | 61–96 ms |
| Tokens/sec | 96.9–105.7 |
| Backend | GPU |

These are the actual numbers this benchmark run produced on this machine — re-run
`npm run benchmark` to reproduce on your own hardware; results will differ.

## Quantization trade-off (from the publisher's model card)

Per Tether's published [MedPsy-1.7B-GGUF README](https://huggingface.co/qvac/MedPsy-1.7B-GGUF),
Q4_K_M scores 65.58 average (HealthBench + closed-ended benchmark average) vs. 66.31 for the BF16
baseline — a **−1.10% relative** quality loss for a **69% size reduction** (4.07 GB → 1.28 GB),
which the publisher recommends as "best size/quality trade-off" and the choice CheckCare uses.

## What this model is trained for (per publisher)

A medical and healthcare-domain conversational assistant, per its tags (`medical`, `healthcare`,
`clinical`, `edge`, `on-device`). CheckCare does not claim any capability beyond what's documented
by the publisher, and layers its own deterministic Safety Engine and Response Validator on top
rather than trusting the model's output directly for risk classification.

## Limitations

- English-only generation; CheckCare's Spanish UI does not translate MedPsy's output (see
  README § Limitations).
- A 1.7B-parameter model, even domain-tuned, can produce incorrect or incomplete information —
  this is exactly why CheckCare never lets it make the final risk determination or bypass the
  Response Validator.
- Not evaluated by CheckCare's authors against a clinically validated benchmark beyond what the
  publisher has released; see `evaluation/` for CheckCare's own (small, non-clinical) test suite.
