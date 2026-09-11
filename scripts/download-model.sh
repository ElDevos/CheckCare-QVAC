#!/usr/bin/env bash
# Downloads the MedPsy-1.7B Q4_K_M GGUF from Hugging Face into ./models/.
# The file is NOT committed to git (see .gitignore) — every clone must run
# this script once before `npm run dev`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="$REPO_ROOT/models"
MODEL_FILE="medpsy-1.7b-q4_k_m-imat.gguf"
MODEL_URL="https://huggingface.co/qvac/MedPsy-1.7B-GGUF/resolve/main/${MODEL_FILE}"
EXPECTED_SIZE=1282439360
EXPECTED_SHA256="41ee947d9cce72ec657577219fd1798fabeabf0d832217fe23c9d6d3d18d5880"

mkdir -p "$MODELS_DIR"
DEST="$MODELS_DIR/$MODEL_FILE"

if [ -f "$DEST" ]; then
  SIZE=$(stat -f%z "$DEST" 2>/dev/null || stat -c%s "$DEST" 2>/dev/null || echo 0)
  if [ "$SIZE" -eq "$EXPECTED_SIZE" ]; then
    echo "▸ Model already present at $DEST ($SIZE bytes). Skipping download."
    exit 0
  fi
  echo "▸ Found partial/incorrect download ($SIZE bytes). Resuming."
fi

echo "▸ Downloading MedPsy-1.7B (Q4_K_M, ~1.28GB) from Hugging Face..."
curl -L -C - --retry 5 --retry-delay 3 -o "$DEST" "$MODEL_URL"

SIZE=$(stat -f%z "$DEST" 2>/dev/null || stat -c%s "$DEST" 2>/dev/null || echo 0)
if [ "$SIZE" -ne "$EXPECTED_SIZE" ]; then
  echo "✖ Downloaded file size ($SIZE) does not match expected ($EXPECTED_SIZE). Download may be corrupt." >&2
  exit 1
fi

if command -v shasum >/dev/null 2>&1; then
  ACTUAL_SHA256=$(shasum -a 256 "$DEST" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SHA256=$(sha256sum "$DEST" | awk '{print $1}')
else
  echo "▸ No sha256 tool found, skipping checksum verification."
  ACTUAL_SHA256="$EXPECTED_SHA256"
fi

if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
  echo "✖ SHA256 mismatch. Expected $EXPECTED_SHA256, got $ACTUAL_SHA256." >&2
  exit 1
fi

echo "▸ Model downloaded and verified: $DEST ($SIZE bytes)"
