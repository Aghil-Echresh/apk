#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Pin llama.cpp so CI/local builds are reproducible instead of depending on
# whichever API happens to be on the default branch.
LLAMA_CPP_COMMIT="b9acf138a1e28ce1fc23b5a4fc4b12444b50f7ea"

if [ -d llama.cpp/.git ]; then
  echo "llama.cpp already exists."
  exit 0
fi

git clone https://github.com/ggml-org/llama.cpp.git llama.cpp
cd llama.cpp
git checkout --detach "$LLAMA_CPP_COMMIT"
cd "$ROOT"

echo "llama.cpp pinned to $LLAMA_CPP_COMMIT"
