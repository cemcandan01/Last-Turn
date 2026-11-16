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
if (process.argv.includes("--build")) {
  const build = JSON.parse(await readFile(join(fixture, "Logs/engagement-build.json"), "utf8"));
  if (build.result !== "Succeeded" || build.errors !== 0) throw new Error("Windows build başarısız.");
  const built = new Map(build.sources.map((s) => [s.path, s.hash.toLowerCase()]));
  if (built.size !== sources.size || [...sources].some(([p, h]) => built.get(p) !== h))
    throw new Error("Build ile Play kaynakları farklı.");
  const output = join(unity, "Builds/EngagementWindows-20261116");
  const exe = await readFile(join(output, "LastTurn.exe"));
  if (exe.toString("ascii", 0, 2) !== "MZ") throw new Error("Windows ürünü eksik.");
  const write = JSON.parse(await readFile(join(output, "Validation/player-write-proof.json"), "utf8"));
  const reload = JSON.parse(await readFile(join(output, "Validation/player-reload-proof.json"), "utf8"));
  for (const p of [write, reload]) {
    if (
      p.result !== "player-passed" ||
      p.error ||
      p.errors.length ||
      p.platform !== "WindowsPlayer" ||
      !p.checks.length
    )
      throw new Error("Windows süreç kabulü eksik: " + p.pass);
    if (Date.parse(p.utc) < Date.parse(build.utc)) throw new Error("Eski Windows süreç kanıtı.");
  }
  // İkinci süreç yüklemeden sonra yeniden sürüş başlatır; bitiş hash'lerinin aynı olması beklenmez.
  // Açılıştaki tam State.Snapshot eşitliği gerçek runtime kontrolünde sınanır.
  if (
    write.checks.length < 25 ||
    reload.checks.length < 15 ||
    ![write, reload].every((p) => /^[A-F0-9]{64}$/.test(p.saveHash)) ||
    !reload.checks.includes("Yeni süreç aynı garajı yükledi") ||
    !reload.checks.includes("Yeni süreç satın alınan parçayı yükledi") ||
    !reload.checks.includes("Yeni süreç ayarları yükledi")
  )
    throw new Error("İki süreçte kayıt yükleme kanıtı eksik.");
  console.log(
    `Windows: build 0 hata; ilk süreç ${write.checks.length}, yeniden açılış ${reload.checks.length} kontrol; tam garaj kaydı ve ayarlar yeniden yüklendi.`,
  );
}
