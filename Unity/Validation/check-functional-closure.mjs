import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const hash = (b) => createHash("sha256").update(b).digest("hex").toUpperCase();
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const assets = files(path.join(root, "Assets/LastTurn")).filter((f) => /\.(cs|uss|json|png|wav)$/.test(f));
const playerAssets = assets.filter((f) => !f.replaceAll("\\", "/").includes("/Editor/"));
const buildDir = path.join(root, "Builds/FunctionalWindows");
const manifestPath = path.join(buildDir, "source-proof.json");
if (process.argv.includes("--record-build")) {
  const summary = fs.readFileSync(
    path.join(root, "Logs/P7HudCleanEditor/Logs/functional-build-result.txt"),
    "utf8",
  );
  if (!summary.startsWith("Succeeded / errors=0 /")) throw Error("Başarılı build sonucu yok");
  const sources = playerAssets.map((f) => {
    const rel = path.relative(root, f),
      b = fs.readFileSync(f),
      scratch = path.join(root, "Logs/P7HudCleanEditor", rel);
    if (hash(b) !== hash(fs.readFileSync(scratch))) throw Error("Build kaynak kopyası farklı: " + rel);
    return { path: rel.replaceAll("\\", "/"), hash: hash(b) };
  });
  const binaries = files(buildDir)
    .filter((f) => !f.includes(path.sep + "Validation" + path.sep) && f !== manifestPath)
    .map((f) => ({ path: path.relative(buildDir, f).replaceAll("\\", "/"), hash: hash(fs.readFileSync(f)) }));
  const builtUtc = fs
    .statSync(path.join(buildDir, "LastTurn_Data/Managed/Assembly-CSharp.dll"))
    .mtime.toISOString();
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ utc: new Date().toISOString(), builtUtc, summary, sources, binaries }, null, 2) + "\n",
  );
  console.log("Windows build kaynak/kopya ve " + binaries.length + " ürün dosyası hash kaydı.");
  process.exit(0);
}
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-closure-play.json"), "utf8"));
if (
  p.result !== "b-closure-passed" ||
  p.error ||
  p.runtimeErrors.length ||
  // Yalnız oyun koduna değmeyen Editor tanıları (çevrimdışı Package Manager, Search) ayrı listede kabul edilir.
  p.editorDiagnostics.some(
    (d) => !d.startsWith("[Package Manager Window]") && !d.includes("UnityEditor.Search"),
  )
)
  throw Error("Bina/doğal süre Play başarısız");
const playAssets = assets.filter((f) => !f.endsWith(".wav"));
if (p.sources.length !== playAssets.length) throw Error("Play kaynak kapsamı eski");
for (const f of playAssets) {
  const rel = path.relative(root, f).replaceAll("\\", "/");
  if (!p.sources.some((s) => s.path === rel && s.hash === hash(fs.readFileSync(f))))
    throw Error("Play eski kaynak: " + rel);
}
for (const label of [
  "Dogal baslangic 900 saniye kisaltilmadi",
  "Dogal sayac sifir boss paneli",
  "900 saniye gercek sabit adim gecisi",
  "Iki gercek sarkac fizik ciktisi",
  "Ucustan gercek yere temas",
  "Kariyer profil ayni",
  "Kalici kayit hashleri ayni",
])
  if (!p.checks.includes(label)) throw Error("Eksik davranış: " + label);
for (const phase of ["bind-first", "bind-reuse"])
  if (
    !p.attempts.some(
      (a) => a.phase === phase && a.kind === "gok" && a.open && Math.hypot(a.appliedX, a.appliedZ) > 0,
    )
  )
    throw Error("Gerçek bina bağı/fizik yok: " + phase);
for (const phase of ["release-first", "release-second"])
  if (!p.attempts.some((a) => a.phase === phase && !a.open && Math.hypot(a.appliedX, a.appliedZ) === 0))
    throw Error("Gerçek bırakma yok: " + phase);
for (const name of [
  "natural-boss",
  "target-building",
  "bound-first",
  "cooldown",
  "target-reuse",
  "bound-reuse",
  "cooldown-reuse",
])
  for (const w of [1280, 1920]) {
    const f = `b-closure-${name}-${w}.png`,
      b = fs.readFileSync(path.join(root, "Logs", f));
    if (!p.images.includes(f) || b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== (w === 1280 ? 720 : 1080))
      throw Error("Game View eksik/yanlış: " + f);
  }
const build = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (build.sources.length !== playerAssets.length) throw Error("Build kaynak kapsamı eski");
for (const s of build.sources)
  if (hash(fs.readFileSync(path.join(root, s.path))) !== s.hash) throw Error("Eski build kaynağı: " + s.path);
for (const b of build.binaries)
  if (hash(fs.readFileSync(path.join(buildDir, b.path))) !== b.hash)
    throw Error("Build dosyası farklı: " + b.path);
for (const pass of ["write", "reload"]) {
  const proof = JSON.parse(
    fs.readFileSync(path.join(buildDir, `Validation/player-${pass}-proof.json`), "utf8"),
  );
  if (
    proof.result !== "player-passed" ||
    proof.error ||
    proof.errors.length ||
    proof.platform !== "WindowsPlayer" ||
    Date.parse(proof.utc) < Date.parse(build.builtUtc)
  )
    throw Error("Bağımsız player kabulü eksik/eski: " + pass);
  console.log(`WindowsPlayer ${pass}: ${proof.checks.length} kontrol / ${proof.utc}.`);
}
if (process.argv.includes("--career")) {
  const career = JSON.parse(fs.readFileSync(path.join(root, "Logs/functional-career-play.json"), "utf8"));
  if (career.result !== "p1-play-passed" || career.error || career.checks.length < 65)
    throw Error("Kariyer kabulü başarısız/eksik");
  const log = fs.readFileSync(path.join(root, "Logs/functional-career-editor.log"), "utf8");
  if (/(?:^|\n)[^\n]*\b(?:[A-Za-z]+Exception:|error CS\d{4})/.test(log))
    throw Error("Kariyer Editor logunda hata/istisna");
  for (const f of assets.filter((f) => f.endsWith(".cs"))) {
    const rel = path.relative(root, f).replaceAll("\\", "/");
    if (!career.sources.some((s) => s.path === rel && s.sha256.toUpperCase() === hash(fs.readFileSync(f))))
      throw Error("Kariyer C# kaynağı eski: " + rel);
  }
  console.log(
    `Kariyer ${career.checks.length} Play kontrolü, bütün mevcut C# hashleri aynı; ${career.utc}. Klon sahne/meta için eski genel checker kabulü değildir.`,
  );
}
console.log(
  `Bina/doğal süre: ${p.checks.length} Play / ${p.images.length} Game View / ${p.sources.length} güncel kaynak; ${p.utc}. İnsan/cihaz kabulü değildir.`,
);
