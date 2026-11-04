// P5 hava/günün saati: gerçek TS REG temaları, condOf, havaTutusu, TODS/WXS ve Unity bölge anahtarı eşlemesi.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true }),
  B = L.load("src/dunya/bolgeler"),
  T = L.load("src/dunya/temalar"),
  O = L.load("src/cizim/ortam"),
  P = L.load("src/dunya/pist-tanimlari");
const regions = B.REG.map((r, i) => ({
  index: i,
  key: i < 40 ? r.t + "_" + P.TDEF[i].lv : i === 40 ? "park" : "city",
  theme: r.th || "day",
}));
const themes = [...new Set(["day", ...regions.map((r) => r.theme)])];
const output =
  JSON.stringify({
    baseline,
    sources: L.sources,
    regions,
    tods: O.TODS,
    wxs: O.WXS,
    conds: Object.fromEntries(themes.map((t) => [t, O.condOf(t)])),
    grips: Object.fromEntries(
      themes.map((t) => [t, Object.fromEntries(["sun", "rain", "snow"].map((w) => [w, T.havaTutusu(t, w)]))]),
    ),
  }) + "\n";
const target = path.join(root, "Unity/Validation/Reference/conditions-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw Error("Hava oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(`Hava TS: ${regions.length} bölge teması, ${themes.length} tema × 3 hava tutuşu.`);
