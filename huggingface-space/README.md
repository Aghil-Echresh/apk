---
title: Qwen2.5-Coder 3B GGUF API
emoji: 🤖
colorFrom: indigo
colorTo: purple
sdk: gradio
app_file: app.py
python_version: "3.11"
pinned: false
---

# Qwen2.5-Coder 3B GGUF

Gradio chat UI plus an OpenAI-compatible FastAPI endpoint for the web client.

Endpoints:
- `/health`
- `/v1/models`
- `/v1/chat/completions`

Connection note: the web client checks `/health` before sending chat requests.
