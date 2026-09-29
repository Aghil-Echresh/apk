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

async function testConnection() {
  const url = apiUrl.value.trim();
  if (!url) return setStatus("offline", "آدرس API تنظیم نشده");
  setStatus("checking", "در حال بررسی اتصال…");
  try {
    const r = await fetch(url, { method: "OPTIONS" });
    setStatus(r.ok || r.status === 204 ? "online" : "warning", r.ok ? "اتصال برقرار است" : `HTTP ${r.status}`);
  } catch {
    setStatus(navigator.onLine ? "warning" : "offline", navigator.onLine ? "مرورگر آنلاین است، اما API پاسخ نداد" : "حالت آفلاین");
  }
}

async function ask(text) {
  document.querySelector(".welcome")?.remove();
  const user = { role: "user", content: text };
  state.messages.push(user);
  add("user", text);
  const out = add("assistant", "در حال پاسخ‌گویی…");
  const payloadMessages = state.messages.slice(-24);

  try {
    setStatus("checking", "در حال ارتباط با مدل…");
    const r = await fetch(apiUrl.value.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.value.trim() || "qwen2.5-coder",
        messages: payloadMessages,
        temperature: Number(temperature.value) || 0.2,
        max_tokens: Number(maxTokens.value) || 1024,
        stream: false
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || data.error?.message || `HTTP ${r.status}`);
    const answer = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "پاسخی دریافت نشد.";
    out.textContent = answer;
    state.messages.push({ role: "assistant", content: answer });
    state.apiUrl = apiUrl.value.trim();
    state.model = model.value.trim() || "qwen2.5-coder";
    state.temperature = Number(temperature.value) || 0.2;
    state.maxTokens = Number(maxTokens.value) || 1024;
    saveState(state);
    setStatus("online", "مدل پاسخ داد");
  } catch (e) {
    out.textContent = `اتصال به AI برقرار نشد.\n\n${e.message}`;
    state.messages.pop();
    saveState(state);
    setStatus(navigator.onLine ? "warning" : "offline", navigator.onLine ? "API در دسترس نیست" : "آفلاین: رابط برنامه در دسترس است");
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
  state.model = model.value.trim() || "qwen2.5-coder";
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
