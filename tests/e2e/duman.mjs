// Tarayıcı testi: derlenmiş oyunu (dist/) ya da canlı adresi başsız Chromium'da açar ve tests/e2e/bolumler/
// içindeki bölümleri sırayla koşar. Oyunun içine window.LT üzerinden erişir (src/oyun/api.ts).
// Hangi bölümün hangi dala ait olduğu ve önemi tests/senaryolar/'da; seçerek koşmak için tests/kosucu.mjs.
//   npm run test:e2e                          tüm bölümler (önce npm run build)
//   npm run test:goruntu                      + ekran görüntüleri tests/cikti/ klasörüne
//   node tests/e2e/duman.mjs --bolum acilis,garaj   yalnız bu bölümler
//   node tests/e2e/duman.mjs --klasor dist-dev      başka bir derleme klasörü
//   node tests/e2e/duman.mjs --adres https://…/     derleme yerine canlı adres
//   node tests/e2e/duman.mjs --json cikti.json      bölüm sonuçlarını dosyaya yaz
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BOLUMLER = [
  "acilis",
  "yarislar",
  "garaj",
  "garaj-ses",
  "surus",
  "kerb",
  "ses",
  "hud-cakisma",
  "hud-duzenleyici",
];

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  arg = (a) => process.argv.includes(a),
  deger = (a) => (process.argv.indexOf(a) > 0 ? process.argv[process.argv.indexOf(a) + 1] : null),
  KLASOR = path.join(KOK, deger("--klasor") || "dist"),
  CIKTI = path.join(KOK, "tests", "cikti"),
  GOR = arg("--goruntu"),
  SECILI = deger("--bolum") ? deger("--bolum").split(",").filter(Boolean) : BOLUMLER;

for (const b of SECILI)
  if (!BOLUMLER.includes(b)) {
    console.error(`bilinmeyen bölüm: ${b} (bölümler: ${BOLUMLER.join(", ")})`);
    process.exit(1);
  }

let ADRES = deger("--adres"),
  srv = null;
if (!ADRES) {
  if (!fs.existsSync(path.join(KLASOR, "index.html"))) {
    console.error(path.relative(KOK, KLASOR) + "/ yok: önce npm run build");
    process.exit(1);
  }
  const MIME = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
  };
  srv = http.createServer((q, r) => {
    let f = path.join(KLASOR, decodeURIComponent(q.url.split("?")[0]));
    if (f.endsWith(path.sep)) f += "index.html";
    fs.readFile(f, (e, d) => {
      if (e) {
        r.writeHead(404);
        r.end();
        return;
      }
      r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
      r.end(d);
    });
  });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  ADRES = `http://127.0.0.1:${srv.address().port}/`;
}
const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const br = await chromium.launch({
  executablePath: exe,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
let hata = 0,
  mesajlar = [];
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) {
    hata++;
    mesajlar.push(m);
  }
};
async function sayfa(w = 844, h = 390) {
  const p = await br.newPage({ viewport: { width: w, height: h } });
  p.errs = [];
  p.on("pageerror", (e) => p.errs.push(e.message));
  p.on("console", (m) => m.type() == "error" && p.errs.push(m.text()));
  await p.goto(ADRES + "?" + Date.now());
  await p.waitForFunction(() => window.LT, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  return p;
}

const sonuc = {};
const p = await sayfa();
console.log("Yükleme");
ok(!p.errs.length, "sayfa hatasız açılıyor " + (p.errs[0] || ""));
sonuc.yukleme = { gecti: !hata, hatalar: [...mesajlar] };

for (const b of SECILI) {
  const h0 = hata,
    e0 = p.errs.length,
    t0 = Date.now();
  mesajlar = [];
  console.log(b);
  try {
    const mod = await import(`./bolumler/${b}.mjs`);
    await mod.default({ p, ok });
  } catch (x) {
    ok(false, "bölüm yarıda kaldı: " + x.message);
  }
  // bölüm sırasında sayfada çıkan hata o bölüme yazılır
  if (p.errs.length > e0) ok(false, "sayfa hatası: " + p.errs[e0]);
  sonuc[b] = { gecti: hata == h0, hatalar: mesajlar, sure: (Date.now() - t0) / 1000 };
}

if (GOR) {
  await (await import("./bolumler/goruntu.mjs")).default({ sayfa, fs, path, CIKTI });
}

await br.close();
if (srv) srv.close();
if (deger("--json")) fs.writeFileSync(deger("--json"), JSON.stringify(sonuc, null, 2));
console.log(hata ? `\n${hata} test başarısız` : "\nTüm tarayıcı testleri geçti");
process.exit(hata ? 1 : 0);
