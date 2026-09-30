const STORAGE_KEY = "qwen-ai-state-v2";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { messages: [], apiUrl: "", model: "qwen2.5-coder-3b", temperature: 0.2, maxTokens: 1024 };
  } catch {
    return { messages: [], apiUrl: "", model: "qwen2.5-coder-3b", temperature: 0.2, maxTokens: 1024 };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
