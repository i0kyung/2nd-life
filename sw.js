/* 「제2의 인생」 서비스 워커 — 한 번 플레이하면 오프라인에서도 이어서 할 수 있다.
   화면·스크립트는 미리 받아두고, 큰 그림(image/)은 처음 볼 때 저장한다. */
const CACHE = "second-life-v2"; // v2: 그림 경량화
const CORE = [
  "./", "./index.html", "./result.html",
  "./stage_child.html", "./stage_elementary.html", "./stage_middle.html", "./stage_high.html",
  "./stage_youth.html", "./stage_adult.html", "./stage_senior.html",
  "./fx/fx.css", "./fx/fx.js", "./world/world.css", "./world/world.js", "./pwa.js",
  "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate" || /\.(html|js|css)$/.test(new URL(req.url).pathname);
  if (isPage) {
    // 화면·코드: 새 버전 먼저, 안 되면 저장본
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
  } else {
    // 그림: 저장본 먼저
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
  }
});
