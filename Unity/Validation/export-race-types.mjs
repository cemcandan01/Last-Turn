// TS 0.8.18 yarış türleri oracle'ı: 40 pistin bölge dünyası (Hw/surfW/ipucu + bölge kutusu), su birikintisi çarpışması
// (model.ts carpismalar'ın kendisi), kariyer drift algısı (ortak.ts driftSkoru) ve 15 aracın drift yarışı açı sınırı
// (driftYarisProfili, gerçek startEvent kurulumuyla). Kullanım: node Unity/Validation/export-race-types.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";

export function buildRaceTypes() {
  const L = createBaselineLoader({
    stubs: true,
    extraExports: {
      "src/fizik/yeni/model.ts": ["carpismalar", "noktaDunya"],
      "src/oyun/surus.ts": ["surusKurulumu"],
    },
  });
  const { load } = L;
  const Y = load("src/oyun/yarislar"),
    S = load("src/oyun/surus"),
    P = load("src/dunya/pist"),
    W = load("src/dunya/dunya"),
    O = load("src/fizik/ortak"),
    M = load("src/fizik/yeni/model"),
    A = load("src/fizik/yeni/arac-fizigi"),
    I = load("src/oyun/ilerleme"),
    B = load("src/arayuz/bildirim");
  B.note = () => {};

  // --- 40 pistin bölge dünyası: fizik sırası (4 teker + merkez yüzeyi, sonra yükseklik), kutu dışına taşma dahil ---
  const world = Y.EVENTS.map((e, k) => {
    const R = W.REG[k],
      TR = R.TR;
    let a = (1000 + k * 7919) >>> 0;
    const r = () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0), a / 4294967296);
    const reach = Math.max(R.box[1] - R.box[0], R.box[3] - R.box[2]) * 0.6;
    let s = 0,
      lat = 0;
    P.ipucu.ti = P.nearest(TR, TR.P[0][0], TR.P[0][1], 0, true)[0];
    const rows = [[P.ipucu.ti]];
    for (let n = 0; n < 300; n++) {
      s += 1 + r() * 4;
      lat += (r() - 0.5) * 3 - lat * 0.02;
      if (r() < 0.03) lat = (r() - 0.5) * 2 * reach;
      const b = P.trackAt(TR, TR.open ? s % TR.len : s),
        x = b.x + Math.cos(b.a) * lat,
        z = b.z - Math.sin(b.a) * lat,
        h = b.a + (r() - 0.5);
      const pts = [
        [0.8, 1.3],
        [-0.8, 1.3],
        [0.8, -1.3],
        [-0.8, -1.3],
        [0, 0],
      ].map(([px, pz]) => [x + px * Math.cos(h) + pz * Math.sin(h), z - px * Math.sin(h) + pz * Math.cos(h)]);
      const surf = pts.map(([px, pz]) => W.surfW(px, pz)),
        ti = P.ipucu.ti,
        H = pts.map(([px, pz]) => W.Hw(px, pz));
      rows.push([x, z, h, surf, ti, H]);
    }
    return { key: e.ty + "_" + e.lv, box: R.box, rows };
  });

  // --- su birikintisi: TS carpismalar'ın kendisi, yalnız "water" nesneleriyle ---
  const kurulum = S.surusKurulumu(),
    F = A.aracFizigi(kurulum.car, kurulum),
    water = [];
  for (const [dx, dz, v, count] of [
    [0, 0, 0, 1],
    [2, 1, 5, 1],
    [5.9, 0, 10, 1],
    [6.1, 0, 10, 1],
    [0, 5.95, 30, 1],
    [3, 3, 25, 2],
    [10, 0, 20, 1],
    [1, -1, 45, 1],
  ]) {
    const d = { S: { x: 3200, z: 4100, h: 0.4, vx: 0, vz: 0, vy: 0, w: 0, wet: 0, mud: 0 }, d: {} },
      objs = [],
      cx = {
        kurulum,
        dunya: { H: () => 0, yakin: () => objs, kutu: () => [-1e9, 1e9, -1e9, 1e9], karli: () => false },
        gorselRng: () => 1,
        olay: { puf() {} },
      };
    const Yd = M.yeniBaslat(d, cx),
      T = { x: 0, y: 0, z: 0 };
    M.noktaDunya(Yd, F, 0, 0, 0, T);
    for (let q = 0; q < count; q++) objs.push({ t: "water", x: T.x + dx, z: T.z + dz, r: 6 });
    Yd.vx = v * Math.sin(0.4);
    Yd.vz = v * Math.cos(0.4);
    const before = [Yd.vx, Yd.vz, T.x, T.z];
    M.carpismalar(d, Yd, F, cx, 1 / 60, v);
    water.push({ before, objs, v, after: [Yd.vx, Yd.vz, d.S.wet] });
  }

  // --- kariyer drift algısı (driftSkoru, yaris = false; DR.on yardım kapalı) ---
  const drift = [];
  for (const v of [0, 9.99, 10, 10.01, 18, 40])
    for (const [vl, vt] of [
      [v, 0],
      [0.3 * v, 0.6 * v],
      [-0.5 * v, 0.4 * v],
      [0.9 * v, -0.25 * v],
      [0.5, 0.6],
      [0.2, -0.9],
    ])
      for (const air of [0, 1]) {
        const sim = { S: { air }, DR: { on: false }, D: { t: 0, gap: 0, score: 0 } };
        const act = O.driftSkoru(sim, v, vl, vt, 1 / 60, false);
        drift.push([v, vl, vt, air, act ? 1 : 0, sim.D.beta]);
      }

  // --- drift yarışı açı sınırı: her araç gerçek startEvent kurulumuyla (TS admin kipi yalnız erişim için) ---
  const dp = Y.EVENTS.findIndex((e) => e.ty == "dp" && e.lv == 1);
  const profiles = [];
  I.adminKipi(true);
  for (let car = 0; car < 15; car++) {
    if (!Y.startEvent(dp, car)) throw new Error("drift başlamadı " + car);
    // TS surusAdimi her adımda yerel.cx.kurulum = surusKurulumu() yapar; yarış başındaki gerçek kurulum budur.
    const K = S.surusKurulumu();
    profiles.push({
      car,
      azami: O.driftYarisProfili(K).azami,
      tire: K.tire,
      lock: K.tu.lock,
      diff: K.tu.diff,
      dft: K.as.dft,
    });
    Y.leaveEvent();
  }
  I.adminKipi(false);

  const sources = Object.fromEntries(Object.entries(L.sources).sort(([x], [y]) => x.localeCompare(y)));
  return {
    baseline,
    generator: "Unity/Validation/export-race-types.mjs",
    sources,
    world,
    water,
    drift,
    profiles,
  };
}

export function main() {
  const value = buildRaceTypes(),
    target = path.join(root, "Unity/Validation/Reference/race-types-0.8.18.json"),
    output = JSON.stringify(value) + "\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
      console.error("Güncel değil: race-types-0.8.18.json");
      process.exit(1);
    }
  } else fs.writeFileSync(target, output);
  const surfaces = {};
  for (const w of value.world)
    for (const r of w.rows.slice(1)) for (const s of r[3]) surfaces[s] = (surfaces[s] || 0) + 1;
  console.log(
    `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: ${value.world.length} pist × 300 dünya adımı (yüzey dağılımı ${JSON.stringify(surfaces)}), ` +
      `su ${value.water.length} durum (${value.water.filter((w) => w.after[2] == 1).length} ıslak), drift ${value.drift.length} (${value.drift.filter((d) => d[4]).length} aktif), ` +
      `${value.profiles.length} araç drift profili; kaynak ${Object.keys(value.sources).length} dosya.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
