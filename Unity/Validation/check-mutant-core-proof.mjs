// Ara kapı: Editor derlemesi, kaynak kapsamı ve saf fizik smoke kanıtı. Play/UI kabulü değildir.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/p3-core.json"), "utf8"));
if (p.result !== "p3-core-passed" || p.unityVersion !== "6000.3.9f1" || p.checks !== 8)
  throw Error("P3 Editor core kontrolü başarısız: " + p.error);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|json|meta)$/.test(f));
if (files.length !== p.sources.length) throw Error("P3 Editor kaynak kapsamı değişti");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex");
  if (!p.sources.some((s) => s.path === name && s.sha256 === hash))
    throw Error("Eski P3 Editor kaynağı: " + name);
}
console.log(
  `P3 gerçek Unity Editor: ${p.checks} core kontrolü, ${files.length} güncel kaynak, ${p.utc}. Bu Play veya oyuncu kabulü değildir.`,
);
