import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, relative, extname } from "node:path";

const unity = resolve(import.meta.dirname, "..");
const fixture = join(unity, "Logs/P7StoreEditor");
const core = JSON.parse(await readFile(join(unity, "../tests/cikti/mutant-navigation.json"), "utf8"));
const feedback = JSON.parse(await readFile(join(unity, "../tests/cikti/mutant-road-feedback.json"), "utf8"));
const play = JSON.parse(await readFile(join(fixture, "Logs/pacing-play.json"), "utf8"));
if (
  core.result !== "mutant-navigation-passed" ||
  core.checks < 2304 ||
  core.seeds !== 64 ||
  core.regions !== 3
)
  throw new Error("64 tohum / 3 bölge yönlendirme kanıtı eksik.");
if (play.result !== "pacing-play-passed" || play.error || play.errors.length || !play.checks.length)
  throw new Error("Dolaşım Unity Play başarısız veya boş.");
async function hash(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
if (feedback.result !== "mutant-road-feedback-passed" || feedback.checks < 254)
  throw new Error("Gerçek ödül sınır kanıtı eksik.");
for (const source of [...core.sources, ...feedback.sources])
  if ((await hash(join(unity, "Assets/LastTurn", source.path))) !== source.hash.toLowerCase())
    throw new Error("Eski yönlendirme kanıtı: " + source.path);
async function files(path) {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) result.push(...(await files(child)));
    else if ([".cs", ".uss", ".json", ".jpg"].includes(extname(child))) result.push(child);
  }
  return result;
}
const current = await files(join(unity, "Assets/LastTurn"));
const sources = new Map(play.sources.map((s) => [s.path, s.hash.toLowerCase()]));
if (sources.size !== current.length) throw new Error("Play kaynak kapsamı değişti.");
for (const path of current) {
  const name = relative(unity, path).replaceAll("\\", "/");
  if (sources.get(name) !== (await hash(path))) throw new Error("Eski Play kaynağı: " + name);
}
const required = [
  "pacing-world-1280",
  "pacing-world-1920",
  "pacing-world-3840",
  "pacing-city-1280",
  "pacing-city-1920",
  "pacing-reward-1280",
  "pacing-summary-1280",
  "pacing-summary-1920",
];
for (const name of required)
  if (!play.images.includes("Logs/engagement-" + name + ".png")) throw new Error("Eksik görüntü: " + name);
for (const name of play.images) {
  if (!/^Logs\/engagement-pacing-[a-z-]+-(1280|1920|3840)\.png$/.test(name))
    throw new Error("Görüntü yolu geçersiz.");
  const png = await readFile(join(fixture, name)),
    width = Number(name.match(/-(1280|1920|3840)\.png$/)[1]);
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width * 9) / 16)
    throw new Error("Görüntü boyutu geçersiz.");
}
console.log(
  `Dolaşım: Core ${core.checks}, Unity ${play.checks.length}, ${play.images.length} görüntü, ${sources.size} güncel kaynak; runtime 0.`,
);
if (process.argv.includes("--build")) {
  const build = JSON.parse(await readFile(join(fixture, "Logs/pacing-build.json"), "utf8"));
  if (build.result !== "Succeeded" || build.errors !== 0) throw new Error("Yeni Windows build başarısız.");
  const built = new Map(build.sources.map((s) => [s.path, s.hash.toLowerCase()]));
  if (built.size !== sources.size || [...sources].some(([p, h]) => built.get(p) !== h))
    throw new Error("Build/Play kaynakları farklı.");
  const folder = join(unity, "Builds/EngagementWindows-20261117");
  if ((await readFile(join(folder, "LastTurn.exe"))).toString("ascii", 0, 2) !== "MZ")
    throw new Error("Windows ürünü eksik.");
  const proofs = await Promise.all(
    ["write", "reload"].map(async (pass) =>
      JSON.parse(await readFile(join(folder, "Validation/player-" + pass + "-proof.json"), "utf8")),
    ),
  );
  for (const p of proofs)
    if (
      p.result !== "player-passed" ||
      p.error ||
      p.errors.length ||
      p.platform !== "WindowsPlayer" ||
      Date.parse(p.utc) < Date.parse(build.utc)
    )
      throw new Error("Windows süreç kabulü geçersiz.");
  if (
    proofs[0].checks.length < 25 ||
    proofs[1].checks.length < 15 ||
    !proofs[1].checks.includes("Yeni süreç aynı garajı yükledi")
  )
    throw new Error("İki süreç kayıt kanıtı eksik.");
  console.log(
    `Windows 17 Kasım: build 0 hata; iki ayrı süreç ${proofs[0].checks.length} + ${proofs[1].checks.length}; garaj/ayar/parça yüklendi.`,
  );
}
