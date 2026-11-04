// P4 dilim 1: gerçek TS mekanikAdimi/parametreler/kapasiteUygula/driftGozlemcisi ve enerji perk tanımları.
// Tohumlu rastgele olay dizileri + sınır durumları; skill (beceri.ts) yürütmesi bu oracle kapsamı dışındadır.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader(),
  M = L.load("src/cekirdek/mekanikler"),
  E = L.load("src/oyun/mutant-enerji"),
  R = L.load("src/cekirdek/rastgele");
const clean = (x) => JSON.parse(JSON.stringify(x));
const builtins = {
  nitro: E.NITRO,
  surus: E.SURUS_ENERJISI,
  driftHarvester: M.DRIFT_HARVESTER,
  tutusDarbesi: M.TUTUS_DARBESI,
};
const perks = [...E.PERKLER.map((p) => p.m), ...E.EKLENTI_PERKLERI.map((p) => p.m)];
// Yalnız sınır sınamaları için yapay tanımlar: türev olay zinciri, geçersiz tanım, etkili aktif yetenek.
const synthetic = [
  {
    id: "zincir-a",
    versiyon: 1,
    kategori: "passive",
    tetik: "EnergyGained",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 1,
    kazancBirimi: "olay",
  },
  {
    id: "zincir-b",
    versiyon: 1,
    kategori: "passive",
    tetik: "EnergyGained",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 1,
    kazancBirimi: "olay",
  },
  {
    id: "gecersiz",
    versiyon: 0,
    kategori: "passive",
    tetik: "SurusTick",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 5,
    kazancBirimi: "olay",
  },
  {
    id: "gecersiz-etki",
    versiyon: 1,
    kategori: "active",
    tetik: "AbilityActivated",
    maliyet: 1,
    beklemeAdimi: 0,
    kazanc: 0,
    kazancBirimi: "olay",
    etki: { tutus: 0.9, sure: 1, sonraBekleme: 0 },
  },
  {
    id: "bekleyen",
    versiyon: 1,
    kategori: "passive",
    tetik: "SurusTick",
    maliyet: 0,
    beklemeAdimi: 3,
    kazanc: 2,
    kazancBirimi: "olay",
  },
  {
    id: "saldiri-hasar",
    versiyon: 1,
    kategori: "passive",
    tetik: "HasarVerildi",
    kosul: { hasar: "ates" },
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 1,
    kazancBirimi: "miktar",
  },
  {
    id: "durum-ates",
    versiyon: 1,
    kategori: "passive",
    tetik: "DurumUygulandi",
    kosul: { durum: "ates" },
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 3,
    kazancBirimi: "olay",
  },
  {
    id: "takip-dt",
    versiyon: 1,
    kategori: "passive",
    tetik: "YakinTakip",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 4,
    kazancBirimi: "saniye",
  },
  {
    id: "yetenek-x",
    versiyon: 1,
    kategori: "active",
    tetik: "AbilityActivated",
    kosul: { yetenek: "x" },
    maliyet: 10,
    beklemeAdimi: 0,
    kazanc: 0,
    kazancBirimi: "olay",
    etki: { tutus: 1.3, guc: 1.2, sure: 1, sonraBekleme: 0.5 },
  },
  {
    id: "nearmiss",
    versiyon: 1,
    kategori: "passive",
    tetik: "NearMiss",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 2,
    kazancBirimi: "olay",
  },
  {
    id: "konum",
    versiyon: 1,
    kategori: "passive",
    tetik: "KonumEtkisi",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 1,
    kazancBirimi: "olay",
  },
  {
    id: "carpisma",
    versiyon: 1,
    kategori: "passive",
    tetik: "Carpisma",
    maliyet: 0,
    beklemeAdimi: 0,
    kazanc: 1,
    kazancBirimi: "olay",
  },
];
const pool = [E.NITRO, E.SURUS_ENERJISI, M.DRIFT_HARVESTER, M.TUTUS_DARBESI, ...perks, ...synthetic];
const kinds = [
  "DriftStarted",
  "DriftTickQualified",
  "DriftEnded",
  "AbilityActivated",
  "SurusTick",
  "HasarAlindi",
  "RiskBasladi",
  "HasarVerildi",
  "YakinTakip",
  "NearMiss",
  "KonumEtkisi",
  "DurumUygulandi",
  "KorumaEngelledi",
  "Carpisma",
];
function randomEvent(r, kind, seq) {
  const dt = r() < 0.85 ? 1 / 60 : [0, -1 / 60, 1 / 20, NaN, 1 / 30][Math.floor(r() * 5)],
    pick = (a) => a[Math.floor(r() * a.length)];
  switch (kind) {
    case "DriftStarted":
      return { tur: kind, sira: seq, yon: r() < 0.5 ? -1 : 1 };
    case "DriftTickQualified":
      return { tur: kind, sira: seq, dt, hiz: r() * 40, aci: (r() - 0.5) * 1.6 };
    case "DriftEnded":
      return { tur: kind, sira: seq, sure: r() * 4, spin: r() < 0.35 };
    case "AbilityActivated":
      return { tur: kind, sira: seq, yetenek: pick(["nitro", "tutus-darbesi", "x", "gecersiz-etki", "yok"]) };
    case "SurusTick":
      return { tur: kind, sira: seq, dt, hiz: r() * 60, havada: r() < 0.2 };
    case "HasarAlindi":
      return { tur: kind, sira: seq, hasar: pick(["carpma", "spin"]), miktar: pick([0, 4, 9, -2]) };
    case "RiskBasladi":
      return { tur: kind, sira: seq, risk: Math.floor(r() * 3) };
    case "HasarVerildi":
      return {
        tur: kind,
        sira: seq,
        hedef: "rakip",
        miktar: pick([0, 2, 10, 30, Infinity]),
        hasar: pick(["carpma", "ates", "elektrik", "kinetik"]),
        kaynak: "s",
      };
    case "YakinTakip":
      return { tur: kind, sira: seq, hedef: "rakip", dt, mesafe: r() * 12 };
    case "NearMiss":
      return { tur: kind, sira: seq, hedef: "e:1", hiz: r() * 40 };
    case "KonumEtkisi":
      return { tur: kind, sira: seq, hedef: "rakip", etki: pick(["cekme", "itme"]), kaynak: "s" };
    case "DurumUygulandi":
      return { tur: kind, sira: seq, hedef: "rakip", durum: pick(["ates", "elektrik"]), kaynak: "s" };
    case "KorumaEngelledi":
      return { tur: kind, sira: seq, miktar: pick([0, 5, 12]), kaynak: "s" };
    default:
      return { tur: kind, sira: seq, hedef: "rakip", siddet: r() * 20 };
  }
}
const json = (v) =>
  JSON.parse(
    JSON.stringify(v, (k, x) => (typeof x === "number" && !Number.isFinite(x) ? { n: String(x) } : x)),
  );
