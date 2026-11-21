import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, relative, extname } from "node:path";

const unity = resolve(import.meta.dirname, "..");
const fixture = resolve(unity, "Logs/P7StoreEditor");
const proof = JSON.parse(await readFile(join(fixture, "Logs/pit-ui-play.json"), "utf8"));
if (proof.result !== "pit-ui-play-passed" || proof.error || proof.errors?.length)
  throw new Error("Pit Play başarısız veya çalışma hatası var.");
if (!proof.checks?.length || proof.images?.length !== 38)
  throw new Error("19 yüzeyin iki çözünürlükte kanıtı gerekli.");

async function files(directory) {
  const out = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) out.push(...(await files(path)));
    else if ([".cs", ".uss", ".jpg"].includes(extname(path))) out.push(path);
  }
  return out;
}
const current = await files(join(unity, "Assets/LastTurn"));
const sources = new Map(proof.sources.map((source) => [source.path, source.hash.toLowerCase()]));
if (sources.size !== current.length) throw new Error("Pit kaynak kapsamı değişti.");
for (const path of current) {
  const name = relative(unity, path).replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  if (sources.get(name) !== hash) throw new Error("Eski/eksik Pit kanıtı: " + name);
}
for (const name of proof.images) {
  if (!/^Logs\/pit-[a-z0-9-]+-(1280|1920)\.png$/.test(name)) throw new Error("Geçersiz görüntü yolu.");
  const png = await readFile(join(fixture, name));
  const width = Number(name.match(/-(1280|1920)\.png$/)[1]);
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width * 9) / 16)
    throw new Error("Görüntü çözünürlüğü uyuşmuyor: " + name);
}
console.log(
  `Pit UI Play: ${proof.checks.length} kontrol, ${proof.images.length} görüntü, ${current.length} güncel kaynak; ${proof.utc}.`,
);
console.log(
  "Grafik batch panel/kamera kanıtı; insan kabulü, fiziksel giriş veya tam koşu regresyonu değildir.",
);
