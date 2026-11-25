
const OFFICIAL = "https://cross-creative.github.io/easy_screen/";

function chkOfficial() {
  const h = location.hostname;
  const local = h === "" || h === "localhost" || h === "127.0.0.1";
  if (local || h === new URL(OFFICIAL).hostname) return;
  const a = $("officialLink");
  a.href = OFFICIAL;
  a.textContent = OFFICIAL;
  $("fakeBanner").hidden = false;
}
const PFX = "tcompartilha-";
const MAX_VIEW = 16;
const MAX_SHR = 4;
const MAX_CAM = 4;
const GIF_KEY = "1JlESXqEw53jC3dwFuBHR897c5mLU6KN7w1WdDE3QHuqk7Z1ZYRRl0cp8EyedRbW";
const GIF_API = "https://api.klipy.com/api/v1/";
const GIF_N = 24;
const CAM = "#cam";
const AFK_MS = 8 * 60 * 1000;
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RES = {
  r480: { width: 854, height: 480, label: "480p" },
  r720: { width: 1280, height: 720, label: "720p" },
  r1080: { width: 1920, height: 1080, label: "1080p" },
  r1440: { width: 2560, height: 1440, label: "1440p" },
  r2160: { width: 3840, height: 2160, label: "4K" }
};
const RES_LIST = ["r480", "r720", "r1080", "r1440", "r2160"];
const FPS_MIN = 5;
const FPS_MAX = 60;
const KB_MIN = 150;
const KB_MAX = 15000;
const CAM_QS = {
  c360: { width: 640, height: 360, fps: 15, kbps: 300 },
  c480: { width: 854, height: 480, fps: 24, kbps: 600 },
  c720: { width: 1280, height: 720, fps: 30, kbps: 1200 },
  c720f60: { width: 1280, height: 720, fps: 60, kbps: 2000 }
};
const CAM_LIST = ["c360", "c480", "c720", "c720f60"];
const UP_MAX = 13000;
const DOWN_WAIT = 8000;
const UP_WAIT = 60000;
const CFG_KEY = "settings";
const UPD_MS = 5 * 60 * 1000;
const VER = "2026-11-24-3";
let updReady = false;
let updHide = false;
let updLast = 0;

function updView() {
  const box = $("updateNotice");
  const inRoom = hosting || !viewerView.hidden;
  if (!inRoom) updHide = false;
  box.hidden = !updReady || (inRoom && updHide);
  if (box.hidden) return;
  setT($("updateText"), inRoom ? "updateRoom" : "updateHome");
  $("updateReload").hidden = inRoom;
  $("updateDismiss").hidden = !inRoom;
}

function isNewer(a, b) {
  const x = String(a).split("-").map(Number);
  const y = String(b).split("-").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] || 0;
    const q = y[i] || 0;
    if (p !== q) return p > q;
  }
  return false;
}

async function getLatest() {
  const url = new URL("version.json", location.href).href + "?v=" + Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("status");
  const data = await res.json();
  if (!data || typeof data.version !== "string" || !/^\d{4}-\d{2}-\d{2}-\d+$/.test(data.version)) throw new Error("version");
  return data.version;
}

async function chkUpd() {
  if (updReady) return;
  updLast = Date.now();
  try {
    const latest = await getLatest();
    if (isNewer(latest, VER)) {
      updReady = true;
      updView();
    }
  } catch (e) {}
}

function watchUpd() {
  if (location.protocol !== "https:" && location.protocol !== "http:") return;
  setInterval(chkUpd, UPD_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - updLast > 60000) chkUpd();
  });
}

function loadCfg() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(CFG_KEY) || "{}") || {}; } catch (e) {}
  return {
    theme: s.theme === "light" || s.theme === "dark" || s.theme === "custom" ? s.theme : "auto",
    accent: isHex(s.accent) ? s.accent.toLowerCase() : "",
    colors: fixColors(s.colors),
    autoReduce: s.autoReduce !== false,
    autoRecover: s.autoRecover !== false,
    capByViewers: s.capByViewers !== false,
    animations: s.animations !== false,
    glow: s.ambient !== false,
    notify: s.notifyV2 === true && "Notification" in window && Notification.permission === "granted"
  };
}

const TH_KEYS = ["bg", "surface", "text", "muted", "border", "accent", "danger"];
const TH_DEF = {
  bg: "#121316",
  surface: "#1c1e23",
  text: "#eceef1",
  muted: "#9aa0a8",
  border: "#2e3138",
  accent: "#5b8cff",
  danger: "#ff6b6b"
};
const PALS = ["#5b8cff", "#9b6bff", "#34c76b", "#ff5fa2", "#ff8a3d", "#ff4d4d", "#1fc7b6", "#f2c230"];

function isHex(s) {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
}

function fixColors(o) {
  const out = {};
  TH_KEYS.forEach((k) => {
    out[k] = o && isHex(o[k]) ? o[k].toLowerCase() : TH_DEF[k];
  });
  return out;
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function inkFor(hex) {
  return lum(hex) > 0.6 ? "#0b1020" : "#ffffff";
}

let cfg = loadCfg();

function saveCfg() {
  try { localStorage.setItem(CFG_KEY, JSON.stringify({ theme: cfg.theme, accent: cfg.accent, colors: cfg.colors, autoReduce: cfg.autoReduce, autoRecover: cfg.autoRecover, capByViewers: cfg.capByViewers, animations: cfg.animations, ambient: cfg.glow, notifyV2: cfg.notify })); } catch (e) {}
}

function applyAnim() {
  if (cfg.animations) {
    document.documentElement.removeAttribute("data-anim");
  } else {
    document.documentElement.dataset.anim = "off";
  }
}

function applyTheme() {
  const root = document.documentElement;
  TH_KEYS.forEach((k) => root.style.removeProperty("--" + k));
  root.style.removeProperty("--accent-text");
  if (cfg.theme === "custom") {
    const c = cfg.colors;
    root.dataset.theme = lum(c.bg) > 0.5 ? "light" : "dark";
    TH_KEYS.forEach((k) => root.style.setProperty("--" + k, c[k]));
    root.style.setProperty("--accent-text", inkFor(c.accent));
    return;
  }
  if (cfg.theme === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = cfg.theme;
  }
  if (cfg.accent) {
    root.style.setProperty("--accent", cfg.accent);
    root.style.setProperty("--accent-text", inkFor(cfg.accent));
  }
}

function syncNotif() {
  const ok = "Notification" in window && Notification.permission === "granted";
  if (!ok && cfg.notify) {
    cfg.notify = false;
    saveCfg();
  }
}

function drawCfg() {
  syncNotif();
  $("setTheme").value = cfg.theme;
  $("setAutoReduce").checked = cfg.autoReduce;
  $("setAutoRecover").checked = cfg.autoRecover;
  $("setCap").checked = cfg.capByViewers;
  $("setAnim").checked = cfg.animations;
  $("setAmbient").checked = cfg.glow;
  $("setNotify").checked = cfg.notify;
  $("setNotify").disabled = !("Notification" in window) || Notification.permission === "denied";
  const hint = $("setNotifyHint");
  if (!("Notification" in window)) {
    setT(hint, "notifyUnsupported");
  } else if (Notification.permission === "denied") {
    setT(hint, "notifyDenied");
  } else {
    setT(hint, "setNotifyHint");
  }
  syncTh();
}

function askNotif() {
  if (!cfg.notify || !("Notification" in window) || Notification.permission !== "default") return;
  reqNotif();
}

function reqNotif() {
  const done = () => {
    syncNotif();
    drawCfg();
  };
  try {
    const r = Notification.requestPermission(done);
    if (r && r.then) r.then(done, done);
  } catch (e) {
    done();
  }
}

function notify(tag, title, body) {
  if (!cfg.notify || !("Notification" in window) || Notification.permission !== "granted") return;
  if (document.hasFocus() && !document.hidden) return;
  try {
    const n = new Notification(title, { body: body, tag: tag });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 20000);
  } catch (e) {}
}

function openCfg() {
  closeChat();
  closeOpts();
  closeViewPanel();
  drawCfg();
  $("settingsPanel").classList.add("open");
  $("settingsPanel").setAttribute("aria-hidden", "false");
  $("settingsBackdrop").hidden = false;
}

function closeCfg() {
  $("settingsPanel").classList.remove("open");
  $("settingsPanel").setAttribute("aria-hidden", "true");
  $("settingsBackdrop").hidden = true;
}

function ownerOf(sid) {
  return sid.endsWith(CAM) ? sid.slice(0, -CAM.length) : sid;
}

function isCam(sid) {
  return sid.endsWith(CAM);
}

function sidOf(call) {
  const m = call.metadata;
  return call.peer + (m && m.cam === true ? CAM : "");
}

function roomN() {
  if (hosting) return viewers.size;
  if (scrState === "sharing" || camState === "sharing") return new Set([...outC.keys()].map(ownerOf)).size;
  return nWatch;
}

function upKbps() {
  if (hosting) {
    return viewers.size * ((stream ? quality.kbps : 0) + (camStream ? camQ.kbps : 0));
  }
  let total = 0;
  outC.forEach((c, k) => {
    total += isCam(k) ? camQ.kbps : quality.kbps;
  });
  return total;
}

function mkQ(resKey, fps) {
  const r = RES[resKey];
  const px = r.width * r.height;
  const bpp = px <= 921600 ? 0.07 : px <= 2073600 ? 0.05 : 0.04;
  const kbps = Math.min(KB_MAX, Math.max(KB_MIN, Math.round(px * fps * bpp / 1000)));
  return { width: r.width, height: r.height, fps: fps, kbps: kbps };
}

function qTxt(resKey, fps) {
  return RES[resKey].label + " · " + fps + " fps";
}

function getFps(el) {
  let n = Math.round(Number(el.value));
  if (!Number.isFinite(n) || n <= 0) n = fpsValue;
  n = Math.min(FPS_MAX, Math.max(FPS_MIN, n));
  el.value = n;
  return n;
}

function stepDown(r, f) {
  const i = RES_LIST.indexOf(r);
  if (i > 0) return { res: RES_LIST[i - 1], fps: f };
  if (f > 15) return { res: r, fps: Math.max(15, Math.round(f / 2)) };
  return null;
}

function stepUp(r, f) {
  if (f < pickFps) return { res: r, fps: Math.min(pickFps, f * 2) };
  const i = RES_LIST.indexOf(r);
  if (i < RES_LIST.indexOf(pickQ)) return { res: RES_LIST[i + 1], fps: f };
  return null;
}

function fits(resKey, fps) {
  if (!cfg.capByViewers) return true;
  const n = roomN();
  if (n <= 0) return true;
  const camLoad = camStream ? camQ.kbps : 0;
  return n * (mkQ(resKey, fps).kbps + camLoad) <= UP_MAX;
}

function camMax() {
  const top = CAM_LIST[CAM_LIST.length - 1];
  if (!cfg.capByViewers) return top;
  const n = roomN();
  if (n <= 0) return top;
  const base = stream ? quality.kbps : 0;
  for (let i = CAM_LIST.length - 1; i >= 0; i--) {
    if (n * (base + CAM_QS[CAM_LIST[i]].kbps) <= UP_MAX) return CAM_LIST[i];
  }
  return CAM_LIST[0];
}

function refreshLocks() {
  [$("liveQuality"), $("viewQuality")].forEach((sel) => {
    Array.from(sel.options).forEach((o) => {
      const over = !fits(o.value, fpsValue);
      o.disabled = over;
      o.textContent = RES[o.value].label + (over ? " 🔒" : "");
    });
  });
  const camTop = CAM_LIST.indexOf(camMax());
  [$("liveCamQuality"), $("viewCamQuality")].forEach((sel) => {
    Array.from(sel.options).forEach((o) => {
      const over = CAM_LIST.indexOf(o.value) > camTop;
      o.disabled = over;
      o.textContent = t("q_" + o.value) + (over ? " 🔒" : "");
    });
  });
}

function autoMsg(key, label) {
  autoMsgSt = { key: key, q: label, until: Date.now() + 12000 };
  showAutoMsg();
  notify("auto", t("title"), t(key, { q: label }));
}

function showAutoMsg() {
  if (!autoMsgSt) return;
  const box = hosting ? $("hostWarn") : $("viewWarn");
  const text = hosting ? $("hostWarnText") : $("viewWarnText");
  setT(text, autoMsgSt.key, { q: autoMsgSt.q });
  if (hosting) $("lowerQ").hidden = true;
  box.hidden = false;
}

function capNow() {
  refreshLocks();
  if (stream) {
    let r = qKey;
    let f = fpsValue;
    let guard = 0;
    while (!fits(r, f) && guard++ < 10) {
      const d = stepDown(r, f);
      if (!d) break;
      r = d.res;
      f = d.fps;
    }
    if (r !== qKey || f !== fpsValue) {
      lastAuto = Date.now();
      setQ(r, f, true);
      autoMsg("capLowered", qTxt(r, f));
    }
  }
  if (camStream) {
    const cc = camMax();
    if (CAM_LIST.indexOf(camKey) > CAM_LIST.indexOf(cc)) {
      lastAuto = Date.now();
      setCamQ(cc, true);
      autoMsg("capLowered", t("q_" + cc));
    }
  }
}


const $ = (id) => document.getElementById(id);
const home = $("home");
const hostView = $("hostView");
const viewerView = $("viewerView");
const canCapture = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
const canCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

let peer = null;
let stream = null;
let camStream = null;
let pendCam = null;
let camKey = "c480";
let camQ = CAM_QS.c480;
let camState = "none";
let qKey = "r720";
let fpsValue = 30;
let quality = mkQ("r720", 30);
let pickQ = "r720";
let pickFps = 30;
let lastAuto = 0;
let lastLim = 0;
let autoMsgSt = null;
let nWatch = 0;
let lastWarn = "";
let isMulti = false;
let inMulti = false;
let viewers = new Map();
let roomCode = "";
let vTimer = null;
let monTimer = null;
let lang = "pt";
const MSG_MAX = 300;
let myNick = "";
let vConn = null;
let unreadN = 0;
const BAN = 5 * 60 * 1000;
const BAN_IP = 2 * 60 * 1000;
const NICK_MS = 60 * 1000;
const NICK_TRIES = 5;
const pending = new Map();
let nickTry = "";
const bans = new Map();
const grants = new Set();
const camGrants = new Set();
const mutedVids = new Set();
const chatBuf = [];
const nickHist = new Map();
let roomWho = [];
let msgSeq = 0;
let chatMute = false;
let gifsOn = true;
let vGifs = false;
let gifTimer = null;
let gifSeq = 0;
let dupTab = false;
const MAX_RT = 8;
const tabId = rndCode() + rndCode();
let retry = 0;
let rtTimer = null;
let rtWait = false;
let manualEnd = false;
let joinCode = "";
let hosting = false;
let away = null;
let awayV = null;
let vLive = false;
let gridEl = null;
const tiles = new Map();
const inC = new Map();
const outC = new Map();
const held = new Map();
let shrIds = new Set();
let shrNames = new Map();
let scrState = "none";
let pendScr = null;
let vMuted = false;
let vVol = 1;
let isPriv = false;
const approvals = new Map();
const allowed = new Set();
const audPrefs = new Map();
let audSig = "";
let visRes = null;
let infoRes = null;
let ipMem = false;
const ADM_GAP = 5000;
const ADM_Q = 8;
const GRACE = 90000;
const admitQ = [];
let nextAdm = 0;
let admTimer = null;
let grace = 0;
let tkTimer = null;
let amSucc = false;
let succState = null;
let succSig = "";
let hGen = 0;
let hostPid = "";
let rGen = 0;
let unloading = false;
let tkMode = false;
let pendRes = null;
let lostV = null;
const TK_MS = 10000;
const RES_MS = 8000;
const GENS = 4;
const HS = "hostSession";

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function topVideo() {
  if (!gridEl) return null;
  const pick = (root) => [...root.querySelectorAll("video")].find((v) => v.srcObject) || null;
  const big = gridEl.querySelector(".tile.big");
  return (big && pick(big)) || pick(gridEl);
}

function relayout() {
  const g = gridEl;
  if (!g) return;
  g.style.setProperty("--cols", tiles.size <= 1 ? 1 : 2);
  g.classList.toggle("has-big", !!g.querySelector(".tile.big"));
  g.classList.toggle("single", tiles.size <= 1);
}

function prefFor(id) {
  let p = audPrefs.get(id);
  if (!p) {
    p = { vol: 1, muted: false };
    audPrefs.set(id, p);
  }
  return p;
}

function applyVol() {
  tiles.forEach((t, id) => {
    const pr = audPrefs.get(id) || { vol: 1, muted: false };
    t.video.muted = t.local || vMuted || pr.muted;
    t.video.volume = vVol * pr.vol;
  });
}

