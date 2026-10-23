// Ekran uyum denetimi (sanal cihazlar). Kullanım: docs/CIHAZ.md
//   npm run cihaz                                   iPhone 13 (referans), bütün ekranlar
//   npm run cihaz -- --ekran garaj-panel            tek ekran (virgülle çoğul; "menu" gibi dal adı da olur)
//   npm run cihaz -- --cihaz iphone-se,ipad-mini    belirli cihazlar
//   npm run cihaz -- --hizli                        alan kümesi (iPhone SE, 13, Galaxy S8) · --hepsi: bütün cihazlar
//   --adres https://…/   canlı adres · --derlemeden  dist/ hazır · --paralel 2 · --resimsiz · --liste
// Çıktı: tests/cikti/cihaz/<cihaz>/<ekran>.png, ozet.html, ozet.md, hatalar.txt (sahip dal | cihaz | ekran | öğe | sorun)
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CIHAZLAR, HIZLI, cihazBul } from "./cihazlar.mjs";
import { EKRANLAR } from "./yardimci/cihaz-ekranlari.mjs";
import { cihazlariDenetle, ozetYaz } from "./yardimci/cihaz-denetim.mjs";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  arg = (a) => process.argv.includes(a),
  deger = (a) => (process.argv.indexOf(a) > 0 ? process.argv[process.argv.indexOf(a) + 1] : null),
  CIKTI = path.join(KOK, "tests", "cikti", "cihaz");

if (arg("--liste")) {
  for (const c of CIHAZLAR)
    console.log(`${c.id.padEnd(22)} ${c.w}×${c.h} @${c.dpr}x ${c.temsilci ? "temsilci" : ""} ${c.ad}`);
  console.log("\nekranlar: " + EKRANLAR.map((e) => `${e.id} (${e.dal})`).join(", "));
  process.exit(0);
}

const secCihaz = arg("--hepsi")
  ? CIHAZLAR
  : arg("--hizli")
    ? CIHAZLAR.filter((c) => HIZLI.includes(c.id))
    : (deger("--cihaz") || "iphone-13").split(",").map((a) => {
        const c = cihazBul(a);
        if (!c) {
          console.error(`bilinmeyen cihaz: ${a} (npm run cihaz -- --liste)`);
          process.exit(2);
        }
        return c;
      });
const istek = deger("--ekran") ? deger("--ekran").split(",") : null;
const secEkran = istek ? EKRANLAR.filter((e) => istek.includes(e.id) || istek.includes(e.dal)) : EKRANLAR;
if (!secEkran.length) {
  console.error(`bilinmeyen ekran: ${istek} (npm run cihaz -- --liste)`);
  process.exit(2);
}

let ADRES = deger("--adres"),
  srv = null;
if (!ADRES) {
  if (
    !arg("--derlemeden") &&
    spawnSync("npx", ["vite", "build", "--logLevel", "warn"], { cwd: KOK, stdio: "inherit" }).status
  )
    process.exit(1);
  const MIME = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  srv = http.createServer((q, r) => {
    let f = path.join(KOK, "dist", decodeURIComponent(q.url.split("?")[0]));
    if (f.endsWith(path.sep)) f += "index.html";
    fs.readFile(f, (e, d) => {
      if (e) return r.writeHead(404).end();
      r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }).end(d);
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
fs.rmSync(CIKTI, { recursive: true, force: true });
const t0 = Date.now();
console.log(`${secCihaz.length} cihaz × ${secEkran.length} ekran`);
const hucreler = await cihazlariDenetle({
  br,
  adres: ADRES,
  cihazlar: secCihaz,
  ekranlar: secEkran,
  cikti: CIKTI,
  resim: !arg("--resimsiz"),
  paralel: Number(deger("--paralel") || 2),
  log: console.log,
});
const sure = (Date.now() - t0) / 1000;
const { md, satirlar, uyarilar } = ozetYaz({
  hucreler,
  cihazlar: secCihaz,
  ekranlar: secEkran,
  cikti: CIKTI,
  sure,
});
if (!arg("--resimsiz") && secCihaz.length * secEkran.length > 1) {
  // birleşik özet görüntüsü
  const p = await br.newPage({ viewport: { width: 1800, height: 900 } });
  await p.goto("file://" + path.join(CIKTI, "ozet.html"));
  await p.waitForLoadState("load");
  await p.evaluate(() => document.querySelectorAll("img").forEach((i) => (i.loading = "eager")));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(CIKTI, "ozet.png"), fullPage: true });
}
await br.close();
if (srv) srv.close();
console.log("\n" + md);
if (satirlar.length)
  console.log(
    "Hatalar (ilk 60):\n" +
      satirlar.slice(0, 60).join("\n") +
      (satirlar.length > 60 ? `\n… ${satirlar.length - 60} satır daha: tests/cikti/cihaz/hatalar.txt` : ""),
  );
console.log(
  `\n${satirlar.length} hata, ${uyarilar.length} uyarı · ${sure.toFixed(0)} sn · tests/cikti/cihaz/ozet.html`,
);
process.exit(satirlar.length ? 1 : 0);
