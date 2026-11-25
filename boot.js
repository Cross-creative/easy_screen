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
