// p14 MUTANT DEV laboratuvarı/drift yarışı/hayalet görünümü Play kanıtı: güncel kaynak hashleri, kabul etiketleri, 14 Game View.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p14-devlab-play.json"), "utf8"));
if (p.result !== "mutant-devlab-passed" || p.error || p.runtimeErrors.length)
  throw Error("DEV Play başarısız");
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
if (p.sources.length !== assets.length) throw Error("DEV Play kaynak kapsamı eski");
for (const f of assets) {
  const rel = path.relative(root, f).replaceAll("\\", "/"),
    sha = createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase();
  if (!p.sources.some((s) => s.path === rel && s.hash === sha)) throw Error("Eski kaynak: " + rel);
}
for (const label of [
  "Geliştirme yapısı (Editor) DEV erişimi",
  "Normal koşu varsayılan",
  "Fare hit-test: mutant-dev-toggle",
  "Aynı tohumla test koşusu",
  "Testte bütün araçlar seçilebilir",
  "İlk dünyada DEV paneli açık",
  "Seviye 3 altı evrim reddi",
  "Kurulum koşu durumunda",
  "MUTANT drift yarışı açıldı",
  "Geri sayımda yarış drift dalı kapalı",
  "Yarış çalışırken drift yarışı dalı",
  "Drift yarış dalında açıldı",
  "Yarış ortasında panel",
  "Sayaç yenilendi",
  "Test bölge 2 / şehir",
  "Bölge geçişi üretim boss zinciriyle",
  "Sıfırlama 40 enerji/boş kurulum",
  "Gecikmeli geliştirici hayaleti görünür (rekor yokken)",
  "Geliştirici hayaleti oyuncunun kaynak modeli, saydam",
  "Malzemeler ×0,45 saydam",
  "Rekor hayaleti varken geliştirici hayaleti gizli",
  "Rekor hayaleti TS uzak araç saydamlığı (hayalet skill malzemesi değil)",
  "Kariyer kaydı aynı",
  "Gerçek kalıcı kayıt hashleri aynı",
])
  if (!p.checks.includes(label)) throw Error("Eksik kabul: " + label);
const shots = ["dev-start", "dev-lab", "dev-drift", "dev-lab-race", "dev-city", "dev-ghost", "record-ghost"];
if (p.images.length !== shots.length * 2) throw Error(shots.length * 2 + " Game View bekleniyor");
for (const s of shots)
  for (const w of [1280, 1920]) {
    const name = `p14-devlab-${s}-${w}.png`;
    if (!p.images.includes(name)) throw Error("Görüntü eksik: " + name);
    const b = fs.readFileSync(path.join(root, "Logs", name));
    if (b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
      throw Error("Yanlış PNG: " + name);
  }
console.log(
  `MUTANT DEV Play: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/${p.images.length} Game View, çalışma hatası0, Editor tanısı ${p.editorDiagnostics.length} (Package Manager çevrimdışı). Fixture: ${p.fixtures.length}. Panel düğmeleri aynı komutlarla; insan kabulü değildir.`,
);
