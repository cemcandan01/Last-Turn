// Sabit TS sentezini mevcut yerel Edge OfflineAudioContext ile WAV'a dönüştürür.
// Yeni ses tasarımı, indirme veya servis yok; src/ değiştirilmez.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { chromium } from "playwright";
const root = path.resolve(import.meta.dirname, "../..");
const dest = path.join(root, "Unity/Assets/LastTurn/Resources/Audio");
const baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
const sourceNames = [
  "src/ses/efektler.ts",
  "src/ses/sentez.ts",
  "src/ses/motor.ts",
  "src/ses/muzik.ts",
  "src/ses/hedefler.ts",
  "src/cekirdek/rastgele.ts",
  "src/cekirdek/matematik.ts",
];
const hash = (b) => createHash("sha256").update(b).digest("hex");
const sources = {};
for (const name of sourceNames) {
  const args = ["-c", `safe.directory=${root.replaceAll("\\", "/")}`];
  const ref = execFileSync("git", [...args, "show", `${baseline}:${name}`], { cwd: root });
  const current = fs.readFileSync(path.join(root, name), "utf8").replaceAll("\r\n", "\n");
  if (current !== ref.toString().replaceAll("\r\n", "\n")) throw Error("TS referansı farklı: " + name);
  sources[name] = hash(ref);
}
const manifestPath = path.join(dest, "source-manifest.json");
if (process.argv.includes("--check")) {
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (m.baseline !== baseline || JSON.stringify(m.sources) !== JSON.stringify(sources))
    throw Error("Ses kaynak manifesti eski");
  for (const a of m.clips) {
    const b = fs.readFileSync(path.join(dest, a.file));
    if (hash(b) !== a.sha256 || b.toString("ascii", 0, 4) !== "RIFF" || b.readUInt32LE(24) !== 22050)
      throw Error("Ses WAV farklı: " + a.file);
  }
  console.log(`${m.clips.length} TS ses klibi / kaynak ve WAV hashleri doğrulandı. İşitme kabulü değildir.`);
  process.exit(0);
}
// Yalnız mevcut TypeScript derleyicisi: CommonJS modülleri bellekte bağlanır.
// Motor Worker'ı bu örneklemede başlatılmaz; import.meta ifadesi yalnız ayrıştırma için boş URL'dir.
const modules = {};
function compile(name) {
  if (modules[name]) return;
  let text = fs.readFileSync(path.join(root, name), "utf8");
  if (name === "src/ses/muzik.ts") text += "\nexport const SampleSeconds=PARCA.length*1.6;";
  const js = ts
    .transpileModule(text, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    })
    .outputText.replaceAll("import.meta.url", '"about:blank"');
  const deps = {};
  modules[name] = { js, deps };
  for (const m of js.matchAll(/require\("(\.[^"]+)"\)/g)) {
    const dep = path.posix.normalize(path.posix.join(path.posix.dirname(name), m[1] + ".ts"));
    deps[m[1]] = dep;
    compile(dep);
  }
}
for (const name of ["src/ses/sentez.ts", "src/ses/efektler.ts", "src/ses/muzik.ts"]) compile(name);
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (!fs.existsSync(edge)) throw Error("Mevcut Edge bulunamadı; tarayıcı indirilmez.");
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.evaluate((modules) => {
    const cache = {};
    function load(name) {
      if (cache[name]) return cache[name].exports;
      const m = { exports: {} };
      cache[name] = m;
      const def = modules[name];
      new Function("require", "module", "exports", def.js)((id) => load(def.deps[id]), m, m.exports);
      return m.exports;
    }
    const music = load("src/ses/muzik.ts");
    globalThis.audioSource = {
      synth: load("src/ses/sentez.ts"),
      ui: load("src/ses/efektler.ts").arayuzSesi,
      Muzik: music.Muzik,
      SampleSeconds: music.SampleSeconds,
    };
  }, modules);
  const names = [
    "tik",
    "sayim",
    "basla",
    "kombo",
    "kasa",
    "yandi",
    "nitro",
    "nitroBitti",
    "kanca",
    "hayaletAc",
    "hayaletKapa",
    "donusumAc",
    "donusumKapa",
    "ruzgar",
    "red",
    "bitis-win",
    "bitis-lose",
    "carpma",
    "inis",
    "motor",
    "lastik-asfalt",
    "lastik-gevsek",
    "savrulma",
    "ruzgar-hiz",
    "muzik",
  ];
  fs.mkdirSync(dest, { recursive: true });
  const clips = [];
  for (const name of names) {
    const result = await page.evaluate(async (name) => {
      const { synth, ui, Muzik, SampleSeconds } = globalThis.audioSource;
      // Kaynakta rastgele davul/çarpma varyasyonu var; yalnız dışa aktarım tekrarlanabilir.
      let seed = 53;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const sr = 22050,
        seconds = name === "muzik" ? SampleSeconds : name === "motor" ? 2 : 2;
      const ctx = new OfflineAudioContext(name === "muzik" ? 2 : 1, Math.ceil(sr * seconds), sr);
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gain.connect(ctx.destination);
      const play = (pcm, loop = false, level = 1) => {
        const b = ctx.createBuffer(1, pcm.length, sr);
        b.getChannelData(0).set(pcm);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.loop = loop;
        const g = ctx.createGain();
        g.gain.value = level;
        s.connect(g).connect(gain);
        s.start(0);
      };
      switch (name) {
        case "basla":
          ui.sayim(ctx, gain, 0, true);
          break;
        case "sayim":
          ui.sayim(ctx, gain, 0, false);
          break;
        case "kombo":
          ui.kombo(ctx, gain, 0, 2);
          break;
        case "bitis-win":
        case "bitis-lose":
          ui.bitis(ctx, gain, 0, name.endsWith("win"));
          break;
        case "hayaletAc":
        case "hayaletKapa":
          ui.hayalet(ctx, gain, 0, name.endsWith("Ac"));
          break;
        case "donusumAc":
        case "donusumKapa":
          ui.donusum(ctx, gain, 0, name.endsWith("Ac"));
          break;
        case "carpma":
        case "inis":
          play(synth.carpma(sr, 70), false, name === "inis" ? 0.45 : 1);
          break;
        case "motor": {
          const p = synth.motorProfili("gt");
          play(synth.motorKatmani(p, 3000, 1, 7000, sr, 11, synth.motorEq("gt", 0)), true);
          break;
        }
        case "lastik-asfalt":
        case "savrulma":
          play(synth.lastikOtmesi(sr), true);
          break;
        case "lastik-gevsek":
          play(synth.cakil(sr), true);
          break;
        case "ruzgar-hiz":
          play(synth.gurultu(2, sr), true, 0.08);
          break;
        case "muzik": {
          const m = new Muzik(ctx, gain);
          m.baslat(0);
          m.planla(seconds);
          break;
        }
        default:
          if (!ui[name]) throw Error("Kaynak sesi yok: " + name);
          ui[name](ctx, gain, 0);
      }
      const b = await ctx.startRendering(),
        n = b.length,
        ch = b.numberOfChannels,
        pcm = new ArrayBuffer(44 + n * ch * 2),
        v = new DataView(pcm);
      const str = (o, s) => {
        for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
      };
      str(0, "RIFF");
      v.setUint32(4, 36 + n * ch * 2, true);
      str(8, "WAVEfmt ");
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, ch, true);
      v.setUint32(24, sr, true);
      v.setUint32(28, sr * ch * 2, true);
      v.setUint16(32, ch * 2, true);
      v.setUint16(34, 16, true);
      str(36, "data");
      v.setUint32(40, n * ch * 2, true);
      let sum = 0,
        peak = 0;
      const channels = Array.from({ length: ch }, (_, c) => b.getChannelData(c));
      for (let i = 0; i < n; i++)
        for (let c = 0; c < ch; c++) {
          const x = Math.max(-1, Math.min(1, channels[c][i]));
          if (!Number.isFinite(x)) throw Error("Geçersiz PCM");
          sum += x * x;
          peak = Math.max(peak, Math.abs(x));
          v.setInt16(44 + (i * ch + c) * 2, Math.round(x * 32767), true);
        }
      if (peak < 1e-5) throw Error("Sessiz PCM: " + name);
      const bytes = new Uint8Array(pcm);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { data: btoa(binary), seconds: n / sr, channels: ch, peak, rms: Math.sqrt(sum / (n * ch)) };
    }, name);
    const bytes = Buffer.from(result.data, "base64"),
      file = name + ".wav";
    fs.writeFileSync(path.join(dest, file), bytes);
    clips.push({
      file,
      sha256: hash(bytes),
      seconds: result.seconds,
      channels: result.channels,
      peak: result.peak,
      rms: result.rms,
    });
  }
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        baseline,
        sources,
        renderer: "Local Edge OfflineAudioContext; 22050 Hz PCM16",
        scope:
          "TS sentezinden işlevsel sesler; motor tek referans katmanı, profesyonel/araç başına ses tasarımı değil.",
        clips,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(clips.length + " TS ses klibi üretildi; kaynaklar değişmedi.");
} finally {
  await browser.close();
}
