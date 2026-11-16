import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, relative, extname } from "node:path";

const unity = resolve(import.meta.dirname, "..");
const fixture = join(unity, "Logs/P7StoreEditor");
const core = JSON.parse(await readFile(join(unity, "../tests/cikti/engagement-core.json"), "utf8"));
const play = JSON.parse(await readFile(join(fixture, "Logs/engagement-play.json"), "utf8"));
if (core.result !== "engagement-passed" || core.checks < 1250 || core.events !== 40)
  throw new Error("40 etkinlik hedef sınırları ve salt özet kanıtı gerekli.");
if (play.result !== "engagement-play-passed" || play.error || play.errors.length || play.images.length !== 10)
  throw new Error("Unity Play, 5 yüzey / 2 çözünürlük veya runtime kanıtı eksik.");
async function hash(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
for (const source of core.sources)
  if ((await hash(join(unity, "Assets/LastTurn", source.path))) !== source.sha256.toLowerCase())
    throw new Error("Eski Core kanıtı: " + source.path);
async function files(path) {
  const result = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    const child = join(path, item.name);
    if (item.isDirectory()) result.push(...(await files(child)));
    else if ([".cs", ".uss", ".json", ".jpg"].includes(extname(child))) result.push(child);
  }
  return result;
}
const current = await files(join(unity, "Assets/LastTurn"));
const sources = new Map(play.sources.map((source) => [source.path, source.hash.toLowerCase()]));
if (sources.size !== current.length) throw new Error("Play kaynak kapsamı değişti.");
for (const path of current) {
  const name = relative(unity, path).replaceAll("\\", "/");
  if (sources.get(name) !== (await hash(path))) throw new Error("Eski Play kanıtı: " + name);
}
for (const name of play.images) {
  if (!/^Logs\/engagement-[a-z-]+-(1280|1920)\.png$/.test(name)) throw new Error("Geçersiz görüntü yolu.");
  const png = await readFile(join(fixture, name));
  const width = Number(name.match(/-(1280|1920)\.png$/)[1]);
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width * 9) / 16)
    throw new Error("Görüntü çözünürlüğü yanlış: " + name);
}
console.log(
  `Ustalık: Core ${core.checks} / 40 etkinlik; Unity ${play.checks.length} kontrol / 10 görüntü, ${sources.size} güncel kaynak, runtime 0.`,
);
