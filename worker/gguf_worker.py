#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, json, os, re, sys
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv()
TOKEN=os.getenv("GITHUB_TOKEN","").strip()
REPO=os.getenv("GITHUB_REPO","Aghil-Echresh/apk").strip()
BASE=os.getenv("GITHUB_BASE_BRANCH","main").strip()
LLAMA=os.getenv("LLAMA_BASE_URL","http://127.0.0.1:8080/v1").rstrip("/")
MODEL=os.getenv("LLAMA_MODEL","qwen2.5-coder").strip()
TIMEOUT=int(os.getenv("LLAMA_TIMEOUT","180"))
MAX_FILES=int(os.getenv("MAX_FILES","12"))
MAX_CHARS=int(os.getenv("MAX_FILE_CHARS","12000"))
API="https://api.github.com"

class WorkerError(RuntimeError): pass

def headers():
    if not TOKEN: raise WorkerError("GITHUB_TOKEN is missing.")
    return {"Accept":"application/vnd.github+json","Authorization":f"Bearer {TOKEN}","X-GitHub-Api-Version":"2022-11-28"}

def get(path, **params):
    r=requests.get(API+path,headers=headers(),params=params,timeout=30)
    if not r.ok: raise WorkerError(f"GitHub GET {r.status_code}: {r.text[:500]}")
    return r.json()

def write_api(path,payload,method="PUT"):
    fn=requests.put if method=="PUT" else requests.post
    r=fn(API+path,headers=headers(),json=payload,timeout=30)
    if not r.ok: raise WorkerError(f"GitHub {method} {r.status_code}: {r.text[:700]}")
    return r.json()

def files():
    data=get(f"/repos/{REPO}/git/trees/{BASE}",recursive=1)
    if data.get("truncated"): raise WorkerError("Repository tree is too large.")
    return [x["path"] for x in data.get("tree",[]) if x.get("type")=="blob" and x.get("path")][:MAX_FILES]

def read(path):
    data=get(f"/repos/{REPO}/contents/{path}",ref=BASE)
    raw=base64.b64decode(data["content"]).decode("utf-8",errors="replace")
    return raw[:MAX_CHARS]

def context():
    out={}
    for p in files():
        try: out[p]=read(p)
        except Exception: pass
    return out

def ask(task,ctx):
    system='''You are a cautious local coding agent.
Return ONLY JSON:
{"summary":"short explanation","changes":[{"path":"repo/path","content":"complete file content"}]}
Rules:
- Only create/update files.
- Never output secrets, tokens, private keys, or credentials.
- Keep changes minimal and directly related to the task.
- Do not modify deployment/security permissions unless explicitly requested.
- content must be the COMPLETE file, not a diff.
'''
    snapshot="\n\n".join(f"===== {p} =====\n{c}" for p,c in ctx.items())
    payload={"model":MODEL,"temperature":0.1,"max_tokens":3000,
             "messages":[{"role":"system","content":system},
                         {"role":"user","content":f"Task:\n{task}\n\nRepository:\n{snapshot}"}]}
    r=requests.post(f"{LLAMA}/chat/completions",json=payload,timeout=TIMEOUT)
    if not r.ok: raise WorkerError(f"llama.cpp {r.status_code}: {r.text[:700]}")
    text=r.json()["choices"][0]["message"]["content"].strip()
    if text.startswith("```"): text=re.sub(r"^```(?:json)?\s*|\s*```$","",text)
    a,b=text.find("{"),text.rfind("}")
    if a<0 or b<=a: raise WorkerError("Model did not return JSON.")
    return json.loads(text[a:b+1])

def create_branch(name):
    ref=get(f"/repos/{REPO}/git/ref/heads/{BASE}")
    write_api(f"/repos/{REPO}/git/refs",{"ref":f"refs/heads/{name}","sha":ref["object"]["sha"]},"POST")

def file_sha(path,branch):
    r=requests.get(API+f"/repos/{REPO}/contents/{path}",headers=headers(),params={"ref":branch},timeout=30)
    if r.status_code==404: return None
    if not r.ok: raise WorkerError(f"file lookup {r.status_code}: {r.text[:400]}")
    return r.json().get("sha")

def put_file(path,content,branch):
    payload={"message":f"worker: update {path}",
             "content":base64.b64encode(content.encode()).decode(),
             "branch":branch}
    sha=file_sha(path,branch)
    if sha: payload["sha"]=sha
    write_api(f"/repos/{REPO}/contents/{path}",payload)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("task",nargs="+")
    ap.add_argument("--apply",action="store_true")
    args=ap.parse_args()
    task=" ".join(args.task)
    print(f"Repo: {REPO}\nModel: {MODEL} via {LLAMA}")
    ctx=context()
    if not ctx: raise WorkerError("Could not read repository.")
    plan=ask(task,ctx)
    changes=plan.get("changes",[])
    if not isinstance(changes,list) or not changes: raise WorkerError("No changes returned.")
    changes=changes[:MAX_FILES]
    print("\nPLAN\n"+str(plan.get("summary","")))
    for x in changes: print(f"  - {x.get('path','?')} ({len(x.get('content',''))} chars)")
    if not args.apply:
        print("\nDry run. Add --apply to create a branch and write changes.")
        return
    slug=re.sub(r"[^a-z0-9]+","-",task.lower()).strip("-")[:36] or "task"
    branch=f"worker/{slug}"
    create_branch(branch)
    for x in changes:
        p=x.get("path","").replace("\\","/")
        if not p or p.startswith("/") or ".." in Path(p).parts: raise WorkerError(f"Unsafe path: {p}")
        if not isinstance(x.get("content"),str): raise WorkerError(f"Invalid content: {p}")
        put_file(p,x["content"],branch)
    print(f"\nDone: https://github.com/{REPO}/tree/{branch}")

if __name__=="__main__":
    try: main()
    except (WorkerError,KeyError,json.JSONDecodeError) as e:
        print(f"ERROR: {e}",file=sys.stderr); raise SystemExit(1)
