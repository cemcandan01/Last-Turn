// Sabit TS 0.8.18: 40 pist × 3 kişilik çizgi/hız verisi; gerçek pilot ve yarışçı oracle'ı.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
import { regionTrack } from "./export-tracks.mjs";
import { buildMutantOpponents } from "./export-mutant-opponents.mjs";

export function buildOpponents() {
  const L = createBaselineLoader({ stubs: true }),
    P = L.load("src/dunya/pist"),
    defs = L.load("src/dunya/pist-tanimlari"),
    A = L.load("src/yz/pilot"),
    K = L.load("src/yz/kisilik"),
    Y = L.load("src/yz/yarisci");
  const plans = [],
    pilots = [],
    races = [];
  for (let trackIndex = 0; trackIndex < defs.TDEF.length; trackIndex++) {
    const { TR, def } = regionTrack(P, defs, trackIndex),
      key = def.t + "_" + def.lv;
    for (const [personality, person] of Object.entries(K.KISILIKLER)) {
      const seed = 731,
        plan = A.pilotPlani(TR, person, seed),
        c = plan.cizgi;
      plans.push({
        key,
        personality,
        line: Object.fromEntries(
          Object.entries(c).map(([k, v]) => [k, ArrayBuffer.isView(v) ? Array.from(v) : v]),
        ),
        speed: Array.from(plan.hiz),
      });
      if (!["gp_1", "gp_8", "rx_1", "rl_1", "dp_1", "dg_1"].includes(key)) continue;
      const d = A.pilotDurumu(plan, c.x[0], c.z[0]),
        rows = [];
      for (let n = 0; n < 600; n++) {
        const i =
          n < 180
            ? Math.min(c.N - 2, Math.floor(n * 0.6))
            : n < 360
              ? Math.min(c.N - 2, 107)
              : n < 480
                ? Math.min(c.N - 2, 130)
                : Math.min(c.N - 2, Math.floor(n * 0.4));
        const j = (i + 1) % c.N,
          normal = Math.atan2(c.x[j] - c.x[i], c.z[j] - c.z[i]);
        const side = n >= 480 ? c.hw + 3 : 0,
          speed = n < 180 ? 28 : n < 360 ? 0 : n < 480 ? 2 : 11,
          h = normal + (n >= 360 && n < 480 ? Math.PI : 0);
        const a = {
          x: c.x[i] + c.nx[i] * side,
          z: c.z[i] + c.nz[i] * side,
          h,
          vx: Math.sin(h) * speed,
          vz: Math.cos(h) * speed,
          beta: n < 180 ? 0.23 * Math.sin(n * 0.1) : 0,
        };
        const input = A.pilotAdimi(plan, d, a, 1 / 60, n > 5);
        rows.push({ a, started: n > 5, input, state: { ...d } });
      }
      pilots.push({ key, personality, seed, start: [c.x[0], c.z[0]], rows });
    }
    if (["gp_1", "rx_1", "rl_1", "dg_1"].includes(key)) {
      const world = {
        H: () => 0,
        surf: () => 1,
        yakin: () => [],
        kutu: () => [-1e9, 1e9, -1e9, 1e9],
        kerb: () => 0,
        havaTutusu: () => 1,
        karli: () => false,
        yolTuru: () => null,
      };
      const setup = Y.rakipKurulumu(10, def.t, "real"),
        start = {
          x: TR.P[0][0] + TR.T[0][1] * 4.5,
          z: TR.P[0][1] - TR.T[0][0] * 4.5,
          h: Math.atan2(TR.T[0][0], TR.T[0][1]),
        };
      const racer = Y.yarisciYap(world, setup, TR, 3, "deneyimli", 731, start, def.t == "dg" ? 1 : 4),
        rows = [];
      for (let n = 0; n < 1200; n++) {
        const input = Y.yarisciAdimi(racer, n >= 6);
        const s = racer.ornek.sim.S;
        if (n % 10 == 9)
          rows.push({
            step: n + 1,
            input,
            body: [s.x, s.z, s.h, s.vx, s.vz],
            pilot: { ...racer.pilot },
            lap: racer.tur,
            armed: racer.kurulu,
            hint: racer.ti,
            time: racer.t,
            finish: racer.bitis,
            returns: racer.pisteDonus,
          });
      }
      races.push({ key, personality: "deneyimli", seed: 731, car: 10, level: "real", laps: 3, start, rows });
    }
  }
  const sources = Object.fromEntries(Object.entries(L.sources).sort(([a], [b]) => a.localeCompare(b)));
  // Eski 120 plan ve fixture aynen kalır; şehir kaynakları ayrı manifesttedir.
  const streets = buildMutantOpponents();
  return {
    catalog: {
      baseline,
      generator: "Unity/Validation/export-opponents.mjs",
      sources,
      personalities: K.KISILIKLER,
      plans: [...plans, ...streets.plans],
      streetSources: streets.sources,
    },
    fixture: { baseline, sources, pilots, races },
  };
}
export function main() {
  const { catalog, fixture } = buildOpponents();
  for (const [name, value] of [
    ["Unity/Assets/LastTurn/Resources/opponent-catalog.json", catalog],
    ["Unity/Validation/Reference/opponent-0.8.18.json", fixture],
  ]) {
    const target = path.join(root, name),
      output = JSON.stringify(value) + "\n";
    if (process.argv.includes("--check")) {
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output)
        throw new Error("Rakip oracle güncel değil: " + name);
    } else fs.writeFileSync(target, output);
  }
  console.log(
    `Rakip TS: ${catalog.plans.length} plan, ${fixture.pilots.length}×600 pilot algı adımı, ${fixture.races.length}×1200 gerçek fizik adımı.`,
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
