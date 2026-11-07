import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p7-profile-f-play.json"), "utf8"));
if (p.result !== "p7-profile-f-passed" || p.error || p.runtimeErrors.length)
  throw Error("Profil F Play başarısız: " + p.error);
for (const check of [
  "Ana menüden F Profil açılır",
  "Enter adı gerçek diske normalize ederek yazar",
  "Esc ad değişimini kaydetmeden iptal eder",
  "Geçersiz form sağlayıcıya gitmez",
  "Oluştur aynı hesap servisine bir kez doğru e-posta ile gider",
  "Gönderimden sonra şifre alanları temizlenir",
  "Bekleme sırasında ikinci giriş çağrısı yapılmaz",
  "Hata gerçek servis metniyle gösterilir; hesap korunur",
  "Klavye şifre sıfırlama mevcut servis yoluna gider",
  "Tab sonraki form alanına odaklanır",
  "Ad dışındaki profil sayaç ve rekorları aynı",
  "Ad dışındaki kalıcı oyuncu JSON dosyaları aynı hash'te",
])
  if (!p.checks.includes(check)) throw Error("Eksik davranış: " + check);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss)$/.test(f));
if (p.sources?.length !== files.length) throw Error("Profil kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!p.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const [state, width] of [
  ["unavailable", 1280],
  ["guest", 1280],
  ["guest", 1920],
  ["linked", 1280],
  ["linked", 1920],
  ["busy", 1920],
  ["error", 1280],
]) {
  const file = `p7-profile-${state}-${width}.png`;
  if (!p.images.includes(file)) throw Error("Eksik Game View: " + file);
  const b = fs.readFileSync(path.join(root, "Logs", file));
  if (b.readUInt32BE(16) !== width || b.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
    throw Error("Yanlış boyut: " + file);
}
console.log(
  `Profil F: ${p.checks.length} grafik Unity Play kontrolü, 7 Game View, ${files.length} güncel kaynak; çalışma hatası ${p.runtimeErrors.length}, Editor tanısı ${p.editorDiagnostics.length}; ${p.utc}. Bulut sağlayıcısı yerel sahtedir; canlı Firebase/insan kabulü değildir.`,
);
