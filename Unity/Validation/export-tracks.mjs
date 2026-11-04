// TS 0.8.18 pist tanımları + geometrisi + pist sorgusu oracle'ı. Sabit SHA'daki TS fonksiyonları bellekte çalışır;
// THREE'ye bağlı bölge/yarış dosyalarındaki bileşim satırları kaynakta birebir aranır (değişirse dışa aktarım durur).
// Kullanım: node Unity/Validation/export-tracks.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";

// TS'de bölge kurulumunun (bolgeler.ts) ve başlangıç noktasının (yarislar.ts) birebir satırları.
const composition = {
  "src/dunya/bolgeler.ts": [
    "const c: V2 = [((k % 4) - 1.5) * 2600, 3200 + Math.floor(k / 4) * 2600],",
    'TR = mkTrack(off(recenter(pistNoktalari(def)), c[0], c[1]), def.hw, def.t == "rl" || def.t == "dg"),',
    "export const REG: Bolge[] = TDEF.map(mkReg);",
    'if (def.t == "gp" || def.t == "dp") {',
    "kerbs(TR);",
    "def.j!.map(([q, f]) => [q, straightF(TR, f)]),",
    'MUD = def.m!.map((f) => ({ ...onTrack(TR, f), r: def.t == "rl" ? 9 : 15 })),',
    "WAT = def.w!.map((f, q) => ({",
    '...onTrack(TR, f, (q % 2 ? 1 : -1) * (def.t == "rl" ? 1.5 : 3)),',
    'r: def.t == "rl" ? 4 : 6,',
    "const inAs = (i: number) => (def.as || []).some(([a, b]) => TR.S[i] >= a * TR.len && TR.S[i] <= b * TR.len);",
  ],
  "src/oyun/yarislar.ts": ['g: tp(TR, r.n, ty == "dg" ? 1 : TR.open ? 4 : TR.N, TR.open ? 0 : 6),'],
};

const KW_SAMPLES = 48;

/** TS bolgeler.ts mkReg'deki pist bileşimi (yukarıdaki satırlar kaynakta denetlenir). */
export function regionTrack(P, defs, k) {
  const def = defs.TDEF[k],
    open = def.t == "rl" || def.t == "dg",
    c = [((k % 4) - 1.5) * 2600, 3200 + Math.floor(k / 4) * 2600],
    TR = P.mkTrack(P.off(P.recenter(defs.pistNoktalari(def)), c[0], c[1]), def.hw, open);
  return { def, open, c, TR };
}

/** Bileşim satırlarını sabit kaynakta doğrula (bölge/yarış dosyaları THREE'ye bağlı olduğu için yüklenmez). */
export function checkComposition(loader) {
  const hashes = {};
  for (const [file, lines] of Object.entries(composition)) {
    const text = loader.read(file);
    for (const line of lines)
      if (!text.includes(line)) throw new Error(file + " bileşim satırı değişmiş: " + line);
    hashes[file] = loader.sources[file];
  }
  return hashes;
}

export function buildTracks() {
  const loader = createBaselineLoader(),
    { load } = loader;
  const compositionHashes = checkComposition(loader);
  const defs = load("src/dunya/pist-tanimlari");
  const P = load("src/dunya/pist");
  const tracks = [],
    cases = [];
  defs.TDEF.forEach((def, k) => {
    const { open, c, TR } = regionTrack(P, defs, k);
    // Ham tanım alanları aynen (nokta listesi tarif yoksa zaten içinde).
    const raw = { ...def };
    tracks.push({
      index: k,
      key: def.t + "_" + def.lv,
      def: raw,
      center: c,
      open,
      geometry: { N: TR.N, len: TR.len, hw: TR.hw, P: TR.P.flat(), T: TR.T.flat(), S: TR.S },
    });
    cases.push(trackCases(P, def, TR, k));
  });
  const sources = Object.fromEntries(Object.entries(loader.sources).sort(([a], [b]) => a.localeCompare(b)));
  const catalog = {
    baseline,
    generator: "Unity/Validation/export-tracks.mjs",
    sources,
    levels: defs.SEVIYELER.map((s) => ({ n: s.n, d: s.d })),
    tracks,
  };
  const fixture = { baseline, kw: P.KW, sources, compositionHashes, tracks: cases };
  return { catalog, fixture };
}

