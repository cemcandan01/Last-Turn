// Beş kaynak skill'in gerçek yürütücüsü; dünya callback'leri yalnız açık test girdilerinden kurulur.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader(),
  B = L.load("src/cekirdek/beceri"),
  DT = 1 / 60;
const copy = (x) => JSON.parse(JSON.stringify(x));
const skill = (id, level = 1, evolution = null, addons = []) => ({
  id,
  seviye: level,
  evrim: evolution,
  eklentiler: addons,
});
const body = (x = 0, z = 0, vz = 25, more = {}) => ({ x, z, h: 0, vx: 0, vz, y: 1, vy: 0, ...more });
const target = (x = 0, z = 20, vz = 22, more = {}) => ({ id: "rakip", ...body(x, z, vz, more) });
const world = (changes = {}) => ({
  oyuncu: body(),
  hedefler: [target()],
  yarista: true,
  zemin: 0,
  ...changes,
});
function bind(w) {
  return {
    ...w,
    baglanti: () => w.link ?? null,
    ...(w.corner ? { kose: () => w.corner } : {}),
    ...(w.sky ? { gokBaglanti: () => w.sky } : {}),
  };
}
const ids = B.BECERILER.map((t) => t.id),
  scenarios = [];
let totalSteps = 0;
const coverage = {
  skills: {},
  effects: {
    playerAcceleration: 0,
    targetAcceleration: 0,
    flight: 0,
    ghost: 0,
    power: 0,
    damage: 0,
    status: 0,
    nearMiss: 0,
    following: 0,
    cuts: 0,
  },
  rejected: 0,
  checkpoints: 0,
};
function run(name, equipped, count, frame, initial = B.beceriDurumuBaslat()) {
  let d = copy(initial),
    previous = [];
  const steps = [];
  let totalDamage = 0,
    maxPower = 1,
    flight = 0,
    ghost = 0,
    status = 0,
    follow = 0,
    near = 0;
  for (let i = 0; i < count; i++) {
    const f = frame(i, d, previous),
      eq = f.equipped ?? equipped,
      w = f.world ?? world(),
      W = bind(w),
      dt = f.dt ?? DT;
    const raw = f.requests ?? [],
      events = [...(f.feedback ? previous : []), ...(f.events ?? [])];
    let observation = null;
    if (f.observe) {
      const o = B.yakinlikGozlemi(d, W, f.observe.engeller ?? [], dt, f.observe.carpti ?? false);
      d = o.d;
      events.push(...o.olaylar);
      observation = o;
    }
    const requests = B.beceriIstekleri(d, eq, W, raw);
    coverage.rejected += raw.filter((id) => !requests.includes(id)).length;
    const helpers = {
      normalized: B.takiliBeceriler(eq),
      flags: B.bayraklar(d, eq),
      requests,
      blockers: Object.fromEntries([...ids, "yok"].map((id) => [id, B.beceriEngeli(d, eq, W, id)])),
      ready: Object.fromEntries([...ids, "yok"].map((id) => [id, B.beceriHazir(d, eq, W, id)])),
      targets: Object.fromEntries([...ids, "yok"].map((id) => [id, B.beceriHedefNoktasi(d, eq, W, id)])),
    };
    const result = B.beceriAdimi(d, eq, W, f.unfiltered ? raw : requests, events, dt);
    d = result.d;
    previous = result.cikti.olaylar;
    const out = result.cikti,
      damages = out.olaylar.filter((e) => e.tur === "HasarVerildi"),
      statuses = out.olaylar.filter((e) => e.tur === "DurumUygulandi");
    totalDamage += damages.reduce((n, e) => n + e.miktar, 0);
    maxPower = Math.max(maxPower, out.guc);
    flight += !!out.ucus;
    ghost += out.hayalet;
    status += statuses.length;
    follow += events.filter((e) => e.tur === "YakinTakip").reduce((n, e) => n + e.dt, 0);
    near += events.filter((e) => e.tur === "NearMiss").length;
    if (Math.hypot(out.oyuncuIvme.x, out.oyuncuIvme.z) > 0) coverage.effects.playerAcceleration++;
    if (Object.values(out.hedefIvme).some((a) => Math.hypot(a.x, a.z) > 0))
      coverage.effects.targetAcceleration++;
    coverage.effects.flight += !!out.ucus;
    coverage.effects.ghost += out.hayalet;
    coverage.effects.power += out.guc > 1;
    coverage.effects.damage += damages.length;
    coverage.effects.status += statuses.length;
    coverage.effects.following += events.filter((e) => e.tur === "YakinTakip").length;
    coverage.effects.nearMiss += events.filter((e) => e.tur === "NearMiss").length;
    coverage.effects.cuts += out.olaylar.length === 64;
    const checkpoint =
      i < 5 || i % 10 === 9 || i === count - 1 || damages.length > 0 || statuses.length > 0 || f.check;
    const row = {
      world: w,
      dt,
      requests: raw,
      events: f.events ?? [],
      feedback: !!f.feedback,
      unfiltered: !!f.unfiltered,
    };
    if (f.equipped) row.equipped = eq;
    if (f.observe) row.observe = f.observe;
    if (checkpoint) {
      row.helpers = copy(helpers);
      row.expected = copy(result);
      if (observation) row.observation = copy(observation);
      coverage.checkpoints++;
    }
    steps.push(row);
    totalSteps++;
  }
  for (const o of equipped) coverage.skills[o.id] = (coverage.skills[o.id] ?? 0) + count;
  scenarios.push({
    name,
    equipped,
    initial: copy(initial),
    steps,
    summary: { totalDamage, maxPower, flight, ghost, status, follow, near },
  });
}
for (const definition of B.BECERILER)
  for (const level of [1, 2, 3])
    for (const evolved of [false, true]) {
      const id = definition.id,
        evolution = evolved ? definition.evrimler[0].id : null;
      const addons = evolved
        ? B.BECERI_EKLENTILERI.filter((e) => B.eklentiUyar(definition, e)).map((e) => e.id)
        : [];
      const n =
        id === "risk-taker" ? 600 : id === "slipstream-engine" ? 140 : id === "flying-dutchman" ? 230 : 100;
      run(
        `${id}/sv${level}/${evolved ? "evrim-eklenti" : "temel"}`,
        [skill(id, level, evolution, addons)],
        n,
        (i) => {
          const w = world({
            hedefler: [
              target(
                evolved && id === "flying-dutchman" ? 1 : 0,
                evolved && id === "grappling-hook" ? -20 : id === "risk-taker" ? 0 : 20,
              ),
            ],
          });
          if (id === "volt-kanat") {
            w.oyuncu = body(0, 0, 25, { y: i < 80 ? 10 : 1, vy: i < 30 ? 2 : 0 });
            w.hedefler = [target(2, 2)];
            w.basili = i < 30 ? ["volt-kanat"] : [];
          }
          if (id === "flying-dutchman") w.hedefler = [target(1, 1)];
          const events =
            id === "risk-taker"
              ? [
                  { tur: "DriftTickQualified", dt: DT, hiz: 20, aci: 0.5 },
                  ...(i > 510
                    ? [{ tur: "HasarVerildi", hedef: "rakip", miktar: 2, hasar: "ates", kaynak: "dis" }]
                    : []),
                ]
              : id === "slipstream-engine" && i < 60
                ? [
                    { tur: "YakinTakip", hedef: "rakip", dt: DT, mesafe: 8 },
                    ...(evolved && i % 20 === 0 ? [{ tur: "NearMiss", hedef: "rakip", hiz: 25 }] : []),
                  ]
                : [];
          return {
            world: w,
            events,
            feedback: id === "risk-taker",
            requests: i === 0 || i === 30 || i === 180 ? [id, id, "yok"] : [],
          };
        },
      );
    }
