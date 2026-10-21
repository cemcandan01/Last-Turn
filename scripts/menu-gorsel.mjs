/* global LT */
// Menü arka plan görselleri: sinematik çekimleri oyunun içinden birer kare alıp küçük WebP olarak kaydeder:
// public/img/menu/NN.webp (menüde rastgele sırayla, yavaş kayma ve çapraz geçişle akar; arayuz/arka-gorsel.ts)
//   npm run build && npm run menugorsel          (pistler ya da çekimler değişince yeniden üret)
// Önizleme (bakmak için JPEG): tests/cikti/menu-gorsel/
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  KLASOR = process.env.KAYIT_DIST || path.join(KOK, "dist"),
  ONIZLEME = path.join(KOK, "tests", "cikti", "menu-gorsel"),
  CIKTI = path.join(KOK, "public", "img", "menu"),
  FPS = 30,
  /** çekimde araç hızlanıp yerleşsin diye geçen süre (sn) */
  BEKLE = 2.5,
  [W, H] = [1152, 532],
  KALITE = 60;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};
const srv = http.createServer((q, r) => {
  let f = path.join(KLASOR, decodeURIComponent(q.url.split("?")[0]));
  if (f.endsWith(path.sep)) f += "index.html";
  fs.readFile(f, (e, d) => {
    if (e) return (r.writeHead(404), r.end());
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
p.on("pageerror", (e) => console.log("sayfa hatası:", e.message));
// oyun döngüsü elle adımlanır (başsız tarayıcının yavaşlığı sonucu etkilemez)
await p.addInitScript(() => {
  let bekleyen = [],
    zaman = 0;
  window.requestAnimationFrame = (f) => (bekleyen.push(f), bekleyen.length);
  window.__adim = (ms) => {
    zaman += ms;
    const f = bekleyen;
    bekleyen = [];
    for (const g of f) g(zaman);
  };
});
await p.goto(`http://127.0.0.1:${srv.address().port}/?kayit`);
await p.waitForFunction(() => window.LT);
await p.evaluate(() => {
  LT.showMenu(["home"]);
  for (let i = 0; i < 30; i++) window.__adim(1000 / 30);
});

fs.rmSync(CIKTI, { recursive: true, force: true });
fs.rmSync(ONIZLEME, { recursive: true, force: true });
fs.mkdirSync(CIKTI, { recursive: true });
fs.mkdirSync(ONIZLEME, { recursive: true });
const adet = await p.evaluate(() => LT.cekimKaydi(0));
let toplam = 0;
for (let i = 0; i < adet; i++) {
  const ad = String(i).padStart(2, "0");
  await p.evaluate((i) => LT.cekimKaydi(i), i);
  await p.evaluate(() => window.__adim(0)); // ilk karede pist kurulsun
  const d = await p.evaluate(
    ([n, ms]) => {
      for (let k = 0; k < n; k++) window.__adim(ms);
      return LT.R.domElement.toDataURL("image/jpeg", 0.95);
    },
    [Math.round(BEKLE * FPS), 1000 / FPS],
  );
  const jpg = path.join(ONIZLEME, `${ad}.jpg`),
    webp = path.join(CIKTI, `${ad}.webp`);
  fs.writeFileSync(jpg, Buffer.from(d.split(",")[1], "base64"));
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    jpg,
    "-c:v",
    "libwebp",
    "-quality",
    String(KALITE),
    "-compression_level",
    "6",
    webp,
  ]);
  const b = fs.statSync(webp).size;
  toplam += b;
  console.log(`çekim ${i}: ${(b / 1024).toFixed(1)} KB`);
}
fs.writeFileSync(path.join(CIKTI, "adet.json"), JSON.stringify(adet));
await br.close();
srv.close();
console.log(`→ ${path.relative(KOK, CIKTI)}: ${adet} görsel, ${(toplam / 1024).toFixed(0)} KB`);