const runs = [];
for (let seed = 1; seed <= 60; seed++) {
  const r = R.mulberry32(seed * 7919),
    count = 1 + Math.floor(r() * 7),
    defs = [];
  for (let i = 0; i < count; i++) defs.push(pool[Math.floor(r() * pool.length)]);
  if (r() < 0.3) defs.push(defs[0]);
  const capacity = M.parametreler(defs).kapasite;
  let d = M.mekanikBaslat(capacity, Math.floor(r() * capacity));
  const initial = clean(d),
    steps = [];
  let seq = 0;
  for (let s = 0; s < 240; s++) {
    const n = Math.floor(r() * 4),
      events = [];
    for (let i = 0; i < n; i++) {
      const kind = kinds[Math.floor(r() * kinds.length)];
      const back = r() < 0.05;
      events.push(randomEvent(r, kind, back ? Math.max(0, seq - 2) : seq));
      if (!back) seq++;
    }
    if (r() < 0.03) events.push({ ...randomEvent(r, "SurusTick", seq), sira: seq + 0.5 });
    const active = r() > 0.04,
      dt = r() < 0.95 ? 1 / 60 : [0, 1 / 10][Math.floor(r() * 2)];
    const before = d;
    d = M.mekanikAdimi(d, events, defs, active, dt);
    steps.push({
      events: json(events),
      active,
      dt,
      same: before === d,
      state: clean(d),
      tutus: M.tutusCarpani(d),
      guc: M.gucCarpani(d),
    });
  }
  runs.push({ seed, defs: defs.map((m) => m.id), initial, steps });
}
// İşlem sınırı: 70 olay tek adımda; türev zincir derinliği 3'ü aşar.
const limit = (() => {
  const defs = [synthetic[0], synthetic[1], E.SURUS_ENERJISI];
  let d = M.mekanikBaslat(200, 0);
  const ev = [];
  for (let i = 0; i < 70; i++) ev.push({ tur: "DriftTickQualified", sira: i, dt: 1 / 60, hiz: 20, aci: 0.5 });
  d = M.mekanikAdimi(d, ev, defs, true, 1 / 60);
  return { defs: defs.map((m) => m.id), events: ev, state: clean(d) };
})();
const params = [];
for (let seed = 1; seed <= 200; seed++) {
  const r = R.mulberry32(seed * 104729),
    defs = [];
  const n = Math.floor(r() * 8);
  for (let i = 0; i < n; i++) defs.push(pool[Math.floor(r() * pool.length)]);
  const before = M.mekanikBaslat(200, Math.floor(r() * 200));
  params.push({
    defs: defs.map((m) => m.id),
    p: M.parametreler(defs),
    before: clean(before),
    after: clean(M.kapasiteUygula(before, defs)),
    kept: M.takiliDuzenle(defs).map((m) => m.id),
  });
}
const starts = [
  [100, 0],
  [100, 40],
  [150, 500],
  [100, -5],
  [0, 0],
  [-1, 0],
  [NaN, 0],
  [100, NaN],
  [Infinity, 0],
].map(([k, b]) => {
  try {
    return { k: String(k), b: String(b), state: clean(M.mekanikBaslat(k, b)) };
  } catch (e) {
    return { k: String(k), b: String(b), error: e.constructor.name };
  }
});
const observers = [];
for (let seed = 1; seed <= 30; seed++) {
  const r = R.mulberry32(seed * 31337);
  let g = M.driftGozlemiBaslat();
  const rows = [];
  for (let s = 0; s < 300; s++) {
    const on = r() < 0.6,
      air = r() < 0.15,
      d = {
        S: { vx: (r() - 0.5) * 40, vz: (r() - 0.5) * 40, air },
        DR: { on: on ? 1 : 0, dir: r() < 0.5 ? -1 : 1, cool: r() < 0.3 ? 0.4 : 0 },
        D: { beta: (r() - 0.5) * 2 },
      };
    const tick = r() < 0.7,
      o = M.driftGozlemcisi(g, d, 1 / 60, tick);
    g = o.g;
    rows.push({ input: d, tick, events: o.olaylar, g: clean(g) });
  }
  observers.push(rows);
}
const output = {
  baseline,
  sources: L.sources,
  constants: {
    depth: M.NEDENSEL_DERINLIK,
    limit: M.ADIM_ISLEM_SINIRI,
    base: M.TEMEL_KAPASITE,
    bounds: M.DEGISTIRICI_SINIRI,
    grip: M.TUTUS_UST,
    power: M.GUC_ETKI_UST,
    startEnergy: E.BASLANGIC_ENERJI,
  },
  builtins,
  perks: perks.map(clean),
  synthetic,
  runs,
  limit,
  params,
  starts,
  observers,
};
const target = path.join(root, "Unity/Validation/Reference/mutant-mechanics-0.8.18.json");
const text = JSON.stringify(output) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== text) throw Error("Mekanik oracle güncel değil");
} else fs.writeFileSync(target, text);
console.log(
  `Mekanik TS: ${runs.length} koşu/${runs.reduce((n, r) => n + r.steps.length, 0)} adım, ${params.length} parametre birleşimi, ${observers.length * 300} gözlemci adımı, ${perks.length} perk.`,
);
