import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
// P4 gerçek Unity Play kanıtı: nitro + beş skill + kombinasyon; güncel kaynak hash'i ve oyuncu dosyası koruması.
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p5-progress.json"), "utf8"));
if (p.result !== "mutant-progress-play-passed") throw Error("P5 kontrol Play başarısız: " + p.error);
if (p.unityVersion !== "6000.3.9f1" || !Array.isArray(p.runtimeErrors) || p.runtimeErrors.length)
  throw Error("P5 kontrol Play Editor/çalışma hatası kanıtı geçersiz");
const required = [
  "Doğal pasif seçimi dünyayı açtı",
  "Bölge 1 hub dünyası",
  "Son Nefes: süre ilk dolunca bir kez 90 sn eklendi",
  "Süre dolunca boss paneli açıldı (TS sureDoldu)",
  "Hava tutuşu boss yarışı ve rakip dünyasına uygulandı",
  "Boss yarışı başladı:",
  "Evrimli Volt Kanat (Fırtına Kanadı) uçarken rakibe elektrik uyguladı",
  "Boss yarışı gerçek fizikte bitti",
  "Boss galibiyeti: bölge 2, yeni boss, sayaç",
  "Bölge 2: Kule Şehri açık dünyası açıldı",
  "Şehirde kanca gerçek dünya bağlantısına atıldı",
  "Mutant kariyer bakiyesi ilerlemesi ve profili değiştirmedi",
  "Mevcut kariyer ve Mutant oyuncu dosyaları aynı hash'te",
  "Koşudan ana menüye dönüldü",
];
for (const c of required)
  if (!p.checks.some((x) => x.startsWith(c))) throw Error("Eksik P5 ilerleme davranışı: " + c);
if (!(p.bossWon && p.raceGrip < 1 && p.evolvedStatus > 0 && p.cityHook && p.bossSteps > 300))
  throw Error("P5 ilerleme ölçümleri eksik");
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
  `P5 Mutant ilerleme Play: ${p.checks.length} kontrol; boss ${p.bossName} ${p.bossSeconds.toFixed(2)} sn gerçek fizikle kazanıldı (yağmur tutuşu ${p.raceGrip}), bölge ${p.regionAfter} şehir, kanca ${p.cityHook}, evrimli skill durumu ${p.evolvedStatus}; ${p.userFiles.length} oyuncu dosyası korundu; ${files.length} güncel kaynak; ${p.utc}. Otomatik Play, insan oynanış kabulü değildir.`,
);
