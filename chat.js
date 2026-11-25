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

