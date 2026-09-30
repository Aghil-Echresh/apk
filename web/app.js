import { loadState, saveState, clearState } from "./storage.js";

const $ = s => document.querySelector(s);
const chat = $("#chat"), input = $("#input"), settings = $("#settings");
const apiUrl = $("#apiUrl"), model = $("#model"), temperature = $("#temperature"), maxTokens = $("#maxTokens");
const status = $("#status"), statusText = $("#statusText");
let state = loadState();

apiUrl.value = state.apiUrl || apiUrl.value;
model.value = state.model || model.value;
temperature.value = state.temperature ?? 0.2;
maxTokens.value = state.maxTokens ?? 1024;

function setStatus(kind, text) {
  status.dataset.state = kind;
  statusText.textContent = text;
}

function add(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function renderHistory() {
  if (!state.messages.length) return;
  document.querySelector(".welcome")?.remove();
  for (const m of state.messages) if (m.role !== "system") add(m.role, m.content);
}

function apiBase(url) {
  return url.replace(/\/v1\/chat\/completions\/?$/, "").replace(/\/$/, "");
}

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function testConnection() {
  const url = apiUrl.value.trim();
  if (!url) return setStatus("offline", "آدرس API تنظیم نشده");
  setStatus("checking", "در حال بررسی سلامت API…");
  try {
    const healthUrl = `${apiBase(url)}/health`;
    const r = await fetchWithTimeout(healthUrl, { method: "GET", cache: "no-store" }, 15000);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
    setStatus("online", `API آماده است • ${data.model || "مدل متصل"}`);
  } catch (e) {
    const reason = e.name === "AbortError" ? "زمان پاسخ تمام شد" : (e.message || "خطای شبکه");
    setStatus(navigator.onLine ? "warning" : "offline", navigator.onLine ? `API وصل نیست • ${reason}` : "آفلاین");
  }
}

async function ask(text) {
  document.querySelector(".welcome")?.remove();
  state.messages.push({ role: "user", content: text });
  add("user", text);
  const out = add("assistant", "در حال پاسخ‌گویی…");
  const payloadMessages = state.messages.slice(-24);

  try {
    setStatus("checking", "در حال ارتباط با مدل…");
    const url = apiUrl.value.trim();
    if (!url) throw new Error("آدرس API تنظیم نشده است.");

    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        model: model.value.trim() || "qwen2.5-coder-3b",
        messages: payloadMessages,
        temperature: Number(temperature.value) || 0.2,
        max_tokens: Number(maxTokens.value) || 1024,
        stream: false
      })
    }, 120000);

    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || data.error?.message || `HTTP ${r.status}`);

    const answer = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "پاسخی دریافت نشد.";
    out.textContent = answer;
    state.messages.push({ role: "assistant", content: answer });
    state.apiUrl = url;
    state.model = model.value.trim() || "qwen2.5-coder-3b";
    state.temperature = Number(temperature.value) || 0.2;
    state.maxTokens = Number(maxTokens.value) || 1024;
    saveState(state);
    setStatus("online", "مدل پاسخ داد");
  } catch (e) {
    out.textContent = `اتصال به AI برقرار نشد.\n\n${e.name === "AbortError" ? "سرور دیر پاسخ داد یا در حال بیدار شدن است." : e.message}`;
    state.messages.pop();
    saveState(state);
    setStatus(navigator.onLine ? "warning" : "offline", navigator.onLine ? "API در دسترس نیست" : "آفلاین: رابط برنامه همچنان فعال است");
  }
}

$("#composer").addEventListener("submit", e => {
  e.preventDefault();
  const value = input.value.trim();
  if (value) { input.value = ""; ask(value); }
});

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#composer").requestSubmit(); }
});

document.querySelectorAll(".chips button").forEach(b => b.onclick = () => {
  input.value = b.dataset.prompt || b.textContent;
  $("#composer").requestSubmit();
});

$("#settingsBtn").onclick = () => settings.showModal();
$("#save").onclick = () => {
  state.apiUrl = apiUrl.value.trim();
  state.model = model.value.trim() || "qwen2.5-coder-3b";
  state.temperature = Number(temperature.value) || 0.2;
  state.maxTokens = Number(maxTokens.value) || 1024;
  saveState(state);
  testConnection();
};

$("#testBtn").onclick = testConnection;
$("#clearBtn").onclick = () => {
  state.messages = [];
  clearState();
  chat.innerHTML = `<section class="welcome"><div class="logo">✦</div><h1>گفت‌وگوی تازه 👋</h1><p>تاریخچه پاک شد. آماده‌ایم.</p></section>`;
  setStatus("ready", "آماده");
};

window.addEventListener("online", () => setStatus("online", "اینترنت در دسترس است"));
window.addEventListener("offline", () => setStatus("offline", "آفلاین، رابط برنامه همچنان فعال است"));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
setStatus(navigator.onLine ? "ready" : "offline", navigator.onLine ? "آماده" : "آفلاین");
renderHistory();
