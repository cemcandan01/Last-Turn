// Unity gerçek Play yarış kanıtı (Last Turn → Yarış Kısa Play Doğrulaması): gp_1 bitti, ödül kayda yazıldı, piste dönüş;
// Assets/LastTurn altındaki bütün kaynaklar kanıttaki hash'lerle aynı olmalı.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const project = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(await fs.readFile(path.join(project, "Logs/race-play.json"), "utf8"));
if (
  proof.result !== "race-play-passed" ||
  proof.unityVersion !== "6000.3.9f1" ||
  proof.checks.length < 16 ||
  proof.track !== "gp_1" ||
  proof.countdownSteps !== 181 ||
  !(proof.maxHeight - proof.minHeight > 3) ||
  proof.savedStars !== proof.stars ||
  proof.savedBalance !== proof.money ||
  !(proof.returnSteps >= 360 && proof.returnSteps <= 362)
)
  throw new Error("Yarış Play kanıtı eksik/başarısız: " + (proof.error || proof.result));
const root = path.join(project, "Assets/LastTurn");
const files = (await fs.readdir(root, { recursive: true })).filter((p) => /\.(cs|unity|mat|meta|json)$/.test(p));
if (files.length !== proof.sources.length) throw new Error("Yarış Play kaynak kapsamı değişmiş");
for (const p of files) {
  const name = path.relative(project, path.join(root, p)).replaceAll("\\", "/");
  const hash = createHash("sha256").update(await fs.readFile(path.join(root, p))).digest("hex");
  if (!proof.sources.some((s) => s.path === name && s.sha256 === hash)) throw new Error("Eski yarış Play kaynağı: " + name);
}
console.log(
  `Unity ${proof.unityVersion}: yarış Play ${proof.checks.length} kontrol; gp_1 ${proof.finishTime} (en iyi tur ${proof.bestLap}), ${proof.stars}★, ` +
    `+${proof.xp} XP +${proof.money} para kayıtta; ${proof.steps} adım, yükseklik ${proof.minHeight.toFixed(2)}–${proof.maxHeight.toFixed(2)} m, ` +
    `piste dönüş ${proof.returnSteps} adım; ${files.length} kaynak hash'i güncel; ${proof.utc}.`,
);
