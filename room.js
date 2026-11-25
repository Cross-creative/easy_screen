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