function drawAudio() {
  const me = hosting ? hostId() : peer ? peer.id : "";
  const list = [];
  shrNames.forEach((nick, id) => {
    if (!isCam(id) && id !== me) list.push([id, nick]);
  });
  const screens = [...shrIds].filter((s) => !isCam(s)).length;
  const show = screens > 1 && list.length > 0;
  const sig = show ? list.map((x) => x[0] + "|" + x[1]).join(";") : "";
  $("audioTabHost").hidden = !show;
  $("audioTabView").hidden = !show;
  if (sig === audSig) return;
  audSig = sig;
  ["audioListHost", "audioListView"].forEach((boxId) => {
    const box = $(boxId);
    box.innerHTML = "";
    if (!show) return;
    list.forEach(([id, nick]) => {
      const pr = prefFor(id);
      const row = document.createElement("div");
      row.className = "audiorow";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = nick;
      const ctl = document.createElement("div");
      ctl.className = "ctl";
      const range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      range.max = "1";
      range.step = "0.05";
      range.value = String(pr.vol);
      const btn = document.createElement("button");
      btn.className = "mini";
      setT(btn, pr.muted ? "unmute" : "mute");
      range.addEventListener("input", () => {
        pr.vol = Number(range.value);
        applyVol();
      });
      btn.addEventListener("click", () => {
        pr.muted = !pr.muted;
        setT(btn, pr.muted ? "unmute" : "mute");
        applyVol();
      });
      ctl.append(range, btn);
      row.append(name, ctl);
      box.appendChild(row);
    });
  });
}

function refreshOv() {
  drawAudio();
  if (hosting) {
    $("hostOverlay").hidden = tiles.size > 0;
    return;
  }
  if (!vLive) return;
  if (tiles.size) {
    $("viewOverlay").hidden = true;
    return;
  }
  $("viewOverlay").hidden = false;
  setT($("viewOverlay"), shrIds.size ? "connecting" : "waiting");
}

function toggleBig(el) {
  if (!gridEl) return;
  const was = el.classList.contains("big");
  gridEl.querySelectorAll(".tile.big").forEach((x) => x.classList.remove("big"));
  if (!was) el.classList.add("big");
  relayout();
}

function newTile(owner, local) {
  const el = document.createElement("div");
  el.className = "tile";
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  const video = document.createElement("video");
  video.className = "v-screen";
  video.autoplay = true;
  video.playsInline = true;
  const camVideo = document.createElement("video");
  camVideo.className = "v-cam";
  camVideo.autoplay = true;
  camVideo.playsInline = true;
  camVideo.muted = true;
  const tag = document.createElement("span");
  tag.className = "tag";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "back-grid";
  setT(backBtn, "backToGrid");
  backBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleBig(el);
  });
  el.append(video, camVideo, tag, backBtn);
  const isSmall = (v) => {
    if (!el.classList.contains("has-cam") || !el.classList.contains("has-screen")) return false;
    return v === camVideo ? !el.classList.contains("swap") : el.classList.contains("swap");
  };
  [video, camVideo].forEach((v) => {
    v.addEventListener("click", (ev) => {
      if (!isSmall(v)) return;
      ev.stopPropagation();
      el.classList.toggle("swap");
    });
  });
  const activate = () => {
    if (tiles.size >= 2 && !el.classList.contains("big")) toggleBig(el);
  };
  el.addEventListener("click", activate);
  el.addEventListener("keydown", (ev) => {
    if (ev.target !== el) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      activate();
    }
  });
  gridEl.appendChild(el);
  const t = { el, video, camVideo, tag, local, screen: null, cam: null };
  tiles.set(owner, t);
  return t;
}

function fixTile(t) {
  t.el.classList.toggle("has-cam", !!t.cam);
  t.el.classList.toggle("has-screen", !!t.screen);
  if (!t.cam || !t.screen) t.el.classList.remove("swap");
  t.tag.classList.toggle("live", !!(t.cam || t.screen));
}

function nickOf(owner) {
  return shrNames.get(owner) || shrNames.get(owner + CAM) || "";
}

function warnSound() {
  if (!hosting) $("soundWarn").hidden = false;
}

function putSrc(owner, cam, nick, mediaStream, local) {
  if (!gridEl) return;
  const t = tiles.get(owner) || newTile(owner, local);
  t.local = local;
  const vid = cam ? t.camVideo : t.video;
  if (cam) {
    t.cam = mediaStream;
    t.camVideo.classList.toggle("mirror", local);
  } else {
    t.screen = mediaStream;
  }
  if (local) {
    setT(t.tag, "youTag", { name: nick });
  } else {
    delete t.tag.dataset.i18n;
    delete t.tag.dataset.vars;
    t.tag.textContent = nick;
  }
  t.el.setAttribute("aria-label", t.tag.textContent);
  if (vid.srcObject !== mediaStream) vid.srcObject = mediaStream;
  fixTile(t);
  applyVol();
  const started = vid.play();
  if (started && started.catch) {
    started.catch((err) => {
      if (!err || err.name !== "NotAllowedError") return;
      vMuted = true;
      applyVol();
      updateMuteBtn();
      warnSound();
      const again = vid.play();
      if (again && again.catch) again.catch(() => {});
    });
  }
  setupAutoPip(true);
  relayout();
  refreshOv();
}

function delSrc(owner, cam) {
  const t = tiles.get(owner);
  if (!t) return;
  if (cam) {
    t.cam = null;
    t.camVideo.srcObject = null;
  } else {
    t.screen = null;
    t.video.srcObject = null;
  }
  if (!t.cam && !t.screen) {
    t.el.remove();
    tiles.delete(owner);
  } else {
    fixTile(t);
  }
  relayout();
  refreshOv();
}

function wipeTiles() {
  tiles.forEach((t) => {
    t.video.srcObject = null;
    t.camVideo.srcObject = null;
    t.el.remove();
  });
  tiles.clear();
  audPrefs.clear();
  audSig = "";
  relayout();
  refreshOv();
}

function takeCall(call) {
  const sid = sidOf(call);
  const owner = call.peer;
  const cam = isCam(sid);
  const old = inC.get(sid);
  inC.set(sid, call);
  if (old) old.close();
  call.answer();
  call.on("stream", (remote) => {
    if (inC.get(sid) !== call) return;
    clearTimeout(vTimer);
    putSrc(owner, cam, nickOf(owner), remote, false);
  });
  call.on("close", () => {
    if (inC.get(sid) === call) {
      inC.delete(sid);
      delSrc(owner, cam);
    }
  });
}

function onCall(call) {
  const sid = sidOf(call);
  if (shrIds.has(sid)) {
    takeCall(call);
    return;
  }
  const prev = held.get(sid);
  if (prev) prev.close();
  held.set(sid, call);
  setTimeout(() => {
    if (held.get(sid) === call) {
      held.delete(sid);
      call.close();
    }
  }, 10000);
}

function setRoster(list) {
  const next = new Map();
  list.forEach((s) => {
    if (s && typeof s.id === "string" && typeof s.nick === "string") next.set(s.id, cleanNick(s.nick));
  });
  shrNames = next;
  shrIds = new Set(next.keys());
  inC.forEach((call, sid) => {
    if (!next.has(sid)) {
      inC.delete(sid);
      call.close();
      delSrc(ownerOf(sid), isCam(sid));
    }
  });
  [...tiles].forEach(([id, t]) => {
    if (t.local) return;
    if (t.screen && !next.has(id)) delSrc(id, false);
    if (t.cam && !next.has(id + CAM)) delSrc(id, true);
  });
  next.forEach((nick, sid) => {
    const t = tiles.get(ownerOf(sid));
    if (t && !t.local) {
      t.tag.textContent = nick;
      t.el.setAttribute("aria-label", nick);
    }
    const st = held.get(sid);
    if (st) {
      held.delete(sid);
      takeCall(st);
    }
  });
  refreshWatch();
  refreshOv();
}

function openViewPanel() {
  closeChat();
  closeCfg();
  $("viewPanel").classList.add("open");
  $("viewPanel").setAttribute("aria-hidden", "false");
  $("viewBackdrop").hidden = false;
}

function closeViewPanel() {
  $("viewPanel").classList.remove("open");
  $("viewPanel").setAttribute("aria-hidden", "true");
  $("viewBackdrop").hidden = true;
}

function eqNick(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function bounce(conn, msg) {
  conn.send(msg);
  setTimeout(() => conn.close(), 500);
}

async function getIp(conn) {
  try {
    const pc = conn.peerConnection;
    if (!pc) return null;
    const stats = await pc.getStats();
    let ip = null;
    stats.forEach((r) => {
      if (r.type === "candidate-pair" && r.state === "succeeded" && (r.nominated || r.selected)) {
        const rc = stats.get(r.remoteCandidateId);
        const addr = rc && (rc.address || rc.ip);
        if (addr && !String(addr).endsWith(".local")) ip = String(addr);
      }
    });
    return ip;
  } catch (e) {
    return null;
  }
}

function banLeft(key) {
  const until = bans.get(key);
  if (!until) return 0;
  if (until <= Date.now()) {
    bans.delete(key);
    return 0;
  }
  return until;
}

function fixChatIn() {
  $("chatInput").disabled = chatMute;
  $("chatSend").disabled = chatMute;
  $("chatInput").placeholder = t(chatMute ? "chatMutedPh" : "chatPlaceholder");
}

function rmMsg(id) {
  const row = $("chatList").querySelector('[data-id="' + id + '"]');
  if (row) row.remove();
}

function dropMsg(id) {
  rmMsg(id);
  const i = chatBuf.findIndex((m) => m.id === id);
  if (i >= 0) chatBuf.splice(i, 1);
  viewers.forEach((v) => {
    if (v.conn.open) v.conn.send({ del: id });
  });
  syncSucc();
}

function toggleMute(id) {
  const v = viewers.get(id);
  if (!v) return;
  v.muted = !v.muted;
  if (v.vid) {
    if (v.muted) mutedVids.add(v.vid);
    else mutedVids.delete(v.vid);
  }
  if (v.conn.open) v.conn.send({ muted: v.muted });
  drawPeople();
  syncSucc();
}

function boot(id) {
  const v = viewers.get(id);
  if (!v) return;
  if (v.vid) {
    bans.set("vid:" + v.vid, Date.now() + BAN);
    allowed.delete(v.vid);
  }
  if (v.ip) bans.set("ip:" + v.ip, Date.now() + BAN_IP);
  if (v.conn.open) v.conn.send({ kicked: true, wait: BAN / 1000 });
  setTimeout(() => v.conn.close(), 500);
  dropView(id);
}

function pid(code, g) {
  return PFX + code + (g ? "-" + g : "");
}

function hostId() {
  return hostPid;
}

function shrList() {
  const list = [];
  if (stream) list.push({ id: hostId(), nick: myNick });
  if (camStream) list.push({ id: hostId() + CAM, nick: myNick });
  viewers.forEach((v, id) => {
    if (v.sharing) list.push({ id, nick: v.nick });
    if (v.camSharing) list.push({ id: id + CAM, nick: v.nick });
  });
  return list;
}

function countShr(cam) {
  return shrList().filter((s) => isCam(s.id) === cam).length;
}

function bcastShr() {
  const list = shrList();
  setRoster(list);
  viewers.forEach((v) => {
    if (v.conn.open) v.conn.send({ sharers: list });
  });
}

function dropScr(id) {
  const c = inC.get(id);
  if (c) {
    inC.delete(id);
    c.close();
  }
  delSrc(id, false);
}

function dropCamM(id) {
  const k = id + CAM;
  const c = inC.get(k);
  if (c) {
    inC.delete(k);
    c.close();
  }
  delSrc(id, true);
}

function dropShr(id) {
  dropScr(id);
  dropCamM(id);
}

function okShare(id) {
  const v = viewers.get(id);
  if (!v) return;
  v.canShare = true;
  v.wantsShare = false;
  if (v.vid) grants.add(v.vid);
  if (v.conn.open) v.conn.send({ canShare: true });
  hostCount();
}

function rejShare(id) {
  const v = viewers.get(id);
  if (!v) return;
  v.wantsShare = false;
  if (v.conn.open) v.conn.send({ shareDenied: "denied" });
  hostCount();
}

function pullShare(id) {
  const v = viewers.get(id);
  if (!v) return;
  const was = v.sharing;
  v.canShare = false;
  v.wantsShare = false;
  v.sharing = false;
  if (v.vid) grants.delete(v.vid);
  if (was) dropScr(id);
  if (v.conn.open) v.conn.send({ canShare: false });
  if (was) bcastShr();
  hostCount();
}

function okCam(id) {
  const v = viewers.get(id);
  if (!v) return;
  v.canCam = true;
  v.wantsCam = false;
  if (v.vid) camGrants.add(v.vid);
  if (v.conn.open) v.conn.send({ canCam: true });
  hostCount();
}

function rejCam(id) {
  const v = viewers.get(id);
  if (!v) return;
  v.wantsCam = false;
  if (v.conn.open) v.conn.send({ camDenied: "denied" });
  hostCount();
}

function pullCam(id) {
  const v = viewers.get(id);
  if (!v) return;
  const was = v.camSharing;
  v.canCam = false;
  v.wantsCam = false;
  v.camSharing = false;
  if (v.vid) camGrants.delete(v.vid);
  if (was) dropCamM(id);
  if (v.conn.open) v.conn.send({ canCam: false });
  if (was) bcastShr();
  hostCount();
}

function onShareRequest(v) {
  if (!isMulti || v.canShare || v.wantsShare) return;
  v.wantsShare = true;
  drawReqs();
  notify("share-" + v.nick, t("title"), t("requestText", { name: v.nick }));
}

function onCamRequest(v) {
  if (!isMulti || v.canCam || v.wantsCam) return;
  v.wantsCam = true;
  drawReqs();
  notify("cam-" + v.nick, t("title"), t("camRequestText", { name: v.nick }));
}

function peerTargets(skip) {
  const targets = [hostId()];
  viewers.forEach((o, oid) => {
    if (oid !== skip) targets.push(oid);
  });
  return targets;
}

function onShareStart(id, v) {
  if (!isMulti || !v.canShare) {
    if (v.conn.open) v.conn.send({ shareDenied: "noperm" });
    return;
  }
  if (v.sharing) return;
  if (countShr(false) >= MAX_SHR) {
    if (v.conn.open) v.conn.send({ shareDenied: "limit" });
    return;
  }
  v.sharing = true;
  bcastShr();
  if (v.conn.open) v.conn.send({ targets: peerTargets(id) });
  hostCount();
}

function onCamStart(id, v) {
  if (!isMulti || !v.canCam) {
    if (v.conn.open) v.conn.send({ camDenied: "noperm" });
    return;
  }
  if (v.camSharing) return;
  if (countShr(true) >= MAX_CAM) {
    if (v.conn.open) v.conn.send({ camDenied: "limit" });
    return;
  }
  v.camSharing = true;
  bcastShr();
  if (v.conn.open) v.conn.send({ camTargets: peerTargets(id) });
  hostCount();
}

function onShareStop(id, v) {
  if (!v.sharing) return;
  v.sharing = false;
  dropScr(id);
  bcastShr();
  hostCount();
}

function onCamStop(id, v) {
  if (!v.camSharing) return;
  v.camSharing = false;
  dropCamM(id);
  bcastShr();
  hostCount();
}

function reqRow(textKey, name, onYes, onNo) {
  const row = document.createElement("div");
  row.className = "request";
  const text = document.createElement("span");
  setT(text, textKey, { name: name });
  const yes = document.createElement("button");
  yes.className = "primary";
  setT(yes, "allow");
  yes.addEventListener("click", onYes);
  const no = document.createElement("button");
  setT(no, "deny");
  no.addEventListener("click", onNo);
  row.append(text, yes, no);
  return row;
}

function drawReqs() {
  const box = $("shareRequests");
  box.innerHTML = "";
  viewers.forEach((v, id) => {
    if (v.wantsShare) box.appendChild(reqRow("requestText", v.nick, () => okShare(id), () => rejShare(id)));
    if (v.wantsCam) box.appendChild(reqRow("camRequestText", v.nick, () => okCam(id), () => rejCam(id)));
  });
}

function drawPeople() {
  const box = $("people");
  if (box.hidden) return;
  box.innerHTML = "";
  if (!viewers.size) {
    const e = document.createElement("div");
    e.className = "status";
    setT(e, "noPeople");
    box.appendChild(e);
    return;
  }
  viewers.forEach((v, id) => {
    const row = document.createElement("div");
    row.className = "person";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = v.nick;
    row.appendChild(name);
    if (v.canShare) {
      const rev = document.createElement("button");
      rev.className = "mini";
      setT(rev, "revokeShare");
      rev.addEventListener("click", () => pullShare(id));
      row.appendChild(rev);
    }
    if (v.canCam) {
      const rev = document.createElement("button");
      rev.className = "mini";
      setT(rev, "revokeCam");
      rev.addEventListener("click", () => pullCam(id));
      row.appendChild(rev);
    }
    const mute = document.createElement("button");
    mute.className = "mini";
    setT(mute, v.muted ? "unmuteUser" : "muteUser");
    mute.addEventListener("click", () => toggleMute(id));
    const kick = document.createElement("button");
    kick.className = "mini stop";
    setT(kick, "kickUser");
    kick.addEventListener("click", () => boot(id));
    row.append(mute, kick);
    box.appendChild(row);
  });
}

function watchNames() {
  if (hosting) return [...viewers.values()].map((v) => ({ n: v.nick, me: false }));
  return roomWho.slice(1).map((x) => ({ n: x.n, me: !!x.m }));
}

function drawWatch(pop) {
  pop.innerHTML = "";
  const head = document.createElement("div");
  head.className = "eyehead";
  setT(head, "watchingNow");
  pop.appendChild(head);
  const list = watchNames();
  if (!list.length) {
    const e = document.createElement("div");
    e.className = "eyeempty";
    setT(e, "noWatchers");
    pop.appendChild(e);
    return;
  }
  const live = new Set(shrNames.values());
  list.forEach((x) => {
    const row = document.createElement("div");
    row.className = "eyename" + (live.has(x.n) ? " live" : "");
    if (x.me) {
      setT(row, "youTag", { name: x.n });
    } else {
      row.textContent = x.n;
    }
    pop.appendChild(row);
  });
}

function refreshWatch() {
  document.querySelectorAll(".eyepop").forEach((pop) => {
    if (!pop.hidden) drawWatch(pop);
  });
}

function closeWatch() {
  document.querySelectorAll(".eyepop").forEach((pop) => {
    pop.hidden = true;
    delete pop.dataset.by;
  });
}

function setupEye(wrapId) {
  const wrap = $(wrapId);
  const badge = wrap.querySelector(".eye");
  const pop = wrap.querySelector(".eyepop");
  const open = (by) => {
    drawWatch(pop);
    pop.dataset.by = by;
    pop.hidden = false;
  };
  const close = () => {
    pop.hidden = true;
    delete pop.dataset.by;
  };
  wrap.addEventListener("mouseenter", () => {
    if (pop.hidden) open("hover");
  });
  wrap.addEventListener("mouseleave", () => {
    if (pop.dataset.by !== "click") close();
  });
  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    if (pop.hidden) {
      open("click");
    } else if (pop.dataset.by === "click") {
      close();
    } else {
      pop.dataset.by = "click";
    }
  });
  badge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      badge.click();
    }
  });
}
function cleanNick(s) {
  return String(s || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);
}

