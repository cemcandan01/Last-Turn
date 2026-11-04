// P5: gerçek TS simülasyonu hava tutuşuyla (havaTutusu: güneş 1, yağmur 0,84, kar 0,74, kar teması 0,9); kaynak fizik gövdesi değiştirilmez.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true }),
  Sim = L.load("src/fizik/simulasyon"),
  SU = L.load("tests/yardimci/surucu"),
  CARS = L.load("src/arac/araclar").CARS;
const world = (grip) => ({
  H: () => 0,
  surf: () => 1,
  yakin: () => [],
  kutu: () => [-1e6, 1e6, -1e6, 1e6],
  kerb: () => 0,
  havaTutusu: () => grip,
  karli: () => false,
  yolTuru: () => null,
});
const configs = [];
for (const grip of [1, 0.84, 0.74, 0.9])
  for (const move of ["hizlan-fren", "el-freni-viraj"]) configs.push({ name: move + "-" + grip, grip, move });
// İki manevra: düz hızlanma sonra tam fren; hızlanıp tam direksiyon + el freni (kayma tutuşa en duyarlı).
const input = (move, n) =>
  move == "hizlan-fren"
    ? { tg: 0, g: n < 150 ? 1 : 0, b: n < 150 ? 0 : 1, analogDireksiyon: false, analogGaz: false, dbr: false }
    : { tg: n < 90 ? 0 : 1, g: 1, b: 0, analogDireksiyon: false, analogGaz: false, dbr: n >= 90 && n < 130 };
const scenarios = [];
for (const config of configs) {
  const setup = SU.kurulumYap(10, CARS[10].pk, "real");
  setup.as = { grip: 0, str: 0, stm: 0, tcs: 0, abs: 0, dft: 0, ini: 0, acc: 1, bra: 1 };
  const sim = new Sim.Simulasyon(7),
    cx = {
      dunya: world(config.grip),
      kurulum: setup,
      olay: { spin() {}, puf() {}, caliRengi: () => 0 },
      rng: sim.rng,
      gorselRng: () => 0.5,
    };
  sim.sifirla(0, 0, 0, 0);
  sim.adim({ tg: 0, g: 0, b: 0, analogDireksiyon: false, analogGaz: false, dbr: false }, cx);
  const rows = [];
  for (let n = 0; n < 240; n++) {
    sim.adim(input(config.move, n), cx);
    if (n % 10 === 9) {
      const y = sim.yeni;
      rows.push([
        n + 1,
        y.px,
        y.py,
        y.pz,
        y.vx,
        y.vy,
        y.vz,
        y.ox,
        y.oy,
        y.oz,
        y.qx,
        y.qy,
        y.qz,
        y.qw,
        y.rpm,
        y.vites,
        ...y.tk.flatMap((w) => [w.w, w.sik, w.Fz]),
      ]);
    }
  }
  scenarios.push({ ...config, rows });
}
const data = JSON.stringify({ baseline, sources: L.sources, tolerance: 1e-6, scenarios }) + "\n";
const target = path.join(root, "Unity/Validation/Reference/weather-physics-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== data) throw Error("Hava fizik oracle güncel değil");
} else fs.writeFileSync(target, data);
console.log("Hava fizik TS: 4 tutuş × 2 manevra × 240 gerçek fizik adımı.");
