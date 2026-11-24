(function () {
  "use strict";

  var ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];

  var TURN_SERVERS = [
  { urls: "turn:global.relay.metered.ca:80", username: "f44d99d0d393261e2ecde3bb", credential: "HtG9eyNudaXk/2Fk" },
  { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "f44d99d0d393261e2ecde3bb", credential: "HtG9eyNudaXk/2Fk" },
  { urls: "turn:global.relay.metered.ca:443", username: "f44d99d0d393261e2ecde3bb", credential: "SUA_SENHA_AQUI" },
  { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "f44d99d0d393261e2ecde3bb", credential: "HtG9eyNudaXk/2Fk" }
];

  function installIce() {
    var Original = window.Peer;
    if (typeof Original !== "function" || Original.__tfWrapped) return;
    var servers = ICE_SERVERS.concat(TURN_SERVERS);
    function Wrapped(a, b) {
      var id = typeof a === "string" ? a : undefined;
      var opts = typeof a === "object" && a ? a : b || {};
      opts = Object.assign({}, opts, { config: { iceServers: servers } });
      return id !== undefined ? new Original(id, opts) : new Original(opts);
    }
    Wrapped.prototype = Original.prototype;
    Wrapped.__tfWrapped = true;
    Object.keys(Original).forEach(function (k) {
      try { Wrapped[k] = Original[k]; } catch (e) {}
    });
    window.Peer = Wrapped;
  }

  installIce();

  var cap = window.Capacitor;
  var isWebView = /; wv\)/.test(navigator.userAgent || "");
  var isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  if (!isNative && !(cap && isWebView)) return;

  var PT = (navigator.language || "pt").toLowerCase().indexOf("pt") === 0;
  var TXT = {
    audioOld: PT ? "Áudio do sistema indisponível: precisa do Android 10 ou superior." : "System audio unavailable: needs Android 10 or newer.",
    audioDenied: PT ? "Áudio não compartilhado: permissão do microfone negada." : "Audio not shared: microphone permission denied."
  };

  function plugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenCapture;
  }

  function toast(message) {
    var el = document.createElement("div");
    el.textContent = message;
    el.style.cssText = "position:fixed;left:50%;bottom:84px;transform:translateX(-50%);max-width:88vw;padding:10px 16px;border-radius:12px;background:rgba(20,20,24,.94);color:#fff;font:500 14px/1.35 system-ui,sans-serif;z-index:99999;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.35)";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2000);
  }

  var css = [
    "html{-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}",
    "body{padding-top:env(safe-area-inset-top,0px)}",
    "main{padding:16px 12px calc(96px + env(safe-area-inset-bottom,0px))}",
    "button,select,input[type=text],input[type=number]{min-height:48px;font-size:16px}",
    "button.mini{min-height:40px;padding:6px 12px}",
    ".ibtn{width:50px;height:50px;border-radius:14px}",
    ".ibtn svg{width:26px;height:26px}",
    ".bar{gap:10px;flex-wrap:wrap}",
    ".row{gap:12px}",
    ".gear{width:54px;height:54px;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px))}",
    ".gear svg{width:28px;height:28px}",
    ".chat-form{padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}",
    ".panel-body{padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}",
    ".stage{border-radius:12px}",
    "@media (max-width:640px){.panel{width:100vw}.dialog{width:94vw}.grid{grid-template-columns:1fr}}",
    "@media (orientation:portrait){.stage{aspect-ratio:auto;height:58vh;min-height:260px}}",
    ".check input[type=checkbox],.check input[type=radio]{width:22px;height:22px}",
    ".badge{padding:8px 14px}",
    ".person{gap:8px;flex-wrap:wrap}"
  ].join("\n");
  var style = document.createElement("style");
  style.id = "tf-mobile";
  style.textContent = css;
  document.head.appendChild(style);

  var current = null;
  var listening = false;
  var sessionSeq = 0;

  function pick(x) {
    if (x === undefined || x === null) return 0;
    if (typeof x === "number") return x;
    return x.max || x.ideal || x.exact || x.min || 0;
  }

  function concat(a, b) {
    if (!a.length) return b;
    var out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function teardown(S) {
    if (!S || S.dead) return;
    S.dead = true;
    try { S.ac.abort(); } catch (e) {}
    clearInterval(S.timer);
    if (S.latest && S.latest.close) { try { S.latest.close(); } catch (e) {} }
    S.latest = null;
    if (S.audioCtx) { try { S.audioCtx.close(); } catch (e) {} }
  }

  function ensureListener() {
    if (listening) return;
    var P = plugin();
    if (!P || !P.addListener) return;
    listening = true;
    P.addListener("stopped", function (ev) {
      var S = current;
      if (!S || S.native !== (ev && ev.session)) return;
      current = null;
      teardown(S);
      try { S.origStop.call(S.track); } catch (e) {}
      try { S.track.dispatchEvent(new Event("ended")); } catch (e) {}
      if (S.audioTrack) { try { S.audioTrack.stop(); } catch (e) {} }
    });
  }

  function startTimer(S) {
    clearInterval(S.timer);
    S.timer = setInterval(function () {
      if (S.dead || !S.latest) return;
      var b = S.latest;
      if (S.canvas.width !== b.width || S.canvas.height !== b.height) {
        S.canvas.width = b.width;
        S.canvas.height = b.height;
      }
      S.ctx.drawImage(b, 0, 0);
    }, Math.round(1000 / S.fps));
  }

  async function pumpVideo(S) {
    var res = await fetch("/__screen", { signal: S.ac.signal, cache: "no-store" });
    var reader = res.body.getReader();
    var buf = new Uint8Array(0);
    var busy = false;
    var pending = null;
    function decode(jpg) {
      busy = true;
      createImageBitmap(new Blob([jpg], { type: "image/jpeg" })).then(function (bmp) {
        if (S.dead) { bmp.close(); return; }
        var old = S.latest;
        S.latest = bmp;
        if (old && old.close) old.close();
      }).catch(function () {}).then(function () {
        busy = false;
        if (pending) {
          var next = pending;
          pending = null;
          decode(next);
        }
      });
    }
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      buf = concat(buf, r.value);
      while (buf.length >= 4) {
        var len = ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
        if (buf.length < 4 + len) break;
        var jpg = buf.slice(4, 4 + len);
        buf = buf.slice(4 + len);
        if (busy) pending = jpg; else decode(jpg);
      }
    }
  }

  async function pumpAudio(S) {
    var res = await fetch("/__audio", { signal: S.ac.signal, cache: "no-store" });
    var reader = res.body.getReader();
    var rest = new Uint8Array(0);
    var cursor = 0;
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      var data = concat(rest, r.value);
      var usable = data.length - (data.length % 4);
      rest = data.slice(usable);
      if (!usable) continue;
      var frames = usable / 4;
      var ab = S.audioCtx.createBuffer(2, frames, 48000);
      var left = ab.getChannelData(0);
      var right = ab.getChannelData(1);
      var view = new DataView(data.buffer, data.byteOffset, usable);
      for (var i = 0; i < frames; i++) {
        left[i] = view.getInt16(i * 4, true) / 32768;
        right[i] = view.getInt16(i * 4 + 2, true) / 32768;
      }
      var now = S.audioCtx.currentTime;
      if (cursor < now + 0.02) cursor = now + 0.09;
      if (cursor > now + 0.6) continue;
      var src = S.audioCtx.createBufferSource();
      src.buffer = ab;
      src.connect(S.audioDest);
      src.start(cursor);
      cursor += ab.duration;
    }
  }

  async function getDisplayMedia(constraints) {
    var P = plugin();
    if (!P) throw new DOMException("Not supported", "NotSupportedError");
    ensureListener();
    constraints = constraints || {};
    var v = typeof constraints.video === "object" && constraints.video ? constraints.video : {};
    var w = pick(v.width) || 1280;
    var h = pick(v.height) || 720;
    var fps = Math.max(5, Math.min(30, pick(v.frameRate) || 15));
    var wantAudio = !!constraints.audio;

    var info;
    try {
      info = await P.start({ width: w, height: h, fps: fps, audio: wantAudio });
    } catch (e) {
      throw new DOMException("Permission denied", "NotAllowedError");
    }

    var S = {
      id: ++sessionSeq,
      native: info.session,
      fps: fps,
      dead: false,
      canvas: document.createElement("canvas"),
      latest: null,
      ac: new AbortController(),
      timer: 0,
      audioCtx: null,
      audioDest: null,
      audioTrack: null
    };
    S.canvas.width = info.width;
    S.canvas.height = info.height;
    S.ctx = S.canvas.getContext("2d", { alpha: false });
    S.ctx.fillStyle = "#000";
    S.ctx.fillRect(0, 0, info.width, info.height);

    var stream = S.canvas.captureStream();
    S.stream = stream;
    S.track = stream.getVideoTracks()[0];
    S.origStop = S.track.stop;

    S.track.stop = function () {
      S.origStop.call(S.track);
      teardown(S);
      if (S.audioTrack) { try { S.audioTrack.stop(); } catch (e) {} }
      if (current === S) {
        current = null;
        try { P.stop(); } catch (e) {}
      }
    };

    S.track.applyConstraints = function (c) {
      c = c || {};
      var nw = pick(c.width) || w;
      var nh = pick(c.height) || h;
      var nf = Math.max(5, Math.min(30, pick(c.frameRate) || S.fps));
      if (current === S) {
        w = nw;
        h = nh;
        S.fps = nf;
        startTimer(S);
        try { P.setQuality({ width: nw, height: nh, fps: nf }); } catch (e) {}
      }
      return Promise.resolve();
    };

    if (info.audio) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        S.audioCtx = new AC({ sampleRate: 48000 });
        S.audioDest = S.audioCtx.createMediaStreamDestination();
        S.audioTrack = S.audioDest.stream.getAudioTracks()[0];
        stream.addTrack(S.audioTrack);
        if (S.audioCtx.resume) S.audioCtx.resume();
      } catch (e) {
        S.audioCtx = null;
        S.audioTrack = null;
      }
    } else if (wantAudio) {
      toast(TXT.audioDenied);
    }

    var previous = current;
    current = S;
    if (previous) teardown(previous);

    startTimer(S);
    pumpVideo(S).catch(function () {});
    if (S.audioCtx) pumpAudio(S).catch(function () {});
    return stream;
  }

  if (!navigator.mediaDevices) {
    try { Object.defineProperty(navigator, "mediaDevices", { value: {}, configurable: true }); } catch (e) {}
  }
  if (navigator.mediaDevices && !navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = getDisplayMedia;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var P = plugin();
    if (!P || !P.getInfo) return;
    P.getInfo().then(function (info) {
      if (info && info.audio === false) {
        ["audio", "viewAudio"].forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.checked = false;
          el.disabled = true;
          if (el.parentElement) el.parentElement.style.opacity = "0.45";
        });
        toast(TXT.audioOld);
      }
    }).catch(function () {});
  });
})();