function saveNick(n) {
  try { localStorage.setItem("nick", n); } catch (e) {}
  try { sessionStorage.setItem("nick", n); } catch (e) {}
}

function requireNick() {
  const n = cleanNick($("nick").value);
  if (!n) {
    setSt($("homeStatus"), "nickRequired", true);
    $("nick").focus();
    return false;
  }
  myNick = n;
  saveNick(n);
  return true;
}

function updateUnread() {
  document.querySelectorAll(".unread").forEach((el) => {
    el.textContent = unreadN > 99 ? "99+" : String(unreadN);
    el.hidden = unreadN === 0;
  });
}

function openChat() {
  closeOpts();
  closeViewPanel();
  closeCfg();
  updateGifBtn();
  $("chatPanel").classList.add("open");
  $("chatPanel").setAttribute("aria-hidden", "false");
  unreadN = 0;
  updateUnread();
  $("chatList").scrollTop = $("chatList").scrollHeight;
  $("chatInput").focus();
}

function closeChat() {
  $("chatPanel").classList.remove("open");
  $("chatPanel").setAttribute("aria-hidden", "true");
}

function toggleChat() {
  if ($("chatPanel").classList.contains("open")) {
    closeChat();
  } else {
    openChat();
  }
}

function clearChat() {
  closeChat();
  closeGifBox();
  roomWho = [];
  $("chatList").innerHTML = "";
  $("people").hidden = true;
  $("people").innerHTML = "";
  chatMute = false;
  unreadN = 0;
  fixChatIn();
  updateUnread();
}

function addChat(m, mod) {
  if (!m || typeof m.nick !== "string" || typeof m.text !== "string") return;
  const list = $("chatList");
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  const row = document.createElement("div");
  row.className = "msg";
  if (Number.isInteger(m.id)) row.dataset.id = String(m.id);
  const who = document.createElement("strong");
  who.textContent = m.nick.slice(0, 20) + ":";
  const body = document.createElement("span");
  body.textContent = " " + m.text.slice(0, MSG_MAX);
  row.appendChild(who);
  row.appendChild(body);
  if (mod && Number.isInteger(m.id)) {
    const del = document.createElement("button");
    del.className = "mini";
    setT(del, "delMsg");
    del.addEventListener("click", () => dropMsg(m.id));
    row.appendChild(del);
  }
  const gifUrl = validGif(m.gif);
  if (gifUrl) {
    const img = document.createElement("img");
    img.className = "gifmsg";
    img.src = gifUrl;
    img.alt = "GIF";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    row.appendChild(img);
  }
  list.appendChild(row);
  while (list.children.length > 200) list.removeChild(list.firstChild);
  if (nearBottom) list.scrollTop = list.scrollHeight;
  if (!$("chatPanel").classList.contains("open")) {
    unreadN++;
    updateUnread();
  }
}

function broadcastChat(nick, text, gif) {
  const m = { id: ++msgSeq, nick: nick, text: text };
  if (gif) m.gif = gif;
  chatBuf.push(m);
  if (chatBuf.length > 50) chatBuf.shift();
  addChat(m, true);
  viewers.forEach((v) => {
    if (v.conn.open) v.conn.send({ chat: m });
  });
  syncSucc();
}

function validGif(u) {
  if (typeof u !== "string" || u.length > 400) return "";
  try {
    const x = new URL(u);
    if (x.protocol !== "https:" || x.username || x.password || x.port) return "";
    if (x.hostname !== "klipy.com" && !x.hostname.endsWith(".klipy.com")) return "";
    return x.href;
  } catch (e) {
    return "";
  }
}

function gifPick(item, order) {
  const f = item && item.file;
  if (!f || typeof f !== "object") return "";
  for (const k of order) {
    const ok = validGif(f[k] && f[k].gif && f[k].gif.url);
    if (ok) return ok;
  }
  return "";
}

async function gifSearch(q) {
  const base = GIF_API + encodeURIComponent(GIF_KEY) + "/gifs/" + (q ? "search" : "trending");
  const url = base + "?per_page=" + GIF_N + (q ? "&q=" + encodeURIComponent(q) : "");
  const r = await fetch(url);
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  const list = j && j.data && Array.isArray(j.data.data) ? j.data.data : [];
  return list
    .filter((it) => it && it.type !== "ad")
    .map((it) => ({ thumb: gifPick(it, ["sm", "xs", "md"]), full: gifPick(it, ["md", "sm", "hd"]) }))
    .filter((x) => x.thumb && x.full);
}

function clearGifNote() {
  const note = $("gifNote");
  delete note.dataset.i18n;
  delete note.dataset.vars;
  note.textContent = "";
}

async function loadGifs() {
  const grid = $("gifGrid");
  const note = $("gifNote");
  if (!GIF_KEY || GIF_KEY.startsWith("COLE")) {
    grid.innerHTML = "";
    setT(note, "gifNoKey");
    return;
  }
  const mine = ++gifSeq;
  setT(note, "gifLoading");
  try {
    const list = await gifSearch($("gifQuery").value.trim().slice(0, 50));
    if (mine !== gifSeq) return;
    grid.innerHTML = "";
    if (!list.length) {
      setT(note, "gifEmpty");
      return;
    }
    clearGifNote();
    list.forEach((x) => {
      const b = document.createElement("button");
      b.type = "button";
      const img = document.createElement("img");
      img.src = x.thumb;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      b.appendChild(img);
      b.addEventListener("click", () => sendGif(x.full));
      grid.appendChild(b);
    });
  } catch (e) {
    if (mine !== gifSeq) return;
    grid.innerHTML = "";
    setT(note, "gifError");
  }
}

function openGifBox() {
  $("gifBox").hidden = false;
  $("gifQuery").value = "";
  loadGifs();
  $("gifQuery").focus();
}

function closeGifBox() {
  $("gifBox").hidden = true;
  gifSeq++;
  clearTimeout(gifTimer);
}

function updateGifBtn() {
  const on = hosting || vGifs;
  $("gifBtn").hidden = !on;
  if (!on) closeGifBox();
}

function sendGif(url) {
  const u = validGif(url);
  if (!u) return;
  if (hosting) {
    broadcastChat(myNick, "", u);
  } else if (vConn && vConn.open && vGifs) {
    vConn.send({ gif: u });
  } else {
    return;
  }
  closeGifBox();
}

function sendChat() {
  const input = $("chatInput");
  const text = input.value.trim().slice(0, MSG_MAX);
  if (!text) return;
  if (hosting) {
    broadcastChat(myNick, text);
  } else if (vConn && vConn.open) {
    vConn.send({ msg: text });
  } else {
    return;
  }
  input.value = "";
}

function pipSupported() {
  return !!document.pictureInPictureEnabled || typeof document.createElement("video").webkitSetPresentationMode === "function";
}

async function enterPip(video, statusEl) {
  try {
    if (!video) throw new Error("none");
    if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
      if (video.readyState === 0) throw new Error("not ready");
      await video.requestPictureInPicture();
    } else if (typeof video.webkitSetPresentationMode === "function") {
      video.webkitSetPresentationMode("picture-in-picture");
    }
  } catch (e) {
    setSt(statusEl, "pipFail", true);
  }
}

function closePipDialog() {
  $("pipDialog").hidden = true;
  $("pipBackdrop").hidden = true;
}

function openPipDialog(statusEl) {
  const box = $("pipList");
  box.innerHTML = "";
  tiles.forEach((tl) => {
    const b = document.createElement("button");
    b.textContent = tl.tag.textContent || "?";
    b.addEventListener("click", () => {
      closePipDialog();
      enterPip(tl.screen ? tl.video : tl.camVideo, statusEl);
    });
    box.appendChild(b);
  });
  $("pipBackdrop").hidden = false;
  $("pipDialog").hidden = false;
}

async function togglePip(statusEl) {
  if (document.pictureInPictureElement) {
    try { await document.exitPictureInPicture(); } catch (e) {}
    return;
  }
  const webkitOn = [...tiles.values()].map((tl) => (tl.screen ? tl.video : tl.camVideo)).find((v) => v.webkitPresentationMode === "picture-in-picture");
  if (webkitOn) {
    webkitOn.webkitSetPresentationMode("inline");
    return;
  }
  if (tiles.size > 1) {
    openPipDialog(statusEl);
    return;
  }
  enterPip(topVideo(), statusEl);
}

function setupAutoPip(active) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.setActionHandler(
      "enterpictureinpicture",
      active ? () => {
        const v = topVideo();
        if (v) v.requestPictureInPicture().catch(() => {});
      } : null
    );
  } catch (e) {}
}

function leavePip() {
  setupAutoPip(false);
  if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
}

function getViewerId() {
  let id = null;
  try { id = localStorage.getItem("viewerId"); } catch (e) {}
  if (!id) {
    id = rndCode() + rndCode();
    try { localStorage.setItem("viewerId", id); } catch (e) {}
  }
  return id;
}

function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.pt[key] || key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      let val = String(vars[k]);
      if (k === "m" && lang === "pt") val = val.replace(".", ",");
      s = s.replace("{" + k + "}", () => val);
    });
  }
  return s;
}

function setT(el, key, vars) {
  el.dataset.i18n = key;
  if (vars) {
    el.dataset.vars = JSON.stringify(vars);
  } else {
    delete el.dataset.vars;
  }
  el.textContent = t(key, vars);
}

function fillQuality() {
  [$("quality"), $("liveQuality"), $("viewQuality")].forEach((sel) => {
    const keep = sel.value || "r720";
    sel.innerHTML = "";
    RES_LIST.forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = RES[k].label;
      sel.appendChild(o);
    });
    sel.value = RES[keep] ? keep : "r720";
  });
  [$("liveCamQuality"), $("viewCamQuality")].forEach((sel) => {
    const keep = sel.value || camKey;
    sel.innerHTML = "";
    CAM_LIST.forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = t("q_" + k);
      sel.appendChild(o);
    });
    sel.value = CAM_QS[keep] ? keep : camKey;
  });
  refreshLocks();
}

function applyLang() {
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const vars = el.dataset.vars ? JSON.parse(el.dataset.vars) : null;
    el.textContent = t(el.dataset.i18n, vars);
  });
  $("codeInput").placeholder = t("codePlaceholder");
  $("nick").placeholder = t("nickPlaceholder");
  $("nickNew").placeholder = t("nickPlaceholder");
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  ["homeStatusX", "viewStatusX"].forEach((id) => $(id).setAttribute("aria-label", t("close")));
  document.querySelectorAll("[data-tipkey]").forEach((el) => {
    const txt = t(el.dataset.tipkey);
    el.dataset.tip = txt;
    el.setAttribute("aria-label", txt);
  });
  refreshBtns();
  $("settingsBtn").title = t("settings");
  $("settingsBtn").setAttribute("aria-label", t("settings"));
  fixChatIn();
  fillQuality();
  refreshWatch();
  $("langPt").classList.toggle("active", lang === "pt");
  $("langEn").classList.toggle("active", lang === "en");
}

function detectLang() {
  let saved = null;
  try { saved = localStorage.getItem("lang"); } catch (e) {}
  if (saved === "pt" || saved === "en") return saved;
  return (navigator.language || "pt").toLowerCase().startsWith("pt") ? "pt" : "en";
}

function setLang(l) {
  lang = l;
  try { localStorage.setItem("lang", l); } catch (e) {}
  applyLang();
}

function closeAudioPops() {
  $("audioPopHost").hidden = true;
  $("audioPopView").hidden = true;
}

function toggleAudioPop(id) {
  const opening = $(id).hidden;
  closeAudioPops();
  $(id).hidden = !opening;
}

function updateHostAudioIcon() {
  const track = stream && stream.getAudioTracks()[0];
  $("audioBtnHost").classList.toggle("muted", !!track && !track.enabled);
}

function show(section) {
  closeAudioPops();
  closeWatch();
  home.hidden = section !== home;
  hostView.hidden = section !== hostView;
  viewerView.hidden = section !== viewerView;
  updView();
}

let lastBtn = null;
let lastBtnAt = 0;
document.addEventListener("click", (e) => {
  const b = e.target.closest("button, .btnlink, select");
  if (b) {
    lastBtn = b;
    lastBtnAt = Date.now();
  }
}, true);

document.querySelectorAll("select").forEach((s) => {
  if (s.parentElement.classList.contains("selwrap")) return;
  const w = document.createElement("span");
  w.className = "selwrap";
  s.parentNode.insertBefore(w, s);
  w.appendChild(s);
  let byPointer = false;
  s.addEventListener("pointerdown", () => { byPointer = true; });
  s.addEventListener("change", () => {
    if (byPointer) setTimeout(() => s.blur(), 0);
    byPointer = false;
  });
  s.addEventListener("blur", () => { byPointer = false; });
});

function wiggle(el) {
  if (!el || !cfg.animations) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  el.addEventListener("animationend", () => el.classList.remove("shake"), { once: true });
}

function wiggleErr(key) {
  if (key === "nickRequired") return wiggle($("nick"));
  if (key === "codeLength") return wiggle($("codeInput"));
  if (lastBtn && Date.now() - lastBtnAt < 2000) wiggle(lastBtn);
}

function setSt(el, key, isError, vars) {
  if (key) {
    setT(el, key, vars);
  } else {
    delete el.dataset.i18n;
    delete el.dataset.vars;
    el.textContent = "";
  }
  el.className = isError ? "status error" : "status";
  if (isError && key) wiggleErr(key);
  if (el.id !== "homeStatus" && el.id !== "viewStatus") return;
  stopFade(el);
  const x = $(el.id + "X");
  if (x) x.hidden = !(key && isError);
  if (key && !isError && key !== "nickToJoin" && key !== "hostUpload") {
    el._ft = setTimeout(() => fadeOut(el), 2000);
  }
}

function stopFade(el) {
  clearTimeout(el._ft);
  clearInterval(el._fi);
}

function fadeOut(el) {
  const text = el.textContent;
  if (!text) return;
  delete el.dataset.i18n;
  delete el.dataset.vars;
  el.textContent = "";
  const spans = Array.from(text).map((ch) => {
    const sp = document.createElement("span");
    sp.textContent = ch;
    sp.style.transition = "opacity 0.25s";
    el.appendChild(sp);
    return sp;
  });
  let i = spans.length - 1;
  const step = Math.max(25, Math.min(70, Math.floor(900 / spans.length)));
  el._fi = setInterval(() => {
    if (i < 0) {
      clearInterval(el._fi);
      el.textContent = "";
      return;
    }
    spans[i].style.opacity = "0";
    i--;
  }, step);
}

function openOpts() {
  closeChat();
  closeCfg();
  $("panel").classList.add("open");
  $("panel").setAttribute("aria-hidden", "false");
  $("backdrop").hidden = false;
}

function closeOpts() {
  $("panel").classList.remove("open");
  $("panel").setAttribute("aria-hidden", "true");
  $("backdrop").hidden = true;
}

function isSharp(key) {
  return key === "r1440" || key === "r2160";
}

async function grabScr(q, withAudio) {
  if (!canCapture) return null;
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser",
        width: { max: q.width },
        height: { max: q.height },
        frameRate: { ideal: q.fps, max: q.fps }
      },
      audio: withAudio,
      systemAudio: "include"
    });
  } catch (err) {
    return null;
  }
}

