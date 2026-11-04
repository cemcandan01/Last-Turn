// P1: gerçek TS ilerleme işlemleri; UI profil adı ve sürüş km blokları kaynaktan çalıştırılır.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true }),
  p = L.load("src/oyun/ilerleme"),
  profile = L.load("src/oyun/profil");
function source(file) {
  const s = execFileSync(
    "git",
    ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", `${baseline}:${file}`],
    { cwd: root, encoding: "utf8" },
  );
  L.sources[file] = createHash("sha256").update(s).digest("hex");
  return s;
}
const rename = source("src/arayuz/menu.ts").match(
  /PROF\.name = nm\.value\.trim\(\)\.slice\(0, 20\) \|\| "Sürücü";/,
)?.[0];
const distance = source("src/oyun/surus.ts").match(
  /PROF\.km \+= \(Math\.hypot\(S\.vx, S\.vz\) \* ADIM\) \/ 1000;/,
)?.[0];
if (!rename || !distance) throw new Error("TS profil blokları değişti.");
const names = ["  Cem  ", "", "  ", "1234567890123456789012345", "\ufeffSürücü\ufeff"].map((input) => {
  new Function("PROF", "nm", rename)(profile.PROF, { value: input });
  return { input, name: profile.PROF.name };
});
const drove = [
  [3, 4, 1 / 60],
  [-12, 5, 20],
  [0, 0, 1],
  [32, -4, 0.1],
].map(([vx, vz, dt]) => {
  new Function("PROF", "S", "ADIM", distance)(profile.PROF, { vx, vz }, dt);
  return { vx, vz, dt, km: profile.PROF.km };
});
const ops = [];
for (const type of ["gp", "rx", "rl", "dp", "dg"])
  for (const stars of [1, 3, 0, 2, 3]) ops.push({ type, level: 1, stars });
// Kupaların sonuna kadar kapı grafiği: fizik tekrar çalıştırılmaz, gerçek ödül/kapı işlemi yürür.
for (const type of ["gp", "rx", "rl", "dp", "dg"])
  for (let level = 2; level <= 8; level++) ops.push({ type, level, stars: 3 });
function state() {
  // Bulut eşitleme saati oyun kuralı değildir; export-garage hattıyla aynı kalıcı oyun alanlarını karşılaştır.
  const { updatedAt, ...progress } = p.ilerlemeVerisi();
  return {
    progress,
    money: p.para(),
    level: p.seviye().lv,
    open: Object.fromEntries(
      ["gp", "rx", "rl", "dp", "dg"].flatMap((t) =>
        Array.from({ length: 8 }, (_, i) => [t + "_" + (i + 1), p.pistAcikMi(t, i + 1)]),
      ),
    ),
  };
}
const initial = state();
const steps = ops.map((op) => {
  const reward = p.yarisBitti(op.type, op.level, op.stars);
  const before = state();
  p.ilerlemeSifirla();
  const after = state();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("TS yeniden yükleme farkı");
  return { op, reward, ...after };
});
const data = { baseline, sources: L.sources, names, drove, initial, steps };
const target = path.join(root, "Unity/Validation/Reference/career-flow-0.8.18.json"),
  output = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw new Error("P1 oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `P1 TS: ${steps.length} ödül/yükleme geçişi × 40 kapı; ${names.length} ad, ${drove.length} yol girdisi.`,
);
