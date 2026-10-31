import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const proof = JSON.parse(fs.readFileSync(path.join(root, "Logs/catalog-compilation.json"), "utf8"));
if (
  proof.result !== "catalog-compiled-and-smoke-passed" ||
  proof.cars !== 15 ||
  proof.parts !== 42 ||
  proof.checks !== 30
)
  throw new Error("Katalog Editor kanıtı eksik");
const required = [
  ...fs
    .readdirSync(path.join(root, "Assets/LastTurn/Scripts/Core"))
    .filter((p) => p.endsWith(".cs"))
    .map((p) => "Assets/LastTurn/Scripts/Core/" + p),
  "Assets/LastTurn/Resources/vehicle-catalog.json",
  "Assets/LastTurn/Editor/VehicleCatalogWindow.cs",
  "Assets/LastTurn/Editor/CatalogCompilationCheck.cs",
];
for (const name of required) {
  const source = proof.sources.find((p) => p.path === name);
  const sha = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex");
  if (source?.sha256 !== sha) throw new Error("Eski katalog kanıtı: " + name);
}
console.log(
  `Unity ${proof.unityVersion}: katalog ${proof.checks} kurulum/sürüş kontrolü; güncel ${required.length} kaynak hash'i, ${proof.utc}.`,
);