async function grabCam(q) {
  if (!canCam) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: q.width },
        height: { ideal: q.height },
        frameRate: { ideal: q.fps }
      },
      audio: false
    });
  } catch (err) {
    return null;
  }
}

let camBlocked = false;

function setBtn(btn, vis, state, tipKey, blockedKey) {
  btn.hidden = !vis;
  const blocked = !!blockedKey && state !== "live";
  btn.classList.toggle("st-blocked", blocked);
  btn.classList.toggle("st-allowed", !blocked && state === "allowed");
  btn.classList.toggle("st-live", !blocked && state === "live");
  btn.disabled = state === "wait";
  const txt = t(blocked ? blockedKey : tipKey);
  btn.dataset.tip = txt;
  btn.setAttribute("aria-label", txt);
}

function refreshBtns() {
  const scrBlock = canCapture ? null : "tipBlockedShare";
  const camBlock = canCam && !camBlocked ? null : "tipBlockedCam";
  setBtn($("scrHostBtn"), hosting, stream ? "live" : "idle", stream ? "stopShare" : "pickSurface", scrBlock);
  setBtn($("camHostBarBtn"), hosting, camStream ? "live" : "idle", camStream ? "camOff" : "camOn", camBlock);
  const inRoom = !hosting && inMulti;
  const sMap = { none: ["idle", "reqShare"], requested: ["wait", "reqSent"], allowed: ["allowed", "shareNow"], sharing: ["live", "stopShare"] };
  const cMap = { none: ["idle", "reqCam"], requested: ["wait", "camReqSent"], allowed: ["allowed", "camOn"], sharing: ["live", "camOff"] };
  const s = sMap[scrState] || sMap.none;
  const c = cMap[camState] || cMap.none;
  setBtn($("scrViewBtn"), inRoom, s[0], s[1], scrBlock);
  setBtn($("camViewBtn"), inRoom, c[0], c[1], camBlock);
}

if (navigator.permissions && navigator.permissions.query) {
  navigator.permissions.query({ name: "camera" }).then((p) => {
    const sync = () => {
      camBlocked = p.state === "denied";
      refreshBtns();
    };
    p.addEventListener("change", sync);
    sync();
  }).catch(() => {});
}

function camUI() {
  $("camHostBox").hidden = !hosting || !canCam;
  refreshBtns();
}

function shareUI(on) {
  $("shareBtn").hidden = !canCapture || !on;
  setT($("shareBtn"), "switchSurface");
  $("hostMute").disabled = !on || !stream || !stream.getAudioTracks().length;
  setT($("hostMute"), "muteAudio");
  updateHostAudioIcon();
  camUI();
}

function sendScr(id, v) {
  if (v.call) v.call.close();
  v.call = peer.call(id, stream);
  capBitrate(v.call, quality.kbps);
}

function sendCam(id, v) {
  if (v.camCall) v.camCall.close();
  v.camCall = peer.call(id, camStream, { metadata: { cam: true } });
  capBitrate(v.camCall, camQ.kbps);
}

function useScr(newStream) {
  const old = stream;
  stream = newStream;
  const track = newStream.getVideoTracks()[0];
  track.contentHint = isSharp(qKey) ? "detail" : "";
  track.addEventListener("ended", () => {
    if (stream === newStream) stopScr();
  });
  putSrc("me", false, myNick, newStream, true);
  if (old) old.getTracks().forEach((tr) => tr.stop());
  shareUI(true);
  bcastShr();
  viewers.forEach((v, id) => sendScr(id, v));
  hostCount();
  $("audioNote").hidden = !($("audio").checked && !newStream.getAudioTracks().length);
}

function useCam(newStream) {
  camStream = newStream;
  const track = newStream.getVideoTracks()[0];
  track.addEventListener("ended", () => {
    if (camStream === newStream) hostCamOff();
  });
  putSrc("me", true, myNick, newStream, true);
  camUI();
  bcastShr();
  viewers.forEach((v, id) => sendCam(id, v));
  hostCount();
}

async function hostCamOn() {
  if (camStream || !hosting) return;
  if (countShr(true) >= MAX_CAM) {
    setSt($("hostStatus"), "camLimit", true, { n: MAX_CAM });
    return;
  }
  const s = await grabCam(camQ);
  if (!s) {
    setSt($("hostStatus"), "camFailed", true);
    return;
  }
  if (!hosting || camStream) {
    s.getTracks().forEach((tr) => tr.stop());
    return;
  }
  useCam(s);
}

function hostCamOff() {
  if (!camStream) return;
  camStream.getTracks().forEach((tr) => tr.stop());
  camStream = null;
  delSrc("me", true);
  viewers.forEach((v) => {
    if (v.camCall) {
      v.camCall.close();
      v.camCall = null;
    }
  });
  camUI();
  bcastShr();
  hostCount();
}

function seenIp() {
  if (ipMem) return true;
  try { return localStorage.getItem("ipSeen") === "1"; } catch (e) { return false; }
}

function markIp() {
  ipMem = true;
  try { localStorage.setItem("ipSeen", "1"); } catch (e) {}
}

function openInfo(titleKey, bodyKey, gate) {
  return new Promise((res) => {
    if (infoRes) infoRes(false);
    infoRes = res;
    setT($("infoTitle"), titleKey);
    const box = $("infoBody");
    box.innerHTML = "";
    t(bodyKey).split("\n").forEach((line) => {
      const para = document.createElement("p");
      para.textContent = line;
      box.appendChild(para);
    });
    setT($("infoOk"), gate ? "ipOk" : "close");
    $("infoCancel").hidden = !gate;
    $("infoBackdrop").hidden = false;
    $("infoDialog").hidden = false;
    $("infoOk").focus();
  });
}

function closeInfo(val) {
  $("infoDialog").hidden = true;
  $("infoBackdrop").hidden = true;
  const r = infoRes;
  infoRes = null;
  if (r) r(val);
}

function needIp() {
  if (seenIp()) return Promise.resolve(true);
  return openInfo("ipTitle", "ipBody", true).then((ok) => {
    if (ok) markIp();
    return ok;
  });
}

function askVis() {
  return new Promise((res) => {
    if (visRes) visRes(null);
    visRes = res;
    document.querySelector('input[name="vis"][value="public"]').checked = true;
    $("visBackdrop").hidden = false;
    $("visDialog").hidden = false;
    $("visConfirm").focus();
  });
}

function closeVis(val) {
  $("visDialog").hidden = true;
  $("visBackdrop").hidden = true;
  const r = visRes;
  visRes = null;
  if (r) r(val);
}

async function hostStart(share, withCam) {
  if (!requireNick()) return;
  if (!(await needIp())) return;
  askNotif();
  qKey = $("quality").value;
  fpsValue = getFps($("fps"));
  quality = mkQ(qKey, fpsValue);
  pickQ = qKey;
  pickFps = fpsValue;
  lastAuto = 0;
  lastLim = 0;
  autoMsgSt = null;
  const vis = await askVis();
  if (!vis) return;
  let s = null;
  if (share) {
    s = await grabScr(quality, $("audio").checked);
    if (!s) {
      setSt($("homeStatus"), "shareFailed", true);
      return;
    }
  }
  let cs = null;
  if (withCam) {
    cs = await grabCam(camQ);
    if (!cs) {
      setSt($("homeStatus"), "camFailed", true);
      return;
    }
  }
  stopRes(true);
  if (hosting) closeRoom();
  isPriv = vis === "private";
  isMulti = !share;
  gifsOn = true;
  $("gifsToggle").checked = true;
  setT($("roomType"), isPriv ? "roomPrivateBadge" : "roomPublicBadge");
  setT($("hostSelfName"), "hostLabel", { name: myNick });
  hosting = true;
  gridEl = $("hostGrid");
  show(hostView);
  $("people").hidden = false;
  $("liveQuality").value = qKey;
  $("viewQuality").value = qKey;
  $("liveFps").value = fpsValue;
  $("viewFps").value = fpsValue;
  $("liveCamQuality").value = camKey;
  $("hostWarn").hidden = true;
  shareUI(false);
  refreshOv();
  monStart();
  peerHost(0);
  if (s) useScr(s);
  if (cs) useCam(cs);
}

async function swapScr() {
  if (!stream && countShr(false) >= MAX_SHR) {
    setSt($("hostStatus"), "shareLimit", true, { n: MAX_SHR });
    return;
  }
  const s = await grabScr(quality, $("audio").checked);
  if (s) useScr(s);
}

function stopScr() {
  if (!stream) return;
  leavePip();
  stream.getTracks().forEach((tr) => tr.stop());
  stream = null;
  $("audioNote").hidden = true;
  delSrc("me", false);
  viewers.forEach((v) => {
    if (v.call) {
      v.call.close();
      v.call = null;
    }
  });
  $("hostWarn").hidden = true;
  shareUI(false);
  bcastShr();
  hostCount();
}

function bcastAway() {
  const ms = away ? Math.max(0, away.deadline - Date.now()) : null;
  viewers.forEach((v) => {
    if (v.conn.open) v.conn.send({ away: ms });
  });
}

function tickAway() {
  if (!away) return;
  const left = away.deadline - Date.now();
  if (left <= 0) {
    closeRoom();
    setSt($("homeStatus"), "roomExpired");
    return;
  }
  $("awayHome").hidden = false;
  setT($("awayHomeText"), "awayHome", { code: roomCode, time: fmtTime(left) });
}

function stopAway() {
  if (away) clearInterval(away.tick);
  away = null;
  $("awayHome").hidden = true;
}

function goAway() {
  if (!hosting || away) return;
  closeOpts();
  closeChat();
  away = { deadline: Date.now() + AFK_MS, tick: null };
  show(home);
  setSt($("homeStatus"), "");
  bcastAway();
  away.tick = setInterval(tickAway, 1000);
  tickAway();
}

function backToRoom() {
  if (pendRes) {
    resumeNow();
    return;
  }
  if (!away) return;
  stopAway();
  show(hostView);
  bcastAway();
}

function closeRoom() {
  clearRoomUrl();
  leavePip();
  stopAway();
  bans.clear();
  mutedVids.clear();
  chatBuf.length = 0;
  msgSeq = 0;
  nickHist.clear();
  grants.clear();
  camGrants.clear();
  approvals.forEach((a) => {
    clearTimeout(a.timer);
    if (a.conn.open) a.conn.send({ closed: true });
    a.conn.close();
  });
  approvals.clear();
  clearQueue();
  grace = 0;
  allowed.clear();
  isPriv = false;
  isMulti = false;
  gifsOn = true;
  succSig = "";
  clearHS();
  $("hostNote").hidden = true;
  $("joinRequests").innerHTML = "";
  clearChat();
  monStop();
  $("audioNote").hidden = true;
  $("hostWarn").hidden = true;
  $("shareRequests").innerHTML = "";
  if (stream) {
    stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
  }
  if (camStream) {
    camStream.getTracks().forEach((tr) => tr.stop());
    camStream = null;
  }
  pending.forEach((p) => {
    clearTimeout(p.timer);
    if (p.conn.open) p.conn.send({ closed: true });
    p.conn.close();
  });
  pending.clear();
  viewers.forEach((v) => {
    if (v.conn.open) v.conn.send({ closed: true });
    if (v.call) v.call.close();
    if (v.camCall) v.camCall.close();
    v.conn.close();
  });
  viewers.clear();
  inC.forEach((c) => c.close());
  inC.clear();
  held.forEach((c) => c.close());
  held.clear();
  shrIds = new Set();
  shrNames = new Map();
  if (peer) {
    peer.destroy();
    peer = null;
  }
  hosting = false;
  wipeTiles();
  gridEl = null;
  if (document.fullscreenElement) document.exitFullscreen();
  if (myNick) $("nick").value = myNick;
  show(home);
  setSt($("homeStatus"), "roomEndedHome");
}

function rndCode() {
  let c = "";
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 6; i++) c += CHARS[buf[i] % CHARS.length];
  return c;
}

function fsEl(stage) {
  const big = stage.querySelector(".tile.big");
  return big || stage;
}

function toggleFs(el) {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else {
    setSt($("viewStatus"), "noFullscreen", true);
  }
}

function capBitrate(call, kbps) {
  let tries = 0;
  const timer = setInterval(() => {
    const pc = call.peerConnection;
    const senders = pc ? pc.getSenders().filter((s) => s.track && s.track.kind === "video") : [];
    if (senders.length) {
      clearInterval(timer);
      senders.forEach((s) => {
        const p = s.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = kbps * 1000;
        s.setParameters(p).catch(() => {});
      });
    } else if (++tries > 20) {
      clearInterval(timer);
    }
  }, 250);
}

function setQ(key, fps, auto) {
  qKey = key;
  fpsValue = fps;
  if (!auto) {
    pickQ = key;
    pickFps = fps;
  }
  quality = mkQ(key, fps);
  $("liveQuality").value = key;
  $("viewQuality").value = key;
  $("liveFps").value = fps;
  $("viewFps").value = fps;
  const track = stream && stream.getVideoTracks()[0];
  if (track) {
    track.contentHint = isSharp(key) ? "detail" : "";
    track.applyConstraints({
      width: { max: quality.width },
      height: { max: quality.height },
      frameRate: { ideal: quality.fps, max: quality.fps }
    }).catch(() => {});
  }
  viewers.forEach((v) => {
    if (v.call) capBitrate(v.call, quality.kbps);
  });
  outC.forEach((c, k) => {
    if (!isCam(k)) capBitrate(c, quality.kbps);
  });
  if (hosting) {
    hostCount();
    if (!auto) chkLoad();
  } else {
    viewUp();
  }
}

function setCamQ(key) {
  camKey = key;
  camQ = CAM_QS[key];
  $("liveCamQuality").value = key;
  $("viewCamQuality").value = key;
  const track = camStream && camStream.getVideoTracks()[0];
  if (track) {
    track.applyConstraints({
      width: { ideal: camQ.width },
      height: { ideal: camQ.height },
      frameRate: { ideal: camQ.fps }
    }).catch(() => {});
  }
  viewers.forEach((v) => {
    if (v.camCall) capBitrate(v.camCall, camQ.kbps);
  });
  outC.forEach((c, k) => {
    if (isCam(k)) capBitrate(c, camQ.kbps);
  });
  if (hosting) {
    hostCount();
  } else {
    viewUp();
  }
}

async function chkLoad() {
  const calls = hosting ? [...viewers.values()].flatMap((v) => [v.call, v.camCall]) : [...outC.values()];
  const box = hosting ? $("hostWarn") : $("viewWarn");
  const text = hosting ? $("hostWarnText") : $("viewWarnText");
  if (!stream && !camStream) {
    box.hidden = true;
    return;
  }
  const reasons = await Promise.all(calls.map(async (call) => {
    const pc = call && call.peerConnection;
    if (!pc) return "";
    try {
      const stats = await pc.getStats();
      let found = "";
      stats.forEach((r) => {
        if (r.type === "outbound-rtp" && r.kind === "video" && r.qualityLimitationReason && r.qualityLimitationReason !== "none") {
          found = r.qualityLimitationReason;
        }
      });
      return found;
    } catch (e) {
      return "";
    }
  }));
  let reason = "";
  reasons.forEach((r) => {
    if (r) reason = r;
  });
  if (!stream && !camStream) return;
  const now = Date.now();
  const limited = reason === "bandwidth" || reason === "cpu";
  if (limited) lastLim = now;
  const down = stream ? stepDown(qKey, fpsValue) : null;
  if (cfg.autoReduce && limited && now - lastAuto >= DOWN_WAIT) {
    if (down) {
      lastAuto = now;
      setQ(down.res, down.fps, true);
      autoMsg("autoLowered", qTxt(down.res, down.fps));
      return;
    }
    const ci = CAM_LIST.indexOf(camKey);
    if (!stream && camStream && ci > 0) {
      lastAuto = now;
      setCamQ(CAM_LIST[ci - 1], true);
      autoMsg("autoLowered", t("q_" + CAM_LIST[ci - 1]));
      return;
    }
  }
  const up = stream ? stepUp(qKey, fpsValue) : null;
  if (
    cfg.autoRecover &&
    stream &&
    !limited &&
    up &&
    fits(up.res, up.fps) &&
    now - Math.max(lastLim, lastAuto) >= UP_WAIT
  ) {
    lastAuto = now;
    setQ(up.res, up.fps, true);
    autoMsg("autoRaised", qTxt(up.res, up.fps));
    return;
  }
  if (autoMsgSt && now < autoMsgSt.until) {
    showAutoMsg();
    return;
  }
  autoMsgSt = null;
  const estimate = upKbps() / 1000;
  let key = "";
  let vars = null;
  if (reason === "bandwidth") {
    key = "warnBandwidth";
  } else if (reason === "cpu") {
    key = "warnCpu";
  } else if (estimate >= 20) {
    key = "warnEstimate";
    vars = { m: estimate.toFixed(0) };
  }
  if (key) setT(text, key, vars);
  if ((key === "warnBandwidth" || key === "warnCpu") && key !== lastWarn) notify("warn", t("title"), t(key));
  lastWarn = key;
  if (hosting) $("lowerQ").hidden = !stream || !stepDown(qKey, fpsValue);
  box.hidden = !key || (!stream && !camStream);
}

