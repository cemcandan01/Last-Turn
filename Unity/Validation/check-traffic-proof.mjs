import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, relative, extname } from "node:path";

const unity = resolve(import.meta.dirname, "..");
const fixture = join(unity, "Logs/P7StoreEditor");
const core = JSON.parse(await readFile(join(unity, "../tests/cikti/opponent-traffic.json"), "utf8"));
const play = JSON.parse(await readFile(join(fixture, "Logs/traffic-play.json"), "utf8"));
if (core.result !== "opponent-traffic-passed" || core.checks < 7434 || core.fullRaces.length !== 6)
  throw new Error("İki araç/altın yol/FPS ve tam yarış kanıtı gerekli.");
if (core.fullRaces.filter((r) => r.traffic).some((r) => r.overlaps || r.returns || !r.finished))
  throw new Error("Tam yarış trafik ayrışması başarısız.");
if (
  play.result !== "traffic-play-passed" ||
  play.error ||
  play.errors.length ||
  play.checks.length < 10 ||
  play.images.length !== 6
)
  throw new Error("Unity trafik kanıtı eksik/başarısız.");
async function hash(p) {
  return createHash("sha256")
    .update(await readFile(p))
    .digest("hex");
}
for (const s of core.sources)
  if ((await hash(join(unity, "Assets/LastTurn", s.path))) !== s.hash.toLowerCase())
    throw new Error("Eski Core kanıtı: " + s.path);
async function files(path) {
  const out = [];
  for (const e of await readdir(path, { withFileTypes: true })) {
    const p = join(path, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else if ([".cs", ".uss", ".json", ".jpg"].includes(extname(p))) out.push(p);
  }
  return out;
}
const sources = new Map(play.sources.map((s) => [s.path, s.hash.toLowerCase()]));
const current = await files(join(unity, "Assets/LastTurn"));
if (current.length !== sources.size) throw new Error("Play kaynak kapsamı değişti.");
for (const p of current) {
  const name = relative(unity, p).replaceAll("\\", "/");
  if ((await hash(p)) !== sources.get(name)) throw new Error("Eski Play kaynağı: " + name);
}
for (const name of play.images) {
  if (!/^Logs\/engagement-traffic-[a-z]+-(1280|1920)\.png$/.test(name))
    throw new Error("Geçersiz görüntü yolu.");
  const png = await readFile(join(fixture, name)),
    width = Number(name.match(/-(1280|1920)\.png$/)[1]);
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width * 9) / 16)
    throw new Error("Görüntü boyutu yanlış.");
}
console.log(
  `Trafik: ${core.checks} Core, ${play.checks.length} Unity kontrolü / 6 görüntü / ${sources.size} güncel kaynak; runtime 0.`,
);
if (process.argv.includes("--build")) {
  const build = JSON.parse(await readFile(join(fixture, "Logs/traffic-build.json"), "utf8"));
  if (build.result !== "Succeeded" || build.errors) throw new Error("Windows build başarısız.");
  const built = new Map(build.sources.map((s) => [s.path, s.hash.toLowerCase()]));
  if (built.size !== sources.size || [...sources].some(([p, h]) => built.get(p) !== h))
    throw new Error("Build ve Play kaynakları farklı.");
  const output = join(unity, "Builds/TrafficWindows-20261117");
  if ((await readFile(join(output, "LastTurn.exe"))).toString("ascii", 0, 2) !== "MZ")
    throw new Error("Windows ürünü yok.");
  const proofs = await Promise.all(
    ["write", "reload"].map(async (pass) =>
      JSON.parse(await readFile(join(output, "Validation/player-" + pass + "-proof.json"), "utf8")),
    ),
  );
  for (const p of proofs)
    if (
      p.result !== "player-passed" ||
      p.error ||
      p.errors.length ||
      Date.parse(p.utc) < Date.parse(build.utc)
    )
      throw new Error("Yeni Windows süreç kabulü eksik.");
  if (
    proofs[0].checks.length < 25 ||
    proofs[1].checks.length < 15 ||
    !proofs[1].checks.includes("Yeni süreç aynı garajı yükledi")
  )
    throw new Error("İki süreç kayıt kabulü eksik.");
  console.log(
    `Windows trafik: build 0 hata; iki süreç ${proofs[0].checks.length} + ${proofs[1].checks.length}, kayıtlar yüklendi.`,
  );
}
