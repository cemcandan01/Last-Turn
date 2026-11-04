// Gerçek TS işaret gövdesi tek başına yürütülür; DOM/oyun modülü taklit edilmez.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const loader = createBaselineLoader();
const source = loader.read("src/oyun/mutant.ts");
const constants = source.match(/const ISARET_R = 10,[\s\S]*?ISARET_SURE = 0\.5;/)?.[0];
const guard = source.match(/if \(yarista \|\| k\.faz != "surus"\) return;/)?.[0];
const start = source.indexOf("  // en yakın işaret\n");
const end = source.indexOf("\n}\n\n/** yarış bitti", start);
if (!constants || !guard || start < 0 || end < 0) throw new Error("TS işaret bloğu bulunamadı");
const block = source.slice(start, end);
const code = ts.transpileModule(`${constants}\nconst k=mutant.kosu;\nif (!k) return;\n${guard}\n${block}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const step = new Function("mutant", "x", "z", "v", "dt", "yarista", "atolyeYeri", "bossYeri", code);
const clone = (x) => JSON.parse(JSON.stringify(x));
const cases = [];
const point = (id, x = 0, z = 0, used = false) => ({ id, x, z, used });
const input = (more) => ({
  hasRun: true,
  phase: "surus",
  racing: false,
  x: 0,
  z: 0,
  v: 0,
  events: [],
  chests: [],
  workshop: [100, 100],
  boss: [200, 200],
  ...more,
});
function scenario(name, initial, steps) {
  const state = { icinde: initial.inside, kapali: initial.closed, bekle: initial.wait, kosu: null, ui: null };
  const rows = steps.map(([dt, e]) => {
    let event = null;
    state.kosu = e.hasRun
      ? {
          faz: e.phase,
          etkinlikler: e.events.map((p) => ({ ...p, yapildi: p.used })),
          sandiklar: e.chests.map((p) => ({ ...p, acildi: p.used })),
        }
      : null;
    state.ui = { isaret: (marker) => (event = marker) };
    step(
      state,
      e.x,
      e.z,
      e.v,
      dt,
      e.racing,
      () => e.workshop,
      () => e.boss,
    );
    return { dt, input: e, event, state: { inside: state.icinde, closed: state.kapali, wait: state.bekle } };
  });
  cases.push({ name, initial, rows });
}
const fresh = { inside: "", closed: "", wait: 0 };
const event = input({ events: [point(7)] });
scenario("bekle-hiz-esigi-kapat-cik-yeniden-gir", fresh, [
  [0.2, event],
  [2, input({ ...event, v: 5.001 })],
  [0.3, input({ ...event, v: 5 })],
  [10, event],
  [0.1, input({ ...event, x: 10 })],
  [0.5, event],
]);
scenario("mesafe-kati-sinir-ve-cember", fresh, [
  [1, input({ ...event, x: 6, z: 8 })],
  [0.25, input({ ...event, x: 5.99, z: 8 })],
  [0.25, input({ ...event, x: 5.99, z: 8 })],
]);
scenario("oyun-yok-yaris-ve-faz-durumu-dondurur", { inside: "e7", closed: "", wait: 0.25 }, [
  [10, input({ ...event, hasRun: false, x: 50 })],
  [10, input({ ...event, racing: true, x: 50 })],
  [10, input({ ...event, phase: "boss", x: 50 })],
  [10, input({ ...event, phase: "secim", x: 50 })],
  [10, input({ ...event, phase: "bitti", x: 50 })],
  [0.25, event],
]);
scenario("baslangic-atolyesi-kapali", { inside: "a", closed: "a", wait: 0 }, [
  [1, input({ workshop: [0, 0] })],
  [0.1, input({ workshop: [0, 0], x: 20 })],
  [0.5, input({ workshop: [0, 0] })],
]);
scenario("cakis-sirasi-son-etkinlik-sandik-atolye-boss", fresh, [
  [0.5, input({ events: [point(1, 0), point(2, 8)] })],
  [0.5, input({ events: [point(1)], chests: [point(3), point(4, 8)] })],
  [0.5, input({ events: [point(1)], chests: [point(3)], workshop: [8, 0] })],
  [0.5, input({ events: [point(1)], chests: [point(3)], workshop: [0, 0], boss: [9, 0] })],
]);
scenario("kullanilmis-isaret-atlanir-kaybolan-isaret-cikis", fresh, [
  [0.25, input({ events: [point(1)], chests: [point(2, 0, 0, true)] })],
  [0.25, input({ events: [point(1)], chests: [point(2, 0, 0, true)] })],
  [0.5, input({ events: [point(1, 0, 0, true)] })],
  [0.5, input({ events: [point(1, 0, 0, true)], chests: [point(2)] })],
]);
scenario("isaret-degisince-bekleme-sifirlanir", fresh, [
  [0.4, event],
  [0.2, input({ chests: [point(7)] })],
  [0.2, event],
  [0.3, event],
]);
const data = {
  baseline,
  sources: loader.sources,
  scope:
    "mutantAdimi işaret bloğu; atolyeYeri/bossYeri koordinatları girdidir, hasar/zaman/skill bloğu kapsam dışıdır",
  cases,
};
const target = path.join(root, "Unity/Validation/Reference/mutant-markers-0.8.18.json");
const output = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw new Error("Mutant işaret oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Mutant işaret TS: ${cases.length} senaryo, ${cases.reduce((n, c) => n + c.rows.length, 0)} adım; gerçek kaynak bloğu.`,
);
