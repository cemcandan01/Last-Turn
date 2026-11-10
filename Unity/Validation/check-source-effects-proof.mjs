// p13 kaynak efekt/işaret/kapı/menü görseli Play kanıtı: güncel bütün kaynak hashleri, kabul etiketleri ve 24 Game View.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p13-effects-play.json"), "utf8"));
if (p.result !== "source-effects-passed" || p.error || p.runtimeErrors.length)
  throw Error("Efekt Play başarısız");
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
if (p.sources.length !== assets.length) throw Error("Efekt Play kaynak kapsamı eski");
for (const f of assets) {
  const rel = path.relative(root, f).replaceAll("\\", "/"),
    sha = createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase();
  if (!p.sources.some((s) => s.path === rel && s.hash === sha)) throw Error("Eski kaynak: " + rel);
}
for (const label of [
  "Dokuz kaynak menü görseli",
  "Art arda aynı görsel yok",
  "Sürüşte menü görseli kapalı",
  "Kaynak işaretleri kuruldu / bölge1 13",
  "Toz gerçek temas",
  "Nitro gerçek açık",
  "Üretim şehir dünyası",
  "Sokak işareti pembe ve tabelasız",
  "Hedef halkası HUD TargetPoint'ten",
  "Halka hedef noktasında",
  "Halat ucu bağ noktasında",
  "Kanca ucu bağ noktasında",
  "Bağlıyken hedef halkası gizli",
  "Bırakınca halat gizli",
  "Gerçek hayalet fazı",
  "Şehirde sokak etkinliği",
  "Yarışta dünya işareti yok",
  "Kariyer profil aynı",
  "Kalıcı kayıt hashleri aynı",
])
  if (!p.checks.includes(label)) throw Error("Eksik kabul: " + label);
if (
  !p.checks.some((c) => c.startsWith("Gerçek kanca bağı / ")) ||
  !p.checks.some((c) => c.startsWith("Sokak kapıları TS aralığıyla "))
)
  throw Error("Kanca/kapı kabulü eksik");
const shots = [
  "menu-backdrop",
  "menu-backdrop-next",
  "markers-hub",
  "dust",
  "nitro",
  "markers-city",
  "hook-target",
  "hook-rope",
  "ghost",
  "wind",
  "risk-taker",
  "street-gates",
];
if (p.images.length !== shots.length * 2) throw Error(shots.length * 2 + " Game View bekleniyor");
for (const s of shots)
  for (const w of [1280, 1920]) {
    const name = `p13-effects-${s}-${w}.png`;
    if (!p.images.includes(name)) throw Error("Görüntü eksik: " + name);
    const b = fs.readFileSync(path.join(root, "Logs", name));
    if (b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
      throw Error("Yanlış PNG: " + name);
  }
console.log(
  `Kaynak efekt Play: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/${p.images.length} Game View, çalışma hatası0, Editor tanısı ${p.editorDiagnostics.length} (Package Manager çevrimdışı). Fixture: ${p.fixtures.length}. İnsan beğeni kabulü değildir.`,
);
