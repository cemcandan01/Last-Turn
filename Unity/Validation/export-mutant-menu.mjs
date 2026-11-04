// Başlangıç araçları ve seçim etiketleri gerçek UI bloklarıdır; DOM oluşturulmaz.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true });
const K = L.load("src/oyun/mutant-kosu"),
  B = L.load("src/cekirdek/beceri");
const cars = L.load("src/arac/araclar").CARS;
const parts = L.load("src/arac/parcalar");
const economy = L.load("src/oyun/ekonomi");
const { mulberry32 } = L.load("src/cekirdek/rastgele");
L.load("src/oyun/yarislar");
const tracks = L.load("src/oyun/mutant").mutantPistleri();
const events = L.load("src/oyun/yarislar").TUM_ETKINLIKLER;
const levels = L.load("src/dunya/pist-tanimlari").SEVIYELER;
const source = L.read("src/arayuz/mutant-ui.ts");
const compile = (code) =>
  ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
const start = source.indexOf("function basla() {");
const startEnd = source.indexOf("  const devDugme =", start);
const block = source.slice(start + "function basla() {".length, startEnd);
if (start < 0 || startEnd < 0 || !block.includes("BASLANGIC_ARACLARI"))
  throw new Error("Başlangıç araç bloğu bulunamadı");
const drawCars = new Function(
  "mutant",
  "mulberry32",
  "BASLANGIC_ARACLARI",
  "CARS",
  compile(block + "\nreturn araclar;"),
);
const choiceStart = source.indexOf("function secenekKarti(");
const choiceEnd = source.indexOf("\n}\n\nfunction pasifSayfasi", choiceStart);
if (choiceStart < 0 || choiceEnd < 0) throw new Error("Seçim kartı bloğu bulunamadı");
const choiceCode = source.slice(choiceStart, choiceEnd + 2);
const choice = new Function(
  "mutant",
  "secenekTuru",
  "pasifBul",
  "beceriBul",
  "beceriEklentisiBul",
  "id",
  compile(choiceCode + "\nreturn secenekKarti(id);"),
);
const timeCode = source.match(/const sure = \(s: number\) => [^;]+;/)?.[0];
if (!timeCode) throw new Error("Süre biçimi bulunamadı");
const time = new Function("s", compile(timeCode + "\nreturn sure(s);"));
const titleStart = source.indexOf("const TUR:");
const titleEnd = source.indexOf("const etkinlikRengi", titleStart);
if (titleStart < 0 || titleEnd < 0) throw new Error("Etkinlik başlık tablosu bulunamadı");
const titles = new Function(compile(source.slice(titleStart, titleEnd) + "\nreturn { TUR, SOKAK_AD };"))();
const clean = (x) => JSON.parse(JSON.stringify(x));
const initialCars = [];
for (const seed of [0, 1, 7, 42, 777, 0x80000000, 0xffffffff])
  for (const test of [false, true])
    initialCars.push({
      seed,
      test,
      cars: drawCars({ kosu: { tohum: seed, test } }, mulberry32, economy.BASLANGIC_ARACLARI, cars),
    });