function monStart() {
  monStop();
  monTimer = setInterval(chkLoad, 3000);
}

function monStop() {
  clearInterval(monTimer);
  monTimer = null;
}
function logNick(vid, nick) {
  if (!vid || !nick) return;
  const list = nickHist.get(vid) || [];
  const i = list.indexOf(nick);
  if (i >= 0) list.splice(i, 1);
  list.push(nick);
  while (list.length > 6) list.shift();
  nickHist.set(vid, list);
}

function whoList(forPeer) {
  const out = [];
  const mine = getViewerId();
  logNick(mine, myNick);
  const entries = [{ vid: mine, nick: myNick, m: forPeer === undefined }];
  viewers.forEach((v, id) => {
    if (v.vid) {
      logNick(v.vid, v.nick);
      entries.push({ vid: v.vid, nick: v.nick, m: id === forPeer });
    }
  });
  const nowNicks = new Set(entries.map((e) => e.nick));
  entries.forEach((e) => {
    const list = nickHist.get(e.vid) || [e.nick];
    out.push({ g: e.vid.slice(0, 8), n: e.nick, m: e.m ? 1 : 0, p: list.filter((x) => !nowNicks.has(x)).slice(-5) });
  });
  return out;
}

function hostCount() {
  const n = viewers.size;
  setT($("count"), "viewersMany", { n: n });
  if (!stream && !camStream) {
    setSt($("hostStatus"), "hostPausedStatus");
  } else if (n) {
    setSt($("hostStatus"), "hostUpload", false, { m: (upKbps() / 1000).toFixed(1) });
  } else {
    setSt($("hostStatus"), "hostWaiting");
  }
  $("uploadInfo").hidden = !((stream || camStream) && n);
  rememberRoom(roomCode, whoList().filter((x) => !x.m));
  viewers.forEach((v, id) => {
    if (v.conn.open) v.conn.send({ count: n, people: whoList(id) });
  });
  drawPeople();
  drawReqs();
  refreshWatch();
  syncSucc();
  capNow();
  saveHS(false);
}

function dropView(id) {
  const v = viewers.get(id);
  if (!v) return;
  viewers.delete(id);
  if (v.call) v.call.close();
  if (v.camCall) v.camCall.close();
  const was = v.sharing || v.camSharing;
  if (was) dropShr(id);
  viewers.forEach((o) => {
    if ((o.sharing || o.camSharing) && o.conn.open) o.conn.send({ left: id });
  });
  if (was) bcastShr();
  hostCount();
}

function nickUsed(n) {
  return eqNick(n, myNick) || [...viewers.values()].some((o) => eqNick(o.nick, n));
}

function dropPend(id) {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
}

function askNick(conn, ctx, tries) {
  if (!pending.has(conn.peer) && pending.size >= ADM_Q) return bounce(conn, { busy: true });
  const prev = pending.get(conn.peer);
  if (prev) clearTimeout(prev.timer);
  if (!ctx.deadline) ctx.deadline = Date.now() + NICK_MS;
  const left = ctx.deadline - Date.now();
  if (tries >= NICK_TRIES || left <= 0) {
    pending.delete(conn.peer);
    return bounce(conn, { nickTaken: true });
  }
  const timer = setTimeout(() => {
    pending.delete(conn.peer);
    bounce(conn, { nickTaken: true });
  }, left);
  pending.set(conn.peer, { conn, ctx, tries, timer });
  conn.send({ askNick: true, retry: tries > 0 });
}

function strArr(a) {
  return Array.isArray(a) ? a.filter((x) => typeof x === "string" && /^[A-Z0-9]{12}$/.test(x)).slice(0, 64) : [];
}

function banArr(a) {
  if (!Array.isArray(a)) return [];
  return a
    .filter((b) => Array.isArray(b) && typeof b[0] === "string" && /^vid:[A-Z0-9]{12}$/.test(b[0]) && Number.isFinite(b[1]))
    .slice(0, 64)
    .map((b) => [b[0], b[1]]);
}

function histArr(a) {
  if (!Array.isArray(a)) return [];
  return a
    .filter((m) => m && typeof m.nick === "string" && typeof m.text === "string" && Number.isInteger(m.id))
    .slice(-50)
    .map((m) => {
      const o = { id: m.id, nick: cleanNick(m.nick), text: m.text.slice(0, MSG_MAX) };
      const g = validGif(m.gif);
      if (g) o.gif = g;
      return o;
    });
}

function saveHS(closing) {
  if (!hosting || !roomCode) return;
  try {
    localStorage.setItem(HS, JSON.stringify({
      code: roomCode,
      gen: hGen,
      priv: isPriv,
      multi: isMulti,
      gifs: gifsOn,
      nick: myNick,
      q: qKey,
      fps: fpsValue,
      allowed: [...allowed],
      grants: [...grants],
      camGrants: [...camGrants],
      t: Date.now(),
      closing: !!closing
    }));
  } catch (e) {}
}

function clearHS() {
  try { localStorage.removeItem(HS); } catch (e) {}
}

function syncSucc() {
  if (unloading) return;
  let first = null;
  viewers.forEach((v, id) => {
    if (!first && v.conn.open) first = id;
  });
  const st = {
    priv: isPriv,
    multi: isMulti,
    gifs: gifsOn,
    allowed: [...allowed],
    grants: [...grants],
    camGrants: [...camGrants],
    bans: [...bans].filter((b) => b[1] > Date.now() && b[0].startsWith("vid:")),
    muted: [...mutedVids],
    chat: chatBuf.slice(),
    nicks: [...nickHist].map((e) => [e[0], e[1].slice(-6)])
  };
  const sig = JSON.stringify([first, st]);
  if (sig === succSig) return;
  succSig = sig;
  viewers.forEach((v, id) => {
    if (v.conn.open) v.conn.send({ succ: id === first });
  });
  if (first) viewers.get(first).conn.send({ succState: st });
}

function drawJoin() {
  const box = $("joinRequests");
  box.innerHTML = "";
  approvals.forEach((a, id) => {
    const row = document.createElement("div");
    row.className = "request";
    const text = document.createElement("span");
    setT(text, "joinRequestText", { name: a.ctx.nick });
    const yes = document.createElement("button");
    yes.className = "primary";
    setT(yes, "allow");
    yes.addEventListener("click", () => decide(id, true));
    const no = document.createElement("button");
    setT(no, "deny");
    no.addEventListener("click", () => decide(id, false));
    row.append(text, yes, no);
    box.appendChild(row);
  });
}

function dropApproval(id) {
  const a = approvals.get(id);
  if (!a) return null;
  clearTimeout(a.timer);
  approvals.delete(id);
  drawJoin();
  return a;
}

function decide(id, ok) {
  const a = dropApproval(id);
  if (!a || !a.conn.open) return;
  if (!ok) return bounce(a.conn, { denied: true });
  const ctx = { ...a.ctx, approved: true };
  if (nickUsed(ctx.nick)) return askNick(a.conn, ctx, 0);
  admit(a.conn, ctx);
}

function askEntry(conn, ctx) {
  if (approvals.size >= 8) return bounce(conn, { denied: true });
  const timer = setTimeout(() => decide(conn.peer, false), 90000);
  approvals.set(conn.peer, { conn, ctx, timer });
  conn.send({ waiting: true });
  drawJoin();
  notify("join-" + conn.peer, t("title"), t("joinRequestText", { name: ctx.nick }));
}

function dropQueued(id) {
  const i = admitQ.findIndex((q) => q.conn.peer === id);
  if (i < 0) return;
  admitQ.splice(i, 1);
  notifyQueue();
}

function notifyQueue() {
  admitQ.forEach((q, i) => {
    if (q.conn.open) q.conn.send({ queued: i + 1 });
  });
}

function pumpQueue() {
  if (admTimer || !admitQ.length) return;
  const wait = Math.max(0, nextAdm - Date.now());
  admTimer = setTimeout(() => {
    admTimer = null;
    const q = admitQ.shift();
    if (q && q.conn.open && hosting) {
      nextAdm = Date.now() + ADM_GAP;
      admitNow(q.conn, q.ctx);
    }
    notifyQueue();
    pumpQueue();
  }, wait);
}

function clearQueue() {
  clearTimeout(admTimer);
  admTimer = null;
  nextAdm = 0;
  admitQ.splice(0).forEach((q) => {
    if (q.conn.open) q.conn.send({ closed: true });
    q.conn.close();
  });
}

function admit(conn, ctx) {
  if (viewers.size >= MAX_VIEW) return bounce(conn, { full: true });
  const known = !!(ctx.vid && allowed.has(ctx.vid));
  if (isPriv && !ctx.approved && !known) return askEntry(conn, ctx);
  if (Date.now() < grace) return admitNow(conn, ctx);
  if (admitQ.some((q) => q.conn.peer === conn.peer)) return;
  if (!admitQ.length && !admTimer && Date.now() >= nextAdm) {
    nextAdm = Date.now() + ADM_GAP;
    return admitNow(conn, ctx);
  }
  if (admitQ.length >= ADM_Q) return bounce(conn, { busy: true });
  admitQ.push({ conn, ctx });
  notifyQueue();
  pumpQueue();
}

function admitNow(conn, ctx) {
  if (viewers.size >= MAX_VIEW) return bounce(conn, { full: true });
  if (ctx.vid) allowed.add(ctx.vid);
  const v = {
    conn,
    call: null,
    camCall: null,
    vid: ctx.vid,
    tab: ctx.tab,
    ip: ctx.ip,
    nick: ctx.nick,
    muted: !!(ctx.vid && mutedVids.has(ctx.vid)),
    lastMsg: 0,
    canShare: isMulti && !!(ctx.vid && grants.has(ctx.vid)),
    wantsShare: false,
    sharing: false,
    canCam: isMulti && !!(ctx.vid && camGrants.has(ctx.vid)),
    wantsCam: false,
    camSharing: false
  };
  viewers.set(conn.peer, v);
  conn.send({
    hostNick: myNick,
    yourNick: ctx.nick,
    sharers: shrList(),
    canShare: v.canShare,
    canCam: v.canCam,
    multi: isMulti,
    gifs: gifsOn,
    away: away ? Math.max(0, away.deadline - Date.now()) : null
  });
  if (v.muted) conn.send({ muted: true });
  if (chatBuf.length) conn.send({ history: chatBuf });
  if (stream) sendScr(conn.peer, v);
  if (camStream) sendCam(conn.peer, v);
  viewers.forEach((o, oid) => {
    if (oid === conn.peer || !o.conn.open) return;
    if (o.sharing) o.conn.send({ callNew: conn.peer });
    if (o.camSharing) o.conn.send({ camCallNew: conn.peer });
  });
  hostCount();
}

function peerHost(attempt, fixed, gen) {
  roomCode = fixed || rndCode();
  hGen = gen || 0;
  hostPid = pid(roomCode, hGen);
  peer = new Peer(hostPid);
  const me = peer;

  peer.on("open", () => {
    $("hostCode").textContent = roomCode;
    hostCount();
  });

peer.on("call", onCall);

peer.on("connection", (conn) => {
  conn.on("open", async () => {
    const ip = await getIp(conn);
    if (!conn.open) return;
    const meta = conn.metadata || {};
    const vid = typeof meta.vid === "string" && /^[A-Z0-9]{12}$/.test(meta.vid) ? meta.vid : null;
    const tab = typeof meta.tab === "string" && /^[A-Z0-9]{12}$/.test(meta.tab) ? meta.tab : null;
    const nick = cleanNick(meta.nick);
    const ban = Math.max(vid ? banLeft("vid:" + vid) : 0, ip ? banLeft("ip:" + ip) : 0);
    if (ban) {
      return bounce(conn, { kicked: true, wait: Math.ceil((ban - Date.now()) / 1000) });
    }
    for (const [oid, other] of [...viewers]) {
      if (vid && other.vid === vid) {
        if (tab && other.tab === tab) {
          dropView(oid);
          other.conn.close();
        } else if (other.conn.open) {
          return bounce(conn, { duplicate: true });
        }
      }
    }
    for (const [aid, a] of [...approvals]) {
      if (vid && a.ctx.vid === vid) {
        dropApproval(aid);
        a.conn.close();
      }
    }
    if (viewers.size >= MAX_VIEW) return bounce(conn, { full: true });
    const ctx = { vid, tab, ip, nick, deadline: 0 };
    if (!nick || nickUsed(nick)) return askNick(conn, ctx, 0);
    admit(conn, ctx);
  });
  conn.on("data", (d) => {
    const p = pending.get(conn.peer);
    if (p) {
      if (!d || typeof d !== "object" || typeof d.nick !== "string") return;
      const n = cleanNick(d.nick);
      if (!n || nickUsed(n)) return askNick(conn, p.ctx, p.tries + 1);
      clearTimeout(p.timer);
      pending.delete(conn.peer);
      return admit(conn, { ...p.ctx, nick: n });
    }
    const v = viewers.get(conn.peer);
    if (!v || !d || typeof d !== "object") return;
    if (d.reqShare === true) return onShareRequest(v);
    if (d.shareStart === true) return onShareStart(conn.peer, v);
    if (d.shareStop === true) return onShareStop(conn.peer, v);
    if (d.reqCam === true) return onCamRequest(v);
    if (d.camStart === true) return onCamStart(conn.peer, v);
    if (d.camStop === true) return onCamStop(conn.peer, v);
    if (typeof d.gif === "string") {
      const g = validGif(d.gif);
      const t0 = Date.now();
      if (!g || !gifsOn || v.muted || t0 - v.lastMsg < 700) return;
      v.lastMsg = t0;
      broadcastChat(v.nick, "", g);
      return;
    }
    if (v.muted || typeof d.msg !== "string") return;
    const now = Date.now();
    if (now - v.lastMsg < 700) return;
    v.lastMsg = now;
    const text = d.msg.trim().slice(0, MSG_MAX);
    if (text) broadcastChat(v.nick, text);
  });
  conn.on("close", () => {
    dropPend(conn.peer);
    dropApproval(conn.peer);
    dropQueued(conn.peer);
    dropView(conn.peer);
  });
  conn.on("error", () => {
    dropPend(conn.peer);
    dropApproval(conn.peer);
    dropQueued(conn.peer);
    dropView(conn.peer);
  });
});

peer.on("disconnected", () => {
  if (peer && !peer.destroyed) peer.reconnect();
});

  peer.on("error", (err) => {
    if (peer !== me) return;
    if (err.type === "unavailable-id" && fixed) {
      if (attempt < (tkMode ? 2 : 8)) {
        me.destroy();
        setTimeout(() => {
          if (hosting && peer === me) peerHost(attempt + 1, fixed, gen);
        }, 1500);
      } else {
        closeRoom();
        $("nick").value = myNick;
        joinRoom(fixed);
      }
    } else if (err.type === "unavailable-id" && attempt < 5) {
      peer.destroy();
      peerHost(attempt + 1);
    } else if (err.type !== "peer-unavailable") {
      setSt($("hostStatus"), "connError", true, { e: err.type });
    }
  });
}

function takeHost(code, priv, allowedList, grantList, noteKey, gen, extra, camGrantList) {
  grace = Date.now() + GRACE;
  isPriv = priv;
  if (extra) isMulti = extra.multi === true;
  if (extra) gifsOn = extra.gifs !== false;
  $("gifsToggle").checked = gifsOn;
  tkMode = noteKey === "nowHost";
  allowed.clear();
  allowedList.forEach((x) => allowed.add(x));
  grants.clear();
  grantList.forEach((x) => grants.add(x));
  camGrants.clear();
  (camGrantList || []).forEach((x) => camGrants.add(x));
  bans.clear();
  mutedVids.clear();
  chatBuf.length = 0;
  msgSeq = 0;
  nickHist.clear();
  if (extra) {
    if (Array.isArray(extra.nicks)) {
      extra.nicks.slice(0, 64).forEach((e) => {
        if (Array.isArray(e) && typeof e[0] === "string" && /^[A-Z0-9]{12}$/.test(e[0]) && Array.isArray(e[1])) {
          e[1].slice(-6).forEach((x) => logNick(e[0], cleanNick(x)));
        }
      });
    }
    extra.bans.forEach((b) => bans.set(b[0], b[1]));
    extra.muted.forEach((x) => mutedVids.add(x));
    extra.chat.forEach((m) => {
      chatBuf.push(m);
      if (m.id > msgSeq) msgSeq = m.id;
    });
  }
  setT($("roomType"), priv ? "roomPrivateBadge" : "roomPublicBadge");
  setT($("hostSelfName"), "hostLabel", { name: myNick });
  hosting = true;
  gridEl = $("hostGrid");
  wipeTiles();
  show(hostView);
  if (extra) {
    extra.chat.forEach((m) => addChat(m, true));
    unreadN = 0;
    updateUnread();
  }
  $("people").hidden = false;
  $("liveQuality").value = qKey;
  $("viewQuality").value = qKey;
  $("liveFps").value = fpsValue;
  $("viewFps").value = fpsValue;
  $("liveCamQuality").value = camKey;
  $("hostWarn").hidden = true;
  shareUI(false);
  refreshOv();
  monStart();
  succSig = "";
  setT($("hostNote"), noteKey);
  $("hostNote").hidden = false;
  peerHost(0, code, gen);
}

