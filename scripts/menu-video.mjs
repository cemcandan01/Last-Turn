/* global LT */
// Menü arka plan videosu: sinematik çekimleri oyunun içinden kare kare kaydeder (döngü elle adımlanır, takılmasız),
// komşu çekimleri çapraz geçişle birleştirir, sonu başına temiz bağlanan bir döngü üretir: public/video/menu.mp4
//   npm run build && node scripts/menu-video.mjs            (pistler ya da çekimler değişince yeniden üret)
//   node scripts/menu-video.mjs --hizli                     (deneme: düşük çözünürlük, kısa)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  HIZLI = process.argv.includes("--hizli"),
  KLASOR = process.env.KAYIT_DIST || path.join(KOK, "dist"),
  KARE = path.join(KOK, "tests", "cikti", "video"),
  CIKTI = path.join(KOK, "public", "video", "menu.mp4"),
  FPS = 30,
  /** çapraz geçiş süresi (sn) */
  GECIS = 1,
  [W, H] = HIZLI ? [640, 296] : [1280, 592];
// çekim sırası (oyun/sinematik.ts → SHOTS): türler karışık; gece yağmurdaki kokpit çekimi (3) kullanılmaz
const SIRA = [0, 5, 7, 4, 1, 6, 9, 8, 2],
  SURE = { 0: 5, 1: 5, 2: 5, 4: 5, 5: 5, 6: 5, 7: 6, 8: 5, 9: 5.5 };

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
// oyun döngüsü elle adımlanır: requestAnimationFrame bekletilir, her kare tam 1/FPS sn sonrası için bir kez çağrılır
// ve çizilen kare aynı anda alınır (başsız tarayıcının yavaşlığı videoya yansımaz)
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

fs.rmSync(KARE, { recursive: true, force: true });
const parcalar = [];
for (const [n, i] of SIRA.entries()) {
  if (HIZLI && n > 2) break;
  const sure = (HIZLI ? 2 : SURE[i]) + GECIS,
    kl = path.join(KARE, String(n).padStart(2, "0"));
  fs.mkdirSync(kl, { recursive: true });
  await p.evaluate((i) => LT.cekimKaydi(i), i);
  await p.evaluate(() => window.__adim(0)); // ilk karede pist kurulsun
  const N = Math.round(sure * FPS);
  for (let k = 0; k < N; k++) {
    const d = await p.evaluate((ms) => {
      window.__adim(ms);
      return LT.R.domElement.toDataURL("image/jpeg", 0.95);
    }, 1000 / FPS);
    fs.writeFileSync(
      path.join(kl, `k${String(k).padStart(4, "0")}.jpg`),
      Buffer.from(d.split(",")[1], "base64"),
    );
  }
  parcalar.push({ kl, sure });
  console.log(`çekim ${i}: ${N} kare`);
}
await br.close();
srv.close();

// parçaları çapraz geçişle birleştir; sonra ilk parçanın baş kısmı tekrar eklenir ve video ilk geçişin bittiği
// andan başlatılır: son kare ile ilk kare aynı an olur, döngü dikişsiz
const girdi = [],
  sure = [];
for (const q of [...parcalar, parcalar[0]]) {
  girdi.push("-framerate", String(FPS), "-i", path.join(q.kl, "k%04d.jpg"));
  sure.push(q.sure);
}
sure[sure.length - 1] = GECIS; // son parça: ilk çekimin yalnız geçiş kadar başı
let suz = "",
  onceki = "[0:v]",
  t = 0;
for (let k = 1; k < sure.length; k++) {
  t += sure[k - 1] - GECIS;
  const ad = k == sure.length - 1 ? "[x]" : `[v${k}]`,
    gir = k == sure.length - 1 ? `[${k}:v]trim=duration=${GECIS},setpts=PTS-STARTPTS[s${k}];` : "";
  suz +=
    gir +
    `${onceki}${k == sure.length - 1 ? `[s${k}]` : `[${k}:v]`}xfade=transition=fade:duration=${GECIS}:offset=${t.toFixed(3)}${ad};`;
  onceki = ad;
}
const toplam = t + GECIS;
suz += `[x]trim=start=${GECIS}:end=${toplam.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[son]`;
fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    ...girdi,
    "-filter_complex",
    suz,
    "-map",
    "[son]",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-preset",
    "slow",
    "-crf",
    HIZLI ? "30" : "24",
    "-g",
    String(FPS * 2),
    "-movflags",
    "+faststart",
    "-an",
    CIKTI,
  ],
  { stdio: "inherit" },
);
console.log(
  `→ ${path.relative(KOK, CIKTI)} (${(fs.statSync(CIKTI).size / 1e6).toFixed(2)} MB, ${(toplam - GECIS).toFixed(1)} sn)`,
);
