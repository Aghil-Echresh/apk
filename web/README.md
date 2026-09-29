# Web version

Browser → GitHub Pages → Hugging Face Space → llama.cpp → Qwen2.5-Coder-3B GGUF

Default API: `https://aghill-apk.hf.space/v1/chat/completions`

The Space exposes `/health`, `/v1/models`, and `/v1/chat/completions` with browser CORS enabled. The Android/offline-ai project remains separate.

GitHub Pages deployment is provided by `.github/workflows/web-pages.yml`.
The first Space start can be slow because the GGUF file is downloaded and loaded.
