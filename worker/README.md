# GGUF GitHub Worker

A local, free GitHub coding worker powered by a GGUF model through llama.cpp.

## Connected model

The worker is configured for **Qwen2.5-Coder-3B-Instruct-Q4_K_M GGUF** through the local `llama-server` OpenAI-compatible API.

Architecture:

GitHub repository -> local Worker -> llama.cpp `llama-server` -> Qwen2.5-Coder-3B GGUF

The worker reads repository files, asks the local model for a structured change plan, and writes approved changes to a new Git branch. It never writes directly to `main`.

## Requirements

- Python 3.10+
- llama.cpp `llama-server`
- Qwen2.5-Coder-3B-Instruct-Q4_K_M GGUF
- A GitHub fine-grained token with repository Contents read/write permission

No paid AI API is required.

## Start Qwen GGUF

From the directory containing the GGUF file:

```bash
./llama-server -m ./qwen2.5-coder-3b-instruct-q4_k_m.gguf --alias qwen2.5-coder-3b --host 127.0.0.1 --port 8080 -c 4096
```

The `--alias` value must match `LLAMA_MODEL=qwen2.5-coder-3b` in `.env`.

## Install Worker

```bash
cd worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Put the GitHub token in `.env`. Never commit `.env`.

## Test the model connection

With `llama-server` running on `127.0.0.1:8080`:

```bash
curl http://127.0.0.1:8080/v1/models
```

The response should expose the `qwen2.5-coder-3b` model alias.

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

## GitHub Actions

The included Actions workflow validates Python syntax. It does **not** try to reach `127.0.0.1:8080`, because GitHub-hosted runners cannot access the llama-server running on your local device. The actual GGUF Worker is intentionally local and free.
