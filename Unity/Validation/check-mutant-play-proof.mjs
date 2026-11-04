import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p3-play.json"), "utf8"));
if (p.result !== "mutant-play-passed") throw Error("Mutant Play başarısız: " + p.error);
if (p.unityVersion !== "6000.3.9f1" || !Array.isArray(p.runtimeErrors) || p.runtimeErrors.length)
  throw Error("Mutant Play Editor/çalışma hatası kanıtı geçersiz");
const required = [
  "Ana menüden Mutant başlangıç komutu",
  "Tohumlu doğal koşu başlangıcı",
  "Kaynak üç başlangıç aracı",
  "Başlangıç araç seçimi saf oturuma bağlandı",
  "Kaynak başlangıç pasif seçimi",
  "Doğal pasif seçimi dünyayı açtı",
  "Mutant açık dünyası gerçek çevre ve araç fiziğiyle açıldı",
  ...["shop", "chest", "event", "boss"].map(
    (panel) => "Gerçek sabit fizik adımı işaret kapısını açtı: " + panel,
  ),
  "Atölye yetersiz koşu parasıyla satışı reddetti",
  "Atölye gerçek koşu parasıyla parça sattı",
  "Atölye sonrası canlı fizik kurulumu güncellendi",
  "Sandık tek kaynak ödülü sundu",
  "Sandık gerçek ödülü bir kez uyguladı",
  "Dünya etkinlik işareti doğru yarış odasını seçti",
  "Etkinlik kariyer ödülü ve hayaletinden ayrı",
  "Mutant etkinliğinde gerçek fiziksel rakip",
  "Gerçek etkinlik bitişi koşu sonuç ekranına döndü",
  "Gerçek yarış bitiş callback'i etkinliği bir kez tamamladı",
  "Gerçek yarış sonucu koşu para ve XP ödülünü uyguladı",
  "Etkinlik gerçek motor gövde adımlarıyla tamamlandı",
  "Etkinlikten açık dünya koşusuna dönüldü",
  "Kaynak tohumlu boss korundu",
  "Boss gerçek kaynak araç ve YZ fiziğiyle başladı",
  "Boss sonucu gerçek rakip bitiş sırasından kayıp oldu",
  "Doğal koşu boss kaybıyla başlangıçtan sona tamamlandı",
  "Boss oyuncu ve rakibi gerçek motor gövde adımlarıyla tamamladı",
  "Koşu bitiş rekoru ayrı Mutant dosyasına yazılıp yeniden yüklendi",
  "Mutant kariyer bakiyesi ilerlemesi ve profili değiştirmedi",
  "Mevcut kariyer ve Mutant oyuncu dosyaları aynı hash'te",
  "Koşu özetinden ana menüye dönüldü",
];
for (const c of required) if (!p.checks.includes(c)) throw Error("Eksik Mutant Play davranışı: " + c);
if (p.eventPhysicsSteps <= 300 || p.bossPhysicsSteps <= 300 || p.eventSeconds <= 5 || p.bossSeconds <= 5)
  throw Error("Gerçek fiziksel yarış kanıtı eksik");
const hash = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|meta|json|unity)$/.test(f));
if (files.length !== p.sources.length) throw Error("Mutant Play kaynak kapsamı değişti");
for (const f of files) {
  const name = "Assets/LastTurn/" + f.replaceAll("\\", "/");
  if (!p.sources.some((s) => s.path === name && s.sha256 === hash(path.join(root, name))))
    throw Error("Eski Mutant Play kaynağı: " + name);
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
for (const name of ["p3-event.png", "p3-summary.png"]) {
  const f = path.join(root, "Logs", name);
  if (!fs.existsSync(f) || fs.statSync(f).size < 1000) throw Error("Eksik kamera kanıtı: " + name);
}
console.log(
  `P3 gerçek Unity Play: ${p.checks.length} kontrol; doğal başlangıç/seçim/dünya/işaret/atölye/sandık, etkinlik ${p.eventSeconds.toFixed(2)}sn/${p.eventPhysicsSteps} fizik adımı, boss kaybıyla koşu bitişi ${p.bossSeconds.toFixed(2)}sn/${p.bossPhysicsSteps} fizik adımı; ${p.userFiles.length} oyuncu dosyası korundu; ${files.length} güncel kaynak; ${p.utc}. Otomatik Play, insan oynanış kabulü değildir. ${p.batch ? "Batch kamera render'ı IMGUI/etkileşimli UI kanıtı değildir." : ""}`,
);
