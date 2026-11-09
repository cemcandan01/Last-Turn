import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-event-play.json"), "utf8"));
if (proof.result !== "b-event-passed" || proof.error || proof.runtimeErrors.length)
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
  "Gerçek işaret/dwell etkinliği açar",
  "Panel sürüş/HUD sahipliğini alır",
  "Fare yalnız seçer; odak riskle aynı",
  "Ok risk seçer",
  "Tab iki girdi yolunda bir kez ilerler",
  "Başlat odağında seçili risk korunur",
  "Çizim/odak/sürüş girdisi RNG/timer/ödül değiştirmez",
  "Esc yalnız mevcut pause yoluna gider",
  "Pause dönüşü panel/seçim ve durum korunur",
  "Settings/pause dönüşü seçim ve durum korunur",
  "Fare Geri koşu durumunu değiştirmez",
  "Çift onay ikinci yarış/işlem üretmez",
  "Uzun Türkçe içerik klavyeyle kayar",
  "Uzun metin/kaydırma salt sunum",
  "Eski/tamamlanmış etkinlik onay anında reddedilir",
  "Bulunamayan etkinlik eski yarışı başlatmaz",
  "Geçersiz etkinlikten güvenli Geri",
  "Kariyer sahiplik para profil aynı",
  "İzole ürün kalıcı kayıt hash'leri aynı",
])
  if (!proof.checks.includes(label)) throw Error("Eksik davranış: " + label);
for (const name of ["time", "duel", "chase", "drift"])
  for (const label of [
    "Gerçek yarış oturumuna doğru kimlik/risk / ",
    "Gerçek oturum hedefi sunumla aynı / ",
    "Etkinlik paneli kapanır; kariyer yarışı açılmaz / ",
    "Yarış HUD'u geri gelir / ",
  ])
    if (!proof.checks.includes(label + name)) throw Error("Eksik gerçek yarış kapsamı: " + name);
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
for (const name of ["time", "duel", "chase", "drift", "long", "invalid"])
  for (const width of [1280, 1920]) {
    const file = `b-event-${name}-${width}.png`;
    if (!proof.images.includes(file)) throw Error("Eksik Game View: " + file);
    for (const label of [
      "Tek etkinlik görünümü / ",
      "İşlemler ekran içinde / ",
      "B iki sütun ve eylemler ayrık / ",
      "Gerçek risk sayısı / ",
    ])
      if (!proof.checks.includes(label + name + width)) throw Error("Eksik görsel kabul: " + name + width);
    const png = fs.readFileSync(path.join(root, "Logs", file));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + file);
  }
console.log(
  `B etkinlik: ${proof.checks.length} gerçek Play kontrolü,12 Game View,${files.length} güncel kaynak; Runtime ${proof.runtimeErrors.length}, Editor ${proof.editorDiagnostics.length}; ${proof.utc}; ${proof.environment}. Sentetik girdi/kontrollü fixture; insan veya fiziksel yarış kabulü değildir.`,
);
