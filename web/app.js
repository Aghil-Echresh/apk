const $=s=>document.querySelector(s);
const chat=$("#chat"),input=$("#input"),settings=$("#settings"),apiUrl=$("#apiUrl"),model=$("#model");
let messages=JSON.parse(localStorage.chatHistory||"[]");
apiUrl.value=localStorage.apiUrl||apiUrl.value;
model.value=localStorage.model||model.value||"qwen2.5-coder";
function add(role,text){const el=document.createElement("div");el.className="msg "+role;el.textContent=text;chat.appendChild(el);chat.scrollTop=chat.scrollHeight;return el}
function renderHistory(){if(!messages.length)return;document.querySelector(".welcome")?.remove();for(const m of messages)if(m.role!=="system")add(m.role,m.content)}
async function ask(text){
 document.querySelector(".welcome")?.remove();messages.push({role:"user",content:text});add("user",text);
 const out=add("assistant","در حال پاسخ‌گویی…");
 try{const r=await fetch(apiUrl.value,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:model.value,messages,temperature:.2,max_tokens:1024,stream:false})});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.detail||data.error?.message||"HTTP "+r.status);
 const answer=data.choices?.[0]?.message?.content||data.choices?.[0]?.text||"پاسخی دریافت نشد.";out.textContent=answer;messages.push({role:"assistant",content:answer});localStorage.chatHistory=JSON.stringify(messages);
 }catch(e){out.textContent="اتصال به AI برقرار نشد.\n\n"+e.message;messages.pop()}}
$("#composer").addEventListener("submit",e=>{e.preventDefault();const v=input.value.trim();if(v){input.value="";ask(v)}});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit()}});
document.querySelectorAll(".chips button").forEach(b=>b.onclick=()=>{input.value=b.textContent;$("#composer").requestSubmit()});
$("#settingsBtn").onclick=()=>settings.showModal();
$("#save").onclick=()=>{localStorage.apiUrl=apiUrl.value.trim();localStorage.model=model.value.trim()||"qwen2.5-coder";apiUrl.value=localStorage.apiUrl;model.value=localStorage.model};
renderHistory();
