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

