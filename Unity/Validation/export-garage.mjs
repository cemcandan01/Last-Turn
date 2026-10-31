// Özgün TS satın alma ve takılı parça işlemleri; C# sonuçları oracle üretimine girmez.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { baseline, root, createBaselineLoader } from "./export-catalog.mjs";

export function buildGarageReference() {
  const sources = {};
  function scenario(name, operations, seed = null) {
    const loader = createBaselineLoader();
    if (seed) {
      loader.storage.set("lt_ilerleme", JSON.stringify(seed.progress));
      loader.storage.set("lt_yildiz", JSON.stringify(seed.progress.yildiz ?? {}));
      loader.storage.set("lt_parca", JSON.stringify(seed.equipped ?? {}));
      if (seed.selectedCar != null) loader.storage.set("lt_car", String(seed.selectedCar));
    }
    const p = loader.load("src/oyun/ilerleme"),
      m = loader.load("src/oyun/modifiye"),
      economy = loader.load("src/oyun/ekonomi"),
      parts = loader.load("src/arac/parcalar"),
      cars = loader.load("src/arac/araclar").CARS;
    let selected = seed?.selectedCar ?? economy.ILK_ARAC;
    const snapshot = () => {
      const v = p.ilerlemeVerisi();
      const progress = Object.fromEntries(
        ["surum", "xp", "kazanilan", "alimlar", "ekAcik", "yildiz"].map((k) => [k, v[k]]),
      );
      const equipped = {};
      for (let car = 0; car < cars.length; car++) {
        const ids = m.takiliParcalar(car);
        if (ids.length) equipped[car] = ids;
      }
      const setup = parts.parcaliKurulum(selected, m.takiliParcalar(selected), "norm");
      return {
        snapshot: { version: 1, baseline, catalogGeneration: 1, selectedCar: selected, assistLevel: "norm", progress, equipped },
        balance: p.para(),
        level: p.seviye().lv,
        setup: {
          hp: setup.car.hp,
          kg: setup.car.kg,
          tire: setup.tire,
          pk: setup.pk,
          tu: setup.tu,
          as: setup.as,
        },
        ownedCars: cars.map((_, car) => p.aracAcikMi(car)),
        ownedParts: cars.map((_, car) =>
          parts.PARCALAR.filter((part) => p.parcaSahipMi(car, part.id)).map((part) => part.id),
        ),
      };
    };
    const initial = snapshot();
    const steps = operations.map((op) => {
      let result = null;
      switch (op.kind) {
        case "money":
          result = p.paraEkle(op.amount, "oracle");
          break;
        case "xp":
          p.xpEkle(op.amount, "oracle");
          break;
        case "buyCar":
          result = p.aracSatinAl(op.car);
          break;
        case "block":
          result = p.aracSatinAlinabilirMi(op.car).neden ?? "";
          break;
        case "cost":
          result = p.parcaAlimBedeli(op.car, op.ids);
          break;
        case "buyParts":
          result = p.parcaSatinAl(op.car, op.ids);
          break;
        case "equip":
          result = m.parcaTak(op.car, op.id);
          break;
        case "unequip":
          m.parcaSok(op.car, op.category);
          result = true;
          break;
        case "package":
          result = m.paketiTak(op.car, op.id);
          break;
        case "stock":
          m.stokaDon(op.car);
          result = true;
          break;
        case "select":
          result = p.aracAcikMi(op.car);
          if (result) {
            selected = op.car;
            loader.storage.set("lt_car", String(selected));
          }
          break;
        case "reload":
          p.ilerlemeSifirla();
          m.modifiyeSifirla();
          selected = +(loader.storage.get("lt_car") ?? economy.ILK_ARAC);
          break;
        default:
          throw new Error("Bilinmeyen oracle işlemi: " + op.kind);
      }
      return { op, result, ...snapshot() };
    });
    Object.assign(sources, loader.sources);
    return {
      name,
      seed: seed
        ? {
            version: 1,
            baseline,
            selectedCar: seed.selectedCar ?? economy.ILK_ARAC,
            progress: seed.progress,
            equipped: seed.equipped ?? {},
          }
        : null,
      initial,
      steps,
    };
  }
  const scenarios = [
    scenario("yeni-oyuncu-ve-reddedilen-islemler", [
      { kind: "block", car: 0 },
      { kind: "buyCar", car: 0 },
      { kind: "select", car: 0 },
      { kind: "buyParts", car: 10, ids: ["motor-sokak"] },
      { kind: "equip", car: 10, id: "motor-sokak" },
      { kind: "package", car: 10, id: "asfalt" },
      { kind: "buyParts", car: 0, ids: ["motor-sokak"] },
      { kind: "equip", car: 10, id: "bilinmeyen" },
      { kind: "package", car: 10, id: "bilinmeyen" },
      { kind: "money", amount: -2.5 },
      { kind: "xp", amount: -3 },
      { kind: "reload" },
    ]),
    scenario("arac-satin-alma-seviye-ve-para", [
      { kind: "money", amount: 17999 },
      { kind: "block", car: 0 },
      { kind: "xp", amount: 910 },
      { kind: "block", car: 0 },
      { kind: "buyCar", car: 0 },
      { kind: "money", amount: 1 },
      { kind: "buyCar", car: 0 },
      { kind: "block", car: 0 },
      { kind: "buyCar", car: 0 },
      { kind: "select", car: 0 },
      { kind: "reload" },
    ]),
    scenario("iki-arac-ve-kategori-kredisi", [
      { kind: "money", amount: 60000 },
      { kind: "xp", amount: 3290 },
      { kind: "buyCar", car: 0 },
      { kind: "buyCar", car: 1 },
      { kind: "cost", car: 0, ids: ["motor-sokak"] },
      { kind: "buyParts", car: 0, ids: ["motor-sokak"] },
      { kind: "equip", car: 0, id: "motor-sokak" },
      { kind: "cost", car: 0, ids: ["motor-yaris"] },
      { kind: "buyParts", car: 0, ids: ["motor-yaris"] },
      { kind: "equip", car: 0, id: "motor-yaris" },
      { kind: "equip", car: 0, id: "motor-sokak" },
      { kind: "cost", car: 1, ids: ["motor-yaris"] },
      { kind: "buyParts", car: 1, ids: ["motor-yaris"] },
      { kind: "equip", car: 1, id: "motor-yaris" },
      { kind: "select", car: 1 },
      { kind: "unequip", car: 0, category: "motor" },
      { kind: "reload" },
      { kind: "buyParts", car: 0, ids: ["motor-degisim", "motor-degisim", "motor-sokak", "bilinmeyen"] },
      { kind: "equip", car: 0, id: "motor-degisim" },
      { kind: "stock", car: 0 },
      { kind: "reload" },
    ]),
    scenario("paket-lastik-ve-sira", [
      { kind: "money", amount: 15000.5 },
      { kind: "cost", car: 10, ids: ["lastik-yaris", "suspansiyon-yaris", "aero-yaris"] },
      { kind: "buyParts", car: 10, ids: ["lastik-yaris", "suspansiyon-yaris", "aero-yaris"] },
      { kind: "package", car: 10, id: "asfalt" },
      { kind: "buyParts", car: 10, ids: ["lastik-drift", "diferansiyel-kilitli", "aci-kiti"] },
      { kind: "package", car: 10, id: "drift" },
      { kind: "select", car: 10 },
      { kind: "reload" },
      { kind: "buyParts", car: 10, ids: ["motor-yaris", "motor-sokak", "motor-yaris"] },
      { kind: "equip", car: 10, id: "motor-yaris" },
      { kind: "equip", car: 10, id: "motor-sokak" },
      { kind: "unequip", car: 10, category: "lastik" },
      { kind: "stock", car: 10 },
      { kind: "reload" },
    ]),
    scenario("ucretsiz-bilinmeyen-ve-tekrar", [
      { kind: "buyParts", car: 10, ids: ["motor-kisitli", "agirlik-balast", "fren-sokak", "bilinmeyen"] },
      { kind: "equip", car: 10, id: "motor-kisitli" },
      { kind: "equip", car: 10, id: "agirlik-balast" },
      { kind: "equip", car: 11, id: "motor-kisitli" },
      { kind: "stock", car: 10 },
      { kind: "buyParts", car: 10, ids: ["bilinmeyen"] },
      { kind: "money", amount: 450 },
      { kind: "buyParts", car: 10, ids: ["motor-sokak"] },
      { kind: "buyParts", car: 10, ids: ["motor-sokak"] },
      { kind: "equip", car: 10, id: "motor-sokak" },
      { kind: "reload" },
    ]),
  ];
  const migrations = [
    { name: "v2-bos", progress: { surum: 2, xp: 0, kazanilan: 0, alimlar: {}, ekAcik: [], yildiz: {} } },
    {
      name: "v2-oynanmis",
      selectedCar: 0,
      progress: { surum: 2, xp: 40, kazanilan: 1000, alimlar: {}, ekAcik: [], yildiz: {} },
    },
    {
      name: "v1-seviye-yildiz",
      progress: {
        surum: 1,
        xp: 460,
        kazanilan: 0,
        alimlar: {},
        ekAcik: [],
        yildiz: { asphalt_1: 2, dirt_1: 3 },
      },
    },
    { name: "v3-eksik-ek-alanlar", progress: { surum: 3, xp: 0 } },
  ].map((seed) => ({
    ...scenario(seed.name, [{ kind: "reload" }], seed),
    expectedRejected: seed.progress.surum === 1,
  }));
  const driveLoader = createBaselineLoader();
  const driveParts = driveLoader.load("src/arac/parcalar"),
    drivePhysics = driveLoader.load("src/fizik/yeni/arac-fizigi"),
    driveData = driveLoader.load("src/fizik/veriler"),
    driveCars = driveLoader.load("src/arac/araclar").CARS,
    driveRaceTires = driveLoader.load("src/arac/yaris-lastigi");
  // Yalnız saf toprak kuralı özgün kaynak gövdesinden alınır; MUTANT'ın UI/koşu modülü yüklenmez.
  const mutant = driveLoader.read("src/oyun/mutant-kosu.ts");
  const constant = mutant.split("\n").find((line) => line.startsWith("export const TOPRAK_ACIK_PAYI"));
  const start = mutant.indexOf("export function toprakDengesi(");
  const begin = mutant.indexOf("{", start);
  if (!constant || start < 0 || begin < 0) throw new Error("Toprak kaynak kuralı bulunamadı");
  let end = begin + 1,
    depth = 1;
  for (; end < mutant.length && depth; end++) {
    if (mutant[end] === "{") depth++;
    if (mutant[end] === "}") depth--;
  }
  if (depth) throw new Error("Toprak kaynak kuralı kapanmadı");
  const extracted = ts.transpileModule(constant + "\n" + mutant.slice(start, end), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = vm.createContext({ exports: {}, TIRES: driveData.TIRES });
  new vm.Script(extracted).runInContext(context);
  const balance = context.exports.toprakDengesi;
  const driveProfiles = driveCars.flatMap((car, carIndex) =>
    [[], ...driveParts.PAKETLER.map((p) => p.parcalar)].flatMap((ids) =>
      ["", "gp"].flatMap((raceType) =>
        [false, true].map((terrain) => {
          const setup = driveParts.parcaliKurulum(carIndex, ids, "norm");
          if (raceType) setup.tire = driveRaceTires.yarisLastigi(raceType, ids);
          const before = setup.car.gr;
          if (terrain) setup.car = balance(setup.car, setup.tire);
          const physics = drivePhysics.aracFizigi(setup.car, setup);
          return {
            carIndex,
            ids,
            terrain,
            raceType,
            tire: setup.tire,
            preset: setup.pk,
            car: { k: setup.car.k, hp: setup.car.hp, kg: setup.car.kg, gr: setup.car.gr },
            beforeGrip: before,
            physics,
          };
        }),
      ),
    ),
  );
  Object.assign(sources, driveLoader.sources);
  return {
    schema: 1,
    baseline,
    sources: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))),
    scenarios,
    migrations,
    driveProfiles,
  };
}

export function main() {
  const value = buildGarageReference();
  const target = path.join(root, "Unity/Validation/Reference/garage-operations-0.8.18.json");
  // Her işlem tek satır; üretilmiş kanıt incelenebilir ve farkı dar kalır.
  const output =
    "{\n" +
    Object.entries(value)
      .map(
        ([key, data]) =>
          "  " +
          JSON.stringify(key) +
          ": " +
          (Array.isArray(data)
            ? "[\n" + data.map((row) => "    " + JSON.stringify(row)).join(",\n") + "\n  ]"
            : JSON.stringify(data)),
      )
      .join(",\n") +
    "\n}\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output)
      throw new Error("Garaj TS işlem kanıtı güncel değil");
  } else fs.writeFileSync(target, output);
  console.log(
    `Garaj TS ${baseline}: ${value.scenarios.length} akış, ${value.scenarios.reduce((n, s) => n + s.steps.length, 0)} işlem, ${value.migrations.length} kayıt geçişi, ${value.driveProfiles.length} sürüş profili.`,
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
