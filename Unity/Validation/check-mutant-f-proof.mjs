import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/p7-mutant-f-play.json"), "utf8"));
if (proof.result !== "p7-mutant-f-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("Mutant F Play başarısız: " + proof.error);
for (const check of [
  "Başlama onayı koşuyu henüz oluşturmaz",
  "Esc yeni koşu onayını iptal eder",
  "Üç başlangıç aracı mevcut seed/RNG listesinden",
  "Aracı değiştirmek yetenekleri yeniden çekmez",
  "Fare Devam yeni aracı seçer",
  "Seçilen araç ve pasif gerçek koşuda uygulanır",
  "Boss süresi sürüş başlayınca akar",
  "Mevcut çıkış komutu Mutant menüsüne döner",
  "Araç adımından Esc Mutant menüsüne çıkar",
  "Kariyer sahiplik/para/profil değişmedi",
  "İzole ürün oyuncu kayıtları aynı hash'te",
])
  if (!proof.checks.includes(check)) throw Error("Eksik davranış: " + check);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss)$/.test(f));
if (proof.sources?.length !== files.length) throw Error("Mutant F kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!proof.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const screen of ["menu", "confirm", "car", "skill"])
  for (const width of [1280, 1920]) {
    const file = `p7-mutant-${screen}-${width}.png`;
    if (!proof.images.includes(file)) throw Error("Eksik Game View görüntüsü: " + file);
    const png = fs.readFileSync(path.join(root, "Logs", file));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("Yanlış görüntü boyutu: " + file);
  }
console.log(
  `Mutant F gerçek grafik Unity Play: ${proof.checks.length} kontrol, 8 Game View, ${files.length} güncel kaynak; çalışma hatası ${proof.runtimeErrors.length}, Editor tanısı ${proof.editorDiagnostics.length}; seed ${proof.seed}; ${proof.utc}. İnsan kabulü değildir.`,
);
