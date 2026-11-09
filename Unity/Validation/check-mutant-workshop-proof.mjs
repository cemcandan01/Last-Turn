import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-workshop-play.json"), "utf8"));
if (proof.result !== "b-workshop-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("B atölye Play başarısız: " + proof.error);
if (!proof.environment?.includes("6000.3.9f1") || !proof.environment.includes("GameView"))
  throw Error("Gerçek Game View ortam kaydı eksik");
const native =
  "ArgumentOutOfRangeException: Index was out of range. Must be non-negative and less than the size of the collection.\nParameter name: index";
if (proof.editorDiagnostics.some((s) => s.replaceAll("\r", "").trim() !== native))
  throw Error("Beklenmeyen Editor tanısı: " + proof.editorDiagnostics.join("; "));
if (proof.editorDiagnostics.length)
  console.warn(
    `UnityEditor.Search tanısı ${proof.editorDiagnostics.length}; Console tamamen temiz değildir.`,
  );
for (const label of [
  "Gerçek atölye kapısı açılır; sürüş/HUD engelli",
  "Paneli açmak stok/RNG/para değiştirmez",
  "Tab tek adım ilerler",
  "Shift Tab geri ilerler",
  "Panel gezinmesi/nitro/skill RNG/timer/gövde/parça değiştirmez",
  "Esc mevcut pause yolunda",
  "Pause dönüşü odak ve durum korunur",
  "Settings dönüşü odak ve durum korunur",
  "Fare Geri salt; kaynaklar aynı",
  "Panelden sürüşe sızan nitro/skill isteği yok",
  "Sürüşte N yolu çalışmaya devam eder",
  "Sürüşte skill yolu çalışmaya devam eder",
  "Normal alım mevcut Core ile aynı",
  "Alım mevcut araç hesabına ve yenileme bağlantısına geçer",
  "Runtime eski/geçersiz parçayı güvenle reddeder",
  "Geri sonrası fizik kurulumu mevcut parçayla yenilenir",
  "Tam fiyatla klavye alımı aynı",
  "Tam fiyat harcanır ve parça stoktan kalkar",
  "Yetersiz para alımı uygulamaz",
  "Tam gövdede tamir uygulanmaz",
  "Gerçek tamir sonucu / repair",
  "Gerçek tamir sonucu / partial",
  "Bir puana yetmeyen para tamir harcamaz",
  "Fare yenilemesi gerçek Core RNG sonucu ve bedelle aynı",
  "Tek giriş yenilemeyi iki kez uygulamaz",
  "Yenileme sonrası eski kart tokeni parça almaz",
  "Sonraki açık yenileme işlemi yapılabilir",
  "İki açık yenileme yalnız iki bedel harcar",
  "Boş stok/yetersiz parada odak geçerli Geri",
  "Klavye Geri HUD'a döner",
  "Uzun açıklama klavyeyle kayar; durum değişmez",
  "Ortak girdi koruması 2A panelinde de salt",
  "2A panelinden sürüşe de istek sızmaz",
  "Kariyer sahiplik para profil aynı",
  "İzole ürün kalıcı kayıt hash'leri aynı",
])
  if (!proof.checks.includes(label)) throw Error("Eksik davranış: " + label);
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "Assets/LastTurn/Resources/mutant-catalog.json"), "utf8"),
);
for (const p of catalog.parts)
  if (!proof.checks.includes("Gerçek parça kategori ikonu / " + p.id))
    throw Error("Eksik parça ikonu: " + p.id);
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
for (const name of ["stock", "repair", "partial", "poor", "empty", "long"])
  for (const width of [1280, 1920]) {
    const file = `b-workshop-${name}-${width}.png`;
    if (!proof.images.includes(file)) throw Error("Eksik Game View: " + file);
    for (const label of [
      "Atölye tek görünüm sahibi / ",
      "Gerçek kaynaklar modelle aynı / ",
      "Tam tamir bedeli ayrı / ",
      "İşlem uygunluğu gerçek modelde / ",
      "Gerçek stok sayısı / ",
    ])
      if (!proof.checks.includes(label + name + width)) throw Error("Eksik görsel kabul: " + name + width);
    for (const target of [
      "workshop-money",
      "workshop-body",
      "workshop-power",
      "workshop-full-cost",
      "workshop-repair-preview",
      "workshop-repair",
      "workshop-refresh",
      "workshop-back",
      "workshop-notice",
    ])
      if (!proof.checks.includes("Kaynak/eylem erişilebilir / " + target + name + width))
        throw Error("Eksik yerleşim: " + target);
    const png = fs.readFileSync(path.join(root, "Logs", file));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + file);
  }
console.log(
  `B atölye: ${proof.checks.length} gerçek Play kontrolü,12 Game View,${files.length} güncel kaynak; Runtime ${proof.runtimeErrors.length}, Editor ${proof.editorDiagnostics.length}; ${proof.utc}; ${proof.environment}. Sentetik girdi/kontrollü fixture; insan kabulü değildir.`,
);
