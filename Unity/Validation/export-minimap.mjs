// P5 miniharita: gerçek TS miniHaritaCiz çerçevesi + mmDonustur (ilk kare; genişlik hıza göre).
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const R = createBaselineLoader({ stubs: true }).load("src/cekirdek/rastgele"),
  r = R.mulberry32(240);
let sources;
const cases = [];
for (let c = 0; c < 40; c++) {
  // her durum yeni yükleyici: TS genişlik yumuşatması modül durumunda (ilk kare doğrudan hedef)
  const L = createBaselineLoader({ stubs: true }),
    MM = L.load("src/arayuz/mini-harita");
  sources = L.sources;
  MM.miniHaritaKur({ getContext: () => new Proxy({}, { get: () => () => {} }) });
  const x = (r() - 0.5) * 2000,
    z = (r() - 0.5) * 2000,
    h = r() * 6.2832,
    v = c % 4 == 0 ? 0 : r() * 90;
  MM.miniHaritaCiz(x, z, Math.sin(h), Math.cos(h), v);
  const points = [];
  for (let i = 0; i < 30; i++) {
    const wx = x + (r() - 0.5) * 900,
      wz = z + (r() - 0.5) * 900;
    points.push({ wx, wz, p: MM.mmDonustur(wx, wz) });
  }
  cases.push({ x, z, h, v, points });
}
const output = JSON.stringify({ baseline, sources, cases }) + "\n";
const target = path.join(root, "Unity/Validation/Reference/minimap-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw Error("Miniharita oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(`Miniharita TS: ${cases.length} çerçeve × 30 nokta.`);
