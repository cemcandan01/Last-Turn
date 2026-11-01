import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, ".."),
  p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p2-play.json"), "utf8"));
if (p.result !== "p2-play-passed") throw new Error("P2 Play başarısız: " + p.error);
if (p.unityVersion !== "6000.3.9f1" || !Array.isArray(p.runtimeErrors) || p.runtimeErrors.length)
  throw new Error("P2 Editor sürümü/çalışma hatası kanıtı geçersiz");
for (const key of ["gp_1", "rx_1", "rl_1", "dg_1"])
  for (const prefix of [
    "Gerçek fiziksel YZ, kariyer ödülü yok ",
    "Oyuncu ve fiziksel YZ bitti ",
    "Sonuç/sıralama bağlı ",
    "YZ denemesi kariyer/profil/ödülü değiştirmedi ",
  ])
    if (!p.checks.some((c) => c.startsWith(prefix + key)))
      throw new Error("Eksik P2 davranışı: " + prefix + key);
for (const key of ["hub", "park", "city"])
  if (!p.checks.includes("Gerçek açık dünya ve kaynak engeller " + key))
    throw new Error("Eksik dünya: " + key);
for (const check of [
  "Gerçek araç çevre darbesi ve hit olayı",
  "Gerçek sınır duvarı aracı alanda tuttu",
  "Çevre sonrası kariyer ödülü/yıldız yeniden yüklendi",
  "Oyuncu kayıtları korundu",
])
  if (!p.checks.includes(check)) throw new Error("Eksik P2 davranışı: " + check);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|meta|json|unity)$/.test(f));
if (files.length !== p.sources.length) throw new Error("P2 kaynak kapsamı değişti");
for (const f of files) {
  const name = "Assets/LastTurn/" + f.replaceAll("\\", "/"),
    hash = createHash("sha256")
      .update(fs.readFileSync(path.join(root, name)))
      .digest("hex");
  if (!p.sources.some((s) => s.path === name && s.sha256 === hash))
    throw new Error("Eski P2 kaynağı: " + name);
}
console.log(
  `P2 gerçek Unity Play: ${p.checks.length} kontrol, dört fiziksel rakipli yarış, üç dünya, engel/sınır, kariyer ödülü/yükleme; ${files.length} güncel kaynak; ${p.utc}. Otomatik Play, insan oynanış kabulü değildir.`,
);
