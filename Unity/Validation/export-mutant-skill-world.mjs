// Gerçek mutant-beceri.ts ve saf yol/şehir sorguları. Görsel/DOM katmanı çalıştırılmaz.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
import { regionTrack } from "./export-tracks.mjs";
const L = createBaselineLoader({ stubs: true });
const M = L.load("src/oyun/mutant-beceri"), P = L.load("src/dunya/pist"), Y = L.load("src/dunya/yollar");
const C = L.load("src/dunya/corak"), S = L.load("src/dunya/sehir-duzen"), definitions = L.load("src/dunya/pist-tanimlari");
const data = { baseline, roads: Y.yolNoktalari(C.EA, C.EB, C.SX), cityRoads: S.sehirYolNoktalari(), city: {
  x: S.SEHIR_X, z: S.SEHIR_Z, half: S.SEHIR_YARI, avenues: S.CADDELER, streets: S.SOKAKLAR,
  avenueHalf: S.CADDE_YARI, streetHalf: S.SOKAK_YARI, avenueSpacing: S.CADDE_ARA, streetSpacing: S.SOKAK_ARA,
  park: S.PARK, centripetal: S.KOSE_MERKEZCIL, cells: [...S.sehirBinalari().hucre.entries()],
} };
const tracks = definitions.TDEF.map((d, i) => ({ key: d.t + "_" + d.lv, TR: regionTrack(P, definitions, i).TR }));
for (const d of S.SOKAK_ROTALARI) { const r = S.rotaNoktalari(d); tracks.push({ key: "sokak_" + d.id, TR: P.mkTrack(r.pts, r.hw, r.acik) }); }
// Küçük/açık/çok geniş daire: kaynak erken dönüşlerini gerçek fonksiyonla örnekle.
const synthetic = [];
for (const [count, radius, open] of [[2, 5, false], [3, 5, true], [7, 10, false], [12, 200, false], [64, 24, false], [64, 24, true]]) {
  // Eşit eğrilikli tam dairede birbirine ULP kadar yakın tepe açılarının farklı indeks seçmesi yerine
  // gerçek pistler gibi eşit olmayan örnek aralıkları kullan; kaynak sorgularının formülü değişmez.
  const points = Array.from({ length: count }, (_, i) => { const angle = i / count * Math.PI * 2 + .015 * Math.sin(i * .71); return [radius * Math.sin(angle), radius * Math.cos(angle)]; });
  const tangents = points.map((_, i) => { const a = points[open ? Math.max(0, i - 1) : (i - 1 + count) % count], b = points[open ? Math.min(count - 1, i + 1) : (i + 1) % count];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz) || 1; return [dx / length, dz / length]; });
  const distances = [0]; for (let i = 1; i < count; i++) distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const length = distances.at(-1) + (open ? 0 : Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]));
  const key = `synthetic_${count}_${radius}_${open}`; const TR = { P: points, T: tangents, S: distances, N: count, len: length, hw: 6, open };
  synthetic.push({ key, geometry: { P: points.flat(), T: tangents.flat(), S: distances, len: length, hw: 6, open } }); tracks.push({ key, TR });
}
const cases = [], targets = [{ id: "rakip", x: 0, z: 22, h: 0, vx: 0, vz: 15, y: 1 }];
const counts = { links: 0, corners: 0, sky: 0, nullLinks: 0, nullCorners: 0, nullSky: 0 };
function sample(key, TR, player, racing, openWorld, ground = 0, held = undefined, steering = .4) {
  const w = M.beceriDunyasiYap(player, targets, TR, racing, openWorld, ground, { basili: held, direksiyon: steering });
  const links = [[0, 65], [18, 65], [50, 30]].map(([min, max]) => ({ min, max, value: w.baglanti(min, max) }));
  const corners = [-1, 0, 1].map(direction => ({ direction, value: w.kose(direction) }));
  const sky = w.gokBaglanti?.() ?? null;
  for (const l of links) counts[l.value ? "links" : "nullLinks"]++;
  for (const c of corners) counts[c.value ? "corners" : "nullCorners"]++;
  counts[sky ? "sky" : "nullSky"]++;
  cases.push({ key, player, targets, racing, openWorld, ground, held: held ?? null, steering, city: M.sehirdeMi(player.x, player.z), hasSky: !!w.gokBaglanti, links, corners, sky });
}
sample("", null, { x: 0, z: 0, h: 0, vx: 0, vz: 0 }, false, false, 4, ["volt-kanat", "grappling-hook"], -.6);
for (const { key, TR } of tracks) for (const fraction of [0, .01, .22, .53, .98]) for (const direction of [-1, 1]) {
  const i = Math.min(TR.N - 1, Math.floor(fraction * TR.N)), heading = Math.atan2(TR.T[i][0], TR.T[i][1]) + (direction < 0 ? Math.PI : 0);
  sample(key, TR, { x: TR.P[i][0], z: TR.P[i][1], h: heading, vx: TR.T[i][0] * 20 * direction, vz: TR.T[i][1] * 20 * direction, y: fraction < .5 ? 0 : 20 }, true, true);
}
for (const [x, z] of [[0, 0], [0, -90], [140, 0], [210, -300], [-40, 350], [450, 450], [900, 900],
  [S.SEHIR_X - 800, 0], [S.SEHIR_X + 800, 0], [S.SEHIR_X, -800], [S.SEHIR_X, 800], [S.SEHIR_X, 0], [S.SEHIR_X + 799.999, 0]])
  for (const open of [false, true]) for (const speed of [0, 3, 3.001, 25])
    sample("", null, { x, z, h: .15, vx: 0, vz: speed }, false, open, 2, undefined, 0);
