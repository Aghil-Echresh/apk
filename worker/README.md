# GGUF GitHub Worker

A local, free GitHub coding worker powered by a GGUF model through llama.cpp.

## Architecture

GitHub repository -> local Worker -> llama.cpp OpenAI-compatible server -> GGUF model

The worker reads repository files, asks the local model for a structured change plan, and writes approved changes to a new Git branch. It never writes directly to main.

## Requirements

- Python 3.10+
- llama.cpp `llama-server`
- A GGUF coding model such as Qwen2.5-Coder 3B
- A GitHub fine-grained token with repository Contents read/write permission

No paid AI API is required.

## Start llama.cpp

```bash
./llama-server -m ./models/qwen2.5-coder-3b-instruct-q4_k_m.gguf --host 127.0.0.1 --port 8080 -c 4096
```

## Install

```bash
cd worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Put the GitHub token in `.env`. Never commit `.env`.

## Dry run

```bash
python gguf_worker.py "Inspect the offline AI project and propose a build fix"
```

## Apply

```bash
python gguf_worker.py --apply "Inspect the offline AI project and fix a build problem"
```

The worker creates a branch named `worker/...` and writes the proposed files there. Review and merge the branch yourself.

## Security model

The model cannot execute shell commands. It only proposes complete file contents. The worker rejects absolute paths and `..` traversal, does not send the GitHub token to llama.cpp, and does not write to `main`.
