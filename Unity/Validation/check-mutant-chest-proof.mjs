import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-chest-play.json"), "utf8"));
if (proof.result !== "b-chest-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("B etkinlik Play başarısız: " + proof.error);
if (!proof.environment?.includes("6000.3.9f1") || !proof.environment.includes("GameView"))
  throw Error("Gerçek Game View ortam kaydı eksik");
// Eski proof eşikleri değiştirilmez. Bu yeni kapsam yalnız belgelenmiş Search tanısını ayrı uyarıyla raporlar.
const native =
  "ArgumentOutOfRangeException: Index was out of range. Must be non-negative and less than the size of the collection.\nParameter name: index";
if (proof.editorDiagnostics.some((s) => s.replaceAll("\r", "").trim() !== native))
  throw Error("Beklenmeyen Editor tanısı: " + proof.editorDiagnostics.join("; "));
if (proof.editorDiagnostics.length)
  console.warn(
    `UnityEditor.Search tanısı ${proof.editorDiagnostics.length}; Console tamamen temiz değildir.`,
  );
for (const label of [
  "Gercek isaret teklifi hazirlar",
  "Cizim gezinme nitro skill salt",
  "Esc pause",
  "Pause Settings donusu salt",
  "Kabul Core durumuyla ayni",
  "Tek teklif ikinci kez uygulanmaz",
  "Lanet cizimi teklif uretmez",
  "Ret yalniz sandigi kapatir",
  "Eski acilmis teklif guvenli",
  "Lanetli kabul mevcut bedeli uygular",
  "Kariyer profil ayni",
  "Kalici dosyalar ayni",
])
  if (!proof.checks.includes(label)) throw Error("Missing behavior: " + label);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss|json|png)$/.test(f));
if (proof.sources?.length !== files.length) throw Error("Kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!proof.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const name of ["normal", "cursed", "invalid", "long"])
  for (const width of [1280, 1920]) {
    const file = `b-chest-${name}-${width}.png`;
    if (!proof.images.includes(file)) throw Error("Eksik Game View: " + file);
    for (const label of ["Tek gorunum / ", "Gercek teklif / ", "Gercek uygunluk / "])
      if (!proof.checks.includes(label + name + width)) throw Error("Missing shot check: " + name + width);
    const png = fs.readFileSync(path.join(root, "Logs", file));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + file);
  }
console.log(
  `B sandık: ${proof.checks.length} gerçek Play kontrolü,8 Game View,${files.length} güncel kaynak; Runtime ${proof.runtimeErrors.length}, Editor ${proof.editorDiagnostics.length}; ${proof.utc}; ${proof.environment}. Sentetik girdi/kontrollü fixture; insan veya fiziksel yarış kabulü değildir.`,
);
