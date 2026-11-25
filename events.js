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

