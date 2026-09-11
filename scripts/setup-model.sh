#!/usr/bin/env bash
# One-shot setup: downloads MedPsy, downloads the embedding model used for
# RAG, ingests the knowledge base, and runs a real (not mocked) end-to-end
# sanity inference. Run this once after `npm install`, before `npm run dev`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/3: Downloading MedPsy-1.7B (Q4_K_M GGUF) ==="
bash scripts/download-model.sh

echo ""
echo "=== 2/3: Ingesting knowledge base into local RAG store ==="
echo "    (this also downloads the embedding model, ~278MB, on first run)"
npx tsx scripts/ingest-knowledge.ts

echo ""
echo "=== 3/3: Running a real local inference sanity check ==="
npx tsx apps/edge/src/qvac/benchmark.ts

echo ""
echo "▸ Setup complete. MedPsy is installed and verified with real local inference."
echo "▸ Next: npm run dev"
