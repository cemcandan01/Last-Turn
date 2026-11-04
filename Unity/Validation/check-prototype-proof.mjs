import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const project = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(await fs.readFile(path.join(project, "Logs/gt-prototype-play.json"), "utf8"));
if (
  proof.result !== "play-passed" ||
  proof.unityVersion !== "6000.3.9f1" ||
  proof.checks.length < 28 ||
  !(proof.fullLeftLaunchSpeed > 30 && proof.fullRightLaunchSpeed > 30) ||
  !(Math.abs(proof.reverseSpeed) * 3.6 < 38 && Math.abs(proof.reverseSpeed) * 3.6 > 30)
)
  throw new Error("GT Play kanıtı eksik/başarısız: " + proof.error);
const root = path.join(project, "Assets/LastTurn");
const files = (await fs.readdir(root, { recursive: true })).filter((p) => /\.(cs|unity|mat|meta)$/.test(p));
if (files.length !== proof.sources.length) throw new Error("GT Play kaynak kapsamı değişmiş");
for (const p of files) {
  const name = path.relative(project, path.join(root, p)).replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(await fs.readFile(path.join(root, p)))
    .digest("hex");
  if (!proof.sources.some((s) => s.path === name && s.sha256 === hash))
    throw new Error("Eski GT Play kaynağı: " + name);
}
console.log(
  JSON.stringify(
    {
      result: proof.result,
      utc: proof.utc,
      checks: proof.checks.length,
      acceleratedSpeed: proof.acceleratedSpeed,
      brakedSpeed: proof.brakedSpeed,
      reverseSpeed: proof.reverseSpeed,
      reverseRpm: proof.reverseRpm,
      fullLeftLaunchSpeed: proof.fullLeftLaunchSpeed,
      fullRightLaunchSpeed: proof.fullRightLaunchSpeed,
      maxRelativeCameraStep: proof.maxRelativeCameraStep,
    },
    null,
    2,
  ),
);
