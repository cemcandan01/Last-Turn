import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
// P4 gerçek Unity Play kanıtı: nitro + beş skill + kombinasyon; güncel kaynak hash'i ve oyuncu dosyası koruması.
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p4-play.json"), "utf8"));
if (p.result !== "mutant-ability-play-passed") throw Error("P4 Play başarısız: " + p.error);
if (p.unityVersion !== "6000.3.9f1" || !Array.isArray(p.runtimeErrors) || p.runtimeErrors.length)
  throw Error("P4 Play Editor/çalışma hatası kanıtı geçersiz");
const required = [
  "Enerji/skill yürütücüsü Mutant oturumuna bağlandı",
  "Doğal pasif seçimi dünyayı açtı",
  "N komutu nitroyu açtı, enerjiyi harcadı ve canlı fizik gücü yeniden kurdu",
  "Nitro süresi doldu",
  "Nitro gerçek fizikte aynı sürüşe göre ek hız kazandırdı",
  "Enerji yetmeyince nitro açılmadı",
  "Volt Kanat basılıyken araç gerçek fizikte yükseldi",
  "Uçuşta nitro burun itkisine HAVA_NITRO ekledi (kombinasyon)",
  "Havada sürükleme burun denetimine verildi",
  "Tuş bırakılınca Volt Kanat süzülerek indi",
  "Hayalet fazı fiziğe katı engel geçişi olarak verildi",
  "Hayalet fazında çarpma hasarı engellendi (KorumaEngelledi)",
  "Hayalet araç katı engelin içinden çarpmadan geçti",
  "Hayalet geçişi gövde hasarı vermedi",
  "Gerçek kontrollü drift Risk Taker dönüşümünü açtı ve güç fiziğe geçti",
  "Hub'da köşe/rakip yokken kanca yuvası HEDEF YOK gösterdi",
  "Hedefsiz kanca isteği reddedildi, enerji/hak harcanmadı",
  "Mutant etkinliğinde rakip skill etkisine bağlandı",
  "Kanca gerçek rakibe atıldı",
  "Yeniden basış kancayı süre dolmadan bıraktı",
  "Kanca çekişi rakip fiziğine dış ivme olarak uygulandı",
  "Slipstream gerçek rakip arkasında yakın takipte depoladı",
  "Skill'li gerçek etkinlik bitişi koşu sonuç ekranına döndü",
  "Mutant kariyer bakiyesi ilerlemesi ve profili değiştirmedi",
  "Mevcut kariyer ve Mutant oyuncu dosyaları aynı hash'te",
  "Koşudan ana menüye dönüldü",
];
for (const c of required)
  if (!p.checks.some((x) => x === c || x.startsWith(c + " ("))) throw Error("Eksik P4 Play davranışı: " + c);
if (!(
  p.nitroSpeedGain > 0.2 &&
  p.flightHeight > 3 &&
  p.flightSteps > 60 &&
  p.airNitroForward >= 23 - 1e-9 &&
  p.ghostPassMetres > 2 &&
  p.ghostCollisions === 0 &&
  p.riskPower > 1 &&
  p.hookSteps > 0 &&
  p.hookPull > 0 &&
  p.slipstreamStored > 0 &&
  p.eventPhysicsSteps > 300
))
  throw Error("P4 gerçek fizik ölçümleri eksik");
const hash = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|meta|json|unity)$/.test(f));
if (files.length !== p.sources.length) throw Error("P4 Play kaynak kapsamı değişti");
for (const f of files) {
  const name = "Assets/LastTurn/" + f.replaceAll("\\", "/");
  if (!p.sources.some((s) => s.path === name && s.sha256 === hash(path.join(root, name))))
    throw Error("Eski P4 Play kaynağı: " + name);
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
  `P4 gerçek Unity Play: ${p.checks.length} kontrol; nitro +${p.nitroSpeedGain.toFixed(2)} m/s, Volt Kanat ${p.flightHeight.toFixed(1)} m/${p.flightSteps} hava adımı + havada nitro ${p.airNitroForward}, hayalet ${p.ghostPassMetres.toFixed(1)} m çarpışmasız, Risk Taker ×${p.riskPower} (${p.riskSteps} adım), kanca ${p.hookSteps} adım/rakibe ${p.hookPull.toFixed(1)} m/s², Slipstream ${p.slipstreamStored.toFixed(2)} sn; etkinlik ${p.eventPhysicsSteps} fizik adımı; ${p.userFiles.length} oyuncu dosyası korundu; ${files.length} güncel kaynak; ${p.utc}. Otomatik Play, insan oynanış ve dokunmatik kabulü değildir.`,
);
