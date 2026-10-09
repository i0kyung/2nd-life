/* 앱 설치(PWA) 등록 — http(s)로 열었을 때만. 파일을 더블클릭해 열면(file://) 조용히 건너뛴다. */
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

/* 다음 시대 미리 받기 — 지금 시대를 플레이하는 동안, 다음 화면·배경·내 캐릭터 그림을
   한가할 때 조용히 받아 둔다. 시대가 바뀌는 순간 그림이 늦게 뜨지 않게 하기 위해서다. */
(function () {
  const NEXT = {
    "index.html": ["stage_child.html", "child"],
    "stage_child.html": ["stage_elementary.html", "elementary"],
    "stage_elementary.html": ["stage_middle.html", "middle"],
    "stage_middle.html": ["stage_high.html", "high"],
    "stage_high.html": ["stage_youth.html", "youth"],
    "stage_youth.html": ["stage_adult.html", "adult"],
    "stage_adult.html": ["stage_senior.html", "senior"],
    "stage_senior.html": ["result.html", "result"]
  };
  const page = location.pathname.split("/").pop() || "index.html";
  const nx = NEXT[page]; if (!nx) return;
  // 데이터 절약 모드나 느린 2G에서는 미리 받지 않는다
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ""))) return;

  function myImages(key) {
    let u = null;
    try { u = (JSON.parse(localStorage.getItem("secondLife_players")) || [])[0]; } catch (e) {}
    if (!u || !u.gender) return [];
    const g = u.gender === "female" ? "female" : "male";
    const n = String(u.characterId || "").replace(/\D/g, "").replace(/^0+/, "");
    const out = [];
    if (key === "child" || key === "elementary") {
      out.push(`./image/user/base/${key}_${g}.png`);
      ["normal", "happy", "sad", "worried", "burnout"].forEach(f => out.push(`./image/user/base/faces/${key}_${g}_${f}.png`));
    } else if (n) {
      const k = key === "result" ? "senior" : key;
      out.push(`./image/user/${g}/${n}/${k}.png`);
      if (key === "middle") ["normal", "happy", "sad", "worried", "burnout"].forEach(f => out.push(`./image/user/${g}/${n}/face_${f}.png`));
    }
    return out;
  }
  function prefetch(url, as) {
    const l = document.createElement("link");
    l.rel = "prefetch"; l.href = url; if (as) l.as = as;
    document.head.appendChild(l);
  }
  function go() {
    prefetch("./" + nx[0], "document");
    prefetch(`./image/bg/${nx[1]}.png`, "image");
    myImages(nx[1]).forEach(u => prefetch(u, "image"));
  }
  // 첫 화면이 다 그려지고 몇 초 뒤, 브라우저가 한가할 때
  window.addEventListener("load", () => setTimeout(() => (window.requestIdleCallback || setTimeout)(go), 4000));
})();