function stopRes(clear) {
  if (!pendRes) return;
  clearInterval(pendRes.tick);
  pendRes = null;
  $("awayHome").hidden = true;
  if (clear) clearHS();
}

function tickResume() {
  if (!pendRes) return;
  const left = pendRes.deadline - Date.now();
  if (left <= 0) {
    stopRes(true);
    return;
  }
  $("awayHome").hidden = false;
  setT($("awayHomeText"), "resumeHome", { code: pendRes.sess.code, time: fmtTime(left) });
}

function resumeNow() {
  const r = pendRes;
  if (!r) return;
  stopRes(false);
  const sess = r.sess;
  myNick = cleanNick(sess.nick);
  $("nick").value = myNick;
  if (RES[sess.q]) {
    const f = Math.min(FPS_MAX, Math.max(FPS_MIN, Math.round(Number(sess.fps)) || 30));
    qKey = sess.q;
    fpsValue = f;
    quality = mkQ(sess.q, f);
    pickQ = sess.q;
    pickFps = f;
  }
  const g = Number(sess.gen);
  isMulti = sess.multi === true;
  gifsOn = sess.gifs !== false;
  takeHost(sess.code, sess.priv === true, strArr(sess.allowed), strArr(sess.grants), "resumedHost", g >= 0 && g < GENS ? g : 0, null, strArr(sess.camGrants));
}

function tryRes(urlCode) {
  let sess = null;
  try { sess = JSON.parse(localStorage.getItem(HS) || "null"); } catch (e) {}
  if (!sess || typeof sess !== "object") return false;
  const age = Date.now() - Number(sess.t);
  const okCode = typeof sess.code === "string" && /^[A-Z0-9]{6}$/.test(sess.code);
  const nick = cleanNick(sess.nick);
  if (!okCode || !nick || !(age <= RES_MS)) {
    clearHS();
    return false;
  }
  if (!(sess.closing === true || age > 6000)) return false;
  if (urlCode && urlCode !== sess.code) return false;
  pendRes = { sess, deadline: Number(sess.t) + RES_MS, tick: setInterval(tickResume, 1000) };
  tickResume();
  return true;
}

function becomeHost() {
  const st = succState;
  const code = joinCode;
  if (!st || !code) return;
  manualEnd = true;
  rtWait = false;
  clearTimeout(rtTimer);
  clearTimeout(vTimer);
  tkTimer = null;
  amSucc = false;
  succState = null;
  awayOff();
  dropMedia();
  vConn = null;
  if (peer) {
    const old = peer;
    peer = null;
    old.destroy();
  }
  clearChat();
  closeViewPanel();
  $("hostName").hidden = true;
  setSt($("viewStatus"), "");
  takeHost(code, st.priv, st.allowed, st.grants, "nowHost", (rGen + 1) % GENS, st, st.camGrants);
}

function maybeStartTakeover() {
  if (!amSucc || !succState || tkTimer || manualEnd || dupTab) return;
  tkTimer = setTimeout(() => {
    tkTimer = null;
    if (manualEnd || dupTab || !amSucc || !succState) return;
    becomeHost();
  }, TK_MS);
}

function copyFb(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) {}
  ta.remove();
  if (ok) done();
}

function copyTxt(text, el) {
  const done = () => {
    el.textContent = t("copied");
    setTimeout(() => { el.textContent = t(el.dataset.i18n); }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => copyFb(text, done));
  } else {
    copyFb(text, done);
  }
}

function awayOn(ms) {
  awayOff();
  if (typeof ms !== "number" || !isFinite(ms)) return;
  awayV = { deadline: Date.now() + ms, tick: setInterval(renderAwayView, 1000) };
  renderAwayView();
}

function renderAwayView() {
  if (!awayV) return;
  $("awayBanner").hidden = false;
  setT($("awayText"), "awayViewer", { time: fmtTime(awayV.deadline - Date.now()) });
}

function renderLostView() {
  if (!lostV) return;
  const left = lostV.deadline - Date.now();
  $("awayBanner").hidden = false;
  if (left > 0) {
    setT($("awayText"), "hostLost", { time: fmtTime(left) });
  } else {
    setT($("awayText"), "hostHandover");
  }
}

function startLostView() {
  if (lostV || awayV) return;
  lostV = { deadline: Date.now() + TK_MS, tick: setInterval(renderLostView, 1000) };
  renderLostView();
}

function awayOff() {
  if (lostV) clearInterval(lostV.tick);
  lostV = null;
  if (awayV) clearInterval(awayV.tick);
  awayV = null;
  $("awayBanner").hidden = true;
}

function viewUp() {
  if (hosting) return;
  capNow();
  if (scrState === "sharing" || camState === "sharing") {
    setSt($("viewStatus"), "hostUpload", false, { m: (upKbps() / 1000).toFixed(1) });
  } else if ($("viewStatus").dataset.i18n === "hostUpload") {
    setSt($("viewStatus"), "");
  }
}

function viewShareUI() {
  $("viewShareOpts").hidden = !canCapture || !inMulti;
  $("viewCamOpts").hidden = !canCam || !inMulti;
  $("openViewOptions").hidden = !inMulti || (!canCapture && !canCam);
  refreshBtns();
  $("viewSwitch").hidden = scrState !== "sharing";
  viewUp();
}

function resetShare() {
  if (!hosting) {
    monStop();
    $("viewWarn").hidden = true;
  }
  if (pendScr) {
    pendScr.getTracks().forEach((tr) => tr.stop());
    pendScr = null;
  }
  if (pendCam) {
    pendCam.getTracks().forEach((tr) => tr.stop());
    pendCam = null;
  }
  if (!hosting && stream) {
    stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
  }
  if (!hosting && camStream) {
    camStream.getTracks().forEach((tr) => tr.stop());
    camStream = null;
  }
  outC.forEach((c) => c.close());
  outC.clear();
  scrState = "none";
  camState = "none";
  viewShareUI();
}

function watchEnd(s) {
  const track = s.getVideoTracks()[0];
  track.contentHint = isSharp(qKey) ? "detail" : "";
  track.addEventListener("ended", () => {
    if (stream === s) viewerStopShare(true);
  });
}

function callTarget(id) {
  if (!stream || !peer || id === peer.id) return;
  const old = outC.get(id);
  if (old) old.close();
  const call = peer.call(id, stream);
  outC.set(id, call);
  capBitrate(call, quality.kbps);
  call.on("close", () => {
    if (outC.get(id) === call) {
      outC.delete(id);
      viewUp();
    }
  });
  viewUp();
}

function callCamTarget(id) {
  if (!camStream || !peer || id === peer.id) return;
  const key = id + CAM;
  const old = outC.get(key);
  if (old) old.close();
  const call = peer.call(id, camStream, { metadata: { cam: true } });
  outC.set(key, call);
  capBitrate(call, camQ.kbps);
  call.on("close", () => {
    if (outC.get(key) === call) {
      outC.delete(key);
      viewUp();
    }
  });
  viewUp();
}

async function viewerShare() {
  askNotif();
  qKey = $("viewQuality").value;
  fpsValue = getFps($("viewFps"));
  quality = mkQ(qKey, fpsValue);
  pickQ = qKey;
  pickFps = fpsValue;
  lastAuto = 0;
  lastLim = 0;
  autoMsgSt = null;
  const s = await grabScr(quality, $("viewAudio").checked);
  if (!s) {
    setSt($("viewStatus"), "shareFailed", true);
    return;
  }
  if (scrState !== "allowed" || !vConn || !vConn.open) {
    s.getTracks().forEach((tr) => tr.stop());
    return;
  }
  pendScr = s;
  vConn.send({ shareStart: true });
}

async function viewerCam() {
  askNotif();
  camKey = $("viewCamQuality").value;
  camQ = CAM_QS[camKey];
  const s = await grabCam(camQ);
  if (!s) {
    setSt($("viewStatus"), "camFailed", true);
    return;
  }
  if (camState !== "allowed" || !vConn || !vConn.open) {
    s.getTracks().forEach((tr) => tr.stop());
    return;
  }
  pendCam = s;
  vConn.send({ camStart: true });
}

function beginViewerShare(targets) {
  const s = pendScr;
  pendScr = null;
  if (!s) return;
  stream = s;
  watchEnd(s);
  putSrc("me", false, myNick, s, true);
  scrState = "sharing";
  targets.forEach(callTarget);
  monStart();
  viewShareUI();
}

function beginViewerCam(targets) {
  const s = pendCam;
  pendCam = null;
  if (!s) return;
  camStream = s;
  s.getVideoTracks()[0].addEventListener("ended", () => {
    if (camStream === s) viewerStopCam(true);
  });
  putSrc("me", true, myNick, s, true);
  camState = "sharing";
  targets.forEach(callCamTarget);
  monStart();
  viewShareUI();
}

async function viewerReshare() {
  const s = await grabScr(quality, $("viewAudio").checked);
  if (!s) return;
  if (scrState !== "sharing") {
    s.getTracks().forEach((tr) => tr.stop());
    return;
  }
  const old = stream;
  stream = s;
  watchEnd(s);
  putSrc("me", false, myNick, s, true);
  if (old) old.getTracks().forEach((tr) => tr.stop());
  [...outC.keys()].filter((k) => !isCam(k)).forEach(callTarget);
}

function viewerStopShare(notify) {
  if (scrState !== "sharing" && !stream) return;
  if (stream) {
    stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
  }
  [...outC].forEach(([k, c]) => {
    if (isCam(k)) return;
    outC.delete(k);
    c.close();
  });
  delSrc("me", false);
  if (notify && vConn && vConn.open) vConn.send({ shareStop: true });
  if (!camStream) {
    monStop();
    $("viewWarn").hidden = true;
  }
  scrState = "allowed";
  viewShareUI();
}

function viewerStopCam(notify) {
  if (camState !== "sharing" && !camStream) return;
  if (camStream) {
    camStream.getTracks().forEach((tr) => tr.stop());
    camStream = null;
  }
  [...outC].forEach(([k, c]) => {
    if (!isCam(k)) return;
    outC.delete(k);
    c.close();
  });
  delSrc("me", true);
  if (notify && vConn && vConn.open) vConn.send({ camStop: true });
  if (!stream) {
    monStop();
    $("viewWarn").hidden = true;
  }
  camState = "allowed";
  viewShareUI();
}

function viewerEnded(key, vars) {
  clearRoomUrl();
  clearTimeout(tkTimer);
  tkTimer = null;
  amSucc = false;
  succState = null;
  manualEnd = true;
  rtWait = false;
  clearTimeout(rtTimer);
  clearTimeout(vTimer);
  awayOff();
  dropMedia();
  $("viewOverlay").hidden = false;
  setT($("viewOverlay"), key, vars);
}

function openNickDialog(retryAsk) {
  closeViewPanel();
  closeChat();
  clearTimeout(vTimer);
  $("nickDialogError").hidden = !retryAsk;
  $("nickBackdrop").hidden = false;
  $("nickDialog").hidden = false;
  $("nickNew").value = nickTry || myNick;
  $("nickNew").focus();
  $("nickNew").select();
}

function closeNickDialog() {
  $("nickDialog").hidden = true;
  $("nickBackdrop").hidden = true;
}

function armNoVideo(p) {
  clearTimeout(vTimer);
  vTimer = setTimeout(() => {
    if (peer !== p || !$("nickDialog").hidden) return;
    if (!tiles.size && $("viewOverlay").dataset.i18n === "connecting") {
      viewerEnded("noVideo");
    }
  }, 15000);
}

function submitNick() {
  const n = cleanNick($("nickNew").value);
  if (!n) {
    $("nickNew").focus();
    return;
  }
  if (eqNick(n, myNick) || eqNick(n, nickTry)) {
    $("nickDialogError").hidden = false;
    $("nickNew").focus();
    return;
  }
  if (!vConn || !vConn.open) return;
  nickTry = n;
  vConn.send({ nick: n });
  closeNickDialog();
  setT($("viewOverlay"), "connecting");
  armNoVideo(peer);
}

function dropMedia() {
  closeNickDialog();
  vLive = false;
  inC.forEach((c) => c.close());
  inC.clear();
  held.forEach((c) => c.close());
  held.clear();
  shrIds = new Set();
  shrNames = new Map();
  wipeTiles();
  resetShare();
}

function scheduleRetry() {
  if (manualEnd || dupTab || rtWait) return;
  clearTimeout(vTimer);
  if (retry >= MAX_RT) {
    viewerEnded("connLost");
    return;
  }
  retry++;
  rtWait = true;
  const wait = Math.min(1000 * 2 ** (retry - 1), 15000);
  dropMedia();
  $("viewOverlay").hidden = false;
  setT($("viewOverlay"), "reconnecting", { n: retry, max: MAX_RT });
  clearTimeout(rtTimer);
  rtTimer = setTimeout(() => {
    rtWait = false;
    if (manualEnd) return;
    connectToRoom(joinCode);
  }, wait);
}

function updateMuteBtn() {
  const off = vMuted || vVol === 0;
  setT($("muteBtn"), off ? "unmute" : "mute");
  $("audioBtnView").classList.toggle("muted", off);
  if (!off) $("soundWarn").hidden = true;
}

function joinRoom(code) {
  if (String(code).trim().length === 6 && cleanNick($("nick").value) && !seenIp()) {
    needIp().then((ok) => {
      if (ok) joinRoomNow(code);
    });
    return;
  }
  joinRoomNow(code);
}

function joinRoomNow(code) {
  code = code.trim().toUpperCase();
  if (code.length !== 6) {
    setSt($("homeStatus"), "codeLength", true);
    return;
  }
  if (!requireNick()) return;
  stopRes(true);
  if (hosting) closeRoom();
  gridEl = $("viewGrid");
  wipeTiles();
  show(viewerView);
  $("viewOverlay").hidden = false;
  setT($("viewOverlay"), "connecting");
  $("eyeView").hidden = true;
  setSt($("viewStatus"), "");
  awayOff();
  scrState = "none";
  camState = "none";
  viewShareUI();
  updateMuteBtn();
  dupTab = false;
  manualEnd = false;
  rtWait = false;
  retry = 0;
  joinCode = code;
  nickTry = "";
  amSucc = false;
  succState = null;
  connectToRoom(code);
}

