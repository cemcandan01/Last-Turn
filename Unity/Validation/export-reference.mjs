// Sabit TS 0.8.18 matematiğini çalıştırır; kaynak dosyalarını değiştirmez, bağımlılık indirmez.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
const sources = ["src/fizik/yeni/lastik.ts", "src/fizik/yeni/model.ts", "src/cekirdek/rastgele.ts"];
const texts = sources.map((p) =>
  execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "-C", root, "show", baseline + ":" + p],
    { encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } },
  ),
);

function extract(text, name) {
  const start = text.indexOf("function " + name + "(");
  if (start < 0) throw new Error("Kaynak fonksiyon bulunamadı: " + name);
  let end = text.indexOf("{", start),
    depth = 1;
  for (end++; depth && end < text.length; end++) {
    if (text[end] === "{") depth++;
    if (text[end] === "}") depth--;
  }
  if (depth) throw new Error("Fonksiyon sınırı geçersiz: " + name);
  // Yalnız bu sabit kaynağın skaler imzaları; genel TypeScript dönüştürücüsü değildir.
  return text.slice(start, end).replace(/:\s*(number|LastikParam|LastikSonucu|Rastgele)\b/g, "");
}
const bOf = texts[0].split("\n").find((s) => s.startsWith("const bOf = "));
if (!bOf) throw new Error("Lastik eğrisi sabiti eksik");
const code = [
  bOf.replace(/:\s*number\b/g, ""),
  extract(texts[0], "lastikKuvveti"),
  extract(texts[1], "tekerCoz"),
  extract(texts[2], "mulberry32"),
  "({lastikKuvveti,tekerCoz,mulberry32})",
].join("\n");
const oracle = vm.runInNewContext(code, {}, { timeout: 1000 });
const tolerances = { omega: 1e-7, fx: 1e-4, fy: 1e-4, slip: 1e-6, speed: 1e-6, position: 1e-5, angle: 1e-5 };
const parameters = {
  mass: 300,
  radius: 0.34,
  inertia: 1.2 + 4 * 0.34 ** 2,
  load: 300 * 24,
  maxDriveTorque: 500,
  maxBrakeTorque: 1200,
  slipAngle: 0.3,
  tire: { muY: 1.15, muX: 1.15, kp: 0.11, ap: 0.12, C: 1.35 },
};

function scenario(name, seed, initialSpeed, p) {
  const random = oracle.mulberry32(seed),
    rows = [];
  let omega = initialSpeed / p.radius,
    speed = initialSpeed,
    position = 0,
    angle = 0;
  for (let step = 0; step < 600; step++) {
    const throttle = random(),
      brake = random() < 0.2 ? random() : 0,
      control = random() * 2 - 1;
    const force = { Fx: 0, Fy: 0, s: 0 };
    for (let n = 0; n < 8; n++) {
      const h = 1 / 60 / 8;
      omega = oracle.tekerCoz(
        omega,
        p.inertia,
        h,
        p.maxDriveTorque * throttle,
        p.maxBrakeTorque * brake,
        p.radius,
        speed,
        Math.max(Math.abs(speed), 3),
        p.load,
        Math.tan(control * p.slipAngle),
        p.tire,
        force,
      );
      speed += (force.Fx / p.mass) * h;
      position += speed * h;
      angle += omega * h;
    }
    rows.push([throttle, brake, control, omega, force.Fx, force.Fy, force.s, speed, position, angle]);
  }
  return { name, seed, initialSpeed, parameters: p, rows };
}
const cases = [
  [7200, 0, 0],
  [0, 0.2, -0.1],
  [-1, 0.2, 0.1],
  [7200, 0.11, 0],
  [7200, -0.3, 0.3],
].map(([load, kappa, tanAlpha]) => {
  const out = { Fx: 0, Fy: 0, s: 0 };
  oracle.lastikKuvveti(load, kappa, tanAlpha, parameters.tire, out);
  return { load, kappa, tanAlpha, expected: [out.Fx, out.Fy, out.s] };
});
const reference = {
  version: 1,
  baseline,
  dt: 1 / 60,
  substeps: 8,
  scope: "fixed-load longitudinal wheel bench; not full gp3 vehicle replay",
  sources: Object.fromEntries(
    sources.map((p, i) => [p, createHash("sha256").update(texts[i]).digest("hex")]),
  ),
  tolerances,
  tireCases: cases,
  scenarios: [
    scenario("asphalt-forward", 5, 2, parameters),
    scenario("reverse-low-grip", 5, -3, { ...parameters, tire: { ...parameters.tire, muX: 0.6, muY: 0.6 } }),
    scenario("no-contact", 5, 2, { ...parameters, load: 0 }),
  ],
};
const target = path.join(root, "Unity/Validation/Reference/wheel-drive-0.8.18.json");
const content = JSON.stringify(reference) + "\n";
if (process.argv.includes("--check")) {
  // Metadata/inputs stay exact; libm differences across OS/Node versions use the declared output tolerances.
  const stored = JSON.parse(fs.readFileSync(target, "utf8"));
  const metadata = (r) => ({
    ...r,
    scenarios: r.scenarios.map(({ rows, ...s }) => ({ ...s, inputs: rows.map((row) => row.slice(0, 3)) })),
    tireCases: r.tireCases.map(({ expected, ...c }) => c),
  });
  if (JSON.stringify(metadata(stored)) !== JSON.stringify(metadata(reference)))
    throw new Error("Referans kaynak/parametre/girdi sözleşmesi değişti.");
  const limits = Object.values(tolerances);
  function near(actual, expected, limit) {
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) > limit)
      throw new Error("Sabit TS referansı sayısal toleransı aştı; otomatik yenilenmedi.");
  }
  for (let s = 0; s < reference.scenarios.length; s++)
    for (let k = 0; k < 600; k++)
      for (let c = 0; c < 7; c++)
        near(reference.scenarios[s].rows[k][c + 3], stored.scenarios[s].rows[k][c + 3], limits[c]);
  for (let k = 0; k < cases.length; k++)
    for (let c = 0; c < 3; c++) near(cases[k].expected[c], stored.tireCases[k].expected[c], limits[c + 1]);
  console.log("TS 0.8.18 referansı doğrulandı: 3 × 600 adım, orijinal lastik/teker fonksiyonları.");
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  console.log("TS referansı yazıldı: " + target);
}
