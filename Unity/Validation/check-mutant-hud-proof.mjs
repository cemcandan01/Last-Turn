import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-hud-play.json"), "utf8"));
if (proof.result !== "b-hud-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("B HUD Play başarısız: " + proof.error);
// Üretici yalnız UnityEditor.Search stack'ini (LastTurn içermiyorsa) ayrı kaydeder.
// Bilinen Editor indeksleme tanısı saklanır ve açık uyarıdır; başka tanı kabul edilmez.
const searchDiagnostic =
  "ArgumentOutOfRangeException: Index was out of range. Must be non-negative and less than the size of the collection.\nParameter name: index";
if (proof.editorDiagnostics.some((s) => s.replaceAll("\r", "").trim() !== searchDiagnostic))
  throw Error("Beklenmeyen Editor tanısı: " + proof.editorDiagnostics.join("; "));
if (proof.editorDiagnostics.length)
  console.warn(
    `Bilinen UnityEditor.Search tanısı: ${proof.editorDiagnostics.length}; Console tamamen temiz değildir. Tam stack b-hud-editor-clean.log içindedir.`,
  );
for (const label of [
  "HUD gerçek dünyada sahip",
  "HUD fare sürüşünü yakalamaz",
  "N gerçek nitro enerji yoluna gider",
  "2 gerçek uçuş skillini açar",
  "Fare hava kontrolü bas ve bırak korunur",
  "Esc HUD'u gizler ve duraklatır",
  "Pause koşu durumunu ilerletmez",
  "Ayarlar HUD'u gizler",
  "Sonuç HUD'u örter",
  "Mevcut ödül komutu korunur",
  "Süre bitince boss HUD'u örter",
  "Yeni koşu eski bildirimi taşımaz",
  "Kariyer sahiplik para profil aynı",
  "İzole ürün kalıcı kayıt hash'leri aynı",
])
  if (!proof.checks.includes(label)) throw Error("Eksik davranış: " + label);
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
for (const screen of ["empty", "full", "active", "race"])
  for (const width of [1280, 1920]) {
    const name = `b-hud-${screen}-${width}.png`;
    if (!proof.images.includes(name)) throw Error("Eksik Game View: " + name);
    for (const label of [
      "HUD görünür / ",
      "Koşu verisi modelle aynı / ",
      "Nitro modelle aynı / ",
      "Görev modelle aynı / ",
      "Özet metni sığar / ",
    ])
      if (!proof.checks.includes(label + screen + width))
        throw Error("Eksik model/UI kabulü: " + screen + width);
    const png = fs.readFileSync(path.join(root, "Logs", name));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + name);
  }
console.log(
  `B HUD: ${proof.checks.length} grafik Play kontrolü, 8 Game View, ${files.length} güncel kaynak; çalışma hatası ${proof.runtimeErrors.length}, Editor tanısı ${proof.editorDiagnostics.length}; ${proof.utc}. Fiziksel yarış/insan kabulü değildir.`,
);
