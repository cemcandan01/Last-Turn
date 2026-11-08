import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-boss-play.json"), "utf8"));
if (proof.result !== "b-boss-passed" || proof.error || proof.runtimeErrors.length)
  throw Error("B boss Play başarısız: " + proof.error);
for (const label of [
  "Sağ ok tek düğme ilerler",
  "Sol ok meydan okumaya döner",
  "Tab Geri düğmesini seçer",
  "InputSystem Tab tek düğme ilerler",
  "Fare Geri açık dünyaya döner",
  "Erken Esc yalnız geri döner; çift pause yok",
  "Fare meydan oku gerçek boss yarışını kurar",
  "Boss yarışı hedefi görünümle aynı",
  "Meydan okuma para XP araç ve RNG'yi korur",
  "Gerçek fizik adımı zaman aşımını boss ekranına taşır",
  "Süre dolunca Geri çağrısı durumu değiştirmez",
  "Zorunlu boss Esc ile duraklar; kayıt ve RNG aynı",
  "Devam zorunlu boss ekranına döner",
  "Enter zorunlu boss yarışını kurar",
  "Zorunlu düello boss hedefi bitiş sırası",
  "Kariyer sahiplik para profil aynı",
  "İzole ürün kalıcı kayıt hash'leri aynı",
])
  if (!proof.checks.includes(label)) throw Error("Eksik davranış: " + label);
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "Assets/LastTurn/Resources/mutant-catalog.json"), "utf8"),
);
for (const boss of catalog.bosses)
  for (const label of [
    "Boss adı ve arma gerçek modelde ",
    "Hedef gerçek Core kararında ",
    "Yetenekler katalog görünümünde ",
  ])
    if (!proof.checks.includes(label + boss.id)) throw Error("Eksik boss: " + boss.id);
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
for (const screen of [...catalog.bosses.map((b) => b.id), "expired"])
  for (const width of [1280, 1920]) {
    const name = `b-boss-${screen}-${width}.png`;
    if (!proof.images.includes(name)) throw Error("Eksik Game View: " + name);
    const png = fs.readFileSync(path.join(root, "Logs", name));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + name);
  }
console.log(
  `B boss: ${proof.checks.length} grafik Play kontrolü, 12 Game View, ${files.length} güncel kaynak; çalışma hatası ${proof.runtimeErrors.length}, Editor tanısı ${proof.editorDiagnostics.length}; ${proof.utc}. Tam yarış/insan kabulü değildir.`,
);
