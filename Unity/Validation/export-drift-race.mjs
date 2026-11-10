// TS 0.8.18 MUTANT drift yarışı oracle'ı: aynı tam simülasyon (model.ts + ortak.ts driftPenceresi/driftSkoru) bu kez
// cx.driftYarisi = true (surus.ts: Mutant dp yarışı çalışırken). Düz asfalt, gerçek kurulum, betikli girdi.
// Kullanım: node Unity/Validation/export-drift-race.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
import { SCRIPTS } from "./export-assists.mjs";

const DRIFT = {
  ...SCRIPTS,
  // hızlan, yarım direksiyon + gaz (kayma açısıyla giriş), sonra gazı bırakıp kısa karşı direksiyon (bitiş/spin sınırı)
  uzun: (n) =>
    n < 260
      ? [0, 1, 0, 0]
      : n < 330
        ? [0.75, 1, 0, 0]
        : n < 520
          ? [0.25, 0.8, 0, 0]
          : n < 600
            ? [-0.8, 0.3, 0, 0]
            : [0, 0.2, 0, 0],
};

export function buildDriftRace() {
  const L = createBaselineLoader({ stubs: true });
  const SU = L.load("tests/yardimci/surucu"),
    Sim = L.load("src/fizik/simulasyon"),
    O = L.load("src/fizik/ortak"),
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
  const cases = [];
  for (const car of [10, 2, 0]) {
    for (const level of ["real", "norm", "arc"]) {
      const K = SU.kurulumYap(car, CARS[car].pk, level),
        profile = O.driftYarisProfili(K);
      for (const [name, script] of Object.entries(DRIFT)) {
        let spins = 0;
        const sim = new Sim.Simulasyon(7),
          cx = {
            dunya: W,
            kurulum: K,
            olay: { spin: () => spins++, puf() {}, caliRengi: () => 0 },
            rng: sim.rng,
            gorselRng: () => 0.5,
            driftYarisi: !process.env.DRIFT_RACE_CAREER,
          };
        sim.sifirla(0, 0, 0, 0);
        const S = sim.d.S,
          DR = sim.d.DR,
          rows = [];
        for (let n = 0; n < 720; n++) {
          const [tg, g, b, dbr] = script(n);
          sim.adim({ tg, g, b, analogDireksiyon: false, analogGaz: false, dbr: !!dbr }, cx);
          if (n % 10 == 9)
            rows.push([
              n + 1,
              S.x,
              S.z,
              S.h,
              S.vx,
              S.vz,
              DR.k,
              DR.on ? 1 : 0,
              DR.bt ?? 0,
              DR.nc ?? 0,
              DR.hold ?? 0,
              DR.cool ?? 0,
              sim.d.D.act ? 1 : 0,
              spins,
            ]);
        }
        cases.push({ car, level, tire: K.tire, script: name, profile, rows });
      }
    }
  }
  const sources = Object.fromEntries(Object.entries(L.sources).sort(([a], [b]) => a.localeCompare(b)));
  return { baseline, generator: "Unity/Validation/export-drift-race.mjs", sources, cases };
}

export function main() {
  const value = buildDriftRace(),
    target =
      process.env.DRIFT_RACE_CAREER || path.join(root, "Unity/Validation/Reference/drift-race-0.8.18.json"),
    output = JSON.stringify(value) + "\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
      console.error("Güncel değil: drift-race-0.8.18.json");
      process.exit(1);
    }
  } else fs.writeFileSync(target, output);
  const on = value.cases.filter((c) => c.rows.some((r) => r[7])).length,
    spun = value.cases.filter((c) => c.rows.at(-1)[13] > 0).length;
  console.log(
    `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: ${value.cases.length} drift yarışı durumu; ${on} durumda drift açıldı, ${spun} durumda spin.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