// Tanımdan türeyen pist öğeleri (bölge kurulumundaki gibi) ve deterministik sorgu örnekleri.
function trackCases(P, def, TR, k) {
  const derived = {
    bbox150: P.bbox(TR, 150),
    start: P.tp(TR, def.n, def.t == "dg" ? 1 : TR.open ? 4 : TR.N, TR.open ? 0 : 6).slice(1),
  };
  if (def.t == "gp" || def.t == "dp") {
    P.kerbs(TR);
    derived.kerbs = TR.kb.map((b) => (b ? 1 : 0)).join("");
  }
  if (def.t == "gp") derived.apex = P.autoApex(TR);
  let J = [];
  if (def.t == "rx" || def.t == "rl") {
    J = P.mkJumps(
      TR,
      def.j.map(([q, f]) => [q, P.straightF(TR, f)]),
    );
    derived.jumps = J;
    derived.mud = def.m.map((f) => ({ ...P.onTrack(TR, f), r: def.t == "rl" ? 9 : 15 }));
    derived.water = def.w.map((f, q) => ({
      ...P.onTrack(TR, f, (q % 2 ? 1 : -1) * (def.t == "rl" ? 1.5 : 3)),
      r: def.t == "rl" ? 4 : 6,
    }));
    derived.asphalt = TR.P.map((_, i) =>
      (def.as || []).some(([a, b]) => TR.S[i] >= a * TR.len && TR.S[i] <= b * TR.len) ? 1 : 0,
    ).join("");
  }
  const fractions = [0, 0.013, 0.25, 0.5, 0.731, 0.999, 1];
  derived.idxAt = fractions.map((f) => P.idxAt(TR, f));
  derived.straightF = fractions.map((f) => P.straightF(TR, f));
  derived.turnAt = [0, 1, Math.floor(TR.N / 3), TR.N - 1].map((i) => P.turnAt(TR, i, 6));
  derived.onTrack = fractions.map((f, q) => P.onTrack(TR, f, (q - 3) * 2.5));
  derived.atTrack = [0, Math.floor(TR.N / 2), TR.N - 1].map((i) => P.atTrack(TR, i, -4.5));

  const near = P.gridNear(TR),
    hk = TR.kb ? P.Hkerb(TR) : null,
    lateral = [0, 0.5, -0.5, 1.02, -1.02, 1.04, -1.07, 1.3, -1.6, 2.5, -4];
  const samples = [];
  for (let q = 0; q < KW_SAMPLES; q++) {
    const s = ((q + 0.37) / KW_SAMPLES) * TR.len,
      base = P.trackAt(TR, s),
      // teğete dik: atTrack ile aynı yön (pozitif sağ)
      nx = Math.cos(base.a),
      nz = -Math.sin(base.a),
      o = lateral[q % lateral.length] * (TR.hw + (q % 3 == 0 ? P.KW : 0)) + (q % 5) * 0.137,
      x = base.x + nx * o,
      z = base.z + nz * o,
      hint = (Math.round((s / TR.len) * TR.N) + ((q * 17) % 90) - 45 + TR.N) % TR.N;
    const full = P.nearest(TR, x, z, 0, true),
      hinted = P.nearest(TR, x, z, hint, false);
    const row = {
      x,
      z,
      hint,
      s,
      trackAt: base,
      curvAt: P.curvAt(TR, s),
      full,
      hinted,
      grid: near(x, z),
      proj: P.parcayaIzdusum(TR, x, z, full[0]),
      clear: P.clearOf(TR, x, z, TR.hw + 3),
    };
    if (hk) {
      P.ipucu.ti = hint;
      row.kerbHint = hint;
      row.kerb = hk(x, z);
      row.kerbHintAfter = P.ipucu.ti;
    }
    if (J.length) row.jump = P.jumpH(J, x, z);
    samples.push(row);
  }
  // Pist dışı uzak nokta: ipucu penceresi yetmez, tam tarama.
  const far = [TR.P[0][0] + 900, TR.P[0][1] - 700];
  samples.push({
    x: far[0],
    z: far[1],
    hint: 0,
    full: P.nearest(TR, far[0], far[1], 0, true),
    hinted: P.nearest(TR, far[0], far[1], 0, false),
    grid: near(far[0], far[1]),
  });
  for (const sx of [-25, 0, 0.5, TR.len * 0.5, TR.len - 0.01, TR.len, TR.len + 40])
    samples.push({ s: sx, trackAt: P.trackAt(TR, sx), curvAt: P.curvAt(TR, sx) });
  return { index: k, key: def.t + "_" + def.lv, derived, samples };
}

const hash = (text) => createHash("sha256").update(text).digest("hex");

export function main() {
  const { catalog, fixture } = buildTracks();
  const files = [
    ["Unity/Assets/LastTurn/Resources/track-catalog.json", catalog],
    ["Unity/Validation/Reference/track-queries-0.8.18.json", fixture],
  ];
  let failed = false;
  for (const [name, value] of files) {
    const target = path.join(root, name),
      output = JSON.stringify(value) + "\n";
    if (process.argv.includes("--check")) {
      const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
      if (current !== output) {
        console.error("Güncel değil: " + name);
        failed = true;
      }
    } else fs.writeFileSync(target, output);
  }
  if (failed) process.exit(1);
  const N = catalog.tracks.reduce((a, t) => a + t.geometry.N, 0),
    samples = fixture.tracks.reduce((a, t) => a + t.samples.length, 0),
    gp1 = catalog.tracks.find((t) => t.key == "gp_1");
  console.log(
    `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: ${catalog.tracks.length} pist, ${N} pist noktası, ` +
      `${samples} sorgu örneği; gp_1 "${gp1.def.n}" N=${gp1.geometry.N} uzunluk=${gp1.geometry.len.toFixed(3)} m; ` +
      `kaynak ${Object.keys(catalog.sources).length} dosya, katalog sha ${hash(JSON.stringify(catalog)).slice(0, 12)}.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
