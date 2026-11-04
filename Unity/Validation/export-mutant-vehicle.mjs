// Kaynak fonksiyonlar sabit TS etiketinden çalışır; kayıt ve oyun dosyalarına dokunulmaz.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader(),
  m = L.load("src/oyun/mutant-kosu"),
  cars = L.load("src/arac/araclar").CARS;
const tires = L.load("src/fizik/veriler").TIRES;
const cases = [];
const builds = [
  [],
  ...m.PASIFLER.map((p) => Array(p.en).fill(p.id)),
  [
    "guc",
    "guc",
    "guc",
    "camtop",
    "adrenalin",
    "adrenalin",
    "hafif",
    "hafif",
    "aci",
    "aci",
    "toprak",
    "asfalt",
    "fren",
  ],
  ["ek-takviye-tampon", "ek-yedek-tup"],
];
for (let car = 0; car < cars.length; car++)
  for (const passives of builds)
    for (const body of [100, 50, 49, 0])
      for (const [remaining, power, skillPower, skillGrip] of [
        [0, 1, 1, 1],
        [1, 1.6, 1, 1],
        [1, 1.6, 1.5, 1.5],
      ]) {
        const input = { car, passives, body, remaining, power, skillPower, skillGrip };
        const changed = m.kosuAraci(cars[car], {
          pasifler: passives,
          govde: body,
          mek: { etkiKalan: remaining, etkiGuc: power },
          becCikti: { guc: skillPower, tutus: skillGrip },
        });
        cases.push({ input, car: changed });
      }
const dirt = [];
for (let car = 0; car < cars.length; car++)
  for (let tire = 0; tire < tires.length; tire++)
    dirt.push({ car, tire, grip: tires[tire].g[0], result: m.toprakDengesi(cars[car], tire) });
const parts = L.load("src/arac/parcalar"),
  presets = L.load("src/fizik/veriler").PRESETS;
const partBuilds = [
  [],
  ...parts.PAKETLER.map((p) => p.parcalar),
  ...parts.PAKETLER.map((p) => p.parcalar.filter((id) => parts.parcaBul(id).e.lastik == null)),
];
const setups = [];
for (let car = 0; car < cars.length; car++)
  for (const ids of partBuilds)
    for (const body of [100, 40]) {
      const P = parts.aracKur(car, ids),
        hasTire = P.parcalar.some((id) => parts.parcaBul(id).e.lastik != null),
        tire = hasTire ? P.tire : presets[P.pk].tire;
      const run = { pasifler: ["guc", "camtop", "adrenalin"], govde: body };
      setups.push({ car, ids, run, tire, result: m.toprakDengesi(m.kosuAraci(P.car, run), tire) });
    }
const data = {
  baseline,
  sources: L.sources,
  passiveIds: m.PASIFLER.map((p) => p.id),
  cars,
  cases,
  dirt,
  setups,
};
const target = path.join(root, "Unity/Validation/Reference/mutant-vehicle-0.8.18.json");
const output = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw Error("Mutant araç oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Mutant araç TS: ${cases.length} pasif/gövde/nitro/skill örneği, ${dirt.length} toprak/lastik eşleşmesi.`,
);
