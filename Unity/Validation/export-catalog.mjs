// Sabit TS kaynağı bellekte çalışır; kaynak dosyaları ve oyun kayıtları değiştirilmez.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
export const root = path.resolve(import.meta.dirname, "../..");

// THREE/DOM'a bağlı TS dosyalarını (bölge kurulumu) saf sorguları için yüklerken kullanılan her şeyi kabul eden taklit:
// özelliği, çağrısı ve kurucusu yine kendisidir; görsel kurulum hiç çalıştırılmaz, yalnız modül üst düzeyi geçer.
function universalStub() {
  const target = function () {};
  const proxy = new Proxy(target, {
    get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : key === "prototype" ? {} : proxy),
    apply: () => proxy,
    construct: () => proxy,
    set: () => true,
    has: () => true,
  });
  return proxy;
}

export function createBaselineLoader({ stubs = false, extraExports = {} } = {}) {
  const modules = new Map(),
    sources = {},
    storage = new Map();
  const read = (name) => {
    const source = execFileSync(
      "git",
      ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "-C", root, "show", baseline + ":" + name],
      { encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } },
    );
    sources[name] = createHash("sha256").update(source).digest("hex");
    return source;
  };
  const globals = stubs
    ? Object.fromEntries(
        [
          "document",
          "window",
          "navigator",
          "HTMLCanvasElement",
          "Image",
          "requestAnimationFrame",
          "addEventListener",
          "matchMedia",
          "AudioContext",
          "location",
          "performance",
          "setTimeout",
          "clearTimeout",
          "devicePixelRatio",
          "innerWidth",
          "innerHeight",
          "screen",
          "fetch",
          "OffscreenCanvas",
        ].map((k) => [k, universalStub()]),
      )
    : {};
  const context = vm.createContext({
    ...globals,
    console,
    structuredClone,
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
  });
  function load(name) {
    name = path.posix.normalize(name.endsWith(".ts") ? name : name + ".ts");
    if (!name.startsWith("src/") && !(stubs && name.startsWith("tests/yardimci/")))
      throw new Error("Katalog dışı modül: " + name);
    if (modules.has(name)) return modules.get(name).exports;
    const module = { exports: {} };
    modules.set(name, module);
    let source = read(name);
    // Salt veri olan özel tabloları dışarı aç; hesaplama gövdeleri aynen çalışır.
    if (name === "src/fizik/yeni/arac-fizigi.ts") source += "\nexport { FREKANS as catalogFrequencies };";
    if (name === "src/arac/performans.ts") source += "\nexport { referanslar as catalogTracks };";
    // Doğrulama için kaynakta iç fonksiyonu dışa aç (gövde değişmez).
    if (extraExports[name]) source += "\nexport { " + extraExports[name].join(", ") + " };";
    // Vite ortamı: taklit modunda üretim dışı sabit değerler (geliştirici/deneme bayrakları kapalı).
    if (stubs)
      source = source
        .replaceAll("import.meta.env", '({ MODE: "test", DEV: false, PROD: true, BASE_URL: "/" })')
        .replaceAll("import.meta.url", '"file:///baseline/"');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = (specifier) => {
      if (!specifier.startsWith(".")) {
        if (stubs) return universalStub();
        throw new Error("Harici modül yürütülmez: " + specifier);
      }
      return load(path.posix.join(path.posix.dirname(name), specifier));
    };
    new vm.Script("(function(require,module,exports){" + code + "\n})", {
      filename: baseline + "/" + name,
    }).runInContext(context)(require, module, module.exports);
    return module.exports;
  }
  return { load, read, sources, storage };
}

