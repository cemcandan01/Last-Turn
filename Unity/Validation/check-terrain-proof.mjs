import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const project = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(await fs.readFile(path.join(project, "Logs/terrain-play.json"), "utf8"));
if (
  proof.result !== "terrain-play-passed" ||
  proof.unityVersion !== "6000.3.9f1" ||
  proof.checks.length < 23 ||
  !(proof.lowSpeedPeakBeta < 12 && proof.lowSpeedFinalBeta < 3) ||
  !proof.air ||
  !proof.landed ||
  !proof.soil ||
  !proof.mixed
)
  throw new Error("Arazi Play kanıtı eksik/başarısız: " + proof.error);
const root = path.join(project, "Assets/LastTurn");
const files = (await fs.readdir(root, { recursive: true })).filter((p) =>
  /\.(cs|unity|mat|meta|asset)$/.test(p),
);
if (files.length !== proof.sources.length) throw new Error("Arazi Play kaynak kapsamı değişti");
for (const file of files) {
  const name = path.relative(project, path.join(root, file)).replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(await fs.readFile(path.join(root, file)))
    .digest("hex");
  if (!proof.sources.some((s) => s.path === name && s.sha256 === hash))
    throw new Error("Eski arazi Play kaynağı: " + name);
}
const { sources, ...summary } = proof;
console.log(JSON.stringify(summary, null, 2));
