const $ = (id) => document.getElementById(id);
const serverInput = $('server');
const nameInput = $('username');
const roomInput = $('room');
const joinBtn = $('join');
const leaveBtn = $('leave');
const talkBtn = $('talk');
const statusEl = $('status');
const dot = $('dot');
const peersEl = $('peers');
const audioEl = $('audio');

serverInput.value = localStorage.getItem('wt-server') || '';
nameInput.value = localStorage.getItem('wt-name') || '';
roomInput.value = localStorage.getItem('wt-room') || 'کانال ۱';

let ws = null;
let localStream = null;
let clientId = null;
let talking = false;
let joining = false;
const roomPeers = new Map();
const pcs = new Map();
const pendingCandidates = new Map();

function status(message, connected = false) {
  statusEl.textContent = message;
  dot.classList.toggle('on', connected);
}

function renderPeers() {
  peersEl.replaceChildren();
  if (!roomPeers.size) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = 'فعلاً عضو دیگری آنلاین نیست.';
    peersEl.append(empty);
    return;
  }

  for (const peer of roomPeers.values()) {
    const tag = document.createElement('span');
    tag.className = 'peer';
    tag.textContent = (peer.talking ? '🎙️ ' : '● ') + peer.name +
      (peer.talking ? ' · در حال صحبت' : '');
    peersEl.append(tag);
  }
}

function send(data) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function queueCandidate(id, candidate) {
  if (!pendingCandidates.has(id)) pendingCandidates.set(id, []);
  pendingCandidates.get(id).push(candidate);
}

async function flushCandidates(id, pc) {
  const candidates = pendingCandidates.get(id) || [];
  pendingCandidates.delete(id);
  for (const candidate of candidates) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.warn('Skipping invalid queued ICE candidate', error);
    }
  }
}

function closePeer(id) {
  const pc = pcs.get(id);
  if (pc) {
    pc.ontrack = null;
    pc.close();
    pcs.delete(id);
  }
  pendingCandidates.delete(id);
  roomPeers.delete(id);
  document.getElementById('audio-' + id)?.remove();
  renderPeers();
}

async function makePeer(id, name, initiator) {
  if (pcs.has(id)) {
    const existing = roomPeers.get(id);
    if (existing && name) existing.name = name;
    renderPeers();
    return pcs.get(id);
  }

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  });

  pcs.set(id, pc);
  roomPeers.set(id, { id, name: name || 'کاربر', talking: false });
  renderPeers();

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = event => {
    if (event.candidate) send({ type: 'candidate', to: id, candidate: event.candidate });
  };

  pc.ontrack = event => {
    let audio = document.getElementById('audio-' + id);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'audio-' + id;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.setAttribute('playsinline', '');
      audioEl.append(audio);
    }
    // Some Android WebViews provide no stream in event.streams.
    const incomingStream = event.streams?.[0] || new MediaStream([event.track]);
    audio.srcObject = incomingStream;
    event.track.onunmute = () => {
      audio.play().catch(error => {
        console.warn('Remote audio playback was blocked', error);
        status('صدای دریافتی آماده است؛ یک بار روی صفحه بزنید و صدای رسانه را بالا ببرید', true);
      });
    };
    audio.play().catch(error => {
      console.warn('Remote audio playback was blocked', error);
      status('صدا وصل شد؛ برای شنیدن، یک بار روی صفحه بزنید و صدای رسانه را بررسی کنید', true);
    });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') {
      status('مسیر صوتی برقرار نشد؛ شبکه یا سرور TURN لازم است', true);
      closePeer(id);
    } else if (pc.connectionState === 'disconnected') {
      status('ارتباط صوتی ناپایدار است؛ شبکه را بررسی کنید', true);
    } else if (pc.connectionState === 'connected') {
      status('مسیر صوتی برقرار شد', true);
    } else if (pc.connectionState === 'closed') {
      closePeer(id);
    }
  };

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'offer', to: id, description: pc.localDescription });
  }
  return pc;
}

async function releaseLocalMedia() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
}

async function leave(message = 'اتصال قطع شد') {
  setTalking(false);
  const oldSocket = ws;
  ws = null;
  clientId = null;
  joining = false;

  if (oldSocket) {
    try {
      if (oldSocket.readyState === WebSocket.OPEN) {
        oldSocket.send(JSON.stringify({ type: 'leave' }));
      }
      oldSocket.close();
    } catch {}
  }

  for (const pc of pcs.values()) pc.close();
  pcs.clear();
  roomPeers.clear();
  pendingCandidates.clear();
  renderPeers();
  audioEl.replaceChildren();
  await releaseLocalMedia();

  joinBtn.disabled = false;
  leaveBtn.disabled = true;
  talkBtn.disabled = true;
  status(message);
}

