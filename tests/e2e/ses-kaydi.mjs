/* global LT */
// Ses kaydı: derlenmiş oyunun seslerini başsız Chromium'da çevrimdışı çalıp tests/cikti/ses/ klasörüne yazar
// (menü müziği, her aracın motoru, sürüş efektleri). ffmpeg varsa telefonda dinlemek için .m4a da üretir.
//   npm run build && node tests/e2e/ses-kaydi.mjs              hepsi
//   node tests/e2e/ses-kaydi.mjs motor:dg muzik                 yalnız seçilenler
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TUM_ACIK } from "../yardimci/ilerleme-acik.mjs";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  KLASOR = path.join(KOK, "dist"),
  CIKTI = path.join(KOK, "tests", "cikti", "ses");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
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
const p = await br.newPage({ viewport: { width: 844, height: 390 } });
await p.addInitScript(TUM_ACIK);
p.on("pageerror", (e) => console.error("  sayfa hatası: " + e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/`);
await p.waitForFunction(() => window.LT, null, { timeout: 15000 });

const HEPSI = [
  ["muzik", "gt", 56],
  ...["gt", "rx", "dr", "rl", "dg"].map((a) => ["motor", a, 14]),
  ["surus", "dr", 14],
  ...["gt", "rx", "dr", "rl", "dg"].map((a) => ["dinle", a, 5.5]),
];
const sec = process.argv.slice(2);
const isler = sec.length
  ? [
      ...HEPSI.filter(([t, a]) => sec.includes(t) || sec.includes(t + ":" + a)),
      // muzik:gitar gibi: yalnız bir çalgı grubu, kısa
      ...sec.filter((s) => s.startsWith("muzik:")).map((s) => [s, "gt", 16]),
    ]
  : HEPSI;
fs.mkdirSync(CIKTI, { recursive: true });
const ffmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
for (const [tur, arac, sn] of isler) {
  const ad = tur.startsWith("muzik") ? tur.replace(":", "-") : tur + "-" + arac,
    t0 = Date.now();
  const b64 = await p.evaluate(([t, a, s]) => LT.sesKaydi(t, a, s), [tur, arac, sn]);
  const f = path.join(CIKTI, ad + ".wav");
  fs.writeFileSync(f, Buffer.from(b64, "base64"));
  if (ffmpeg)
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      f,
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      f.replace(".wav", ".m4a"),
    ]);
  console.log(`  ${ad}: ${sn} sn (${((Date.now() - t0) / 1000).toFixed(1)} sn sürdü)`);
}
await br.close();
srv.close();