function connectToRoom(code) {
  clearTimeout(vTimer);
  clearTimeout(rtTimer);
  dropMedia();
  vConn = null;
  const old = peer;
  peer = null;
  if (old) old.destroy();

  const p = new Peer();
  peer = p;
  p.on("connection", (c) => c.close());
  let startRest = null;

  p.on("open", () => {
    if (peer !== p) return;
    vConn = null;
    const conns = [];
    const wireConn = (conn, g) => {
      conn.on("data", (d) => {
        if (peer !== p || vConn !== conn || !d || typeof d !== "object") return;
        if (typeof d.hostNick === "string") {
          setT($("hostName"), "hostLabel", { name: cleanNick(d.hostNick) });
          $("hostName").hidden = false;
          if (typeof d.yourNick === "string") {
            const accepted = cleanNick(d.yourNick);
            if (accepted) {
              myNick = accepted;
              nickTry = "";
              $("nick").value = accepted;
              saveNick(accepted);
            }
          }
          retry = 0;
          vGifs = d.gifs !== false;
          updateGifBtn();
          clearTimeout(tkTimer);
          tkTimer = null;
          amSucc = false;
          succState = null;
          vLive = true;
          inMulti = d.multi === true;
          scrState = d.canShare === true ? "allowed" : "none";
          camState = d.canCam === true ? "allowed" : "none";
          viewShareUI();
          if ("away" in d) awayOn(d.away);
          setRoster(Array.isArray(d.sharers) ? d.sharers : []);
          return;
        }
        if (typeof d.succ === "boolean") {
          amSucc = d.succ;
          if (!d.succ) succState = null;
          return;
        }
        if (d.succState && typeof d.succState === "object") {
          succState = {
            priv: d.succState.priv === true,
            multi: d.succState.multi === true,
            gifs: d.succState.gifs !== false,
            allowed: strArr(d.succState.allowed),
            grants: strArr(d.succState.grants),
            camGrants: strArr(d.succState.camGrants),
            bans: banArr(d.succState.bans),
            muted: strArr(d.succState.muted),
            chat: histArr(d.succState.chat)
          };
          return;
        }
        if (Number.isInteger(d.queued)) {
          setT($("viewOverlay"), "queueWait", { n: d.queued });
          return;
        }
        if (d.busy === true) {
          leaveRoom();
          setSt($("homeStatus"), "roomBusy", true);
          return;
        }
        if (d.waiting === true) {
          clearTimeout(vTimer);
          setT($("viewOverlay"), "joinWaiting");
          return;
        }
        if (d.denied === true) {
          leaveRoom();
          setSt($("homeStatus"), "joinDenied", true);
          return;
        }
        if (d.askNick === true) {
          openNickDialog(d.retry === true);
          return;
        }
        if (Array.isArray(d.history)) {
          $("chatList").innerHTML = "";
          d.history.forEach((m) => addChat(m));
          unreadN = 0;
          updateUnread();
          return;
        }
        if (d.chat && typeof d.chat === "object") {
          addChat(d.chat);
          return;
        }
        if (Number.isInteger(d.del)) {
          rmMsg(d.del);
          return;
        }
        if (typeof d.muted === "boolean") {
          chatMute = d.muted;
          fixChatIn();
          return;
        }
        if (typeof d.gifs === "boolean") {
          vGifs = d.gifs;
          updateGifBtn();
          return;
        }
        if (d.nickTaken === true) {
          leaveRoom();
          setSt($("homeStatus"), "nickTaken", true);
          $("nick").focus();
          return;
        }
        if (d.kicked === true) {
          const mins = Math.max(1, Math.ceil((Number(d.wait) || 300) / 60));
          leaveRoom();
          setSt($("homeStatus"), "kicked", true, { min: mins });
          return;
        }
        if (d.duplicate === true) {
          dupTab = true;
          viewerEnded("duplicateTab");
          return;
        }
        if (d.full === true) {
          dupTab = true;
          viewerEnded("roomFull");
          return;
        }
        if (Array.isArray(d.sharers)) {
          setRoster(d.sharers);
          return;
        }
        if (typeof d.canShare === "boolean") {
          if (d.canShare) {
            if (scrState !== "sharing") scrState = "allowed";
            setSt($("viewStatus"), "shareAllowed");
          } else {
            viewerStopShare(false);
            scrState = "none";
            setSt($("viewStatus"), "shareRevoked", true);
          }
          viewShareUI();
          return;
        }
        if (typeof d.canCam === "boolean") {
          if (d.canCam) {
            if (camState !== "sharing") camState = "allowed";
            setSt($("viewStatus"), "camAllowed");
          } else {
            viewerStopCam(false);
            camState = "none";
            setSt($("viewStatus"), "camRevoked", true);
          }
          viewShareUI();
          return;
        }
        if (typeof d.shareDenied === "string") {
          if (pendScr) {
            pendScr.getTracks().forEach((tr) => tr.stop());
            pendScr = null;
          }
          if (d.shareDenied === "limit") {
            scrState = "allowed";
            setSt($("viewStatus"), "shareLimit", true, { n: MAX_SHR });
          } else {
            scrState = "none";
            if (d.shareDenied === "denied") setSt($("viewStatus"), "shareReqDenied", true);
          }
          viewShareUI();
          return;
        }
        if (typeof d.camDenied === "string") {
          if (pendCam) {
            pendCam.getTracks().forEach((tr) => tr.stop());
            pendCam = null;
          }
          if (d.camDenied === "limit") {
            camState = "allowed";
            setSt($("viewStatus"), "camLimit", true, { n: MAX_CAM });
          } else {
            camState = "none";
            if (d.camDenied === "denied") setSt($("viewStatus"), "camReqDenied", true);
          }
          viewShareUI();
          return;
        }
        if (Array.isArray(d.targets)) {
          beginViewerShare(d.targets.filter((x) => typeof x === "string"));
          return;
        }
        if (Array.isArray(d.camTargets)) {
          beginViewerCam(d.camTargets.filter((x) => typeof x === "string"));
          return;
        }
        if (typeof d.callNew === "string") {
          callTarget(d.callNew);
          return;
        }
        if (typeof d.camCallNew === "string") {
          callCamTarget(d.camCallNew);
          return;
        }
        if (typeof d.left === "string") {
          [d.left, d.left + CAM].forEach((k) => {
            const c = outC.get(k);
            if (c) {
              outC.delete(k);
              c.close();
            }
          });
          viewUp();
          return;
        }
        if ("away" in d) {
          awayOn(d.away);
          return;
        }
        if (Number.isInteger(d.count) && d.count >= 0 && d.count <= 9999) {
          nWatch = d.count;
          if (Array.isArray(d.people)) {
            roomWho = d.people.slice(0, 40).filter((x) => x && typeof x.g === "string" && typeof x.n === "string").map((x) => ({
              g: x.g.slice(0, 8),
              n: cleanNick(x.n),
              m: x.m ? 1 : 0,
              p: Array.isArray(x.p) ? x.p.slice(0, 5).map((y) => cleanNick(String(y))) : []
            }));
            rememberRoom(joinCode, roomWho.filter((x) => !x.m));
          }
          $("eyeView").hidden = false;
          setT($("viewCount"), "eyeCount", { n: d.count });
          refreshWatch();
          capNow();
          return;
        }
        if (d.closed === true) viewerEnded("roomEndedByHost");
      });
      conn.on("open", () => {
        if (peer !== p) return;
        if (vConn && vConn !== conn) {
          dupTab = true;
          conns.forEach((o) => o.close());
          vConn = null;
          viewerEnded("roomSuspicious");
          return;
        }
        vConn = conn;
        rGen = g;
        setTimeout(() => {
          if (peer !== p || vConn !== conn) return;
          conns.forEach((o) => {
            if (o !== conn) o.close();
          });
        }, 2000);
        armNoVideo(p);
      });
      conn.on("close", () => {
        if (peer !== p || dupTab || vConn !== conn) return;
        maybeStartTakeover();
        startLostView();
        scheduleRetry();
      });
      conn.on("error", () => {
        if (peer !== p || dupTab || vConn !== conn) return;
        maybeStartTakeover();
        startLostView();
        scheduleRetry();
      });
    };
    const startConn = (g) => {
      if (conns[g]) return;
      const c = p.connect(pid(code, g), { reliable: true, metadata: { vid: getViewerId(), nick: myNick, tab: tabId } });
      conns[g] = c;
      wireConn(c, g);
    };
    startRest = () => {
      for (let g = 1; g < GENS; g++) startConn(g);
    };
    startConn(0);
    setTimeout(() => {
      if (peer === p && !vConn) startRest();
    }, 3000);
    vTimer = setTimeout(() => {
      if (peer !== p) return;
      if (retry === 0) {
        viewerEnded("cantConnect");
      } else {
        scheduleRetry();
      }
    }, 20000);
  });

  p.on("call", (call) => {
    if (peer !== p) return;
    onCall(call);
  });

  let unavailable = 0;
  p.on("error", (err) => {
    if (peer !== p) return;
    if (err.type === "peer-unavailable") {
      if (vConn && vConn.open) return;
      if (startRest) startRest();
      unavailable++;
      if (unavailable < GENS) return;
      if (retry === 0) {
        viewerEnded("roomNotFound");
      } else {
        scheduleRetry();
      }
    } else if (retry === 0) {
      viewerEnded("connError", { e: err.type });
    } else {
      scheduleRetry();
    }
  });
}

function clearRoomUrl() {
  try {
    const u = new URL(location.href);
    if (!u.searchParams.has("sala")) return;
    u.searchParams.delete("sala");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  } catch (e) {}
}

function leaveRoom() {
  clearRoomUrl();
  clearTimeout(tkTimer);
  tkTimer = null;
  amSucc = false;
  succState = null;
  closeNickDialog();
  nickTry = "";
  manualEnd = true;
  rtWait = false;
  retry = 0;
  clearTimeout(rtTimer);
  leavePip();
  clearChat();
  clearTimeout(vTimer);
  vConn = null;
  dupTab = false;
  awayOff();
  dropMedia();
  if (peer) {
    const old = peer;
    peer = null;
    old.destroy();
  }
  gridEl = null;
  nWatch = 0;
  inMulti = false;
  closeViewPanel();
  $("hostName").hidden = true;
  delete $("hostName").dataset.i18n;
  delete $("hostName").dataset.vars;
  $("hostName").textContent = "";
  setSt($("viewStatus"), "");
  vMuted = false;
  vVol = 1;
  $("volume").value = 1;
  updateMuteBtn();
  $("soundWarn").hidden = true;
  if (document.fullscreenElement) document.exitFullscreen();
  if (myNick) $("nick").value = myNick;
  show(home);
}

