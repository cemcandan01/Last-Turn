// Gerçek TS bölge kurucuları çalışır; görsel API taklit, colAdd/RNG ve fizik verisi gerçektir.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({
  stubs: true,
  extraExports: { "src/dunya/corak.ts": ["HILLS"], "src/dunya/bolgeler.ts": ["mkReg"] },
});
const B = L.load("src/dunya/bolgeler"),
  W = L.load("src/dunya/dunya"),
  K = L.load("src/dunya/kurucu"),
  C = L.load("src/dunya/corak"),
  R = L.load("src/dunya/yollar");
const SD = L.load("src/dunya/sehir-duzen");
// Hücreleri sonradan gezmek ekleme sırasını bozabilir: aynı TS ekle çağrısını gözlemle.
let inserted = [],
  originals = [],
  cones = [];
const queries = [];
const add = W.dunya.cols.ekle.bind(W.dunya.cols);
W.dunya.cols.ekle = (o) => {
  originals.push(o);
  inserted.push({ ...o });
  add(o);
};
const cone = K.cone;
K.cone = (x, z) => {
  cones.push({ x, z });
  return cone(x, z);
};
const objects = () => inserted;
function querySamples(key) {
  const points = originals
    .filter((_, i) => i % Math.max(1, Math.floor(originals.length / 12)) === 0)
    .slice(0, 12)
    .map((o) => ({ x: o.x, z: o.z }));
  queries.push({
    key,
    points: points.map((p) => ({
      ...p,
      indices: Array.from(W.dunya.cols.yakin(p.x, p.z)).map((o) => originals.indexOf(o)),
    })),
  });
}
W.loadWorld();
const regions = [
  { key: "hub", name: "Çorak Topraklar", bounds: W.HUBB, teleports: C.TELEW, objects: objects(), cones },
];
querySamples("hub");
for (const [i, r] of B.REG.entries()) {
  inserted = [];
  originals = [];
  cones = [];
  W.dunya.cols.temizle();
  W.ensureBuilt(r);
  regions.push({
    key: i < 40 ? r.t + "_" + L.load("src/dunya/pist-tanimlari").TDEF[i].lv : i === 40 ? "park" : "city",
    name: r.n,
    bounds: r.box,
    teleports: r.tele ?? [],
    objects: objects(),
    cones,
  });
  querySamples(regions.at(-1).key);
}
const samples = regions.map((r, i) => {
  L.load("src/dunya/pist").ipucu.ti = 0;
  const region = i === 0 ? null : B.REG[i - 1];
  const [a, b, c, d] = r.bounds;
  const points = [];
  for (let n = 0; n < 60; n++) {
    const x = a + (b - a) * (((n * 17) % 61) / 61),
      z = c + (d - c) * (((n * 23) % 67) / 67);
    points.push([x, z, W.Hw(x, z), W.surfW(x, z)]);
  }
  return { key: r.key, points };
});
const streets = SD.SOKAK_ROTALARI.map((def) => {
  const r = SD.rotaNoktalari(def),
    g = L.load("src/dunya/pist").mkTrack(r.pts, r.hw, r.acik);
  return {
    def,
    open: r.acik,
    laps: SD.sokakTurSayisi(def, g.len),
    stars: SD.sokakYildizlari(def),
    geometry: { P: g.P.flat(), T: g.T.flat(), S: g.S, N: g.N, len: g.len, hw: g.hw },
  };
});
const data = {
  baseline,
  sources: L.sources,
  hills: C.HILLS,
  roads: R.YOLLAR,
  roadHalf: R.YOL_YARI,
  city: {
    x: SD.SEHIR_X,
    z: SD.SEHIR_Z,
    half: SD.SEHIR_YARI,
    avenues: SD.CADDELER,
    streets: SD.SOKAKLAR,
    avenueSpacing: SD.CADDE_ARA,
    streetSpacing: SD.SOKAK_ARA,
    park: SD.PARK,
    path: SD.PARK_YOLU,
    lake: SD.GOL,
    heightCells: [...SD.sehirBinalari().hucre.entries()],
    routes: streets,
  },
  regions,
};
const output = JSON.stringify(data) + "\n",
  file = path.join(root, "Unity/Assets/LastTurn/Resources/world-catalog.json");
const reference = path.join(root, "Unity/Validation/Reference/world-0.8.18.json"),
  sampleOutput = JSON.stringify({ baseline, samples, queries }) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(file, "utf8") !== output || fs.readFileSync(reference, "utf8") !== sampleOutput)
    throw new Error("Dünya kataloğu veya TS örnekleri değişti");
} else {
  fs.writeFileSync(file, output);
  fs.writeFileSync(reference, sampleOutput);
}
console.log(
  `TS dünya: ${regions.length} bölge, ${regions.reduce((s, r) => s + r.objects.length, 0)} fiziksel nesne.`,
);
