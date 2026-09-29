import os
import gradio as gr
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

MODEL_REPO = "bocalan/Qwen2.5-Coder-3B-Instruct-Q4_K_M-GGUF"
MODEL_FILE = "qwen2.5-coder-3b-instruct-q4_k_m.gguf"
MODEL_NAME = os.getenv("MODEL_NAME", "qwen2.5-coder-3b")
SYSTEM_PROMPT = """You are Qwen2.5-Coder, a helpful coding assistant.
Answer clearly and accurately. Prefer concise explanations and runnable code.
You can communicate in Persian when the user writes in Persian."""

model_path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILE)
llm = Llama(model_path=model_path, n_ctx=4096,
            n_threads=max(2, os.cpu_count() or 2), verbose=False)

def normalize_history(history):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history or []:
        if isinstance(item, dict):
            role, content = item.get("role"), item.get("content")
            if role in ("user", "assistant") and isinstance(content, str):
                messages.append({"role": role, "content": content})
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            user, assistant = item
            if user: messages.append({"role": "user", "content": str(user)})
            if assistant: messages.append({"role": "assistant", "content": str(assistant)})
    return messages

def chat(message, history):
    messages = normalize_history(history)
    messages.append({"role": "user", "content": message})
    result = llm.create_chat_completion(messages=messages, temperature=0.2, top_p=0.9, max_tokens=1024)
    return result["choices"][0]["message"]["content"]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str = MODEL_NAME
    messages: list[ChatMessage]
    temperature: float = 0.2
    top_p: float = 0.9
    max_tokens: int = 1024
    stream: bool = False

api = FastAPI(title="Qwen GGUF API", version="1.0.0")
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

@api.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}

@api.get("/v1/models")
def models():
    return {"object": "list", "data": [{"id": MODEL_NAME, "object": "model", "owned_by": "local-gguf"}]}

@api.post("/v1/chat/completions")
def completions(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    if not any(m["role"] == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    result = llm.create_chat_completion(
        messages=messages,
        temperature=max(0.0, min(req.temperature, 2.0)),
        top_p=max(0.0, min(req.top_p, 1.0)),
        max_tokens=max(1, min(req.max_tokens, 4096)),
    )
    choice = result["choices"][0]
    return {"id": result.get("id", "qwen-gguf"), "object": "chat.completion",
            "created": result.get("created", 0), "model": MODEL_NAME,
            "choices": [{"index": 0, "message": choice["message"],
                         "finish_reason": choice.get("finish_reason", "stop")}],
            "usage": result.get("usage", {})}

demo = gr.ChatInterface(
    fn=chat,
    title="🤖 Qwen2.5-Coder 3B — GGUF Demo",
    description="Qwen2.5-Coder-3B-Instruct Q4_K_M running with llama.cpp. مدل GGUF با API سازگار با OpenAI.",
    examples=["Write a Python function to check whether a number is prime.",
              "یک API ساده با FastAPI برای ثبت کاربران بنویس.",
              "Create a responsive HTML/CSS login page.",
              "این کد JavaScript را توضیح بده: const x = arr.map(v => v * 2)"],
)
app = gr.mount_gradio_app(api, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
