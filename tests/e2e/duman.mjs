/* global LT */
// Tarayıcı duman testi: derlenmiş oyunu (dist/) başsız Chromium'da açar; menüler, 15 yarış, açık dünyalar,
// garaj ve sürüş akışını denetler. Oyunun içine window.LT üzerinden erişir (src/oyun/api.ts).
//   npm run test:e2e              (önce npm run build)
//   npm run test:goruntu          + ekran görüntüleri tests/cikti/ klasörüne
//   node tests/e2e/duman.mjs --klasor dist-dev    başka bir derleme klasörü
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  arg = (a) => process.argv.includes(a),
  ki = process.argv.indexOf("--klasor"),
  KLASOR = path.join(KOK, ki > 0 ? process.argv[ki + 1] : "dist"),
  CIKTI = path.join(KOK, "tests", "cikti"),
  GOR = arg("--goruntu");
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
const ADRES = `http://127.0.0.1:${srv.address().port}/`;
const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const br = await chromium.launch({
  executablePath: exe,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
let hata = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) hata++;
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

console.log("Yükleme ve menü");
const p = await sayfa();
ok(!p.errs.length, "sayfa hatasız açılıyor " + (p.errs[0] || ""));
const v = await p.evaluate(() => {
  const r = [];
  for (const m of [
    ["race"],
    ["race", "t:gp"],
    ["race", "t:gp", "e:0"],
    ["free"],
    ["profile"],
    ["settings"],
    ["home"],
  ]) {
    LT.showMenu(m);
    r.push(document.querySelector("#menu").innerHTML.length > 200);
  }
  return r;
});
ok(v.every(Boolean), "menü ekranları (yarış, tür, pist, serbest, profil, ayarlar) açılıyor");
const imgs = await p.evaluate(async () => {
  LT.showMenu(["race"]);
  await new Promise((r) => setTimeout(r, 800));
  return [...document.querySelectorAll(".tile img")].map((i) => i.naturalWidth > 0);
});
ok(imgs.length == 5 && imgs.every(Boolean), "5 yarış türü görseli yükleniyor");
const surum = await p.evaluate(() => [
  LT.surum,
  document.documentElement.outerHTML.match(/APP_VERSION='([^']+)'/)?.[1],
]);
ok(
  surum[0] == surum[1],
  `sürüm ${surum[0]} (index.html'deki sürümle aynı: eski uygulamalar güncellemeyi görür)`,
);

console.log("Yarışlar ve dünyalar");
const ev = await p.evaluate(() => {
  LT.demoStop();
  return LT.EVENTS.map((e, i) => {
    try {
      LT.startEvent(
        i,
        LT.CARS.findIndex((c) => c.ty == e.ty),
      );
      const g = LT.REG[e.reg].g;
      return !!g && g.children.length > 0;
    } catch (x) {
      return x.message;
    }
  });
});
ok(
  ev.length == 15 && ev.every((x) => x === true),
  `${ev.length} yarışın hepsi kuruluyor` +
    (ev.find((x) => x !== true) ? " — " + ev.find((x) => x !== true) : ""),
);
const wd = await p.evaluate(() =>
  LT.WORLDS.map((_w, i) => {
    try {
      LT.startWorld(i);
      return true;
    } catch (x) {
      return x.message;
    }
  }),
);
ok(
  wd.every((x) => x === true),
  "açık dünyalar açılıyor",
);
const gr = await p.evaluate(() => {
  try {
    LT.openGarage(0);
    document.querySelector("#gnx").click();
    const n = LT.oyun.CAR.n;
    LT.closeGarage();
    return n;
  } catch (x) {
    return "HATA " + x.message;
  }
});
ok(!gr.startsWith("HATA"), "garaj açılıyor ve araç değişiyor");
const sg = await p.evaluate(() => {
  LT.showMenu(["free"]);
  document.querySelector("[data-w='1']").click();
  const gar = !document.querySelector("#gar").classList.contains("hidden");
  document.querySelector("#gnx").click();
  document.querySelector("#gok").click();
  const r = { gar, mod: LT.oyun.mode, w: LT.oyun.CURW.n, pk: LT.kurulum.pk, aracPk: LT.oyun.CAR.pk };
  LT.showSet();
  r.serbestOnayar = !!document.querySelector("#set details[data-sec='pre']");
  LT.showMenu(["home"]);
  LT.demoStop();
  LT.startEvent(6, 2);
  LT.showSet();
  r.yarisOnayar = !!document.querySelector("#set details[data-sec='pre']");
  r.yarisPk = LT.kurulum.pk;
  LT.showMenu(["home"]);
  return r;
});
ok(
  sg.gar && sg.mod == "drive" && sg.w == "Boş Otopark" && sg.pk == sg.aracPk,
  "serbest sürüşten önce garaj açılıyor, araç kendi önayarıyla başlıyor",
);
ok(
  sg.serbestOnayar && !sg.yarisOnayar && sg.yarisPk == "dr",
  "önayar yalnız serbest sürüşte; drift yarışında aracın drift önayarı",
);

