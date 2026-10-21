// Last Turn service worker (derlemede üretilir, elle düzenleme: src/pwa/sw-sablon.js).
// Oyun dosyaları kurulumda önbelleğe alınır, internetsiz de açılır. index.html internet varken her açılışta
// ağdan tazelenir; adında özet olan dosyalar (assets/) değişmez, önbellekten gelir.
const CACHE = "%ONEK%%SURUM%-%OZET%";
const ONEK = "%ONEK%";
const CORE = /* DOSYALAR */ [];
const KOK = new URL("./", self.location).pathname;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  // yalnız kendi önbelleklerini temizler: ana sürüm ile deneme sürümü (dev/) aynı kökeni paylaşır
  const benim = (k) =>
    ONEK == "last-turn-" ? k.startsWith("last-turn") && !k.startsWith("last-turn-dev-") : k.startsWith(ONEK);
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && benim(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith(KOK)) return;
  // ana sürüm deneme sürümüne karışmaz
  if (ONEK == "last-turn-" && u.pathname.startsWith(KOK + "dev/")) return;
  if (/\/video\//.test(u.pathname)) {
    e.respondWith(videoYaniti(e.request));
    return;
  }
  const sabit = /\/(assets|icons|img)\//.test(u.pathname);
  e.respondWith(
    sabit
      ? caches.match(e.request).then(
          (r) =>
            r ||
            fetch(e.request).then((n) => {
              const c = n.clone();
              caches.open(CACHE).then((k) => k.put(e.request, c));
              return n;
            }),
        )
      : fetch(e.request, { cache: "no-store" })
          .then((n) => {
            if (n.ok) {
              const c = n.clone();
              caches.open(CACHE).then((k) => k.put(e.request, c));
            }
            return n;
          })
          .catch(() =>
            caches
              .match(e.request, { ignoreSearch: true })
              .then((r) => r || caches.match(KOK + "index.html")),
          ),
  );
});

// menü videosu: önbellekten parça parça (Range) verilir. iOS videoyu parça isteyerek oynatır; önbellekteki tam
// dosyayı (200) parça isteğine döndürmek iOS'ta videoyu oynatmaz
async function videoYaniti(q) {
  const c = await caches.open(CACHE);
  let r = await c.match(q.url);
  if (!r) {
    r = await fetch(q.url);
    if (r.status != 200) return r;
    await c.put(q.url, r.clone());
  }
  const aralik = q.headers.get("range");
  if (!aralik) return r;
  const b = await r.arrayBuffer(),
    n = b.byteLength,
    m = /bytes=(\d*)-(\d*)/.exec(aralik),
    bas = m && m[1] ? +m[1] : 0,
    son = m && m[2] ? Math.min(+m[2], n - 1) : n - 1;
  return new Response(b.slice(bas, son + 1), {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes ${bas}-${son}/${n}`,
      "Content-Length": String(son - bas + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