document.querySelectorAll(".chatBtn").forEach((b) => b.addEventListener("click", toggleChat));
$("openViewOptions").addEventListener("click", openViewPanel);
$("closeViewOptions").addEventListener("click", closeViewPanel);
$("viewBackdrop").addEventListener("click", closeViewPanel);
setupEye("eyeHost");
setupEye("eyeView");
document.addEventListener("click", (e) => {
  if (!e.target.closest(".eyewrap")) closeWatch();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeViewPanel();
  closeChat();
  closeOpts();
  closeCfg();
  closeAudioPops();
  closePipDialog();
  closeWatch();
  if (visRes) closeVis(null);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const dialogs = [...document.querySelectorAll(".dialog")].filter((d) => !d.hidden);
  const panels = [...document.querySelectorAll(".panel.open")];
  const box = dialogs.length ? dialogs[dialogs.length - 1] : panels[panels.length - 1];
  if (!box) return;
  const items = [...box.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
    .filter((x) => !x.disabled && x.getClientRects().length > 0);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!box.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
$("soundOn").addEventListener("click", () => {
  vMuted = false;
  if (vVol === 0) {
    vVol = 1;
    $("volume").value = 1;
  }
  applyVol();
  updateMuteBtn();
  tiles.forEach((tl) => {
    [tl.video, tl.camVideo].forEach((v) => {
      if (!v.srcObject) return;
      const started = v.play();
      if (started && started.catch) started.catch(() => {});
    });
  });
});
$("closeChat").addEventListener("click", closeChat);
$("chatSend").addEventListener("click", sendChat);
$("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});
$("startHost").addEventListener("click", () => hostStart(true));
$("createRoom").addEventListener("click", () => hostStart(false));
$("camHome").addEventListener("click", () => hostStart(false, true));
$("backToRoom").addEventListener("click", backToRoom);
$("awayBtn").addEventListener("click", goAway);
$("pipView").addEventListener("click", () => {
  closeViewPanel();
  togglePip($("viewStatus"));
});
$("pipHost").addEventListener("click", () => {
  closeOpts();
  togglePip($("hostStatus"));
});
window.addEventListener("pageshow", () => {
  unloading = false;
});
window.addEventListener("pagehide", () => {
  unloading = true;
  if (hosting) saveHS(true);
  if (peer) peer.destroy();
});
$("shareBtn").addEventListener("click", () => {
  closeOpts();
  swapScr();
});
$("scrHostBtn").addEventListener("click", () => {
  if (stream) {
    stopScr();
  } else {
    swapScr();
  }
});
$("camHostBarBtn").addEventListener("click", () => {
  if (camStream) {
    hostCamOff();
  } else {
    hostCamOn();
  }
});
$("openOptions").addEventListener("click", openOpts);
$("closeOptions").addEventListener("click", closeOpts);
$("backdrop").addEventListener("click", closeOpts);
$("hostFs").addEventListener("click", () => {
  closeOpts();
  toggleFs(fsEl($("hostStage")));
});
function closeEndDialog() {
  $("endDialog").hidden = true;
  $("endBackdrop").hidden = true;
}
$("closeRoom").addEventListener("click", () => {
  $("endBackdrop").hidden = false;
  $("endDialog").hidden = false;
  $("cancelClose").focus();
});
$("cancelClose").addEventListener("click", closeEndDialog);
$("endBackdrop").addEventListener("click", closeEndDialog);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeEndDialog();
});
$("confirmClose").addEventListener("click", () => {
  closeEndDialog();
  closeOpts();
  closeRoom();
});
$("liveQuality").addEventListener("change", () => setQ($("liveQuality").value, getFps($("liveFps"))));
$("liveFps").addEventListener("change", () => setQ($("liveQuality").value, getFps($("liveFps"))));
$("viewQuality").addEventListener("change", () => setQ($("viewQuality").value, getFps($("viewFps"))));
$("viewFps").addEventListener("change", () => setQ($("viewQuality").value, getFps($("viewFps"))));
$("liveCamQuality").addEventListener("change", (e) => setCamQ(e.target.value));
$("viewCamQuality").addEventListener("change", (e) => setCamQ(e.target.value));
$("lowerQ").addEventListener("click", () => {
  const d = stepDown(qKey, fpsValue);
  if (d) setQ(d.res, d.fps);
});
$("hostMute").addEventListener("click", () => {
  const track = stream && stream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  setT($("hostMute"), track.enabled ? "muteAudio" : "unmuteAudio");
  updateHostAudioIcon();
});
$("audioBtnHost").addEventListener("click", (e) => {
  e.stopPropagation();
  toggleAudioPop("audioPopHost");
});
$("audioBtnView").addEventListener("click", (e) => {
  e.stopPropagation();
  toggleAudioPop("audioPopView");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".apop")) closeAudioPops();
});
$("copyCode").addEventListener("click", (e) => copyTxt(roomCode, e.currentTarget));
$("copyLink").addEventListener("click", (e) => {
  const url = location.origin + location.pathname + "?sala=" + roomCode;
  copyTxt(url, e.currentTarget);
});
$("join").addEventListener("click", () => joinRoom($("codeInput").value));
$("codeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinRoom($("codeInput").value);
});
$("leave").addEventListener("click", leaveRoom);
$("visConfirm").addEventListener("click", () => {
  const sel = document.querySelector('input[name="vis"]:checked');
  closeVis(sel ? sel.value : "public");
});
$("visCancel").addEventListener("click", () => closeVis(null));
$("visBackdrop").addEventListener("click", () => closeVis(null));
$("nick").addEventListener("input", () => saveNick(cleanNick($("nick").value)));
$("nick").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && $("codeInput").value.trim().length === 6) joinRoom($("codeInput").value);
});
$("pipCancel").addEventListener("click", closePipDialog);
$("pipBackdrop").addEventListener("click", closePipDialog);
setInterval(() => {
  if (hosting) saveHS(false);
}, 2000);
$("nickConfirm").addEventListener("click", submitNick);
$("nickCancel").addEventListener("click", leaveRoom);
$("nickNew").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitNick();
});
$("scrViewBtn").addEventListener("click", () => {
  if (scrState === "none") {
    if (vConn && vConn.open) {
      vConn.send({ reqShare: true });
      scrState = "requested";
      setSt($("viewStatus"), "");
      viewShareUI();
    }
  } else if (scrState === "allowed") {
    viewerShare();
  } else if (scrState === "sharing") {
    viewerStopShare(true);
  }
});
$("camViewBtn").addEventListener("click", () => {
  if (camState === "none") {
    if (vConn && vConn.open) {
      vConn.send({ reqCam: true });
      camState = "requested";
      setSt($("viewStatus"), "");
      viewShareUI();
    }
  } else if (camState === "allowed") {
    viewerCam();
  } else if (camState === "sharing") {
    viewerStopCam(true);
  }
});
$("viewSwitch").addEventListener("click", () => {
  closeViewPanel();
  viewerReshare();
});
$("viewFs").addEventListener("click", () => {
  closeViewPanel();
  toggleFs(fsEl($("viewStage")));
});
$("muteBtn").addEventListener("click", () => {
  vMuted = !vMuted;
  if (!vMuted && vVol === 0) {
    vVol = 1;
    $("volume").value = 1;
  }
  applyVol();
  updateMuteBtn();
});
$("volume").addEventListener("input", (e) => {
  vVol = Number(e.target.value);
  vMuted = vVol === 0;
  applyVol();
  updateMuteBtn();
});
$("settingsBtn").addEventListener("click", openCfg);
$("infoOk").addEventListener("click", () => closeInfo(true));
$("infoCancel").addEventListener("click", () => closeInfo(false));
$("infoBackdrop").addEventListener("click", () => closeInfo(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && infoRes) closeInfo(false);
});
$("termsLink").addEventListener("click", () => openInfo("termsTitle", "termsBody", false));
$("ipLink").addEventListener("click", () => openInfo("ipTitle", "ipBody", false));
let reportPick = null;
const RECENT = "recentRooms";
function loadRecent() {
  try {
    const a = JSON.parse(localStorage.getItem(RECENT) || "[]");
    if (!Array.isArray(a)) return [];
    return a
      .filter((r) => r && /^[A-Z0-9]{6}$/.test(r.code) && Array.isArray(r.people) && Number.isFinite(r.ts))
      .slice(0, 2)
      .map((r) => ({
        code: r.code,
        ts: r.ts,
        people: r.people.slice(0, 40).filter((x) => x && typeof x.g === "string" && typeof x.n === "string").map((x) => ({
          g: x.g.slice(0, 8),
          n: cleanNick(x.n),
          p: Array.isArray(x.p) ? x.p.slice(0, 5).map((y) => cleanNick(String(y))) : []
        }))
      }));
  } catch (e) {
    return [];
  }
}
function rememberRoom(code, people) {
  if (!/^[A-Z0-9]{6}$/.test(code || "") || !Array.isArray(people)) return;
  const list = loadRecent();
  const i = list.findIndex((r) => r.code === code);
  const entry = i >= 0 ? list.splice(i, 1)[0] : { code: code, ts: 0, people: [] };
  const dupOf = (arr) => {
    const c = {};
    arr.forEach((x) => {
      c[x.g] = (c[x.g] || 0) + 1;
    });
    return (x) => (c[x.g] > 1 ? x.g + "|" + x.n : x.g);
  };
  const oldKey = dupOf(entry.people);
  const newKey = dupOf(people);
  const byId = new Map(entry.people.map((x) => [oldKey(x), x]));
  people.forEach((x) => {
    if (!x) return;
    const key = newKey(x);
    const old = byId.get(key);
    let prev = (x.p || []).slice();
    if (old) {
      prev = prev.concat(old.p);
      if (old.n !== x.n) prev.push(old.n);
    }
    prev = prev.filter((y, k) => y && y !== x.n && prev.indexOf(y) === k).slice(-5);
    byId.set(key, { g: x.g, n: x.n, p: prev });
  });
  entry.people = [...byId.values()].slice(-40);
  entry.ts = Date.now();
  list.unshift(entry);
  try {
    localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 2)));
  } catch (e) {}
}
let reportDoneTimer = 0;
let reportLastSent = 0;
const REPORT_API = { projectId: "easy-screen-reports", apiKey: "AIzaSyCSg3MOH3QfMID1xYjsoxDt7-8qES-BxJg" };
const REPORT_MAIL = "supervxz99@gmail.com";
function reportTarget() {
  return reportPick;
}
function reportData() {
  const tg = reportTarget();
  const me = getViewerId().slice(0, 8);
  const lines = [];
  lines.push(t("reportLblRoom") + ": " + ($("reportCode").value.trim() || "-"));
  if (tg) {
    lines.push(t("reportLblWho") + ": " + tg.n);
    lines.push(t("reportLblId") + ": " + tg.g);
    if (tg.p.length) lines.push(t("reportLblAlso") + ": " + tg.p.join(", "));
  } else {
    lines.push(t("reportLblWho") + ": " + ($("reportNick").value.trim() || "-"));
  }
  lines.push(t("reportLblBy") + ": " + me);
  lines.push(t("reportLblTime") + ": " + new Date().toISOString());
  lines.push(t("reportLblText") + ": " + $("reportText").value.trim());
  if ($("reportChat").checked && !$("reportChat").disabled) {
    const rows = [...$("chatList").querySelectorAll(".msg")].slice(-15).map((r) => r.textContent.trim().slice(0, 120));
    if (rows.length) lines.push("", t("reportLblChat") + ":", ...rows);
  }
  return { subject: t("reportSubject"), body: lines.join("\n") + "\n" };
}
function reportFields() {
  const tg = reportTarget();
  const rows = $("reportChat").checked && !$("reportChat").disabled
    ? [...$("chatList").querySelectorAll(".msg")].slice(-15).map((r) => r.textContent.trim().slice(0, 120))
    : [];
  return {
    room: $("reportCode").value.trim().slice(0, 6),
    target: (tg ? tg.n : $("reportNick").value.trim()).slice(0, 40),
    targetId: tg ? tg.g : "",
    prev: tg ? tg.p.join(", ").slice(0, 200) : "",
    by: getViewerId().slice(0, 8),
    text: $("reportText").value.trim().slice(0, 1000),
    chat: rows.join("\n").slice(0, 2500),
    lang: lang,
    status: "new",
    createdAt: new Date().toISOString()
  };
}
async function sendReport() {
  const st = $("reportStatus");
  const show = (key, err) => {
    st.hidden = false;
    st.className = "status" + (err ? " error" : "");
    setT(st, key);
  };
  const f = reportFields();
  if (!f.text) return show("reportEmpty", true);
  if (Date.now() - reportLastSent < 30000) return show("reportWait", true);
  $("reportSend").disabled = true;
  try {
    const fields = {};
    Object.keys(f).forEach((k) => {
      fields[k] = { stringValue: f[k] };
    });
    const r = await fetch("https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(REPORT_API.projectId) + "/databases/(default)/documents/reports?key=" + encodeURIComponent(REPORT_API.apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: fields })
    });
    if (!r.ok) throw new Error("http " + r.status);
    reportLastSent = Date.now();
    $("reportStatus").hidden = true;
    setT($("reportDoneMsg"), "reportSent");
    $("reportDoneMsg").hidden = false;
    $("reportDialog").classList.add("done");
    clearTimeout(reportDoneTimer);
    reportDoneTimer = setTimeout(closeReport, 4000);
  } catch (e) {
    show("reportFail", true);
  }
  $("reportSend").disabled = false;
}
function refreshReport() {
  const d = reportData();
  $("reportGmail").href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(REPORT_MAIL) + "&su=" + encodeURIComponent(d.subject) + "&body=" + encodeURIComponent(d.body);
  $("reportMail").href = "mailto:" + REPORT_MAIL + "?subject=" + encodeURIComponent(d.subject) + "&body=" + encodeURIComponent(d.body);
}
function fillReportWho() {
  const box = $("reportGroups");
  const groups = loadRecent();
  const cur = hosting ? roomCode : !viewerView.hidden ? joinCode : "";
  box.innerHTML = "";
  reportPick = null;
  groups.forEach((r, gi) => {
    const det = document.createElement("details");
    if (gi === 0) det.open = true;
    const sum = document.createElement("summary");
    const when = new Date(r.ts).toLocaleString(lang === "pt" ? "pt-BR" : "en", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    sum.textContent = t("reportRoom", { code: r.code }) + (r.code === cur ? " (" + t("reportCurrent") + ")" : "") + " · " + when;
    det.appendChild(sum);
    r.people.forEach((x) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rp";
      b.setAttribute("aria-pressed", "false");
      b.textContent = x.n + (x.p.length ? " (" + x.p.join(", ") + ")" : "");
      b.addEventListener("click", () => {
        box.querySelectorAll(".rp").forEach((o) => o.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        reportPick = { g: x.g, n: x.n, p: x.p };
        $("reportCode").value = r.code;
        $("reportNick").value = "";
        refreshReport();
      });
      det.appendChild(b);
    });
    box.appendChild(det);
  });
  $("reportWhoBox").hidden = groups.length === 0;
  const hasChat = !!$("chatList").querySelector(".msg");
  $("reportChat").disabled = !hasChat;
  $("reportChat").checked = false;
  $("reportChatWrap").classList.toggle("off", !hasChat);
}
function openReport() {
  const code = hosting ? roomCode : !viewerView.hidden ? joinCode : "";
  $("reportCode").value = code || "";
  $("reportNick").value = "";
  $("reportText").value = "";
  $("reportChat").checked = false;
  $("reportStatus").hidden = true;
  clearTimeout(reportDoneTimer);
  $("reportDoneMsg").hidden = true;
  $("reportDialog").classList.remove("done");
  $("reportSend").hidden = !(REPORT_API.projectId && REPORT_API.apiKey);
  fillReportWho();
  $("reportAddr").textContent = t("reportAddr", { mail: REPORT_MAIL });
  refreshReport();
  $("reportBackdrop").hidden = false;
  $("reportDialog").hidden = false;
  $("reportText").focus();
}
function closeReport() {
  $("reportBackdrop").hidden = true;
  $("reportDialog").hidden = true;
}
$("reportCode").addEventListener("input", () => {
  $("reportCode").value = $("reportCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
["reportCode", "reportNick", "reportText"].forEach((id) => $(id).addEventListener("input", refreshReport));
$("reportNick").addEventListener("input", () => {
  if ($("reportNick").value) {
    reportPick = null;
    $("reportGroups").querySelectorAll(".rp").forEach((o) => o.setAttribute("aria-pressed", "false"));
  }
});
$("reportChat").addEventListener("change", refreshReport);
$("reportLink").addEventListener("click", openReport);
$("reportClose").addEventListener("click", closeReport);
$("reportSend").addEventListener("click", sendReport);
$("reportBackdrop").addEventListener("click", closeReport);
$("reportCopy").addEventListener("click", async () => {
  const d = reportData();
  const txt = d.subject + "\n\n" + d.body;
  try {
    await navigator.clipboard.writeText(txt);
  } catch (e) {
    const ta = $("reportText");
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e2) {}
  }
  setT($("reportCopy"), "copied");
  setTimeout(() => setT($("reportCopy"), "reportCopy"), 1500);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("reportDialog").hidden) closeReport();
});
$("homeStatusX").addEventListener("click", () => setSt($("homeStatus"), ""));
$("viewStatusX").addEventListener("click", () => setSt($("viewStatus"), ""));
$("closeSettings").addEventListener("click", closeCfg);
$("settingsBackdrop").addEventListener("click", closeCfg);
$("updateReload").addEventListener("click", () => location.reload());
$("updateDismiss").addEventListener("click", () => {
  updHide = true;
  updView();
});
$("setTheme").addEventListener("change", (e) => {
  cfg.theme = e.target.value;
  saveCfg();
  applyTheme();
  drawCfg();
});
$("setAutoReduce").addEventListener("change", (e) => {
  cfg.autoReduce = e.target.checked;
  saveCfg();
});
$("setAutoRecover").addEventListener("change", (e) => {
  cfg.autoRecover = e.target.checked;
  saveCfg();
});
$("setNotify").addEventListener("change", (e) => {
  const want = e.target.checked;
  const supported = "Notification" in window;
  if (!want || !supported || Notification.permission === "denied") {
    cfg.notify = false;
    saveCfg();
    drawCfg();
    return;
  }
  cfg.notify = true;
  saveCfg();
  if (Notification.permission === "default") {
    reqNotif();
  } else {
    drawCfg();
  }
});
window.addEventListener("focus", () => {
  syncNotif();
  if ($("settingsPanel").classList.contains("open")) drawCfg();
});
$("setAnim").addEventListener("change", (e) => {
  cfg.animations = e.target.checked;
  saveCfg();
  applyAnim();
});
$("setCap").addEventListener("change", (e) => {
  cfg.capByViewers = e.target.checked;
  saveCfg();
  capNow();
});
$("setAmbient").addEventListener("change", (e) => {
  cfg.glow = e.target.checked;
  saveCfg();
  if (!cfg.glow) glowOff();
});
$("langPt").addEventListener("click", () => setLang("pt"));
$("langEn").addEventListener("click", () => setLang("en"));

const GLOW = { cv: document.createElement("canvas"), cur: null };
GLOW.cv.width = 32;
GLOW.cv.height = 18;
const gCtx = GLOW.cv.getContext("2d", { willReadFrequently: true });

function bandAvg(d, x0, y0, x1, y1) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * 32 + x) * 4;
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

function glowOff() {
  ["t", "r", "b", "l", "avg"].forEach((k) => {
    [$("hostStage"), $("viewStage")].forEach((s) => s.style.removeProperty("--amb-" + k));
  });
  GLOW.cur = null;
}

function glowTick() {
  if (!cfg.glow || document.hidden) {
    if (GLOW.cur) glowOff();
    return;
  }
  const stage = hosting ? $("hostStage") : viewerView.hidden ? null : $("viewStage");
  const v = topVideo();
  if (!stage || !v || v.readyState < 2 || !v.videoWidth) {
    if (GLOW.cur) glowOff();
    return;
  }
  try {
    gCtx.drawImage(v, 0, 0, 32, 18);
  } catch (e) {
    return;
  }
  const d = gCtx.getImageData(0, 0, 32, 18).data;
  const next = [
    bandAvg(d, 0, 0, 32, 2),
    bandAvg(d, 30, 0, 32, 18),
    bandAvg(d, 0, 16, 32, 18),
    bandAvg(d, 0, 0, 2, 18)
  ];
  GLOW.cur = GLOW.cur
    ? GLOW.cur.map((c, i) => c.map((x, k) => x + (next[i][k] - x) * 0.3))
    : next;
  const css = (c, a) => "rgba(" + c.map(Math.round).join(",") + "," + a + ")";
  ["t", "r", "b", "l"].forEach((k, i) => stage.style.setProperty("--amb-" + k, css(GLOW.cur[i], 0.4)));
  const avg = [0, 1, 2].map((k) => GLOW.cur.reduce((s, c) => s + c[k], 0) / 4);
  stage.style.setProperty("--amb-avg", css(avg, 0.55));
}

setInterval(glowTick, 100);

function thMsg(key, err) {
  const el = $("themeMsg");
  setT(el, key);
  el.style.color = err ? "var(--danger)" : "";
}

function syncTh() {
  const custom = cfg.theme === "custom";
  $("customBox").hidden = !custom;
  const acc = custom ? cfg.colors.accent : cfg.accent;
  document.querySelectorAll("#swatches .swatch").forEach((b) => {
    b.setAttribute("aria-pressed", String(!!acc && b.dataset.hex === acc.toLowerCase()));
  });
  TH_KEYS.forEach((k) => {
    const i = $("col-" + k);
    if (i) i.value = cfg.colors[k];
  });
}

function curColors() {
  if (cfg.theme === "custom") return { ...cfg.colors };
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  TH_KEYS.forEach((k) => {
    const v = cs.getPropertyValue("--" + k).trim();
    out[k] = isHex(v) ? v.toLowerCase() : TH_DEF[k];
  });
  return out;
}

function buildTh() {
  const sw = $("swatches");
  PALS.forEach((hex) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.hex = hex;
    b.style.background = hex;
    b.setAttribute("aria-label", hex);
    b.addEventListener("click", () => {
      if (cfg.theme === "custom") {
        cfg.colors.accent = hex;
      } else {
        cfg.accent = cfg.accent === hex ? "" : hex;
      }
      saveCfg();
      applyTheme();
      syncTh();
    });
    sw.appendChild(b);
  });
  const names = {
    bg: "colBg",
    surface: "colSurface",
    text: "colText",
    muted: "colMuted",
    border: "colBorder",
    accent: "colAccent",
    danger: "colDanger"
  };
  const box = $("customRows");
  TH_KEYS.forEach((k) => {
    const row = document.createElement("label");
    row.className = "setrow";
    const text = document.createElement("span");
    text.className = "settext";
    const name = document.createElement("span");
    name.className = "setname";
    setT(name, names[k]);
    text.appendChild(name);
    const input = document.createElement("input");
    input.type = "color";
    input.id = "col-" + k;
    input.className = "colorpick";
    input.addEventListener("input", () => {
      cfg.colors[k] = input.value.toLowerCase();
      saveCfg();
      applyTheme();
      syncTh();
    });
    row.append(text, input);
    box.appendChild(row);
  });
}

$("themeExport").addEventListener("click", () => {
  const code = "TF1:" + btoa(JSON.stringify(curColors()));
  $("themeCode").value = code;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => thMsg("themeCopied"), () => thMsg("themeExported"));
  } else {
    thMsg("themeExported");
  }
});

$("themeImport").addEventListener("click", () => {
  const raw = $("themeCode").value.trim();
  if (!raw.startsWith("TF1:")) {
    thMsg("themeBad", true);
    return;
  }
  try {
    const obj = JSON.parse(atob(raw.slice(4)));
    if (!obj || typeof obj !== "object" || !TH_KEYS.every((k) => isHex(obj[k]))) throw new Error("bad");
    cfg.colors = fixColors(obj);
    cfg.theme = "custom";
    saveCfg();
    applyTheme();
    drawCfg();
    thMsg("themeImported");
  } catch (e) {
    thMsg("themeBad", true);
  }
});

$("themeReset").addEventListener("click", () => {
  cfg.theme = "auto";
  cfg.accent = "";
  cfg.colors = { ...TH_DEF };
  saveCfg();
  applyTheme();
  drawCfg();
  thMsg("themeResetDone");
});

lang = detectLang();
applyTheme();
applyAnim();
buildTh();
drawCfg();
applyLang();
watchUpd();
  let savedNick = "";
  try { savedNick = localStorage.getItem("nick") || ""; } catch (e) {}
  if (!savedNick) {
    try { savedNick = sessionStorage.getItem("nick") || ""; } catch (e) {}
  }
  $("nick").value = savedNick;
  chkOfficial();
  viewShareUI();
  if (!canCapture) {
  $("shareCard").hidden = true;
  $("shareNotice").hidden = false;
  if (!canCam) {
    setT($("noShareMsg"), "noShareOnly");
    $("camHome").hidden = true;
    $("noShareDot").hidden = true;
  }
  $("watchCard").classList.add("highlight");
}
  if (pipSupported()) {
  $("pipView").hidden = false;
  $("pipHost").hidden = false;
}

const params = new URLSearchParams(location.search);
const roomParam = params.get("sala");
const resumed = tryRes(roomParam ? roomParam.toUpperCase().slice(0, 6) : "");
if (roomParam && !resumed) {
  const linkCode = roomParam.toUpperCase().slice(0, 6);
  $("codeInput").value = linkCode;
  if ($("nick").value.trim()) {
    joinRoom(linkCode);
  } else {
    setSt($("homeStatus"), "nickToJoin");
    $("nick").focus();
  }
}

$("gifBtn").addEventListener("click", () => {
  if ($("gifBox").hidden) {
    openGifBox();
  } else {
    closeGifBox();
  }
});
$("gifQuery").addEventListener("input", () => {
  clearTimeout(gifTimer);
  gifTimer = setTimeout(loadGifs, 450);
});
$("gifsToggle").addEventListener("change", (e) => {
  gifsOn = e.target.checked;
  viewers.forEach((v) => {
    if (v.conn.open) v.conn.send({ gifs: gifsOn });
  });
  syncSucc();
  saveHS(false);
});
