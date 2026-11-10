import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p11-source-play.json"), "utf8"));
if (
  p.result !== "p11-source-passed" ||
  p.error ||
  p.runtimeErrors.length ||
  // Yalnız oyun koduna değmeyen Editor tanıları (çevrimdışı Package Manager, Search) ayrı listede kabul edilir.
  p.editorDiagnostics.some(
    (d) => !d.startsWith("[Package Manager Window]") && !d.includes("UnityEditor.Search"),
  )
)
  throw Error("Kaynak sunum Play başarısız");
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const assets = files(path.join(root, "Assets/LastTurn")).filter((f) =>
  /\.(cs|uss|json|png|wav|bytes|shader)$/.test(f),
);
if (p.sources.length !== assets.length) throw Error("Play kaynak kapsamı eski");
for (const f of assets) {
  const rel = path.relative(root, f).replaceAll("\\", "/"),
    sha = createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase();
  if (!p.sources.some((s) => s.path === rel && s.hash === sha)) throw Error("Eski Play kaynağı: " + rel);
}
for (const label of [
  "Missing graph returns null",
  "30/60/120 FPS same physics with source presentation",
  ...[30, 60, 120].flatMap((n) => ["Presentation read-only twin trace " + n, "Fixed 240 steps " + n]),
])
  if (!p.checks.includes(label)) throw Error("Eksik davranış: " + label);
const m = JSON.parse(
  fs.readFileSync(path.join(root, "Assets/LastTurn/Resources/SourcePresentation/manifest.json"), "utf8"),
);
for (const car of m.cars)
  for (const label of [
    "Car source identity " + car.key,
    "Cockpit bindings " + car.key,
    "Mirror faces " + car.key,
    "Live selected model " + car.id,
    "Actual mirror render " + car.id,
  ])
    if (!p.checks.includes(label)) throw Error("Eksik araç kabulü: " + label);
for (const world of m.worlds)
  if (!p.checks.includes("World source geometry " + world.key)) throw Error("Eksik dünya: " + world.key);
if (p.images.length !== 49) throw Error("49 güncel Game View bekleniyor");
for (const name of p.images) {
  const b = fs.readFileSync(path.join(root, "Logs", name)),
    w = name.includes("-1920") ? 1920 : 1280;
  if (b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
    throw Error("PNG boyutu farklı: " + name);
}
console.log(
  `Kaynak sunum Play: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/${p.images.length} Game View, hata0. İnsan beğeni/işitme kabulü değildir.`,
);
