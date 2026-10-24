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

// Okuma yalnız etkin sürümden yapılır; aynı kökendeki diğer uygulamalar karışmaz.
async function onbellekten(istek, secenek) {
  try {
    return await (await caches.open(CACHE)).match(istek, secenek);
  } catch {
    // iOS depolama kotası ya da özel gezinme ağdan oynamayı engellememeli.
  }
}

function sakla(e, yanit) {
  if (!yanit.ok) return;
  const kopya = yanit.clone();
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.put(e.request, kopya))
      .catch(() => {}),
  );
}

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith(KOK)) return;
  // Giriş yardımcısı her zaman ağdan gelmeli; çevrimdışıyken yerine oyun HTML'i dönmemeli.
  if (u.pathname.startsWith(KOK + "__/")) return;
  // ana sürüm deneme sürümüne karışmaz
  if (ONEK == "last-turn-" && u.pathname.startsWith(KOK + "dev/")) return;
  const sabit = /\/(assets|icons|img)\//.test(u.pathname);
  e.respondWith(
    (async () => {
      if (sabit) {
        const kayit = await onbellekten(e.request);
        if (kayit) return kayit;
      }
      try {
        const yanit = await fetch(e.request, sabit ? undefined : { cache: "no-store" });
        sakla(e, yanit);
        return yanit;
      } catch (hata) {
        const kayit = await onbellekten(e.request, { ignoreSearch: true });
        if (kayit) return kayit;
        // Yalnız sayfa açılışında oyun kabuğuna dön; JS/JSON yerine HTML verme.
        if (e.request.mode == "navigate") {
          const sayfa = (await onbellekten(KOK + "index.html")) || (await onbellekten(KOK));
          if (sayfa) return sayfa;
        }
        throw hata;
      }
    })(),
  );
});
