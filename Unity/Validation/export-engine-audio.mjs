// Özgün saf TS motor sentezi; mevcut Node/TypeScript kullanılır, src değiştirilmez.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "../.."),
  baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
const dest = path.join(root, "Unity/Assets/LastTurn/Resources/Audio/Engines");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const cache = new Map(),
  sources = {};
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const b = execFileSync(
    "git",
    ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", `${baseline}:${name}`],
    { cwd: root },
  );
  sources[name] = sha(b);
  const m = { exports: {} };
  cache.set(name, m);
  const js = ts
    .transpileModule(b.toString(), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    })
    .outputText.replaceAll("import.meta.url", '"about:blank"');
  new Function("require", "module", "exports", js)(
    (id) => load(path.posix.normalize(path.posix.join(path.posix.dirname(name), id + ".ts"))),
    m,
    m.exports,
  );
  return m.exports;
}
const synth = load("src/ses/sentez.ts");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "Unity/Assets/LastTurn/Resources/vehicle-catalog.json"), "utf8"),
);
if (process.argv.includes("--check")) {
  const m = JSON.parse(fs.readFileSync(path.join(dest, "manifest.json"), "utf8"));
  if (m.baseline !== baseline || m.profiles.length !== 15 || m.clips.length !== 156)
    throw Error("Motor ses kapsamı eksik");
  for (const [file, hash] of Object.entries(sources))
    if (m.sources[file] !== hash) throw Error("Motor kaynağı farklı");
  for (const c of m.clips) {
    const b = fs.readFileSync(path.join(dest, c.file));
    if (sha(b) !== c.hash || b.toString("ascii", 0, 4) !== "RIFF" || b.readUInt32LE(24) !== 22050)
      throw Error("Motor WAV farklı: " + c.file);
  }
  console.log(
    "15 motor/150 gaz-boş katmanı/6 valf-patlama; kaynak ve PCM hashleri doğru. İşitme kabulü değildir.",
  );
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
const clips = [],
  profiles = [];
function write(file, pcm) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(22050, 24);
  b.writeUInt32LE(44100, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(pcm.length * 2, 40);
  let sum = 0,
    max = 0;
  for (let i = 0; i < pcm.length; i++) {
    if (!Number.isFinite(pcm[i])) throw Error("Geçersiz PCM");
    const n = Math.max(-1, Math.min(1, pcm[i]));
    b.writeInt16LE(Math.trunc(n * 32767), 44 + i * 2);
    sum += n * n;
    max = Math.max(max, Math.abs(n));
  }
  if (max <= 0) throw Error("Boş PCM");
  fs.writeFileSync(path.join(dest, file + ".wav"), b);
  clips.push({
    file: file + ".wav",
    hash: sha(b),
    samples: pcm.length,
    rms: Math.sqrt(sum / pcm.length),
    peak: max,
  });
  const meta = path.join(dest, file + ".wav.meta");
  if (!fs.existsSync(meta))
    fs.writeFileSync(
      meta,
      "fileFormatVersion: 2\nguid: " +
        sha(Buffer.from("Audio/Engines/" + file)).slice(0, 32) +
        "\nAudioImporter:\n  serializedVersion: 7\n  defaultSettings:\n    loadType: 0\n    sampleRateSetting: 0\n    sampleRateOverride: 22050\n    compressionFormat: 0\n    quality: 1\n  forceToMono: 1\n  normalize: 0\n  preloadAudioData: 1\n",
    );
  return file;
}
for (const car of catalog.cars) {
  const key = car.k,
    rpm = car.dv ?? 7500,
    p = synth.motorProfili(key),
    layers = synth
      .motorKatmanlari(key, rpm, 22050)
      .map((l, i) => ({
        rpm: l.devir,
        gas: write(key + "-" + i + "-gas", l.gaz),
        off: write(key + "-" + i + "-off", l.bos),
      }));
  profiles.push({
    key,
    rpm,
    vtec: p.vtec ?? 0,
    turbo: p.turbo,
    compressor: p.kompresor,
    gears: p.disli,
    pops: p.patlama,
    valve: p.valf,
    layers,
  });
  console.log("Motor " + key + ": 5 gaz + 5 boş katman");
}
for (let i = 0; i < 4; i++) write("pop-" + i, synth.patlama(22050, 40 + i));
for (let i = 1; i <= 2; i++) write("valve-" + i, synth.valf(22050, i));
// Gerçek TS guncelle çalışır; AudioParam hedefleri sahte sağlayıcıda gözlenir.
const { MotorSesi } = load("src/ses/motor.ts");
const rows = [];
const param = () => ({
    value: 0,
    setTargetAtTime(v) {
      this.value = v;
    },
  }),
  node = () => ({
    gain: param(),
    frequency: param(),
    Q: param(),
    connect() {
      return this;
    },
  });
const context = { createGain: node, createBiquadFilter: node };
for (const p of profiles)
  for (const fps of [30, 60, 120]) {
    const m = new MotorSesi(context, {});
    m.p = { ...synth.motorProfili(p.key), patlama: 0 };
    m.dMax = p.rpm;
    m.katman = p.layers.map((l) => ({
      devir: l.rpm,
      gaz: { s: { playbackRate: param() }, g: node() },
      bos: { s: { playbackRate: param() }, g: node() },
    }));
    if (p.turbo) m.turbo = { o: { frequency: param() }, g: node(), n: node(), ng: node() };
    if (p.compressor) m.komp = { o: { frequency: param() }, g: node() };
    if (p.gears) m.disli = { o: { frequency: param() }, g: node() };
    for (let i = 0; i < 36; i++) {
      const dt = 1 / fps,
        time = (i + 1) * dt,
        rpm = [300, 900, 0.24 * p.rpm, 0.42 * p.rpm, 0.64 * p.rpm, 0.9 * p.rpm, 0.98 * p.rpm, 1.04 * p.rpm][
          i % 8
        ],
        gas = [0, 1, 1, 0.65, 1, 0, 0.8, 1][i % 8],
        shift = i === 18,
        speed = i * 2,
        boost = i < 20 ? null : i < 30 ? 0.9 : 0.2,
        volume = 0.73;
      m.guncelle(
        time,
        dt,
        { devir: rpm, gaz: gas, kesik: shift, hiz: speed, ...(boost === null ? {} : { boost }) },
        volume,
      );
      rows.push({
        key: p.key,
        fps,
        time,
        dt,
        rpm,
        gas,
        shift,
        speed,
        boost,
        volume,
        max: p.rpm,
        layers: p.layers.map((l) => l.rpm),
        vtec: p.vtec,
        turbo: p.turbo,
        compressor: p.compressor,
        gears: p.gears,
        expected: [
          m.yuk,
          m.boost,
          m.cikis.gain.value,
          m.vtecF.gain.value,
          ...m.katman.flatMap((k) => [k.gaz.g.gain.value, k.bos.g.gain.value, k.gaz.s.playbackRate.value]),
          m.turbo?.o.frequency.value ?? 0,
          m.turbo?.g.gain.value ?? 0,
          m.turbo?.n.frequency.value ?? 0,
          m.turbo?.ng.gain.value ?? 0,
          m.komp?.o.frequency.value ?? 0,
          m.komp?.g.gain.value ?? 0,
          m.disli?.o.frequency.value ?? 0,
          m.disli?.g.gain.value ?? 0,
        ],
      });
    }
  }
fs.writeFileSync(
  path.join(root, "Unity/Validation/Reference/engine-audio-0.8.18.json"),
  JSON.stringify({ baseline, sources, rows }) + "\n",
);
fs.writeFileSync(
  path.join(dest, "manifest.json"),
  JSON.stringify({ baseline, sources, profiles, clips }, null, 2) + "\n",
);
