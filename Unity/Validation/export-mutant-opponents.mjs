// TS 0.8.18 şehir rotaları: gerçek çizgi/pilot ve oyun/rakip.ts Mutant kurulum bloğu.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";

export function buildMutantOpponents() {
  const L = createBaselineLoader({ stubs: true });
  const P = L.load("src/dunya/pist"), SD = L.load("src/dunya/sehir-duzen"), A = L.load("src/yz/pilot");
  const K = L.load("src/yz/kisilik"), Y = L.load("src/yz/yarisci"), M = L.load("src/oyun/mutant-kosu");
  const parts = L.load("src/arac/parcalar"), presets = L.load("src/fizik/veriler").PRESETS;
  const source = L.read("src/oyun/rakip.ts");
  const setupStart = source.indexOf("  const kur = rakipKurulumu(");
  const setupEnd = source.indexOf("  rakip.tabanHp =", setupStart);
  if (setupStart < 0 || setupEnd < 0) throw new Error("Kaynak Mutant rakip kurulum bloğu yok");
  const setupCode = ts.transpileModule(source.slice(setupStart, setupEnd) + "\nreturn kur;", {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const configure = new Function("r", "EV", "kurulum", "set", "rakipKurulumu", "parcaBul", "parcaliKurulum", "PRESETS", "kosuAraci", "toprakDengesi", setupCode);
  const setup = (car, ids, passives, type, level = "real") => configure({ arac: car, parca: ids, pasif: passives }, { ty: type }, { lk: level }, { ss: 1, sm: 1 },
    Y.rakipKurulumu, parts.parcaBul, parts.parcaliKurulum, presets, M.kosuAraci, M.toprakDengesi);
  const plans = [], pilots = [], races = [], setups = [];
  const builds = [[], ...parts.PAKETLER.map(p => p.parcalar), ...parts.PAKETLER.map(p => p.parcalar.filter(id => parts.parcaBul(id).e.lastik == null))];
  for (const car of [0, 10, 11, 12, 14]) for (const ids of builds) for (const passives of [[], ["guc", "asfalt"], ["toprak", "hafif", "camtop"]]) {
    const type = "gp", expected = setup(car, ids, passives, type);
    setups.push({ car, ids, passives, type, level: "real", expected });
  }
  const pickedKinds = new Set();
  for (let routeIndex = 0; routeIndex < SD.SOKAK_ROTALARI.length; routeIndex++) {
    const route = SD.SOKAK_ROTALARI[routeIndex], points = SD.rotaNoktalari(route);
    const TR = P.mkTrack(points.pts, points.hw, points.acik), key = "sokak_" + route.id;
    for (const [personality, person] of Object.entries(K.KISILIKLER)) {
      const seed = 731, plan = A.pilotPlani(TR, person, seed), line = plan.cizgi;
      plans.push({ key, personality, line: Object.fromEntries(Object.entries(line).map(([k, v]) => [k, ArrayBuffer.isView(v) ? Array.from(v) : v])), speed: Array.from(plan.hiz) });
      const pilot = A.pilotDurumu(plan, line.x[0], line.z[0]), rows = [];
      for (let n = 0; n < 120; n++) {
        const i = Math.min(line.N - 2, Math.floor(n * (line.N - 2) / 119)), j = (i + 1) % line.N;
        const course = Math.atan2(line.x[j] - line.x[i], line.z[j] - line.z[i]);
        // Tam ±π eşitliği Math.atan2/sin kitaplıklarının ULP farkında iki eşdeğer dönüş yönüne ayrılabilir.
        // Ters yön dalını sınırdan 0,17 rad içeride ölç; kaynak pilot formülleri değişmez.
        const offset = n >= 90 ? line.hw + 3 : 0, heading = course + (n >= 60 && n < 90 ? Math.PI - .17 : 0), speed = n < 40 ? 25 : n < 60 ? 0 : n < 90 ? 2 : 11;
        const perception = { x: line.x[i] + line.nx[i] * offset, z: line.z[i] + line.nz[i] * offset, h: heading,
          vx: Math.sin(heading) * speed, vz: Math.cos(heading) * speed, beta: n < 40 ? .23 * Math.sin(n * .1) : 0 };
        const input = A.pilotAdimi(plan, pilot, perception, 1 / 60, n > 5);
        rows.push({ a: perception, started: n > 5, input, state: { ...pilot } });
      }
      pilots.push({ key, routeIndex, personality, seed, start: [line.x[0], line.z[0]], rows });
    }
    if (pickedKinds.has(route.tur)) continue;
    pickedKinds.add(route.tur);
    const type = points.acik ? "rl" : "gp", car = 10, ids = [], passives = ["guc", "asfalt"], personality = "deneyimli", seed = 731;
    const start = { x: TR.P[0][0] + TR.T[0][1] * 4.5, z: TR.P[0][1] - TR.T[0][0] * 4.5, h: Math.atan2(TR.T[0][0], TR.T[0][1]) };
    const laps = SD.sokakTurSayisi(route, TR.len);
    const world = { H: () => 0, surf: () => 1, yakin: () => [], kutu: () => [-1e9, 1e9, -1e9, 1e9], kerb: () => 0, havaTutusu: () => 1, karli: () => false, yolTuru: () => null };
    const racer = Y.yarisciYap(world, setup(car, ids, passives, type), TR, laps, personality, seed, start, 4), rows = [];
    for (let n = 0; n < 600; n++) {
      const input = Y.yarisciAdimi(racer, n >= 6), state = racer.ornek.sim.S;
      if (n % 10 == 9) rows.push({ step: n + 1, input, body: [state.x, state.z, state.h, state.vx, state.vz], pilot: { ...racer.pilot },
        lap: racer.tur, armed: racer.kurulu, hint: racer.ti, time: racer.t, finish: racer.bitis, returns: racer.pisteDonus });
    }
    races.push({ key, routeIndex, type, car, ids, passives, level: "real", personality, seed, start, laps, rows });
  }
  const sources = Object.fromEntries(Object.entries(L.sources).sort(([a], [b]) => a.localeCompare(b)));
  return { plans, sources, fixture: { baseline, sources, pilots, races, setups } };
}

export function main() {
  const { fixture } = buildMutantOpponents();
  const target = path.join(root, "Unity/Validation/Reference/mutant-opponents-0.8.18.json"), output = JSON.stringify(fixture) + "\n";
  if (process.argv.includes("--check")) { if (fs.readFileSync(target, "utf8") !== output) throw new Error("Mutant rakip oracle güncel değil"); }
  else fs.writeFileSync(target, output);
  console.log(`Mutant rakip TS: 27 sokak planı; ${fixture.pilots.length}×120 pilot, ${fixture.races.length}×600 gerçek fizik, ${fixture.setups.length} kaynak Mutant kurulumu.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
