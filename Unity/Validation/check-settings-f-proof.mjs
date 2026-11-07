import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p7-settings-f-play.json"), "utf8"));
if (p.result !== "p7-settings-f-passed" || p.error || p.runtimeErrors.length)
  throw Error("Ayarlar F Play başarısız: " + p.error);
for (const check of [
  "Ana menü 4 → F Ayarlar açılır; IMGUI ayarlar geri dönüş olarak gizli",
  "Enter açık/kapalıyı çevirir (direksiyon ters)",
  "→ kamera biçimini değiştirir",
  "Göstergeler: Windows'ta yalnız etkili harita biçimi",
  "Fare harita biçimini seçer (yuvarlak)",
  "→ oyun sesini %5 artırır",
  "Fare − müziği %5 azaltır",
  "Esc kaydedip kapatır",
  "Değişiklikler ayar dosyasına yazıldı",
  "Sürüş yardımı kariyer kaydından yeniden yüklenir",
  "Tercihler yeniden açılışta aynı",
  "Duraklatma → Ayarlar yarış sahnesinde F ekranı; HUD gizli",
  "Yarışta Esc ayarları kapatıp duraklatma menüsüne döner (aynı Esc ikinci kez işlenmez)",
  "Sonraki Esc yarışa devam ettirir",
])
  if (!p.checks.includes(check)) throw Error("Eksik davranış: " + check);
if (
  !p.checks.some((c) => c.startsWith("→ sürüş yardımını mevcut komutla değiştirir")) ||
  !p.checks.some((c) => c.startsWith("Kontroller: giriş biçimleri"))
)
  throw Error("Eksik davranış: yardım komutu / tuş tablosu");
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss)$/.test(f));
if (p.sources?.length !== files.length) throw Error("Ayarlar kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!p.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const [state, width, height] of [
  ["drive", 1920, 1080],
  ["camera", 1280, 720],
  ["sound", 1920, 1080],
  ["controls", 1920, 1080],
  ["controls", 2560, 1080],
  ["controls", 1280, 720],
  ["race", 1920, 1080],
]) {
  const file = `p7-settings-${state}-${width}.png`;
  if (!p.images.includes(file)) throw Error("Eksik Game View: " + file);
  const b = fs.readFileSync(path.join(root, "Logs", file));
  if (b.readUInt32BE(16) !== width || b.readUInt32BE(20) !== height) throw Error("Yanlış boyut: " + file);
}
console.log(
  `Ayarlar F: ${p.checks.length} grafik Unity Play kontrolü, 7 Game View, ${files.length} güncel kaynak; çalışma hatası ${p.runtimeErrors.length}, Editor tanısı ${p.editorDiagnostics.length}; ${p.utc}. Sentetik klavye ve panel hit-test; insan kabulü değildir.`,
);
