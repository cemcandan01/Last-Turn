import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ extraExports: { "src/fizik/yeni/model.ts": ["carpismalar"] } }),
  M = L.load("src/fizik/yeni/model"),
  parts = L.load("src/arac/parcalar"),
  cars = L.load("src/arac/araclar").CARS;
const F = L.load("src/fizik/yeni/arac-fizigi").aracFizigi(cars[0], parts.parcaliKurulum(0, [], "real"));
const types = [
  { t: "solid", x: 0, z: 0, r: 2 },
  { t: "box", x: 0, z: 0, hx: 2, hz: 4 },
  { t: "bush", x: 0, z: 0, r: 3 },
  { t: "water", x: 0, z: 0, r: 3 },
];
const cases = [];
for (const [i, obstacles] of [...types.map((o) => [o]), types, []].entries())
  for (const angle of [0, 0.4]) {
    const y = {
      px: i === 5 ? 99 : -3,
      py: F.cgY,
      pz: F.cgZ,
      qx: 0,
      qy: Math.sin(angle / 2),
      qz: 0,
      qw: Math.cos(angle / 2),
      vx: 18,
      vy: 0,
      vz: 3,
      ox: 0,
      oy: 0.2,
      oz: 0,
    };
    const d = { S: { hit: -9, wet: 0, y: 0, h: angle }, zaman: 0 },
      bounds = i === 5 ? [-100, 100, -100, 100] : [-1000, 1000, -1000, 1000];
    const initial = { ...y },
      rows = [];
    const world = { yakin: () => obstacles, kutu: () => bounds, karli: () => false };
    for (let tick = 0; tick < 35; tick++) {
      y.px += y.vx / 60;
      y.pz += y.vz / 60;
      M.carpismalar(
        d,
        y,
        F,
        { dunya: world, gorselRng: () => 1, olay: { puf: () => {}, caliRengi: () => 0 } },
        1 / 60,
        Math.hypot(y.vx, y.vz),
      );
      rows.push([y.px, y.pz, y.vx, y.vz, y.oy, d.S.hit, d.S.wet]);
      d.zaman += 1 / 60;
    }
    cases.push({ initial, objects: obstacles, bounds, rows });
  }
const value = {
  baseline,
  sources: L.sources,
  physics: { mass: F.m, iy: F.I[1], cgY: F.cgY, cgZ: F.cgZ },
  cases,
};
const target = path.join(root, "Unity/Validation/Reference/collisions-0.8.18.json"),
  out = JSON.stringify(value) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== out) throw new Error("Çarpışma oracle farklı");
} else fs.writeFileSync(target, out);
console.log(`TS çarpışma: ${cases.length} senaryo × 35 temas adımı; kaynak fonksiyonu doğrudan çalıştı.`);
