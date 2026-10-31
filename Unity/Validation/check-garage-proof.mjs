import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/garage-play.json"), "utf8"));
if (
  proof.result !== "garage-play-passed" ||
  proof.checks.length < 20 ||
  proof.gtSteps < 120 ||
  proof.terrainSteps < 120
)
  throw new Error("Garaj Play kanıtı eksik: " + proof.error);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((p) => /\.(cs|unity|meta|json)$/.test(p));
if (files.length !== proof.sources.length) throw new Error("Garaj kaynak kapsamı değişti");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex");
  if (!proof.sources.some((p) => p.path === name && p.sha256 === hash))
    throw new Error("Eski garaj Play kanıtı: " + name);
}
console.log(
  `Unity ${proof.unityVersion}: garaj ${proof.checks.length} kontrol; gerçek Play yeniden açma, ${proof.gtSteps}+${proof.terrainSteps} sürüş adımı; ${proof.utc}.`,
);