const choices = [];
function card(id, skills = []) {
  choices.push({
    id,
    skills,
    expected: choice(
      { kosu: { beceriler: skills } },
      K.secenekTuru,
      K.pasifBul,
      B.beceriBul,
      B.beceriEklentisiBul,
      id,
    ),
  });
}
for (const p of [...K.PASIFLER, ...K.EKLENTILER]) card(p.id);
for (const skill of B.BECERILER) {
  card("b:" + skill.id);
  for (const level of [1, 2])
    card("y:" + skill.id, [{ id: skill.id, seviye: level, evrim: null, eklentiler: [] }]);
  for (const v of skill.evrimler)
    card("v:" + skill.id + ":" + v.id, [{ id: skill.id, seviye: 3, evrim: null, eklentiler: [] }]);
  for (const addon of B.BECERI_EKLENTILERI)
    if (B.eklentiUyar(skill, addon))
      card("e:" + addon.id + ":" + skill.id, [{ id: skill.id, seviye: 1, evrim: null, eklentiler: [] }]);
}
const states = [];
function save(k, car) {
  const skillName = (skill) => {
    const definition = B.beceriBul(skill.id),
      evolution = skill.evrim && definition.evrimler.find((v) => v.id === skill.evrim);
    return (
      definition.ad +
      " Sv" +
      skill.seviye +
      (evolution ? " · " + evolution.ad : "") +
      (skill.eklentiler.length
        ? " (" + skill.eklentiler.map((a) => B.beceriEklentisiBul(a).ad).join(", ") + ")"
        : "")
    );
  };
  const bossIndex = K.bossPisti(k, tracks);
  const expected = {
    phase: k.faz,
    region: k.bolge,
    level: k.seviye,
    test: k.test,
    finished: k.faz === "bitti",
    wrecked: k.pert,
    defeatedBosses: k.yenilenBoss,
    startingCarsCards: drawCars({ kosu: k }, mulberry32, economy.BASLANGIC_ARACLARI, cars).map((id) => ({
      id,
      name: cars[id].n,
      hp: cars[id].hp,
    })),
    ownedSkills: k.beceriler.map((s) => {
      const t = B.beceriBul(s.id),
        v = s.evrim && t.evrimler.find((q) => q.id === s.evrim);
      return { id: s.id, name: t.ad + " Sv" + s.seviye + (v ? " · " + v.ad : "") };
    }),
    remaining: k.kalan,
    timer: time(k.kalan),
    body: k.govde,
    money: k.para,
    xp: k.xp,
    nextLevelXp: K.seviyeXp(k.seviye + 1),
    carName: car < 0 ? "" : cars[car].n,
    bossName: k.boss.ad,
    bossDescription: k.boss.d,
    bossWeakness: k.boss.zayif,
    bossType: k.boss.ty,
    bossAbilities: k.boss.yetenekler,
    bossTrackIndex: bossIndex,
    bossTarget: K.bossHedefi(k, tracks[bossIndex]),
    repairCost: K.tamirBedeli(k),
    refreshCost: K.STOK_YENILE,
    canRefresh: k.para >= K.STOK_YENILE,
    showRepair: k.govde < K.GOVDE.tam,
    canRepair: k.govde < K.GOVDE.tam && k.para >= K.GOVDE.tamirFiyati,
    powerLossPercent: Math.round(K.GOVDE.gucKaybi * (100 - k.govde)),
    choices: k.secenekler.map((id) => ({
      id,
      value: choice({ kosu: k }, K.secenekTuru, K.pasifBul, B.beceriBul, B.beceriEklentisiBul, id),
    })),
    passiveNames: k.pasifler.map((id) => K.pasifBul(id).ad),
    installedPartNames: k.parcalar.map((id) => parts.PARCALAR.find((p) => p.id === id).n),
    skillNames: k.beceriler.map(skillName),
    stock: k.stok.map((id) => {
      const p = parts.PARCALAR.find((p) => p.id === id),
        price = K.parcaFiyati(k, p.sv, id);
      return {
        id,
        name: p.n,
        description: p.d,
        category: parts.KATEGORILER.find((c) => c[0] === p.kat)[1],
        price,
        canBuy: k.para >= price,
      };
    }),
    events: k.etkinlikler.map((e) => ({
      id: e.id,
      trackIndex: e.i,
      name: events[e.i].n,
      type: e.ty,
      title: e.rakip ? "Düello" : e.sokak ? titles.SOKAK_AD[e.sokak] : titles.TUR[e.ty][0],
      street: e.sokak ?? "",
      levelName: levels[e.sev - 1].n,
      x: e.x,
      z: e.z,
      done: e.yapildi,
      duel: !!e.rakip || e.sokak === "kovala",
      risks: K.RISKLER.slice(
        0,
        e.rakip || e.sokak === "kovala" ? K.DUELLO.kisilikler.length : K.RISKLER.length,
      ).map((r, i) => {
        const reward = K.ETKINLIK_ODULU(e.sev);
        return {
          risk: i,
          name: r.ad,
          target: e.rakip || e.sokak === "kovala" ? 0 : K.etkinlikHedefi(tracks[e.i], i).limit,
          xp: Math.round(reward.xp * r.odul),
          money: Math.round(reward.para * r.odul),
          penalty: r.ceza,
          consolation: Math.round(reward.para * r.kacirma),
        };
      }),
    })),
    chests: k.sandiklar.map((q) => {
      const offer = q.secenekler[0] ?? "",
        definition = offer ? K.sandikOduluBul(offer) : null,
        curse = q.lanet ? K.LANETLER[q.lanet] : null;
      return {
        id: q.id,
        title: q.lanetli ? "Lanetli sandık" : "Gizli sandık",
        offer,
        name: definition?.ad ?? "",
        description: definition?.d ?? "",
        curseName: curse?.ad ?? "",
        curseDescription: curse?.d ?? "",
        opened: q.acildi,
        inspected: q.incelendi,
        cursed: q.lanetli,
        x: q.x,
        z: q.z,
      };
    }),
  };
  const { rng, ...state } = k;
  states.push({ seed: k.tohum, test: k.test, car, state: clean(state), expected: clean(expected) });
}
const run = K.kosuBaslat(42, tracks);
save(run, -1);
K.pasifSec(run, run.secenekler[0]);
for (const chest of run.sandiklar) K.sandikTeklifi(run, chest.id);
for (const money of [2, 3, 39, 40, 150, 1000]) {
  run.govde = 52.5;
  run.para = money;
  run.pasifler = ["tuccar", "tuccar"];
  save(run, 0);
}
run.beceriler = B.BECERILER.slice(0, 3).map((s) => ({
  id: s.id,
  seviye: 3,
  eklentiler: [],
  evrim: s.evrimler[0]?.id ?? null,
}));
run.govde = 100;
run.kalan = 59.99;
save(run, cars.length - 1);
K.bossaGir(run);
K.bossBitti(run, true, tracks);
save(run, 0);
const output =
  JSON.stringify({
    baseline,
    sources: L.sources,
    initialCars,
    choices,
    states,
    times: [0, 0.5, 59.99, 60, 90, 900].map((s) => ({ seconds: s, text: time(s) })),
  }) + "\n";
const target = path.join(root, "Unity/Validation/Reference/mutant-menu-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw new Error("Mutant menü oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Mutant menü TS: ${initialCars.length} başlangıç, ${choices.length} seçim kartı, ${states.length} görünüm durumu; gerçek UI araç/seçim/süre blokları.`,
);
