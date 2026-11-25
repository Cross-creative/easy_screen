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


function rndCode() {
  let c = "";
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 6; i++) c += CHARS[buf[i] % CHARS.length];
  return c;
}
