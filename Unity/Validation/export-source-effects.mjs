// Gerçek TS gövdeleri tek başına yürütülür: mutant.ts beceriEfektDurumu/nitroAcik ve mutant-ui.ts isaretleriGuncelle
// (isaretler.ts renkYazisi ile). Çizim modülü/DOM taklit edilmez; yalnız işaret listesi ve efekt durumu kaydedilir.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const loader = createBaselineLoader();
const js = (code) =>
  ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
const between = (source, start, end) => {
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error("TS bloğu bulunamadı: " + start);
  return source.slice(a, b);
};
const mutant = loader.read("src/oyun/mutant.ts"),
  ui = loader.read("src/arayuz/mutant-ui.ts"),
  marks = loader.read("src/cizim/isaretler.ts"),
  skill = loader.read("src/cekirdek/beceri.ts");
const sarkac = skill.match(/export const SARKAC = "([^"]+)";/)?.[1];
if (!sarkac) throw new Error("SARKAC yok");
const effectBody =
  between(mutant, "export function beceriEfektDurumu() {", "\n}\n").replace("export ", "") +
  "\n}\n" +
  between(mutant, "export const nitroAcik =", ";\n").replace("export ", "") +
  ";\nreturn { durum: beceriEfektDurumu(), nitro: nitroAcik() };";
const effect = new Function("mutant", "SARKAC", js(effectBody));
const colors =
  between(ui, "const TUR: Record<YarisTuru, [string, number, string]> = {", "\n\n/** Uzmanlığı") + "\n";
const update = between(ui, "function isaretleriGuncelle() {", "\n}\n") + "\n}\n";
const label = between(marks, "const renkYazisi = new Map<number, string>([", "]);") + "]);\n";
const markers = new Function(
  "mutant",
  "atolyeYeri",
  "bossYeri",
  "Hw",
  "isaretleriKur",
  js(colors + label + update + "isaretleriGuncelle();\nreturn renkYazisi;"),
);

const cases = [];
const local = (over) => ({ kalan: 0, ...over });
const run = (yerel, more = {}) => ({
  bec: { yerel },
  becHedef: more.hedef !== undefined ? { "grappling-hook": more.hedef } : {},
  becCikti: { hayalet: !!more.hayalet },
  mek: { etkiKalan: more.nitro ?? 0 },
});
const add = (name, kosu) => {
  const out = effect({ kosu }, sarkac);
  cases.push({ name, kosu, expected: out });
};
add("koşu yok", null);
add("boş", run({}));
add(
  "kanca bina ucu",
  run({ "grappling-hook": local({ kalan: 2, hedef: sarkac, uc: [10, 22, 30], nokta: [10, 30] }) }),
);
add(
  "kanca köşe ucu",
  run({ "grappling-hook": local({ kalan: 1, hedef: "#kose", uc: [5, 1.5, -7], nokta: [4, -6] }) }),
);
add("kanca rakip", run({ "grappling-hook": local({ kalan: 1, hedef: "rakip", nokta: [1, 2] }) }));
add("kanca yol noktası", run({ "grappling-hook": local({ kalan: 1, hedef: null, nokta: [3, 4] }) }));
add(
  "kanca bina hedefsiz nokta",
  run({ "grappling-hook": local({ kalan: 1, hedef: sarkac, nokta: [8, 9] }) }),
);
add("kanca bitti", run({ "grappling-hook": local({ kalan: 0, hedef: "rakip", uc: [1, 2, 3] }) }));
add("hedef var", run({}, { hedef: [11, 12.5, 13] }));
add("hedef null", run({}, { hedef: null }));
add("bağlıyken hedef", run({ "grappling-hook": local({ kalan: 1, uc: [1, 2, 3] }) }, { hedef: [4, 5, 6] }));
add("hayalet", run({}, { hayalet: true }));
add(
  "dönüşüm iz",
  run({
    "risk-taker": local({
      kalan: 3,
      iz: [
        [1, 2, 1.5],
        [3, 4, 0.2],
      ],
    }),
  }),
);
add("dönüşüm kapalı iz", run({ "risk-taker": local({ kalan: 0, iz: [[9, 9, 0.4]] }) }));
add("slipstream", run({ "slipstream-engine": local({ kalan: 0.5 }) }));
add("volt kanat", run({ "volt-kanat": local({ kalan: 4 }) }));
add("nitro", run({}, { nitro: 0.3 }));
add("nitro bitti", run({}, { nitro: 0 }));

const markerCases = [];
const ev = (id, ty, sokak, yapildi = false) => ({
  id,
  ty,
  ...(sokak ? { sokak } : {}),
  x: id * 10,
  z: -id,
  yapildi,
});
for (const [name, kosu] of [
  [
    "bölge1 türleri",
    {
      etkinlikler: ["gp", "rx", "rl", "dp", "dg"].map((t, i) => ev(i, t, null, i === 3)),
      sandiklar: [
        { id: 0, x: 1, z: 2, lanetli: false, acildi: false },
        { id: 1, x: 3, z: 4, lanetli: true, acildi: false },
        { id: 2, x: 5, z: 6, lanetli: false, acildi: true },
      ],
    },
  ],
  [
    "şehir sokak",
    {
      etkinlikler: [ev(0, "gp", "ab"), ev(1, "rl", "tur"), ev(2, "gp", "kovala"), ev(3, "dg", null)],
      sandiklar: [{ id: 0, x: 7, z: 8, lanetli: true, acildi: false }],
    },
  ],
]) {
  let list = null;
  const names = markers(
    { kosu },
    () => [100, 200],
    () => [300, 400],
    () => 0,
    (l) => (list = l),
  );
  markerCases.push({
    name,
    kosu,
    expected: list.map((i) => ({
      x: i.x,
      z: i.z,
      color: i.renk,
      height: i.sandik ? null : (i.boy ?? 70),
      chest: !!i.sandik,
      label: i.sandik ? null : (i.etiket ?? names.get(i.renk) ?? null),
    })),
  });
}
const out = path.join(root, "Unity/Validation/Reference/source-effects-0.8.18.json");
fs.writeFileSync(out, JSON.stringify({ baseline, sarkac, cases, markers: markerCases }, null, 2) + "\n");
console.log(`Kaynak efekt durumu ${cases.length} + işaret ${markerCases.length} TS senaryosu yazıldı.`);