export function buildCatalog() {
  const loader = createBaselineLoader(),
    { load } = loader;
  const cars = load("src/arac/araclar").CARS;
  const parts = load("src/arac/parcalar"),
    perf = load("src/arac/performans");
  const data = load("src/fizik/veriler"),
    physics = load("src/fizik/yeni/arac-fizigi");
  const model = load("src/fizik/yeni/model"),
    features = load("src/arac/ozellikler");
  const economy = load("src/oyun/ekonomi"),
    career = load("src/oyun/kariyer");
  const progress = load("src/oyun/ilerleme"),
    raceTires = load("src/arac/yaris-lastigi");
  const tracks = load("src/dunya/pist-tanimlari").TDEF;
  const types = ["gp", "rx", "rl", "dp", "dg"];
  const events = tracks.map((t) => ({
    tur: t.t,
    lv: t.lv,
    rule: career.kariyerKurali(t.t, t.lv),
    baseReward: economy.yarisOdulTabani(t.t, t.lv),
  }));
  const targets = types.flatMap((tur) =>
    Array.from({ length: 6 }, (_, i) => ({ tur, stage: i + 1, ...career.kariyerKurulumu(tur, i + 1) })),
  );
  const catalog = {
    schema: 1,
    baseline,
    sources: loader.sources,
    cars,
    parts: parts.PARCALAR,
    packages: parts.PAKETLER,
    categories: parts.KATEGORILER,
    presets: data.PRESETS,
    levels: data.LEVELS,
    tires: data.TIRES,
    surfaces: data.SURF,
    classes: perf.SINIFLAR,
    stockCaps: features.STOK_TAVAN,
    featureNames: features.OZELLIK_ADLARI,
    performanceCalibration: perf.KALIBRE,
    performanceTracks: perf.catalogTracks(),
    frequencies: physics.catalogFrequencies,
    constants: {
      gravity: data.YERCEKIMI,
      vmax: data.VMAX,
      rho: physics.RHO,
      grip: model.TUTUS,
      looseGrip: model.GEVSEK_TUTUS,
      loosePeak: model.GEVSEK_TEPE,
      looseC: model.GEVSEK_C,
      looseRear: model.GEVSEK_ARKA,
    },
    prices: {
      cars: economy.ARAC_FIYAT,
      partBase: economy.PARCA_TABAN,
      partSpecial: economy.PARCA_OZEL_FIYAT,
      categoryMultiplier: economy.PARCA_KAT_CARPAN,
      startingCars: economy.BASLANGIC_ARACLARI,
      initialCar: economy.ILK_ARAC,
      legacyFree: economy.ESKI_UCRETSIZ,
    },
    career: {
      version: career.KARIYER_SURUM,
      caps: career.KARIYER_TAVAN,
      moneyPerMinute: career.KARIYER_PARA_DAKIKA,
      xpPerMinute: career.KARIYER_XP_DAKIKA,
      starting: career.BASLANGIC,
      platform: career.PLATFORM,
      events,
      targets,
      unlocks: progress.ACILMA,
      vehicleStages: cars.map((_, i) => career.aracKariyerAsamasi(i)),
    },
    raceTires: raceTires.YARIS_LASTIKLERI,
  };
  const modelSource = loader.read("src/fizik/yeni/model.ts");
  const tirePrep = modelSource.slice(
    modelSource.indexOf("const kz ="),
    modelSource.indexOf("  // ---------- direksiyon:"),
  );
  const tireCode = ts.transpileModule(
    "function surfaceTires(K,surface){ const F=aracFizigi(K.car,K),CAR=K.car,tu=K.tu,as=K.as,T=TIRES[K.tire],S={wet:0,mud:0},W={havaTutusu:()=>1},DR={k:0},gi={g:0},Y={tk:[0,1,2,3].map(()=>({zemin:surface}))},ab=0,vl=0;" +
      tirePrep +
      "return LP; }",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const surfaceOracle = vm.runInNewContext(tireCode + ";surfaceTires", {
    aracFizigi: physics.aracFizigi,
    VMAX: data.VMAX,
    sm: (a, b, x) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    },
    TIRES: data.TIRES,
    SURF: data.SURF,
    TUTUS: model.TUTUS,
    GEVSEK_TUTUS: model.GEVSEK_TUTUS,
    GEVSEK_TEPE: model.GEVSEK_TEPE,
    GEVSEK_C: model.GEVSEK_C,
    GEVSEK_ARKA: model.GEVSEK_ARKA,
    cl: (x, a, b) => Math.max(a, Math.min(b, x)),
  });
  const combinations = [
    [],
    ...parts.PARCALAR.map((p) => [p.id]),
    ...parts.PAKETLER.map((p) => p.parcalar),
    ["motor-degisim", "turbo-buyuk", "cekis-dort", "agirlik-3", "aci-kiti"],
    ["motor-yaris", "motor-sokak", "bilinmeyen", "motor-sokak"],
    ["suspansiyon-ralli", "koruma", "fren-yaris", "aero-buyuk", "diferansiyel-kilitli"],
    ...targets.map((t) => t.parca),
    ...parts.PAKETLER.flatMap((p) => [p.parcalar.slice(0, 1), p.parcalar.slice(0, 2)]),
    ["aero-yaris", "suspansiyon-yaris", "lastik-drift", "diferansiyel-kilitli"],
    ["lastik-toprak", "diferansiyel-ralli", "koruma"],
  ];
  const cases = cars.flatMap((_, carIndex) =>
    combinations.map((ids, i) => {
      const level = "norm",
        setup = parts.parcaliKurulum(carIndex, ids, level);
      return {
        name: cars[carIndex].k + "/" + i,
        carIndex,
        ids,
        level,
        normalized: parts.aracKur(carIndex, ids).parcalar,
        affinity: parts.aracKur(carIndex, ids).uyum,
        setup,
        physics: physics.aracFizigi(setup.car, setup),
        surfaceTires: Array.from({ length: 6 }, (_, s) => surfaceOracle(setup, s)),
        performance: perf.performansPuani(carIndex, ids),
        purchaseCost: progress.parcaAlimBedeli(carIndex, ids),
      };
    }),
  );
  const levelCases = cars.flatMap((_, carIndex) =>
    ["arc", "real"].map((level) => {
      const ids = ["motor-spor", "suspansiyon-ralli", "lastik-spor"],
        setup = parts.parcaliKurulum(carIndex, ids, level);
      return {
        name: cars[carIndex].k + "/" + level,
        carIndex,
        ids,
        level,
        normalized: parts.aracKur(carIndex, ids).parcalar,
        affinity: parts.aracKur(carIndex, ids).uyum,
        setup,
        physics: physics.aracFizigi(setup.car, setup),
        surfaceTires: Array.from({ length: 6 }, (_, s) => surfaceOracle(setup, s)),
      };
    }),
  );
  const partPrices = parts.PARCALAR.map((p) => ({ id: p.id, price: progress.parcaFiyati(p.id) }));
  const rewards = events.flatMap((e) =>
    Array.from({ length: 4 }, (_, stars) =>
      Array.from({ length: 4 }, (_, previous) => ({
        tur: e.tur,
        lv: e.lv,
        stars,
        previous,
        ...economy.yarisOdulu(e.tur, e.lv, stars, previous),
      })),
    ).flat(),
  );
  const xp = Array.from({ length: 30 }, (_, i) => i + 1).map((level) => ({
    level,
    threshold: progress.seviyeTabani(level),
    step: progress.adimXp(level),
  }));
  const investments = [
    { purchases: {}, ids: ["motor-sokak", "motor-yaris", "motor-degisim", "motor-yaris", "bilinmeyen"] },
    {
      purchases: { parca_0_motor_sahte: 123, "parca_0_motor-sokak": 450 },
      ids: ["motor-yaris", "motor-spor"],
    },
    {
      purchases: { "parca_0_motor-sokak": 450, "parca_0_motor-yaris": 2650, "parca_1_motor-degisim": 9000 },
      ids: ["motor-degisim", "motor-yaris", "motor-kisitli"],
    },
  ].map((s) => {
    progress.ilerlemeSifirla();
    loader.storage.set(
      "lt_ilerleme",
      JSON.stringify({
        surum: progress.ILERLEME_SURUM,
        xp: 0,
        alimlar: s.purchases,
        ekAcik: [],
        kazanilan: 0,
      }),
    );
    return { ...s, carIndex: 0, cost: progress.parcaAlimBedeli(0, s.ids) };
  });
  const stars = load("src/oyun/yildiz");
  const accessCases = cars.flatMap((_, carIndex) =>
    [
      ...new Set([
        1,
        Math.max(1, economy.ARAC_FIYAT[carIndex].seviye - 1),
        economy.ARAC_FIYAT[carIndex].seviye,
      ]),
    ].flatMap((level) =>
      [0, 1, 2, 3].map((starsPerEvent) => {
        progress.ilerlemeSifirla();
        loader.storage.set(
          "lt_ilerleme",
          JSON.stringify({
            surum: progress.ILERLEME_SURUM,
            xp: progress.seviyeTabani(level),
            alimlar: {},
            ekAcik: [],
            kazanilan: 0,
          }),
        );
        loader.storage.set(
          "lt_yildiz",
          JSON.stringify(
            Object.fromEntries(events.map((e) => [stars.yildizAnahtari(e.tur, e.lv), starsPerEvent])),
          ),
        );
        return { carIndex, level, starsPerEvent, allowed: progress.aracErisimi(carIndex) };
      }),
    ),
  );
  const gateCases = events.flatMap((e) =>
    [0, 1, 2, 3].map((starsPerEvent) => ({
      tur: e.tur,
      lv: e.lv,
      starsPerEvent,
      ...career.kariyerYildizKapisi(e.tur, e.lv, () => starsPerEvent),
    })),
  );
  catalog.sources = Object.fromEntries(Object.entries(loader.sources).sort(([a], [b]) => a.localeCompare(b)));
  return {
    catalog,
    fixture: {
      schema: 1,
      baseline,
      tolerance: { absolute: 1e-9, relative: 1e-10 },
      cases,
      levelCases,
      partPrices,
      rewards,
      xp,
      investments,
      accessCases,
      gateCases,
      turCases: cars.flatMap((_, carIndex) =>
        ["gp", "rx", "rl", "dg"].map((tur) => ({
          carIndex,
          ids: [],
          tur,
          performance: perf.performansPuani(carIndex, [], tur),
        })),
      ),
      raceTireCases: types.flatMap((tur) =>
        [[], ["lastik-sokak"], ["lastik-spor"], ["lastik-yaris"], ["lastik-yaris", "lastik-sokak"]].map(
          (ids) => ({
            tur,
            ids,
            tire: raceTires.yarisLastigi(tur, ids),
            quality: raceTires.lastikKalitesi(ids),
          }),
        ),
      ),
    },
  };
}

export function main() {
  const { catalog, fixture } = buildCatalog();
  for (const [name, value] of [
    ["Unity/Assets/LastTurn/Resources/vehicle-catalog.json", catalog],
    ["Unity/Validation/Reference/catalog-cases-0.8.18.json", fixture],
  ]) {
    const target = path.join(root, name),
      output = name.includes("catalog-cases")
        ? "{\n" +
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
          "\n}\n"
        : JSON.stringify(value, null, 2) + "\n";
    if (process.argv.includes("--check")) {
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output)
        throw new Error("Katalog üretimi güncel değil: " + name);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, output);
    }
  }
  console.log(
    `TS ${baseline}: ${catalog.cars.length} araç, ${catalog.parts.length} parça, ${catalog.packages.length} paket, ${catalog.tires.length} lastik; ${fixture.cases.length}+${fixture.levelCases.length} kurulum, ${fixture.rewards.length} ödül.`,
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
