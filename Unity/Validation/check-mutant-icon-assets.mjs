import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { bounds, readAlpha } from "./mutant-icon-png.mjs";

const root = path.resolve(import.meta.dirname, "../Assets/LastTurn/Resources");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "mutant-catalog.json"), "utf8"));
const map = JSON.parse(fs.readFileSync(path.join(root, "UI/MutantB/reward-icons.json"), "utf8"));
const expected = [
  ...catalog.passives.map((p) => "passive/" + p.id),
  ...catalog.addons.map((p) => "addon/" + p.id),
  ...catalog.skillAddons.map((p) => "skillAddon/" + p.id),
  ...catalog.skills.map((p) => "skill/" + p.id),
  ...catalog.skills.flatMap((p) => (p.evrimler || []).map((e) => "evolution/" + e.id)),
  ...catalog.parts.map((p) => "part/" + p.id),
  ...catalog.chestResources.map((p) => "resource/" + p.id),
];
if (map.schema !== 1 || map.entries.length !== 94 || new Set(map.entries.map((e) => e.key)).size !== 94)
  throw Error("94 tekrarsız ikon eşlemesi gerekir");
const images = new Map();
for (const asset of map.assets) {
  const file = path.join(root, asset.path + ".png");
  if (createHash("sha256").update(fs.readFileSync(file)).digest("hex") !== asset.sha256)
    throw Error("Görsel hash'i eski: " + asset.path);
  const im = readAlpha(file);
  if (im.width !== asset.width || im.height !== asset.height) throw Error("Boyut eski: " + file);
  images.set(asset.path, im);
}
for (const key of expected) {
  const e = map.entries.find((e) => e.key === key),
    im = images.get(e?.path);
  if (!e || !im) throw Error("Eksik ikon: " + key);
  const c = e.cell,
    b = bounds(im, c.x, c.y, c.width, c.height, 64);
  if (
    !b ||
    e.width <= 0 ||
    e.height <= 0 ||
    e.x < c.x ||
    e.y < c.y ||
    e.x + e.width > c.x + c.width ||
    e.y + e.height > c.y + c.height
  )
    throw Error("Geçersiz Sprite rect: " + key);
  if (b.x < e.x || b.y < e.y || b.x + b.width > e.x + e.width || b.y + b.height > e.y + e.height)
    throw Error("Gövde kesiliyor: " + key);
  if (
    e.path.includes("/atlas/") &&
    (b.x <= c.x || b.y <= c.y || b.x + b.width >= c.x + c.width || b.y + b.height >= c.y + c.height)
  )
    throw Error("Atlas hücre sınırında taşma: " + key);
  // Eski B PNG'lerinde köşede alfa1 sıkıştırma/gürültü kalıntısı bulunabilir.
  if (im.alpha[c.y * im.width + c.x] > 8) throw Error("Şeffaf köşe yok: " + key);
}
for (const p of catalog.parts)
  if (map.entries.find((e) => e.key === "part/" + p.id).path !== "UI/MutantB/part/" + p.kat)
    throw Error("Yanlış parça kategorisi: " + p.id);
const identities = map.entries.map((e) => [e.path, e.x, e.y, e.width, e.height].join(":"));
if (new Set(identities).size !== 64) throw Error("Parça kategorileri dışında ikon tekrar kullanılmış");
console.log(
  `Mutant B ikonları: ${expected.length} tanım, 64 ayrı sembol, ${images.size} RGBA kaynak; hash/alfa/rect/hücre sınırı ve kategori eşlemesi geçti.`,
);
