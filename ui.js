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

