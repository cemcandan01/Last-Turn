import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p1-play.json"), "utf8"));
if (p.result !== "p1-play-passed" || p.checks.length < 40) throw new Error("P1 Play başarısız: " + p.error);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|meta|json|unity)$/.test(f));
if (files.length !== p.sources.length) throw new Error("P1 kaynak kapsamı değişti");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/"),
    sha = createHash("sha256")
      .update(fs.readFileSync(path.join(root, name)))
      .digest("hex");
  if (!p.sources.some((s) => s.path === name && s.sha256 === sha))
    throw new Error("Eski P1 kaynağı: " + name);
}
console.log(
  `P1 Unity Play: ${p.checks.length} kontrol; ana menü, beş yarış, ödül, profil, Play kapat/aç ve oyuncu kaydı koruması; ${files.length} güncel kaynak; ${p.utc}.`,
);
