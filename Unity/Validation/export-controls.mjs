// P5 kontroller ve kalıcı tercihler: gerçek TS fizikGirdisi/tiltRoll/tiltSteer ve ayarlariYukle/ayarlariKaydet.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const loader = () =>
  createBaselineLoader({ stubs: true, extraExports: { "src/oyun/girdi.ts": ["tiltSteer"] } });
const L = loader(),
  E = L.load("src/cekirdek/ekran"),
  G = L.load("src/oyun/girdi"),
  A = L.load("src/oyun/ayarlar"),
  R = L.load("src/cekirdek/rastgele");
const r = R.mulberry32(5150),
  pick = (a) => a[Math.floor(r() * a.length)];
const physics = [];
for (let i = 0; i < 4000; i++) {
  const c = {
    steer: pick(["btn", "wheel", "tilt"]),
    gas: pick(["btn", "analog", "auto"]),
    inv: r() < 0.3 ? 1 : 0,
    tlt: pick([20, 38, 60]),
    l: r() < 0.5 ? 1 : 0,
    r: r() < 0.5 ? 1 : 0,
    g: r() < 0.5 ? Math.round(r() * 100) / 100 : pick([0, 1]),
    b: r() < 0.5 ? Math.round(r() * 100) / 100 : pick([0, 1]),
    sa: Math.round((r() * 2 - 1) * 1000) / 1000,
    dbr: r() < 0.3 ? 1 : 0,
    beta: Math.round((r() * 180 - 90) * 10) / 10,
    gamma: Math.round((r() * 180 - 90) * 10) / 10,
    zero: Math.round((r() * 40 - 20) * 10) / 10,
    rot: pick([0, 90, -90, 180]),
  };
  Object.assign(A.CT, { steer: c.steer, gas: c.gas });
  Object.assign(A.set, { inv: c.inv, tlt: c.tlt });
  Object.assign(G.I, { l: c.l, r: c.r, g: c.g, b: c.b, sa: c.sa, dbr: c.dbr });
  Object.assign(G.tilt, { b: c.beta, g: c.gamma, zero: c.zero });
  E.ekran.rot = c.rot;
  physics.push({ input: c, roll: G.tiltRoll(), steer: G.tiltSteer(), output: G.fizikGirdisi() });
}
E.ekran.rot = 0;
const saved = [
  null,
  "",
  "{}",
  "bozuk{",
  "null",
  "5",
  '{"set":{"inv":1,"tlt":50,"ses":0,"muz":30,"rh":0}}',
  '{"set":{"ss":0,"sm":0,"fov":0,"shk":0,"shd":0,"perf":1,"ac":0,"hayalet":1},"CT":{"steer":"tilt","gas":"auto"},"cam":2,"lk":"arc"}',
  '{"CT":{"steer":"wheel"}}',
  '{"CT":{"gas":"analog"},"cam":3}',
  '{"hud":"kadran"}',
  '{"hud":"sade","cam":1}',
  '{"hud":"yok"}',
  '{"hud":{"hiz":"bant","harita":"kapali","tus":"simge"}}',
  '{"hud":{"hiz":"bozuk","sayac":"yazi","debriyaj":"kapali"}}',
  '{"hud":{"hiz":"kose","sayac":"panel","tus":"panel","harita":"kare","debriyaj":"acik"}}',
  '{"set":{"inv":true,"rh":false}}',
  '{"set":{"tlt":"elli","ses":null},"CT":{"steer":"joystick","gas":3},"cam":9}',
  '{"set":{"bilinmeyen":4},"gelecek":{"surum":9},"cam":-1}',
  '{"cam":1.5}',
];
const loads = saved.map((text) => {
  const L2 = loader(),
    S = L2.load("src/cekirdek/depo"),
    A2 = L2.load("src/oyun/ayarlar");
  if (text != null) S.yaz("lt_ayar", text);
  const k = A2.ayarlariYukle();
  A2.ayarlariKaydet(k.cam ?? 0, "norm");
  return {
    text,
    set: { ...A2.set },
    CT: { ...A2.CT },
    hud: { ...A2.gorunum },
    layout: A2.hudDuzeni(),
    cam: k.cam ?? null,
    lk: k.lk ?? null,
    saved: JSON.parse(S.oku("lt_ayar")),
  };
});
const output =
  JSON.stringify({
    baseline,
    sources: L.sources,
    defaults: { set: A.set, hud: A.HUDLAR, cams: L.load("src/oyun/durum").CAMS },
    physics,
    loads,
  }) + "\n";
const target = path.join(root, "Unity/Validation/Reference/controls-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw Error("Kontrol oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Kontroller TS: ${physics.length} fizik girdisi (3 direksiyon × 3 gaz × ters/eğim/yön), ${loads.length} ayar kaydı.`,
);
