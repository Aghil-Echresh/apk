# Web version

This folder is a static browser client for the APK project's AI backend.

## Run
Open `web/index.html` through a static web server or deploy the folder to GitHub Pages, Hugging Face Spaces (static hosting), Cloudflare Pages, Vercel, etc.

## API
The UI sends OpenAI-compatible POST requests to `/v1/chat/completions` and defaults to `http://127.0.0.1:8080/v1/chat/completions`. Change it in Settings for a deployed GGUF/llama.cpp Worker.

The backend must allow browser CORS requests. The Android/offline-ai folder is intentionally untouched.