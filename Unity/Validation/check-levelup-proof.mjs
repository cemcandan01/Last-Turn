// p15 seviye atlama kutlaması + performans göstergesi Play kanıtı: güncel kaynak hashleri, kabul etiketleri, 6 Game View.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p15-levelup-play.json"), "utf8"));
if (p.result !== "levelup-perf-passed" || p.error || p.runtimeErrors.length)
  throw Error("Seviye Play başarısız");
// Yalnız oyun koduna değmeyen Editor tanıları ayrı listede kabul edilir.
for (const d of p.editorDiagnostics)
  if (!d.startsWith("[Package Manager Window]") && !d.includes("UnityEditor.Search"))
    throw Error("Editor tanısı: " + d);
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const assets = files(path.join(root, "Assets/LastTurn")).filter((f) =>
  /\.(cs|uss|json|png|bytes|shader)$/.test(f),
);
if (p.sources.length !== assets.length) throw Error("Seviye Play kaynak kapsamı eski");
for (const f of assets) {
  const rel = path.relative(root, f).replaceAll("\\", "/"),
    sha = createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase();
  if (!p.sources.some((s) => s.path === rel && s.hash === sha)) throw Error("Eski kaynak: " + rel);
}
for (const label of [
  "Performans satırı TS biçiminde",
  "Seviye atlamadan kutlama yok",
  "Fixture seviye atlatmadı",
  "Gerçek yarış ödülü XP",
  "Gerçek ödülle seviye atlandı",
  "Kutlama sonuç ekranında hemen açılmaz",
  "XP çubuğundan sonra (2,3 sn)",
  "Açılanlar saf modelle aynı",
  "Seviye başlığı görünür",
  "Açılan satırları",
  "Kapatma sonuç ekranında kalır (Enter sonuca geçmedi)",
  "Bekleyen kutlama kalmadı",
  "Gerçek kalıcı kayıt hashleri aynı",
])
  if (!p.checks.includes(label)) throw Error("Eksik kabul: " + label);
const shots = ["perf-menu", "level-up", "result-after"];
if (p.images.length !== shots.length * 2) throw Error(shots.length * 2 + " Game View bekleniyor");
for (const s of shots)
  for (const w of [1280, 1920]) {
    const name = `p15-levelup-${s}-${w}.png`;
    if (!p.images.includes(name)) throw Error("Görüntü eksik: " + name);
    const b = fs.readFileSync(path.join(root, "Logs", name));
    if (b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
      throw Error("Yanlış PNG: " + name);
  }
console.log(
  `Seviye/performans Play: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/${p.images.length} Game View, çalışma hatası0, Editor tanısı ${p.editorDiagnostics.length}. Fixture: ${p.fixtures.length}. İnsan kabulü değildir.`,
);
