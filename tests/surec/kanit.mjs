// Kanıt görüntüsü: derlenmiş oyunu (dist/) başsız Chromium'da açar, oyunun içinde (window.LT) verilen JS'i çalıştırır ve
// ekran görüntüsü alır. Yönetmen, konu sohbetinin tarif ettiği ekranı kullanıcıya göstermek için kullanır.
//   npm run build && node tests/surec/kanit.mjs --js "LT.showMenu(['race'])" --bekle 1500 --cikti tests/cikti/kanit-1.png
// Birden çok görüntü: her görüntü için --js (ister), --bekle (ms, varsayılan 1200) ve --cikti; aynı sayfa sırayla kullanılır.
//   --boyut 844x390 (varsayılan: iPhone yatay)   --klasor dist-dev (başka derleme klasörü)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TUM_ACIK } from "../yardimci/ilerleme-acik.mjs";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  a = process.argv.slice(2),
  deger = (k) => (a.indexOf(k) >= 0 ? a[a.indexOf(k) + 1] : null),
  KLASOR = path.join(KOK, deger("--klasor") || "dist"),
  [W, H] = (deger("--boyut") || "844x390").split("x").map(Number),
  cekimler = [];
let akim = { js: null, bekle: 1200 };
for (let i = 0; i < a.length; i++) {
  if (a[i] == "--js") akim.js = a[++i];
  else if (a[i] == "--bekle") akim.bekle = Number(a[++i]);
  else if (a[i] == "--cikti") {
    cekimler.push({ ...akim, cikti: path.resolve(a[++i]) });
    akim = { js: null, bekle: 1200 };
  }
}
if (!cekimler.length || !fs.existsSync(path.join(KLASOR, "index.html"))) {
  console.error(
    'kullanım: npm run build && node tests/surec/kanit.mjs --js "<LT ifadesi>" --cikti <dosya.png> [...]',
  );
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
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};
const srv = http.createServer((q, r) => {
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
const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const br = await chromium.launch({
  executablePath: exe,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const p = await br.newPage({ viewport: { width: W, height: H } });
await p.addInitScript(TUM_ACIK);
const hatalar = [];
p.on("pageerror", (e) => hatalar.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/?${Date.now()}`);
await p.waitForFunction(() => window.LT, null, { timeout: 15000 });
await p.waitForTimeout(800);
let kod = 0;
for (const c of cekimler) {
  try {
    if (c.js) await p.evaluate(`(async () => { ${c.js} })()`);
  } catch (x) {
    console.error("JS hatası: " + x.message);
    kod = 1;
  }
  await p.waitForTimeout(c.bekle);
  fs.mkdirSync(path.dirname(c.cikti), { recursive: true });
  await p.screenshot({ path: c.cikti });
  console.log(c.cikti);
}
if (hatalar.length) console.error("sayfa hatası: " + hatalar[0]);
await br.close();
srv.close();
process.exit(kod);
