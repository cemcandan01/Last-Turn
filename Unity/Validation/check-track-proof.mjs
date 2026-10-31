// Unity Editor (Mono) pist karşılaştırma kanıtı: 40 pist, bütün örnekler, güncel kaynak hash'leri.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/track-compilation.json"), "utf8"));
const fixture = JSON.parse(fs.readFileSync(path.join(root, "Validation/Reference/track-queries-0.8.18.json"), "utf8"));
const samples = fixture.tracks.reduce((a, t) => a + t.samples.length, 0);
if (proof.result !== "tracks-compiled-and-matched" || proof.tracks !== 40 || proof.samples !== samples || !(proof.maxError <= proof.tolerance))
  throw new Error("Pist Editor kanıtı eksik/başarısız: " + (proof.error || proof.result));
const required = [
  ...fs
    .readdirSync(path.join(root, "Assets/LastTurn/Scripts/Core"))
    .filter((p) => /^Track.*\.cs$/.test(p))
    .map((p) => "Assets/LastTurn/Scripts/Core/" + p),
  "Assets/LastTurn/Resources/track-catalog.json",
  "Validation/Reference/track-queries-0.8.18.json",
  "Assets/LastTurn/Editor/TrackReferenceComparison.cs",
  "Assets/LastTurn/Editor/TrackCompilationCheck.cs",
  "Assets/LastTurn/Editor/TrackCatalogWindow.cs",
];
for (const name of required) {
  const sha = createHash("sha256").update(fs.readFileSync(path.join(root, name))).digest("hex");
  if (proof.sources.find((s) => s.path === name)?.sha256 !== sha) throw new Error("Eski pist kanıtı: " + name);
}
console.log(
  `Unity ${proof.unityVersion}: ${proof.tracks} pist, ${proof.points} nokta, ${proof.samples} örnek, ${proof.checks} koşul; ` +
    `en büyük fark ${proof.maxError} (${proof.maxErrorAt}); ${required.length} kaynak hash'i güncel; ${proof.utc}.`,
);
