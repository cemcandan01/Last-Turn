import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/panel-play.json"), "utf8"));
if (proof.result !== "panel-play-passed" || proof.checks.length < 40)
  throw new Error("Panel Play başarısız: " + proof.error);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((p) => /\.(cs|json|meta|unity)$/.test(p));
if (files.length !== proof.sources.length) throw new Error("Panel kanıtının kaynak kapsamı değişti");
for (const p of files) {
  const name = "Assets/LastTurn/" + p.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex");
  if (!proof.sources.some((s) => s.path === name && s.sha256 === hash))
    throw new Error("Eski panel kaynağı: " + name);
}
console.log(
  `Panel Play: ${proof.checks.length} kontrol; dg_1, beş tür ve GT/Terrain/RaceTest erişimi; ${proof.utc}.`,
);
