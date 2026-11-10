import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p12-engine-play.json"), "utf8"));
if (p.result !== "p12-engine-passed" || p.error || p.runtimeErrors.length || p.editorDiagnostics.length)
  throw Error("Motor Play başarısız");
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const assets = files(path.join(root, "Assets/LastTurn")).filter((f) =>
  /\.(cs|uss|json|png|wav|bytes|shader)$/.test(f),
);
if (p.sources.length !== assets.length) throw Error("Motor Play kaynak kapsamı eski");
for (const f of assets) {
  const rel = path.relative(root, f).replaceAll("\\", "/"),
    sha = createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase();
  if (!p.sources.some((s) => s.path === rel && s.hash === sha)) throw Error("Eski kaynak: " + rel);
}
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "Assets/LastTurn/Resources/Audio/Engines/manifest.json"), "utf8"),
);
for (const profile of manifest.profiles) {
  const sample = p.passes.find((s) => s.car === profile.key);
  if (!sample || sample.sources !== 10 || sample.listenerRms <= 1e-6)
    throw Error("Gerçek PCM çıkışı eksik: " + profile.key);
}
for (const label of [
  "Listen control exists",
  "Five real seconds listen ended",
  "Listen does not change garage save",
  "L keyboard starts listen",
  "Leaving garage cancels listen",
  "Exactly one menu audio listener",
  "Volume zero mutes engine",
  "Pause mutes engine",
  "No missing sound assets",
  "Store preview plays displayed car",
  "Store listen does not purchase or select",
  "Garage listen uses equipped turbo",
  "Store listen uses equipped turbo",
])
  if (!p.checks.includes(label)) throw Error("Eksik kabul: " + label);
for (let i = 0; i < 15; i++)
  for (const label of ["Actual audio model " + i, "Actual PCM output " + i, "Exactly one race listener " + i])
    if (!p.checks.includes(label)) throw Error("Eksik araç kabulü: " + label);
if (p.images.length !== 6) throw Error("6 Game View bekleniyor");
for (const name of p.images) {
  const b = fs.readFileSync(path.join(root, "Logs", name)),
    w = name.includes("-1920") ? 1920 : 1280;
  if (b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
    throw Error("Yanlış PNG: " + name);
}
console.log(
  `Motor ses Play: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/15 gerçek PCM çıkışı/6 Game View, hata0. İnsan işitme kabulü değildir.`,
);