run(
  "kanca-hedefsiz-kose-gevseme-gerilme-kopma",
  [skill("grappling-hook", 3, null, ["sok-bobini"])],
  100,
  (i) => ({
    world: world({
      hedefler: [],
      oyuncu: body(i > 30 ? 10 : i > 20 ? 2 : 0, 0, 25, { y: i > 80 ? 4 : 1 }),
      corner: i < 10 ? undefined : { p: [8, 12], uc: [8, 12] },
      direksiyon: i % 2 ? 0.5 : -0.5,
      link: [0, 30],
    }),
    requests: [0, 10, 12, 14, 16, 18, 22, 30, 60].includes(i) ? ["grappling-hook"] : [],
    check: [9, 10, 11, 21, 31, 81].includes(i),
  }),
);
run("kanca-gok-sarkac-yukselis-iniş-birak", [skill("grappling-hook", 2)], 100, (i) => ({
  world: world({
    hedefler: [],
    oyuncu: body(0, i > 50 ? 40 : 0, 25, { y: i > 80 ? 1 : 8, vy: i > 50 ? -1 : 3 }),
    sky: { p: [0, 25, 20], uc: [12, 25, 20] },
  }),
  requests: i === 0 ? ["grappling-hook"] : [],
  check: [1, 50, 51, 80, 81].includes(i),
}));
run(
  "kanca-rakip-hedef-onceligi-ve-menzil-kopma",
  [skill("grappling-hook", 1, null, ["sok-bobini"])],
  80,
  (i) => ({
    world: world({
      hedefler: [target(0, i < 20 ? 20 : i < 40 ? 5 : 80)],
      corner: { p: [8, 12], uc: [8, 12] },
      sky: { p: [0, 25, 20], uc: [12, 25, 20] },
    }),
    requests: [0, 30, 50].includes(i) ? ["grappling-hook"] : [],
    check: [19, 20, 39, 40].includes(i),
  }),
);
run("kanca-uc-hak-dolum-seviye-kazanma", [skill("grappling-hook", 3)], 330, (i) => ({
  world: world(),
  requests: [0, 1, 2, 3, 4, 5, 6, 7, 310].includes(i) ? ["grappling-hook"] : [],
  equipped: i > 315 ? [skill("grappling-hook", 1)] : undefined,
  check: [6, 7, 299, 300, 301, 310, 316].includes(i),
}));
run(
  "hayalet-kanca-ve-risk-catisma",
  [
    skill("grappling-hook", 2, null, ["sok-bobini"]),
    skill("risk-taker", 3, null, ["kor-cekirdegi"]),
    skill("flying-dutchman", 3),
  ],
  650,
  (i) => ({
    world: world({ hedefler: [target(0, i > 510 ? 0 : 20)] }),
    requests: [0, 30, 510].includes(i) ? ["grappling-hook", "flying-dutchman"] : [],
    events: [
      { tur: "DriftTickQualified", dt: DT, hiz: 20, aci: 0.5 },
      { tur: "NearMiss", hedef: "rakip", hiz: 25 },
      { tur: "YakinTakip", hedef: "rakip", dt: DT, mesafe: 8 },
    ],
    feedback: true,
  }),
);
run(
  "risk-ates-hasar-addon-tavan",
  [skill("risk-taker", 3, null, ["kor-cekirdegi"]), skill("slipstream-engine", 3, "ruzgar-kirici")],
  620,
  (i) => ({
    world: world({ hedefler: [target(0, 0), { ...target(1, 1), id: "ikinci" }] }),
    events: [
      { tur: "DriftTickQualified", dt: DT, hiz: 20, aci: 0.5 },
      ...(i % 3 === 0 ? [{ tur: "NearMiss", hedef: "rakip", hiz: 25 }] : []),
    ],
    feedback: true,
  }),
);
run(
  "uc-skill-ucus-kanca-hayalet",
  [
    skill("grappling-hook", 3),
    skill("volt-kanat", 3, "firtina-kanadi"),
    skill("flying-dutchman", 2, "lanetli-gecis"),
  ],
  100,
  (i) => ({
    world: world({
      oyuncu: body(0, 0, 50, { y: 10, vy: 5 }),
      hedefler: [target(1, 1)],
      sky: { p: [0, 25, 20], uc: [12, 25, 20] },
      basili: i < 50 ? ["volt-kanat"] : [],
    }),
    requests: i === 0 ? ["grappling-hook", "volt-kanat", "flying-dutchman"] : [],
    check: [1, 49, 50, 51].includes(i),
  }),
);
run(
  "slot-normalize-kayip-evrim-eklenti",
  [
    skill("yok"),
    skill("risk-taker"),
    skill("risk-taker"),
    skill("grappling-hook"),
    skill("volt-kanat"),
    skill("flying-dutchman"),
  ],
  30,
  (i) => ({ equipped: i > 10 ? [] : undefined, world: world(), requests: i === 0 ? ids : [], events: [] }),
);
run("takip-kredi-tukenme-dolum", [skill("slipstream-engine", 3)], 420, (i) => ({
  world: world({ hedefler: [target(0, i < 270 || i > 330 ? 8 : -8, 25)] }),
  observe: { engeller: [], carpti: false },
}));
run("near-miss-bekleme-carpma-yaris-disi", [skill("risk-taker", 1)], 430, (i) => ({
  world: world({ yarista: i < 400, hedefler: [target(i % 20 < 10 ? 2.8 : 8, 0)] }),
  observe: {
    engeller: [{ id: "kaya", x: i % 20 < 10 ? 1.1 : 8, z: 0, r: 1 }],
    carpti: i === 100 || i === 200,
  },
  check: [0, 9, 10, 100, 101, 160, 181, 200, 261, 399, 400].includes(i),
}));
run("durum-hasari-olay-kesme-siniri", [skill("flying-dutchman", 3, "lanetli-gecis")], 4, (i) => ({
  world: world({ hedefler: Array.from({ length: 80 }, (_, j) => ({ ...target(j / 100, 1), id: "r" + j })) }),
  requests: i === 0 ? ["flying-dutchman"] : [],
  check: true,
}));
const ending = B.beceriAdimi(
  B.beceriDurumuBaslat(),
  [skill("flying-dutchman")],
  bind(world()),
  ["flying-dutchman"],
  [],
  DT,
).d;
ending.yerel["flying-dutchman"].kalan = DT / 2;
run(
  "bekleme-sonu-yeniden-etkinlesme",
  [skill("flying-dutchman")],
  650,
  () => ({ world: world(), requests: ["flying-dutchman"] }),
  ending,
);
const followBoundaries = [
  { distance: 3, speed: 25, relative: 3, angle: 0 },
  { distance: 12, speed: 25, relative: 3, angle: 0 },
  { distance: 2.99, speed: 25, relative: 3, angle: 0 },
  { distance: 12.01, speed: 25, relative: 3, angle: 0 },
  { distance: 8, speed: 15, relative: 0, angle: 0 },
  { distance: 8, speed: 15.01, relative: 0, angle: 0 },
  { distance: 8, speed: 25, relative: 8, angle: 0 },
  { distance: 8, speed: 25, relative: 7.99, angle: 0 },
  { distance: 8, speed: 25, relative: 3, angle: 0.35 },
  { distance: 8, speed: 25, relative: 3, angle: 0.349 },
];
run("takip-koni-mesafe-hiz-kesin-sinirlar", [skill("slipstream-engine")], followBoundaries.length, (i) => {
  const b = followBoundaries[i];
  return {
    world: world({
      oyuncu: body(0, 0, b.speed),
      hedefler: [
        target(Math.sin(b.angle) * b.distance, Math.cos(b.angle) * b.distance, b.speed - b.relative),
      ],
    }),
    observe: { engeller: [], carpti: false },
    check: true,
  };
});
for (const dt of [0, -1, 1 / 20, 1 / 30])
  run("dt-siniri-" + dt, [skill("grappling-hook", 2)], 3, () => ({
    world: world(),
    dt,
    requests: ["grappling-hook"],
    check: true,
  }));
