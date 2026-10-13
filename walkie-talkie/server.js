import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||8080);
const clients=new Map(), rooms=new Map();
const server=createServer(async(req,res)=>{
  if(req.url==='/healthz'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,service:'aghil-walkie-talkie'}));return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  if(pathname==='/')pathname='/index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end('Forbidden');return;}
  try{if(!(await stat(file)).isFile())throw new Error('not file');const data=await readFile(file);const ext=path.extname(file);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':ext==='.html'?'no-cache':'public, max-age=3600'});res.end(data);}catch{res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found. Build the app first with npm run build.');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:16*1024});
function send(ws,payload){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(payload));}
function broadcast(room,payload,except=null){for(const id of rooms.get(room)||[]){if(id===except)continue;const c=clients.get(id);if(c)send(c.ws,payload);}}
function remove(id){const c=clients.get(id);if(!c)return;rooms.get(c.room)?.delete(id);broadcast(c.room,{type:'peer-left',id},id);if(rooms.get(c.room)?.size===0)rooms.delete(c.room);clients.delete(id);}
wss.on('connection',ws=>{const id=randomUUID();ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString());}catch{return send(ws,{type:'error',message:'پیام نامعتبر'});}if(!m||typeof m.type!=='string')return;
if(m.type==='join'){if(clients.has(id))return;const name=typeof m.name==='string'?m.name.trim().slice(0,24):'';const room=typeof m.room==='string'?m.room.trim().slice(0,32):'';if(!name||!room)return send(ws,{type:'error',message:'نام و کانال الزامی است'});if((rooms.get(room)?.size||0)>=32)return send(ws,{type:'error',message:'ظرفیت کانال تکمیل است'});const peers=[...(rooms.get(room)||[])].map(pid=>({id:pid,name:clients.get(pid)?.name||'کاربر'}));clients.set(id,{id,name,room,ws});if(!rooms.has(room))rooms.set(room,new Set());rooms.get(room).add(id);send(ws,{type:'joined',id,room,peers});broadcast(room,{type:'peer-joined',id,name},id);return;}
const c=clients.get(id);if(!c)return send(ws,{type:'error',message:'ابتدا وارد کانال شوید'});if(m.type==='leave')return remove(id);if(m.type==='talking')return broadcast(c.room,{type:'talking',id,value:!!m.value},id);if(['offer','answer','candidate'].includes(m.type)){const to=clients.get(typeof m.to==='string'?m.to:'');if(!to||to.room!==c.room)return;send(to.ws,{...m,from:id,name:c.name});}});
ws.on('close',()=>remove(id));ws.on('error',()=>remove(id));});
server.on('upgrade',(req,socket,head)=>{if(req.url!=='/signal'&&req.url!=='/'){socket.write('HTTP/1.1 404 Not Found\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
server.listen(port,'0.0.0.0',()=>console.log('Walkie-Talkie server listening on '+port));