// TS 0.8.18 MUTANT DEV test laboratuvarı oracle'ı: mutant-kosu.ts testKurulumu / testBeceriAyarla /
// testKurulumunuSifirla / testBolgeyeGec gerçek kaynakla; normal koşuda ret, test koşusunda kabul/ret sınırları.
// Kullanım: node Unity/Validation/export-mutant-lab.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true });
const K = L.load("src/oyun/mutant-kosu"),
  B = L.load("src/cekirdek/beceri"),
  Y = L.load("src/oyun/yarislar");
const tracks = L.load("src/oyun/mutant")
  .mutantPistleri()
  .map((p, i) => ({ ...p, n: Y.TUM_ETKINLIKLER[i].n }));
const clean = (x) => JSON.parse(JSON.stringify(x ?? null));
const fields = [
  "test",
  "faz",
  "bolge",
  "boss",
  "kalan",
  "xp",
  "seviye",
  "bekleyenSecim",
  "para",
  "pasifler",
  "parcalar",
  "secenekler",
  "etkinlikler",
  "sandiklar",
  "yenilenBoss",
  "govde",
  "pert",
  "mek",
  "bekleyenHasar",
  "bekleyenRisk",
  "beceriler",
  "bekleyenBeceri",
  "bec",
  "becCikti",
  "becEngel",
  "becHedef",
];
const snapshot = (k) =>
  clean(Object.fromEntries(fields.filter((f) => k[f] !== undefined).map((f) => [f, k[f]])));
const runs = [];
for (const test of [false, true]) {
  const seed = 4242,
    k = K.kosuBaslat(seed, tracks, test),
    steps = [];
  const op = (name, args, fn) => steps.push({ name, args, result: clean(fn()), state: snapshot(k) });
  // Başlangıç seçimi kaynaktaki ilk teklifle; sonra laboratuvar işlemleri.
  op("choose", [k.secenekler[0], ""], () => K.pasifSec(k, k.secenekler[0]));
  const passive = K.PASIFLER[0].id,
    limit = K.PASIFLER[0].en;
  for (let i = 0; i <= limit; i++) op("setup", ["pasif", passive], () => K.testKurulumu(k, "pasif", passive));
  op("setup", ["pasif", "yok"], () => K.testKurulumu(k, "pasif", "yok"));
  for (const offer of [
    "b:grappling-hook",
    "b:risk-taker",
    "b:volt-kanat",
    "b:flying-dutchman",
    "y:volt-kanat",
    "b:yok",
  ])
    op("setup", ["beceri", offer], () => K.testKurulumu(k, "beceri", offer));
  const parts = L.load("src/arac/parcalar").PARCALAR,
    a = parts[0],
    b = parts.find((p) => p.kat == a.kat && p.id != a.id),
    c = parts.find((p) => p.kat != a.kat);
  for (const id of [a.id, b.id, c.id, "yok"])
    op("setup", ["parca", id], () => K.testKurulumu(k, "parca", id));
  const hook = B.BECERILER.find((d) => d.id == "grappling-hook"),
    evo = hook.evrimler[0]?.id ?? null,
    addons = B.BECERI_EKLENTILERI.filter((e) => B.eklentiUyar(hook, e)).map((e) => e.id),
    bad = B.BECERI_EKLENTILERI.find((e) => !B.eklentiUyar(hook, e))?.id;
  const skill = (id, sv, ev, ext) =>
    op("skill", [id, sv, ev, ext], () => K.testBeceriAyarla(k, id, sv, ev, ext));
  skill("grappling-hook", 1, null, []);
  skill("grappling-hook", 2, evo, []);
  skill("grappling-hook", 3, evo, addons.slice(0, 2));
  skill("grappling-hook", 3, null, [addons[0], addons[0]]);
  if (bad) skill("grappling-hook", 2, null, [bad]);
  skill("grappling-hook", 4, null, []);
  skill("slipstream-engine", 2, null, []);
  skill("grappling-hook", 0, null, []);
  skill("grappling-hook", 0, null, []);
  op("reset", [], () => K.testKurulumunuSifirla(k));
  op("region", [2], () => K.testBolgeyeGec(k, 2, tracks));
  op("region", [1], () => K.testBolgeyeGec(k, 1, tracks));
  op("region", [3], () => K.testBolgeyeGec(k, 3, tracks));
  op("region", [4], () => K.testBolgeyeGec(k, 4, tracks));
  runs.push({ seed, test, steps });
}
// DEV drift tanısı (drift-tani.ts): gerçek kurulum profili, her dalı açan durumlar.
const T = L.load("src/fizik/drift-tani"),
  O = L.load("src/fizik/ortak"),
  SU = L.load("tests/yardimci/surucu"),
  CARS = L.load("src/arac/araclar").CARS,
  diagnostics = [];
for (const car of [10, 2]) {
  const K = SU.kurulumYap(car, CARS[car].pk, "norm"),
    profile = O.driftYarisProfili(K);
  const base = {
    air: false,
    cool: 0,
    on: 0,
    dir: 1,
    nc: 0,
    hold: 0,
    st: 0,
    gas: 1,
    beta: 0.1,
    vx: 3,
    vz: 14,
  };
  for (const over of [
    { air: true },
    { cool: 0.83 },
    { on: 1, st: 0.6, beta: 0.3 },
    { on: 1, st: -0.5, beta: 0.2, dir: -1 },
    { on: 1, st: 0.1, beta: profile.azami * 0.95 },
    { vx: 1, vz: 5 },
    { gas: 0.1 },
    { nc: 0.07 },
    { hold: 0.2 },
    {},
    { beta: -0.05 },
  ]) {
    const x = { ...base, ...over },
      d = {
        S: { air: x.air, vx: x.vx, vz: x.vz, gas: x.gas },
        DR: { cool: x.cool, on: x.on, dir: x.dir, nc: x.nc, hold: x.hold },
        D: { beta: x.beta },
        st: x.st,
      };
    diagnostics.push({ car, input: x, profile, expected: clean(T.driftTanisi(d, K)) });
  }
}
const value = {
    baseline,
    generator: "Unity/Validation/export-mutant-lab.mjs",
    sources: L.sources,
    runs,
    diagnostics,
  },
  target = path.join(root, "Unity/Validation/Reference/mutant-lab-0.8.18.json"),
  output = JSON.stringify(value) + "\n";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
    console.error("Güncel değil: mutant-lab-0.8.18.json");
    process.exit(1);
  }
} else fs.writeFileSync(target, output);
console.log(
  `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: DEV laboratuvarı ${runs.length} koşu, ${runs.reduce((n, r) => n + r.steps.length, 0)} işlem; test koşusunda kabul ${runs[1].steps.filter((s) => s.result === true).length}.`,
);
