import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const required = [
  "Assets/LastTurn/Scripts/Core/RacePhase.cs",
  "Packages/manifest.json",
  "ProjectSettings/ProjectVersion.txt",
];

for (const relativePath of required) {
  await stat(resolve(projectRoot, relativePath));
}

const version = await readFile(resolve(projectRoot, "ProjectSettings/ProjectVersion.txt"), "utf8");
if (!/^m_EditorVersion: 6000\.3\.9f1$/m.test(version)) {
  throw new Error("Unity sürümü 6000.3.9f1 (Unity 6.3 LTS) olmalıdır.");
}

const manifest = JSON.parse(await readFile(resolve(projectRoot, "Packages/manifest.json"), "utf8"));
for (const packageName of ["com.unity.inputsystem", "com.unity.test-framework"]) {
  if (!manifest.dependencies?.[packageName]) {
    throw new Error(`Eksik Unity paketi: ${packageName}`);
  }
}

console.log("Unity proje düzeni doğrulandı.");
