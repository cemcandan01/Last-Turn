// TS 0.8.18 sürüş yardımları oracle'ı: TS'nin tam simülasyonu (Simulasyon.adim → model.ts yeniAdim + ortak.ts
// driftPenceresi) düz asfalt dünyada, gerçek kurulumla (önayar + yardım seviyesi arc/norm/real ve yardımsız),
// betikli girdilerle. Kullanım: node Unity/Validation/export-assists.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";

export const SCRIPTS = {
  // kalkış, sola viraj, fren
  viraj: (n) => (n < 180 ? [0, 1, 0, 0] : n < 360 ? [0.6, 1, 0, 0] : [0, 0, 1, 0]),
  // hızlan, el freniyle dön, karşı direksiyon + gaz
  elfreni: (n) =>
    n < 240 ? [0, 1, 0, 0] : n < 262 ? [1, 1, 0, 1] : n < 460 ? [-0.5, 1, 0, 0] : [0, 0.4, 0, 0],
  // hızlan, tam direksiyon + gaz (kıç kayması / drift başlatma), sonra karşı direksiyon
  gaz: (n) => (n < 300 ? [0, 1, 0, 0] : n < 420 ? [1, 1, 0, 0] : n < 600 ? [-0.6, 1, 0, 0] : [0, 0.5, 0, 0]),
};

export function buildAssists() {
  const L = createBaselineLoader({ stubs: true });
  const SU = L.load("tests/yardimci/surucu"),
    Sim = L.load("src/fizik/simulasyon"),
    V = L.load("src/fizik/veriler"),
    CARS = L.load("src/arac/araclar").CARS;
  const W = {
    H: () => 0,
    surf: () => 1,
    yakin: () => [],
    kutu: () => [-1e6, 1e6, -1e6, 1e6],
    kerb: () => 0,
    havaTutusu: () => 1,
    karli: () => false,
    yolTuru: () => null,
  };
  const levels = Object.fromEntries(Object.entries(V.LEVELS).map(([k, l]) => [k, l.v]));
  const cases = [];
  for (const car of [10, 2]) {
    for (const level of ["zero", "real", "norm", "arc"]) {
      const K = SU.kurulumYap(car, CARS[car].pk, level == "zero" ? "real" : level);
      // yardımsız: Unity'nin kabul edilmiş dalı (acc/bra 1, diğer yardımlar 0)
      if (level == "zero") K.as = { grip: 0, str: 0, stm: 0, tcs: 0, abs: 0, dft: 0, ini: 0, acc: 1, bra: 1 };
      for (const [name, script] of Object.entries(SCRIPTS)) {
        const sim = new Sim.Simulasyon(7),
          cx = {
            dunya: W,
            kurulum: K,
            olay: { spin() {}, puf() {}, caliRengi: () => 0 },
            rng: sim.rng,
            gorselRng: () => 0.5,
          };
        sim.sifirla(0, 0, 0, 0);
        const S = sim.d.S,
          DR = sim.d.DR,
          rows = [];
        for (let n = 0; n < 700; n++) {
          const [tg, g, b, dbr] = script(n);
          sim.adim({ tg, g, b, analogDireksiyon: false, analogGaz: false, dbr: !!dbr }, cx);
          if (n % 10 == 9)
            rows.push([n + 1, S.x, S.z, S.h, S.vx, S.vz, DR.k, DR.on ? 1 : 0, sim.d.D.beta ?? 0]);
        }
        cases.push({ car, level, as: K.as, pk: K.pk, tire: K.tire, script: name, rows });
      }
    }
  }
  const sources = Object.fromEntries(Object.entries(L.sources).sort(([a], [b]) => a.localeCompare(b)));
  return { baseline, generator: "Unity/Validation/export-assists.mjs", sources, levels, cases };
}

export function main() {
  const value = buildAssists(),
    target = path.join(root, "Unity/Validation/Reference/assists-0.8.18.json"),
    output = JSON.stringify(value) + "\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
      console.error("Güncel değil: assists-0.8.18.json");
      process.exit(1);
    }
  } else fs.writeFileSync(target, output);
  console.log(
    `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: ${value.cases.length} durum (araç × seviye × betik); seviyeler ${Object.keys(value.levels).join(", ")}; ` +
      value.cases
        .filter((c) => c.script == "elfreni")
        .map((c) => `${c.car}/${c.level} DR.k max ${Math.max(...c.rows.map((r) => r[6])).toFixed(2)}`)
        .join(", "),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
