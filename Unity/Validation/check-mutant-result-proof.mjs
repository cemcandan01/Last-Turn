import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-result-play.json"), "utf8"));
if (proof.result !== "b-result-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("B sonuç Play başarısız: " + proof.error);
for (const label of [
  "Enter normal sonuçtan dünyaya döner",
  "Sonuç Esc duraklatır; ödül değişmez",
  "Duraklatmadan sonuç ekranına döner",
  "Fare Devam dünyaya döner",
  "Devam mevcut beceri seçimine geçer; ödül tekrarlanmaz",
  "Devam bekleyen boss'a geçer; ödül tekrarlanmaz",
  "Boss girişinde bekleyen çağrı tüketilir",
  "Boss galibiyetinde güncel bölge ve kaynak sonucu",
  "Boss sonrası Devam ödülü tekrar uygulamaz",
  "Yeni bölgede eski boss çağrısı kalmaz",
  "Koşu bitişi mevcut özette kalır; 7A örtmez",
  "Yeni koşuya taşınan eski sonuç yok",
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
for (const screen of ["passed", "failed", "level", "pending", "boss"])
  for (const width of [1280, 1920]) {
    const name = `b-result-${screen}-${width}.png`;
    if (!proof.images.includes(name)) throw Error("Eksik Game View: " + name);
    for (const label of [
      "Para ve XP gerçek modelde / ",
      "Koşu kaynakları gerçek modelde / ",
      "Başlık bitiş kararıyla aynı / ",
    ])
      if (!proof.checks.includes(label + screen + width))
        throw Error("Eksik model/UI kabulü: " + screen + width);
    const png = fs.readFileSync(path.join(root, "Logs", name));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + name);
  }
console.log(
  `B sonuç: ${proof.checks.length} grafik Play kontrolü, 10 Game View, ${files.length} güncel kaynak; çalışma hatası ${proof.runtimeErrors.length}, Editor tanısı ${proof.editorDiagnostics.length}; ${proof.utc}. Fiziksel yarış/insan kabulü değildir.`,
);
