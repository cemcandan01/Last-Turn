import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p7-pause-result-f-play.json"), "utf8"));
if (p.result !== "p7-pause-result-f-passed" || p.error || p.runtimeErrors.length)
  throw Error("Duraklatma/Sonuç F Play başarısız: " + p.error);
for (const check of [
  "Esc → F Duraklatma; IMGUI duraklatma geri dönüş olarak gizli",
  "Altı işlem, odak DEVAM ET",
  "Başlıkta pist adı ve tur",
  "Hızlı ayar: fare kamerayı seçer ve hemen kaydeder",
  "Esc yarışa devam ettirir",
  "↓↓ Enter → Ayarlar (F)",
  "Ayarlardan Esc duraklatmaya döner",
  "Enter DEVAM ET",
  "Sonuçta yarış HUD'u gizli",
  "Sonuçta Esc duraklatma açmaz",
  "Sonuç Esc → yarış menüsü",
  "TEKRAR yarışı baştan başlatır",
  "Mutant: Esc → F Duraklatma (Devam, Ayarlar, Koşudan çık)",
  "Koşudan çık → Mutant menüsü",
])
  if (!p.checks.includes(check)) throw Error("Eksik davranış: " + check);
for (const prefix of [
  "F Sonuç: büyük süre",
  "Kazanç yarış oturumunun",
  "Sıradaki kariyer yarışı",
  "Enter → ",
  "Sağda süre",
])
  if (!p.checks.some((c) => c.startsWith(prefix))) throw Error("Eksik davranış: " + prefix);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss)$/.test(f));
if (p.sources?.length !== files.length) throw Error("Duraklatma/Sonuç kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!p.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const [state, width, height] of [
  ["pause", 1920, 1080],
  ["pause", 1280, 720],
  ["result", 1920, 1080],
  ["result", 1280, 720],
  ["result", 2560, 1080],
  ["mutant", 1920, 1080],
]) {
  const file = `p7-pause-${state}-${width}.png`;
  if (!p.images.includes(file)) throw Error("Eksik Game View: " + file);
  const b = fs.readFileSync(path.join(root, "Logs", file));
  if (b.readUInt32BE(16) !== width || b.readUInt32BE(20) !== height) throw Error("Yanlış boyut: " + file);
}
console.log(
  `Duraklatma/Sonuç F: ${p.checks.length} grafik Unity Play kontrolü, 6 Game View, ${files.length} güncel kaynak; çalışma hatası ${p.runtimeErrors.length}, Editor tanısı ${p.editorDiagnostics.length}; ${p.utc}. Sentetik klavye ve panel hit-test; insan kabulü değildir.`,
);
