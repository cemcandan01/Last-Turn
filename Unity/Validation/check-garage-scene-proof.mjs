// p16 TS garaj sahnesi (F garaj/modifiye/mağaza) Play kanıtı: güncel kaynak hashleri, kabul etiketleri, 6 Game View.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p16-garage-play.json"), "utf8"));
if (p.result !== "garage-scene-passed" || p.error || p.runtimeErrors.length)
  throw Error("Garaj Play başarısız");
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
if (p.sources.length !== assets.length) throw Error("Garaj Play kaynak kapsamı eski");
for (const f of assets) {
  const rel = path.relative(root, f).replaceAll("\\", "/"),
    sha = createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase();
  if (!p.sources.some((s) => s.path === rel && s.hash === sha)) throw Error("Eski kaynak: " + rel);
}
for (const label of [
  "TS garaj sahnesi yüklendi",
  "Tam ekran arka plan, panellerin altında",
  "Kaynak garaj düğümleri (kolon/halka/hüzme)",
  "TS garaj ışıkları",
  "Araç platformda",
  "Garaj sisi yalnız vitrin çiziminde",
  "Modifiyede garaj arka planı sürer",
  "Mağaza kutusunda tek etkin garaj sahnesi",
  "Gerçek kalıcı kayıt hashleri aynı",
])
  if (!p.checks.includes(label)) throw Error("Eksik kabul: " + label);
const shots = ["garage", "modify", "store"];
if (p.images.length !== shots.length * 2) throw Error(shots.length * 2 + " Game View bekleniyor");
for (const s of shots)
  for (const w of [1280, 1920]) {
    const name = `p16-garage-${s}-${w}.png`;
    if (!p.images.includes(name)) throw Error("Görüntü eksik: " + name);
    const b = fs.readFileSync(path.join(root, "Logs", name));
    if (b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
      throw Error("Yanlış PNG: " + name);
  }
console.log(
  `Garaj sahnesi Play: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/${p.images.length} Game View, çalışma hatası0, Editor tanısı ${p.editorDiagnostics.length}. İnsan beğeni kabulü değildir.`,
);
