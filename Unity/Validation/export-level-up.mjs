// TS 0.8.18 seviye atlama kutlaması oracle'ı: ilerleme.ts kilitTablosu/arasindaAcilan + seviye-ui.ts ogeAdi ve
// “Açıldı/Yeni” başlığı, bütün seviye aralıkları için. Kullanım: node Unity/Validation/export-level-up.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true });
const I = L.load("src/oyun/ilerleme"),
  U = L.load("src/arayuz/seviye-ui");
const table = I.kilitTablosu(),
  cases = [];
for (let eski = 1; eski <= 20; eski++)
  for (let yeni = eski + 1; yeni <= 21; yeni++) {
    const acilan = table.filter((k) => k.seviye > eski && k.seviye <= yeni).map((k) => k.oge);
    cases.push({
      eski,
      yeni,
      heading: acilan.some((o) => o.tur == "pist" || I.aracFiyati(o.no).para <= 0) ? "Açıldı" : "Yeni",
      items: acilan.map((o) => ({
        ...o,
        name: U.ogeAdi(o),
        price: o.tur == "arac" ? I.aracFiyati(o.no).para : 0,
      })),
    });
  }
const value = { baseline, generator: "Unity/Validation/export-level-up.mjs", sources: L.sources, cases },
  target = path.join(root, "Unity/Validation/Reference/level-up-0.8.18.json"),
  output = JSON.stringify(value) + "\n";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
    console.error("Güncel değil: level-up-0.8.18.json");
    process.exit(1);
  }
} else fs.writeFileSync(target, output);
console.log(
  `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: ${cases.length} seviye aralığı, ${table.length} kilit.`,
);