console.log("Sürüş");
const sr = await p.evaluate(async () => {
  LT.startWorld(1);
  const S = LT.sim.S,
    x0 = S.x,
    z0 = S.z,
    t0 = LT.sim.d.zaman;
  LT.I.g = 1;
  while (LT.sim.d.zaman - t0 < 2) await new Promise((r) => setTimeout(r, 20));
  LT.I.g = 0;
  const Y = LT.sim.yeni;
  return {
    yol: Math.hypot(S.x - x0, S.z - z0),
    v: Math.hypot(S.vx, S.vz) * 3.6,
    vites: Y && Y.vites,
    devir: Y && Y.rpm,
    fps: LT.perf.fps,
    cagri: LT.perf.cagri,
  };
});
ok(
  sr.yol > 10 && sr.v > 30 && sr.vites >= 1 && sr.devir > 1000,
  `gazla araç ilerliyor: 2 sn'de ${sr.yol.toFixed(0)} m, ${sr.v.toFixed(0)} km/sa, ${sr.vites}. vites, ${Math.round(sr.devir)} d/dk`,
);
console.log(`  (başsız tarayıcı: ${sr.fps.toFixed(0)} fps, ${sr.cagri} çizim çağrısı)`);
ok(!p.errs.length, "akışlarda sayfa hatası yok " + (p.errs[0] || ""));

if (GOR) {
  fs.mkdirSync(CIKTI, { recursive: true });
  console.log("Ekran görüntüleri → tests/cikti/");
  const g = await sayfa();
  const kare = async (ad, js) => {
    await g.evaluate(js);
    await g.waitForTimeout(1200);
    await g.screenshot({ path: path.join(CIKTI, ad + ".png") });
  };
  await kare("menu", () => LT.showMenu(["home"]));
  await kare("yaris_turu", () => LT.showMenu(["race"]));
  await kare("pist_listesi", () => LT.showMenu(["race", "t:dp"]));
  await kare("garaj", () => {
    LT.demoStop();
    LT.openGarage(null);
  });
  await kare("yaris", () => {
    LT.closeGarage();
    LT.startEvent(0, 0);
    LT.yaris.EV.state = "run";
  });
  await kare("kokpit", () => {
    LT.oyun.camMode = 3;
  });
  for (let i = 0; i < 15; i++) {
    const d = await g.evaluate(async (i) => {
      LT.oyun.camMode = 0;
      LT.startEvent(
        i,
        LT.CARS.findIndex((c) => c.ty == LT.EVENTS[i].ty),
      );
      LT.yaris.EV.state = "run";
      const TR = LT.yaris.EV.TR,
        k = Math.floor(TR.N * 0.3),
        P = TR.P[k];
      LT.reset(P[0], P[1], Math.atan2(TR.T[k][0], TR.T[k][1]));
      LT.oyun.camMode = 1;
      LT.kamera.lp = 0.25;
      LT.kamera.ly = 0.5;
      LT.kamera.lastDrag = performance.now() + 1e7;
      await new Promise((r) => setTimeout(r, 500));
      LT.R.render(LT.scene, LT.cam);
      return LT.R.domElement.toDataURL("image/jpeg", 0.8);
    }, i);
    fs.writeFileSync(
      path.join(CIKTI, `pist_${String(i).padStart(2, "0")}.jpg`),
      Buffer.from(d.split(",")[1], "base64"),
    );
  }
  // virajda gövde yatışı (araç kendi kamerasıyla, otoparkta)
  const yv = await g.evaluate(async () => {
    LT.oyun.camMode = 1;
    LT.startWorld(1);
    const t0 = LT.sim.d.zaman;
    LT.I.g = 1;
    while (LT.sim.d.zaman - t0 < 2.5) await new Promise((r) => setTimeout(r, 20));
    LT.I.l = 1;
    while (LT.sim.d.zaman - t0 < 3.6) await new Promise((r) => setTimeout(r, 20));
    LT.R.render(LT.scene, LT.cam);
    const d = LT.R.domElement.toDataURL("image/jpeg", 0.85);
    LT.I.g = LT.I.l = 0;
    return d;
  });
  fs.writeFileSync(path.join(CIKTI, "viraj.jpg"), Buffer.from(yv.split(",")[1], "base64"));
  await g.close();
}

await br.close();
srv.close();
console.log(hata ? `\n${hata} test başarısız` : "\nTüm tarayıcı testleri geçti");
process.exit(hata ? 1 : 0);
