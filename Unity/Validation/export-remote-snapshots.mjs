import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "../.."),
  baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05",
  sources = {},
  cache = {};
function load(name) {
  if (cache[name]) return cache[name].exports;
  const text = execFileSync(
    "git",
    ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", baseline + ":" + name],
    { cwd: root },
  ).toString();
  sources[name] = createHash("sha256").update(text).digest("hex");
  const m = { exports: {} };
  cache[name] = m;
  new Function(
    "require",
    "module",
    "exports",
    ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
  )((n) => load(path.posix.normalize(path.posix.join(path.posix.dirname(name), n + ".ts"))), m, m.exports);
  return m.exports;
}
const a = load("src/fizik/anlik.ts"),
  cases = [];
for (const fps of [30, 60, 120]) {
  const u = a.uzakAracYap("test", 0),
    steps = [];
  for (let i = 0; i < 180; i++) {
    let frame = null;
    if (i % 4 === 0 || i === 170) {
      frame = a.bosAnlik();
      for (let n = 0; n < a.ANLIK_ALANLARI.length; n++)
        frame[a.ANLIK_ALANLARI[n]] = Math.sin(i * 0.17 + n) * 3;
      frame.t = i === 170 ? 0 : i / fps;
      frame.qw = i % 8 === 0 ? 1 : -1;
      frame.qx = Math.sin(i * 0.21) * 0.2;
      frame.qz = Math.cos(i * 0.33) * 0.15;
      frame.qy = 0.2;
      frame.vites = (i % 6) + 1;
      if (i === 160) frame.t = 156 / fps;
      a.uzakAnlikEkle(u, frame);
    }
    a.uzakGuncelle(u, 1 / fps);
    steps.push({
      frame: frame ? a.anlikDiziye(frame) : null,
      dt: 1 / fps,
      clock: u.saat,
      count: u.tampon.length,
      ready: u.hazir,
      show: a.anlikDiziye(u.goster),
      wheel: [...u.don],
    });
  }
  cases.push({ fps, steps });
}
const result = JSON.stringify({ baseline, sources, fields: a.ANLIK_ALANLARI, cases }, null, 2) + "\n";
const dest = path.join(root, "Unity/Validation/Reference/remote-snapshots-0.8.18.json");
if (process.argv.includes("--write")) fs.writeFileSync(dest, result);
else if (fs.readFileSync(dest, "utf8").replaceAll("\r\n", "\n") !== result)
  throw Error("Uzak görüntü TS referansı farklı");
console.log("Uzak görüntü: 30/60/120 FPS,540 TS çizim adımı; sabit kaynak " + baseline + ".");
