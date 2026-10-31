// Unity gerçek Play yarış kanıtı (Last Turn → Yarış Kısa Play Doğrulaması (5 tür)): gp_1, rx_1, rl_1, dp_1, dg_1 gerçek
// fizikle bitti, türün zemin/fizik izi, ödül kayıtta; gp_1'de piste dönüş ve ↺. Assets/LastTurn kaynak hash'leri güncel olmalı.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const project = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(await fs.readFile(path.join(project, "Logs/race-play.json"), "utf8"));
const keys = (proof.tracks || []).map((t) => t.key).join(",");
if (
  proof.result !== "race-play-passed" ||
  proof.unityVersion !== "6000.3.9f1" ||
  keys !== "gp_1,rx_1,rl_1,dp_1,dg_1" ||
  proof.checks.length < 40 ||
  !proof.tracks.every((t) => t.countdownSteps === 181) ||
  proof.savedBalance !== proof.tracks.reduce((a, t) => a + t.money, 0) ||
  !(proof.returnSteps >= 360 && proof.returnSteps <= 362)
)
  throw new Error("Yarış Play kanıtı eksik/başarısız: " + (proof.error || proof.result + " " + keys));
const root = path.join(project, "Assets/LastTurn");
const files = (await fs.readdir(root, { recursive: true })).filter((p) => /\.(cs|unity|mat|meta|json)$/.test(p));
if (files.length !== proof.sources.length) throw new Error("Yarış Play kaynak kapsamı değişmiş");
for (const p of files) {
  const name = path.relative(project, path.join(root, p)).replaceAll("\\", "/");
  const hash = createHash("sha256").update(await fs.readFile(path.join(root, p))).digest("hex");
  if (!proof.sources.some((s) => s.path === name && s.sha256 === hash)) throw new Error("Eski yarış Play kaynağı: " + name);
}
console.log(
  `Unity ${proof.unityVersion}: yarış Play ${proof.checks.length} kontrol; ` +
    proof.tracks
      .map((t) => `${t.key} ${t.finishTime} ${t.stars}★ +${t.money}` + (t.wet ? ` ıslak ${t.wet}` : "") + (t.drift ? ` drift ${t.drift}/${t.score}p` : "") + (t.trap ? ` tuzak ${Math.round(t.trap)}` : ""))
      .join("; ") +
    `; kayıt bakiyesi ${proof.savedBalance}; piste dönüş ${proof.returnSteps} adım; ${files.length} kaynak hash'i güncel; ${proof.utc}.`,
);
