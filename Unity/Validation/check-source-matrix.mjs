// Kaynak → Unity sınıflandırma matrisi denetimi: sabit referanstaki her src dosyası tam bir kez, izinli altı sınıftan biri,
// var olan Unity karşılıkları ve kanıt başvuruları (.NET bayrağı Program.cs'te ya da dosya). Davranış eşdeğerliği kanıtı
// değildir; kanıtın kendisi başvurulan testlerdedir.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../..");
const m = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "source-matrix.json"), "utf8"));
const sources = execFileSync(
  "git",
  ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "ls-tree", "-r", "--name-only", m.baseline, "src"],
  { cwd: root },
)
  .toString()
  .trim()
  .split(/\r?\n/);
const program = fs.readFileSync(path.join(import.meta.dirname, "Program.cs"), "utf8");
const seen = new Set(),
  counts = {};
for (const item of m.items) {
  if (seen.has(item.path)) throw Error("Tekrar: " + item.path);
  seen.add(item.path);
  if (!sources.includes(item.path)) throw Error("Referansta olmayan kaynak: " + item.path);
  if (!m.classes[item.class]) throw Error("Geçersiz sınıf: " + item.path + " " + item.class);
  if (!item.note) throw Error("Gerekçe yok: " + item.path);
  for (const u of item.unity)
    if (!fs.existsSync(path.join(root, u))) throw Error("Unity karşılığı yok: " + item.path + " → " + u);
  for (const e of item.evidence) {
    if (e.startsWith("--")) {
      if (!program.includes(`args.Contains("${e}")`))
        throw Error("Kanıt bayrağı yok: " + item.path + " " + e);
    } else if (!fs.existsSync(path.join(root, e))) throw Error("Kanıt dosyası yok: " + item.path + " " + e);
  }
  if (item.class === "dogrulandi" && item.evidence.length === 0)
    throw Error("Doğrulandı ama kanıt yok: " + item.path);
  counts[item.class] = (counts[item.class] ?? 0) + 1;
}
for (const s of sources) if (!seen.has(s)) throw Error("Sınıflandırılmamış kaynak: " + s);
console.log(
  `Kaynak matrisi: ${seen.size}/${sources.length} dosya; ` +
    Object.entries(m.classes)
      .map(([k, v]) => `${v} ${counts[k] ?? 0}`)
      .join(", ") +
    ". Sınıf kapsamı denetimi; davranış kanıtı başvurulan testlerdedir.",
);
