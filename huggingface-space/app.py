import os
import gradio as gr
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

MODEL_REPO = "bocalan/Qwen2.5-Coder-3B-Instruct-Q4_K_M-GGUF"
MODEL_FILE = "qwen2.5-coder-3b-instruct-q4_k_m.gguf"

SYSTEM_PROMPT = """You are Qwen2.5-Coder, a helpful coding assistant.
Answer clearly and accurately. Prefer concise explanations and runnable code.
You can communicate in Persian when the user writes in Persian."""

model_path = hf_hub_download(
    repo_id=MODEL_REPO,
    filename=MODEL_FILE,
)

llm = Llama(
    model_path=model_path,
    n_ctx=4096,
    n_threads=max(2, os.cpu_count() or 2),
    verbose=False,
)

def normalize_history(history):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history or []:
        if isinstance(item, dict):
            role = item.get("role")
            content = item.get("content")
            if role in ("user", "assistant") and isinstance(content, str):
                messages.append({"role": role, "content": content})
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            user, assistant = item
            if user:
                messages.append({"role": "user", "content": str(user)})
            if assistant:
                messages.append({"role": "assistant", "content": str(assistant)})
    return messages

def chat(message, history):
    messages = normalize_history(history)
    messages.append({"role": "user", "content": message})

    result = llm.create_chat_completion(
        messages=messages,
        temperature=0.2,
        top_p=0.9,
        max_tokens=1024,
    )
    return result["choices"][0]["message"]["content"]

demo = gr.ChatInterface(
    fn=chat,
    title="🤖 Qwen2.5-Coder 3B — GGUF Demo",
    description=(
        "Qwen2.5-Coder-3B-Instruct Q4_K_M running with llama.cpp. "
        "مدل کدنویسی آفلاین/محلی در قالب GGUF."
    ),
    examples=[
        "Write a Python function to check whether a number is prime.",
        "یک API ساده با FastAPI برای ثبت کاربران بنویس.",
        "Create a responsive HTML/CSS login page.",
        "این کد JavaScript را توضیح بده: const x = arr.map(v => v * 2)",
    ],
)

if __name__ == "__main__":
    demo.launch()