const parameters = [];
for (const definition of B.BECERILER)
  for (const level of [-3, 0, 0.5, 1, 2, 3, 4, 99]) {
    const o = skill(definition.id, level);
    parameters.push({ skill: o, parameters: B.parametre(definition, o) });
  }
for (const [key, value] of Object.entries(coverage.effects))
  if (value === 0) throw Error("Oracle etki kapsamı boş: " + key);
const charges = [];
for (const level of [1, 2, 3])
  for (const local of [
    {},
    { sarj: 0 },
    { sarj: 2, sarjUst: 2 },
    { sarj: 0, sarjUst: 1 },
    { sarj: 3, sarjUst: 3 },
  ]) {
    const p = B.parametre(B.GRAPPLING_HOOK, skill("grappling-hook", level));
    charges.push({ local, parameters: p, value: B.sarjSayisi(local, p) });
  }
const bars = [];
for (const definition of B.BECERILER)
  for (const level of [1, 2, 3])
    for (const value of [0, 1, 100]) {
      const local = { deger: value },
        parameters = B.parametre(definition, skill(definition.id, level));
      bars.push({ id: definition.id, local, parameters, value: definition.bar?.(local, parameters) ?? 0 });
    }
const data = {
  baseline,
  sources: L.sources,
  definitions: copy(B.BECERILER),
  addons: copy(B.BECERI_EKLENTILERI),
  parameters,
  charges,
  bars,
  scenarios,
  coverage,
  totalSteps,
};
const output = JSON.stringify(data) + "\n",
  targetFile = path.join(root, "Unity/Validation/Reference/mutant-skills-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(targetFile, "utf8") !== output) throw Error("Mutant skills oracle güncel değil.");
} else fs.writeFileSync(targetFile, output);
console.log(
  `Mutant skill TS: ${scenarios.length} iz, ${totalSteps} adım, ${coverage.checkpoints} tam durum/çıktı noktası; ${JSON.stringify(coverage.effects)}.`,
);
