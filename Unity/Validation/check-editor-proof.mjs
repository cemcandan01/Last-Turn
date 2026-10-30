// Local Editor evidence is separate from .NET/CI validation; stale evidence is rejected.
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";

const project = resolve(import.meta.dirname, "..");
const core = resolve(project, "Assets/LastTurn/Scripts/Core");
const proof = JSON.parse(await readFile(resolve(project, "Logs/drive-core-compilation.json"), "utf8"));
if (
  proof.result !== "compiled-and-smoke-passed" ||
  proof.unityVersion !== "6000.3.9f1" ||
  proof.smokeSteps !== 600 ||
  proof.vehicleSmokeSteps !== 600 ||
  !proof.coreAssemblyMvid
)
  throw new Error("Unity derleme/kısa test kanıtı geçersiz.");
const files = (await readdir(core, { recursive: true })).filter((p) => p.endsWith(".cs"));
if (files.length !== proof.sources.length) throw new Error("Editor kanıtının Core kapsamı eksik.");
for (const file of files) {
  const full = resolve(core, file),
    name = relative(project, full).replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(await readFile(full))
    .digest("hex");
  if (!proof.sources.some((s) => s.path === name && s.sha256 === hash))
    throw new Error("Eski/farklı Editor kaynağı: " + name);
}
for (const full of [
  ...files.map((p) => resolve(core, p)),
  ...(await readdir(resolve(project, "Assets/LastTurn/Editor")))
    .filter((p) => p.endsWith(".cs"))
    .map((p) => resolve(project, "Assets/LastTurn/Editor", p)),
  resolve(project, "Validation/Reference/four-wheel-0.8.18.json"),
]) {
  if ((await stat(full)).mtimeMs > Date.parse(proof.utc))
    throw new Error("Editor kanıtından sonra kaynak değişti; Editor Assets > Refresh gerekir.");
}
console.log(
  `Unity ${proof.unityVersion}: ${files.length} Core dosyası derlendi; teker ve dört teker için 600'er adımlık kısa test geçti. UTC ${proof.utc}; MVID ${proof.coreAssemblyMvid}`,
);
