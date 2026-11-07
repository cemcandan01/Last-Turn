import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/m2-choice-play.json"), "utf8"));
if (proof.result !== "m2-choice-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("Mutant B seçim Play başarısız: " + proof.error);
for (const label of [
  "Koşu içi seçim tek görünümde",
  "B arka plan ve çerçeve yüklü",
  "Sayı seçimi koşu ve RNG'yi değiştirmez",
  "Native odak seçili ödülle eşleşir",
  "Sol ok tek kart ilerler",
  "PgDn odaklı kart ayrıntısını kaydırır",
  "Tab odağı seçim veya onayda",
  "Esc duraklatır; teklif timer RNG aynı",
  "Esc seçim ekranına döner; çift işlem yok",
  "Fare yalnız seçer; otomatik ödül almaz",
  "Gerçek Choose pasifi alır ve bekleyen seçimi azaltır",
  "Çoklu seçimde yeni teklifler görünür",
  "Dolu yuva açık değiştirme ister; skill atılmaz",
  "Değiştirme iptali teklif ve skill'leri korur",
  "Esc yalnız değiştirmeyi iptal eder",
  "Seçilen skill gerçek Choose ile değiştirildi",
  "Bırakılmayan skill seviyesi korunur",
  "Ödül sonrası gerçek sürüş ve ekran kapanışı",
  "Kariyer sahiplik para profil aynı",
  "İzole ürün kalıcı kayıt hash'leri aynı",
])
  if (!proof.checks.includes(label)) throw Error("Eksik davranış: " + label);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss|json|png)$/.test(f));
if (proof.sources?.length !== files.length) throw Error("Kaynak/görsel kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!proof.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const screen of ["offer", "replace"])
  for (const width of [1280, 1920]) {
    const name = `m2-choice-${screen}-${width}.png`;
    if (!proof.images.includes(name)) throw Error("Eksik Game View: " + name);
    const png = fs.readFileSync(path.join(root, "Logs", name));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("Yanlış görüntü boyutu: " + name);
  }
console.log(
  `Mutant B seçim: ${proof.checks.length} gerçek grafik Play kontrolü, 4 Game View, ${files.length} güncel kod/veri/görsel hash'i; çalışma hatası ${proof.runtimeErrors.length}, Editor tanısı ${proof.editorDiagnostics.length}; ${proof.utc}. Fiziksel girdi/insan kabulü değildir.`,
);
