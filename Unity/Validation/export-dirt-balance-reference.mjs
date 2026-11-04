// Eksik üst kurulum: TS MUTANT toprakDengesi, özgün lastik/teker modeline uygulanır.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createOracle, values, tireValues, surfaces } from "./export-terrain-reference.mjs";
import {
  root,
  baseline,
  carValues,
  presetValue,
  source,
  block,
  fn,
  tolerances,
  fields,
  wheelFields,
} from "./export-vehicle-reference.mjs";
const file = "src/oyun/mutant-kosu.ts";
const mutant = execFileSync(
  "git",
  ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "-C", root, "show", baseline + ":" + file],
  { encoding: "utf8" },
);
const constant = mutant.split("\n").find((l) => l.startsWith("export const TOPRAK_ACIK_PAYI"));
if (!constant) throw new Error("Toprak denge sabiti yok");
const balance = vm.runInNewContext(
  `${constant.replace("export ", "")}\n${fn(mutant, "toprakDengesi").replace(/:\s*Arac\b/g, "")}\ntoprakDengesi`,
  { TIRES: tireValues },
);
const data = source[4];
const tuning = (key) => vm.runInNewContext("(" + block(data, data.indexOf("  " + key + ": {")).body + ")").v;
const profiles = [];
for (const [carIndex, tire] of [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 1],
])
  for (const balanced of [false, true]) {
    const base = carValues[carIndex],
      car = balanced ? balance(base, tire) : base,
      tu = carIndex === 1 ? tuning("tr") : presetValue.v;
    const oracle = createOracle(tire, tu),
      { F, LP } = oracle.setup(car);
    profiles.push({
      name: `${base.k}-tire${tire}-${balanced ? "balanced" : "raw"}`,
      carIndex,
      tire,
      balanced,
      car,
      parameters: F,
      tires: LP,
      tuning: tu,
      combinedBefore: tireValues[tire].g[0] * base.gr[0],
      combinedAfter: tireValues[tire].g[0] * car.gr[0],
      surfaceTires: surfaces.map((_, si) => oracle.setup(car, si).LP),
    });
  }
const scenarios = [];
for (const surface of [0, 1])
  for (const mode of ["low-turn", "fast-turn", "brake", "handbrake"]) {
    const p = profiles.find((p) => p.name === "gt-tire0-balanced"),
      oracle = createOracle(p.tire, p.tuning);
    const world = { H: () => 0, surf: () => surface, havaTutusu: () => 1 };
    const initialSpeed = mode === "low-turn" ? 5 : mode === "fast-turn" ? 22 : 12;
    const { Y, S } = oracle.initial(p.car, world, initialSpeed, 0),
      initial = structuredClone(Y),
      initialValues = values(Y, S),
      rows = [];
    for (let k = 0; k < 600; k++) {
      const command =
        mode === "brake"
          ? [0, 0, 0.5, false, 1, 1.2]
          : mode === "handbrake"
            ? [0.2, 0, 0, k >= 30 && k < 90, 1, 1.2]
            : [k < 120 ? 0.175 : 0, k < 120 ? (mode === "low-turn" ? 3000 : 4000) : 0, 0, false, 1, 1.2];
      oracle.step(Y, S, p.parameters, p.car, world, command);
      rows.push({ command, values: values(Y, S) });
    }
    scenarios.push({
      ...p,
      name: `${mode}-${surface}`,
      world: surface === 0 ? "flat-dirt" : "flat-asphalt",
      initialSpeed,
      heightOffset: 0,
      initial,
      initialValues,
      rows,
    });
  }
const reference = {
  baseline,
  source: file,
  sourceSha256: createHash("sha256").update(mutant).digest("hex"),
  rule: constant.trim(),
  fields: [
    ...fields,
    ...Array.from({ length: 4 }, (_, i) => wheelFields.map((f) => `wheel${i}.${f}`)).flat(),
    ...Array.from({ length: 4 }, (_, i) => `wheel${i}.surface`),
    "wet",
    "mud",
  ],
  tolerances: [...tolerances, 0, 0, 0, 0, 1e-10, 1e-10],
  profiles,
  scenarios,
};
const target = path.join(root, "Unity/Validation/Reference/dirt-balance-0.8.18.json");
if (process.argv.includes("--check")) {
  const saved = JSON.parse(fs.readFileSync(target, "utf8"));
  const meta = (r) => ({
    ...r,
    scenarios: r.scenarios.map(({ rows, ...s }) => ({ ...s, commands: rows.map((r) => r.command) })),
  });
  if (JSON.stringify(meta(saved)) !== JSON.stringify(meta(reference)))
    throw new Error("Toprak denge kaynak/kurulum sözleşmesi değişti");
  for (let s = 0; s < scenarios.length; s++)
    for (let k = 0; k < 600; k++)
      for (let j = 0; j < 51; j++)
        if (
          !Number.isFinite(saved.scenarios[s].rows[k].values[j]) ||
          Math.abs(saved.scenarios[s].rows[k].values[j] - scenarios[s].rows[k].values[j]) >
            reference.tolerances[j]
        )
          throw new Error(`Toprak denge TS farkı ${s}/${k}/${j}`);
  console.log("TS MUTANT toprak dengesi: 8 profil + 8 × 600 × 51 değer doğrulandı.");
} else {
  fs.writeFileSync(target, JSON.stringify(reference) + "\n");
  console.log("TS toprak denge referansı üretildi.");
}
