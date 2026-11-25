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

