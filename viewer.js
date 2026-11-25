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

