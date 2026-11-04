// Sabit TS yol görevi üreticisi ve gerçek adım gövdesi; C# için işlem izleri.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const loader = createBaselineLoader();
const m = loader.load("src/oyun/mutant-gorev");
const { mulberry32 } = loader.load("src/cekirdek/rastgele");
const clone = (x) => JSON.parse(JSON.stringify(x));
const draws = [];
for (const seed of [0, 1, 42, 0xffffffff]) {
  const rng = mulberry32(seed);
  for (const region of [1, 2, 3])
    for (const vmax of [80, 125, 175, 260])
      for (const ramp of [0, 449.999, 450, 1000]) {
        const mission = m.gorevCek(rng, region, vmax, ramp);
        draws.push({ seed, region, vmax, ramp, mission, name: m.GOREV_ADI[mission.tur](mission.hedef) });
      }
}
const cases = [];
const input = (more = {}) => ({
  v: 20,
  havada: false,
  drift: false,
  carpti: false,
  x: 0,
  z: 0,
  engeller: [],
  ...more,
});
const mission = (kind, target = 3, remaining = 25) => ({
  tur: kind,
  hedef: target,
  ilerleme: 0,
  kalan: remaining,
  para: 37,
  enerji: 20,
});
function scenario(name, initial, steps, next = mission("drift")) {
  const state = clone(initial);
  const rows = steps.map(([dt, e]) => {
    const event = m.gorevAdimi(state, e, dt, () => clone(next));
    return { dt, input: e, event: clone(event), state: clone(state) };
  });
  cases.push({ name, initial, next, rows });
}
const blank = () => m.bosGorev();
const active = (kind, target, remaining) => ({ ...blank(), aktif: mission(kind, target, remaining) });
scenario("bekleme-hiz-esigi-yeniden-baslama", blank(), [
  [5, input({ v: 5.999 })],
  [5, input({ v: 6 })],
  [0.5, input()],
  [0.5, input()],
  [3, input({ drift: true })],
  [7.9, input()],
  [0.1, input()],
]);
scenario("drift-kesinti-carpma-kesintisiz", active("drift", 3), [
  [1, input({ drift: true })],
  [0.1, input()],
  [2, input({ drift: true })],
  [0.1, input({ drift: true, carpti: true })],
  [3, input({ drift: true })],
]);
scenario("sicrama-yere-inince-sifirla", active("sicrama", 0.8), [
  [0.5, input({ havada: true })],
  [0.1, input()],
  [0.79, input({ havada: true })],
  [0.02, input({ havada: true })],
]);
scenario("hiz-yuvarlama-ve-tepeyi-koruma", active("hiz", 115), [
  [0.1, input({ v: 100.49 / 3.6 })],
  [0.1, input({ v: 100.5 / 3.6 })],
  [0.1, input({ v: 5 })],
  [0.1, input({ v: 114.5 / 3.6 })],
]);
scenario("sure-doldu-sonra-bekleme", active("drift", 3, 0.2), [
  [0.1, input()],
  [0.1, input()],
  [8, input({ v: 0 })],
  [8, input()],
]);
scenario("ayni-adimda-basari-sureden-once", active("sicrama", 0.8, 0.1), [[0.8, input({ havada: true })]]);
const obstacle = (id, clearance) => ({ id, x: clearance + 1, z: 0, r: 1 });
scenario("kilpayi-esikler-tekillik-carpma", active("kilpayi", 3), [
  [0.1, input({ engeller: [obstacle("a", 2.2)] })],
  [0.1, input({ v: 15, engeller: [obstacle("a", 2)] })],
  [0.1, input({ engeller: [obstacle("a", 2), obstacle("b", 1)] })],
  [0.1, input({ engeller: [obstacle("a", 2)] })],
  [0.1, input({ engeller: [obstacle("a", 4.5)] })],
  [0.1, input({ v: 0, engeller: [obstacle("a", 4.51)] })],
  [0.1, input({ carpti: true, engeller: [obstacle("b", 10)] })],
  [0.1, input({ engeller: [obstacle("c", 1), obstacle("d", 1)] })],
  [0.1, input({ engeller: [] })],
  [0.1, input({ engeller: [obstacle("c", 5), obstacle("d", 5)] })],
]);
scenario("kilpayi-coklu-ayni-kimlik", active("kilpayi", 2), [
  [0.1, input({ engeller: [obstacle("a", 1), obstacle("a", 1)] })],
  [0.1, input({ engeller: [obstacle("a", 5), obstacle("a", 5)] })],
  [0.1, input({ engeller: [obstacle("a", 1)] })],
  [0.1, input({ engeller: [obstacle("a", 5)] })],
]);
const data = { baseline, sources: loader.sources, constants: m.YOL_GOREVI, draws, cases };
const target = path.join(root, "Unity/Validation/Reference/mutant-missions-0.8.18.json");
const output = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw new Error("Mutant yol görevi oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Mutant yol görevi TS: ${draws.length} üretim, ${cases.length} senaryo, ${cases.reduce((n, c) => n + c.rows.length, 0)} adım.`,
);
