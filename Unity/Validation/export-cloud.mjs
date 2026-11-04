// P5 bulut sözleşmesi: gerçek TS ilerlemeDegistir/ilerlemeYukle (sürüm ≥ 3), rekorBirlestir ve ozet.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const load = () => {
  const L = createBaselineLoader({ stubs: true, extraExports: { "src/bulut/esitleme.ts": ["ozet"] } });
  return { L, I: L.load("src/oyun/ilerleme"), E: L.load("src/bulut/esitleme"), P: L.load("src/oyun/profil") };
};
const R = load().L.load("src/cekirdek/rastgele"),
  r = R.mulberry32(707),
  pick = (a) => a[Math.floor(r() * a.length)];
const tracks = ["asphalt", "dirt", "drift", "rally", "drag"].flatMap((t) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => t + "_" + i),
);
const progress = () => ({
  surum: 3,
  xp: Math.floor(r() * 5000),
  updatedAt: Math.floor(r() * 1e6),
  kazanilan: Math.floor(r() * 9000),
  yildiz: Object.fromEntries(tracks.filter(() => r() < 0.2).map((k) => [k, 1 + Math.floor(r() * 3)])),
  ekAcik: ["asphalt_3", "arac_2", "dirt_1"].filter(() => r() < 0.5),
  alimlar: Object.fromEntries(
    ["arac_8", "arac_4", "parca_2_turbo-buyuk"]
      .filter(() => r() < 0.5)
      .map((k) => [k, Math.floor(r() * 3000)]),
  ),
});
let sources, keys;
const merges = [];
for (let c = 0; c < 30; c++) {
  const { L, I, E, P } = load();
  sources = L.sources;
  const local = progress(),
    remote = c % 7 == 0 ? { xp: "bozuk", alimlar: { arac_8: -5 }, yildiz: { asphalt_1: "2" } } : progress();
  I.ilerlemeDegistir(local);
  const before = structuredClone(I.ilerlemeVerisi());
  I.ilerlemeYukle(remote, true);
  const after = structuredClone(I.ilerlemeVerisi());
  // zaman damgası: TS kaydet() Date.now ile damgalar (sonuç ≥ şimdi); belirlenimci olmadığından çıktıdan çıkarılır
  delete before.updatedAt;
  delete after.updatedAt;
  const allKeys = [
    ...tracks.map((k) => k.replace("drift_", "drift_")),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => "drift2_" + i),
  ];
  keys = [...allKeys, ...allKeys.map((k) => "kariyer1_" + k)];
  const localRec = {},
    remoteRec = {};
  for (const k of keys) {
    if (r() < 0.3) {
      const v = Math.round(r() * 2000) / 10;
      localRec[k] = v;
      P.saveBest(k, String(v));
    }
    if (r() < 0.4) remoteRec[k] = pick([Math.round(r() * 2000) / 10, 0, -3, "45.5", "x"]);
  }
  remoteRec["bilinmeyen_1"] = 5;
  E.rekorBirlestir(remoteRec);
  merges.push({
    local,
    remote,
    before,
    merged: after,
    localRec,
    remoteRec,
    records: Object.fromEntries(keys.map((k) => [k, P.best(k)])),
  });
}
const { E } = load();
const docs = [
  { xp: 5, updatedAt: 9, oyunSurum: "0.8.18", ekAcik: ["b", "a"], rekor: { z: 1, a: 2 } },
  { rekor: { a: 2, z: 1 }, ekAcik: ["a", "b"], xp: 5, updatedAt: 1, oyunSurum: "0.9" },
  { xp: 6, ekAcik: ["a"], alimlar: { arac_8: 2000 } },
];
const summaries = docs.map((d) => ({ doc: d, ozet: E.ozet(d) }));
const output = JSON.stringify({ baseline, sources, keys, merges, summaries }) + "\n";
const target = path.join(root, "Unity/Validation/Reference/cloud-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw Error("Bulut oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Bulut TS: ${merges.length} ilerleme/rekor birleştirmesi, ${keys.length} rekor anahtarı, ${summaries.length} özet.`,
);
