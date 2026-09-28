#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -d llama.cpp/.git ]; then echo "llama.cpp already exists."; exit 0; fi
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git llama.cpp
echo "llama.cpp installed at $ROOT/llama.cpp"