function setTalking(value) {
  if (!localStream || !ws || ws.readyState !== WebSocket.OPEN) return;
  talking = value;
  localStream.getAudioTracks().forEach(track => { track.enabled = value; });
  talkBtn.classList.toggle('active', value);
  talkBtn.innerHTML = value
    ? '🔴<br>در حال ارسال صدا<small>برای پایان رها کن</small>'
    : '🎙️<br>برای صحبت نگه دار<small>با رها کردن دکمه، ارسال صدا متوقف می‌شود</small>';
  send({ type: 'talking', value });
}

joinBtn.addEventListener('click', async () => {
  if (joining || clientId !== null) return;

  const url = serverInput.value.trim();
  const name = nameInput.value.trim();
  const room = roomInput.value.trim();

  if (!url || !name || !room) {
    status('آدرس سرور، نام و کانال را وارد کنید');
    return;
  }
  if (!/^wss?:\/\//i.test(url)) {
    status('آدرس باید با ws:// یا wss:// شروع شود');
    return;
  }
  if (location.protocol === 'https:' && url.startsWith('ws://')) {
    status('این صفحه امن است؛ برای اتصال عمومی از آدرس wss:// استفاده کنید');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    status('دسترسی میکروفون در این محیط پشتیبانی نمی‌شود؛ HTTPS را بررسی کنید');
    return;
  }

  joining = true;
  joinBtn.disabled = true;
  localStorage.setItem('wt-server', url);
  localStorage.setItem('wt-name', name);
  localStorage.setItem('wt-room', room);

  try {
    status('در حال درخواست مجوز میکروفون…');
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    const audioTracks = localStream.getAudioTracks();
    if (!audioTracks.length) throw new Error('میکروفون هیچ ترک صوتی برنگرداند');
    audioTracks.forEach(track => {
      track.enabled = false;
      track.onended = () => {
        if (talking) setTalking(false);
        status('میکروفون متوقف شد؛ مجوز میکروفون را بررسی کنید');
      };
    });

    status('در حال اتصال به سرور…');
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      if (ws !== socket) return;
      send({ type: 'join', name, room });
    };

    socket.onmessage = async event => {
      if (ws !== socket) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      try {
        if (message.type === 'joined') {
          clientId = message.id;
          joining = false;
          leaveBtn.disabled = false;
          talkBtn.disabled = false;
          status('متصل به ' + room, true);
          for (const peer of message.peers || []) {
            await makePeer(peer.id, peer.name, true);
          }
        } else if (message.type === 'peer-joined') {
          if (message.id !== clientId) await makePeer(message.id, message.name, false);
        } else if (message.type === 'peer-left') {
          closePeer(message.id);
        } else if (message.type === 'offer') {
          const pc = await makePeer(message.from, message.name, false);
          await pc.setRemoteDescription(message.description);
          await flushCandidates(message.from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: 'answer', to: message.from, description: pc.localDescription });
        } else if (message.type === 'answer') {
          const pc = pcs.get(message.from);
          if (pc) {
            await pc.setRemoteDescription(message.description);
            await flushCandidates(message.from, pc);
          }
        } else if (message.type === 'candidate') {
          const pc = pcs.get(message.from);
          if (!pc || !pc.remoteDescription) {
            queueCandidate(message.from, message.candidate);
          } else {
            try {
              await pc.addIceCandidate(message.candidate);
            } catch (error) {
              console.warn('Could not add ICE candidate', error);
            }
          }
        } else if (message.type === 'error') {
          status(message.message || 'خطای سرور');
        } else if (message.type === 'talking') {
          const peer = roomPeers.get(message.id);
          if (peer) {
            peer.talking = Boolean(message.value);
            renderPeers();
          }
        }
      } catch (error) {
        console.error(error);
        status('خطا در برقراری ارتباط صوتی');
      }
    };

    socket.onerror = () => {
      if (ws === socket) status('خطا در اتصال؛ آدرس سرور و اتصال اینترنت را بررسی کنید');
    };

    socket.onclose = () => {
      if (ws !== socket) return;
      void leave(clientId !== null ? 'اتصال قطع شد' : 'اتصال به سرور برقرار نشد');
    };
  } catch (error) {
    console.error(error);
    await releaseLocalMedia();
    joining = false;
    joinBtn.disabled = false;
    leaveBtn.disabled = true;
    talkBtn.disabled = true;
    status(error.name === 'NotAllowedError'
      ? 'دسترسی میکروفون رد شد'
      : 'خطا: ' + (error.message || 'امکان استفاده از میکروفون نیست'));
  }
});

leaveBtn.addEventListener('click', () => void leave());
talkBtn.addEventListener('pointerdown', event => {
  event.preventDefault();
  try { talkBtn.setPointerCapture(event.pointerId); } catch {}
  if (!talking) setTalking(true);
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  talkBtn.addEventListener(eventName, event => {
    event.preventDefault();
    if (talking) setTalking(false);
  });
}
window.addEventListener('blur', () => { if (talking) setTalking(false); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && talking) setTalking(false);
});
renderPeers();
