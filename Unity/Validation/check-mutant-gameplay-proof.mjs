import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-gameplay-play.json"), "utf8"));
if (p.result !== "b-gameplay-observed" || p.error || p.runtimeErrors.length)
  throw Error("Oynanış gözlemi başarısız: " + p.error);
if (!p.environment.includes("6000.3.9f1") || !p.environment.includes("GameView"))
  throw Error("Game View ortamı eksik");
const native =
  "ArgumentOutOfRangeException: Index was out of range. Must be non-negative and less than the size of the collection.\nParameter name: index";
if (p.editorDiagnostics.some((x) => x.replaceAll("\r", "").trim() !== native))
  throw Error("Beklenmeyen Editor tanısı");
for (const label of [
  "Gercek plan fizik gorsel pist kimligi ayni / 0",
  "Gercek plan fizik gorsel pist kimligi ayni / 1",
  "Gercek plan fizik gorsel pist kimligi ayni / 2",
  "Gameplay kariyer profil ayni",
  "Gameplay kalici oyuncu dosyalari ayni",
  "Atolye UI kismi tamir 6 govde 18 para",
  "Atolye UI tam tamir 24 govde 72 para",
  "Fixture motor mevcut UI Buy ile uygulanir",
])
  if (!p.checks.includes(label)) throw Error("Eksik kontrol: " + label);
for (const round of [0, 1, 2])
  if (
    !p.outcomes.some(
      (x) =>
        x.includes(`Race outcome round=${round}`) &&
        x.includes("state=Finished") &&
        x.includes("teleports=0"),
    )
  )
    throw Error("Gerçek fizik bitişi eksik: " + round);
if (!p.outcomes.some((x) => x.includes("round=0") && x.includes("gate=True direct-entry-fixture=False")))
  throw Error("Sürüşten gerçek işarete giriş eksik");
if (
  !p.outcomes.some(
    (x) => x.includes("round=1") && x.includes("state=Finished") && x.includes("opponent=True"),
  )
)
  throw Error("Rakipli yarış eksik");
if (!p.outcomes.some((x) => x.startsWith("Actual earned level choice: ")))
  throw Error("Gerçek kazanılmış seviye seçimi eksik");
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss|json|png)$/.test(f));
if (p.sources.length !== files.length) throw Error("Kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!p.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const name of [
  "world-0",
  "result-0",
  "result-1",
  "result-2",
  "skill-3",
  "realtime-0",
  "realtime-1",
  "realtime-2",
  "realtime-3",
])
  if (!p.images.includes(`b-gameplay-${name}-1280.png`)) throw Error("Eksik sıralı görüntü: " + name);
for (const file of p.images) {
  if (!/^b-gameplay-[\w-]+-1280\.png$/.test(file)) throw Error("Geçersiz görüntü yolu");
  const png = fs.readFileSync(path.join(root, "Logs", file));
  if (png.readUInt32BE(16) !== 1280 || png.readUInt32BE(20) !== 720) throw Error("PNG boyutu: " + file);
}
for (const s of p.samples)
  if (![s.time, s.x, s.y, s.z, s.speed, s.beta, s.body, s.energy].every(Number.isFinite))
    throw Error("Geçersiz telemetri");
const real = p.samples.filter((s) => s.phase === "realtime-keyboard");
if (!real.length || Math.hypot(real.at(-1).x - real[0].x, real.at(-1).z - real[0].z) < 20)
  throw Error("Gerçek zamanlı klavye hareketi eksik");
const a = [...p.realtimeFrameMs].sort((x, y) => x - y);
if (!a.length || !a.every((x) => Number.isFinite(x) && x > 0)) throw Error("Kare süresi örneklemi eksik");
const percentile = (q) => a[Math.floor((a.length - 1) * q)];
const phases = [...new Set(p.samples.map((s) => s.phase))].map((phase) => {
  const rows = p.samples.filter((s) => s.phase === phase);
  return {
    phase,
    samples: rows.length,
    maxSpeed: Math.max(...rows.map((s) => s.speed)),
    minBody: Math.min(...rows.map((s) => s.body)),
    airborneSamples: rows.filter((s) => s.airborne).length,
    driftSamples: rows.filter((s) => s.driftActive).length,
  };
});
const report = {
  utc: p.utc,
  environment: p.environment,
  hardware: p.hardware,
  sources: files.length,
  images: p.images.length,
  samples: p.samples.length,
  outcomes: p.outcomes,
  phases,
  realtimeFrameSample: {
    count: a.length,
    median: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: a.at(-1),
    over50: a.filter((x) => x > 50).length,
  },
  scope:
    "Kanıt bütünlüğü; insan/denge veya tüm akışların kabulü değildir. Doğrudan yarış girişleri, motor ve skill kurulumu fixture; zaman/sonuç/bitiş enjekte edilmez. Frame örnekleri her render karesini kapsamaz.",
};
fs.writeFileSync(path.join(root, "Logs/b-gameplay-metrics.json"), JSON.stringify(report, null, 2));
console.log(
  `Oynanış kanıtı: ${p.samples.length} örnek,${p.images.length} Game View,${files.length} güncel kaynak; üç fizik bitişi; Runtime ${p.runtimeErrors.length}/Editor ${p.editorDiagnostics.length}. Kapsam sınırları kalite raporundadır.`,
);