for (const ax of [0, 2, 4, 6, 8, 11, 13]) for (const iz of [0, 3, 7, 10, 15, 20]) for (const heading of [0, 1.5]) for (const speed of [0, 32]) {
  const x = S.SEHIR_X + S.CADDELER[ax] + 1, z = S.SEHIR_Z + S.SOKAKLAR[iz] - 18;
  sample("", null, { x, z, h: heading, vx: Math.sin(heading) * speed, vz: Math.cos(heading) * speed, y: ax % 3 == 0 ? 120 : iz % 2 ? 22 : 0 }, false, true);
}
// Yol noktası önceliği: açı eşitliğinde uzak olan, düşük hızda burun, >3 m/s'de hareket yönü.
const roadCases = [];
const customRoads = [[0, 20], [0, 40], [1, 50], [10, 20], [30, 0], [0, -40]];
for (const speed of [0, 3, 3.001]) for (const heading of [0, Math.PI / 2]) {
  const player = { x: 0, z: 0, h: heading, vx: speed, vz: 0 };
  roadCases.push({ points: customRoads, player, min: 18, max: 65, value: Y.yolBaglantisi(customRoads, player, 18, 65) });
}
const obstacleSets = [
  [{ t: "solid", x: 2.55, z: -2.55, r: 2 }, { t: "box", x: 1.25, z: -.05, hx: 3, hz: 4 }, { t: "water", x: 0, z: 0, r: 7 }, { t: "bush", x: 0, z: 0, r: 1 }],
  [2.65, -.01, -0, 2.35, 10000.05, -.15].map(x => ({ t: "solid", x, z: x })),
  [{ t: "box", x: 0, z: 0 }, { t: "solid", x: 0, z: 0 }, { t: "box", x: -4, z: 8, hx: 0, hz: 4 }],
];
const obstacles = obstacleSets.map(objects => ({ objects, expected: M.engelListesi({ yakin: () => objects }, 0, 0) }));
const sources = Object.fromEntries(Object.entries(L.sources).sort(([a], [b]) => a.localeCompare(b)));
data.sources = sources;
const fixture = { baseline, sources, synthetic, cases, roadCases, obstacles, counts };
for (const [file, value] of [["Unity/Assets/LastTurn/Resources/mutant-skill-world.json", data], ["Unity/Validation/Reference/mutant-skill-world-0.8.18.json", fixture]]) {
  const target = path.join(root, file), output = JSON.stringify(value) + "\n";
  if (process.argv.includes("--check")) { if (fs.readFileSync(target, "utf8") !== output) throw new Error("Skill dünya kaynağı güncel değil: " + file); }
  else fs.writeFileSync(target, output);
}
if (!counts.links || !counts.corners || !counts.sky || !counts.nullLinks || !counts.nullCorners || !counts.nullSky) throw new Error("Eksik skill dünya dal kapsamı");
console.log(`Mutant skill dünyası TS: ${cases.length} dünya, ${roadCases.length} yol önceliği, ${obstacles.length} engel kümesi; ${JSON.stringify(counts)}.`);
