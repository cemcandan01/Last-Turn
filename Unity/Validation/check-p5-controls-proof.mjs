import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
// P4 gerçek Unity Play kanıtı: nitro + beş skill + kombinasyon; güncel kaynak hash'i ve oyuncu dosyası koruması.
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p5-controls.json"), "utf8"));
if (p.result !== "controls-play-passed") throw Error("P5 kontrol Play başarısız: " + p.error);
if (p.unityVersion !== "6000.3.9f1" || !Array.isArray(p.runtimeErrors) || p.runtimeErrors.length)
  throw Error("P5 kontrol Play Editor/çalışma hatası kanıtı geçersiz");
const required = [
  "Sürüş sahnesinde dokunmatik katman kuruldu",
  "Yeni ayar dizininde TS varsayılan kontrolleri",
  "Klavye W: tam dijital gaz (TS tuş gazı)",
  "Ok tuşları: gaz ve sola tam direksiyon (+ sol)",
  "C tuşu el freni (TS boşluk/C)",
  "Ters direksiyon tercihi tuş yönünü çevirdi",
  "Otomatik gaz: tuşsuz tam gaz",
  "Otomatik gazda fren gazı keser",
  "İki parmak: gaz + SOL aynı anda",
  "Parmak düğmeden kayınca bağlı kontrol değişmez (pointer capture)",
  "Dokunmatik EL FRENİ",
  "Ekran direksiyonu: çeyrek tur sola ≈ 0,75 analog direksiyon",
  "Direksiyon bırakınca ortalandı",
  "Analog pedal üstte tam gaz",
  "Analog pedal aşağı yarım fren",
  "Yerçekimi sensörü eğim direksiyonuna (TS tiltSteer) gitti",
  "Ortala düğmesi mevcut eğimi sıfır yaptı",
  "Dokunmatik NİTRO tuşu nitroyu açtı",
  "Dokunmatik skill yuvası basılı: Volt Kanat açık",
  "Parmak kalkınca Volt Kanat bırakıldı",
  "Klavye 1 skill yuvası basılı",
  "Odak kaybında ham girişler sıfırlandı (TS girdiSifirla)",
  "KAMERA düğmesi kipi değiştirdi",
  "↺ serbest sürüşte aracı durdurup yere koydu",
  "DURAKLAT düğmesi oyunu duraklattı",
  "AYAR düğmesi ayarlar ekranını açtı",
  "Ayarlar kapatınca dosyaya yazıldı ve yeniden yüklendi",
  "Tercihler yeniden açılışta aynı",
  "Hıza duyarlı direksiyon/yumuşatma tercihi canlı araca uygulandı",
  "Mevcut kariyer, Mutant ve ayar dosyaları aynı hash'te",
  "Koşudan ana menüye dönüldü",
];
for (const c of required)
  if (!p.checks.some((x) => x === c || x.startsWith(c + " [")))
    throw Error("Eksik P5 kontrol davranışı: " + c);
const hash = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|meta|json|unity)$/.test(f));
if (files.length !== p.sources.length) throw Error("P5 kontrol Play kaynak kapsamı değişti");
for (const f of files) {
  const name = "Assets/LastTurn/" + f.replaceAll("\\", "/");
  if (!p.sources.some((s) => s.path === name && s.sha256 === hash(path.join(root, name))))
    throw Error("Eski P5 kontrol Play kaynağı: " + name);
}
for (const f of p.userFiles)
  if (!fs.existsSync(f.path) || hash(f.path) !== f.sha256)
    throw Error("Mevcut oyuncu dosyası değişmiş: " + f.path);
const current = p.userRoots
  .flatMap((r) =>
    fs.existsSync(r)
      ? fs
          .readdirSync(r, { recursive: true })
          .map((f) => path.join(r, f))
          .filter((f) => fs.statSync(f).isFile())
      : [],
  )
  .sort();
const norm = (f) => path.normalize(f);
if (JSON.stringify(current.map(norm).sort()) !== JSON.stringify(p.userFiles.map((f) => norm(f.path)).sort()))
  throw Error("Oyuncu dizininde dosya listesi değişmiş");
console.log(
  `P5 kontroller Play: ${p.checks.length} kontrol, ${p.frames} kare, ekran ${p.screen}; klavye/dokunmatik/eğim/otomatik gaz/odak/ayar kalıcılığı; ${p.userFiles.length} oyuncu dosyası korundu; ${files.length} güncel kaynak; ${p.utc}. Input System sanal cihaz simülasyonudur; gerçek telefon dokunma ve sensör doğrulaması değildir.`,
);
