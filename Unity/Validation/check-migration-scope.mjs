// Kaynak kapsamı denetimi; davranış eşdeğerliği veya Play testi değildir.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../..");
const baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
const file = path.join(import.meta.dirname, "migration-scope.json");
const gitArgs = ["-c", `safe.directory=${root.replaceAll("\\", "/")}`];
const git = (...args) =>
  execFileSync("git", [...gitArgs, ...args], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
const hash = (data) => createHash("sha256").update(data).digest("hex");
const sources = git("ls-tree", "-r", "--name-only", baseline, "src").toString().trim().split(/\r?\n/);
// Bütün blob'ları tek Git sürecinde oku; dosya başına süreç açma.
const blobs = execFileSync("git", [...gitArgs, "cat-file", "--batch"], {
  cwd: root,
  input: sources.map((p) => `${baseline}:${p}\n`).join(""),
  maxBuffer: 16 * 1024 * 1024,
});
let offset = 0;
const hashes = new Map(
  sources.map((p) => {
    const end = blobs.indexOf(10, offset),
      header = blobs.subarray(offset, end).toString().split(" ");
    if (header[1] !== "blob") throw new Error("Kaynak blob okunamadı: " + p);
    const size = Number(header[2]),
      start = end + 1;
    const sha = hash(blobs.subarray(start, start + size));
    offset = start + size + 1;
    return [p, sha];
  }),
);
const group = (p) => (p.split("/").length > 2 ? p.split("/")[1] : "giris-platform");
if (process.argv.includes("--write")) {
  const groups = [...new Set(sources.map(group))].map((id) => ({
    id,
    sources: sources.filter((p) => group(p) === id).map((p) => ({ path: p, sha256: hashes.get(p) })),
  }));
  fs.writeFileSync(
    file,
    JSON.stringify({ baseline, unityBase: "a99122180585ac09f3f1c52a360c046cfb071126", groups }, null, 2) +
      "\n",
  );
}
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
if (
  manifest.baseline !== baseline ||
  git("rev-parse", "typescript-baseline-0.8.18^{commit}").toString().trim() !== baseline
)
  throw new Error("Sabit TS referansı değişti.");
const entries = manifest.groups.flatMap((g) => g.sources);
if (entries.length !== sources.length || new Set(entries.map((p) => p.path)).size !== sources.length)
  throw new Error("Eksik veya yinelenen kaynak kapsamı.");
for (const p of sources) {
  const e = entries.find((q) => q.path === p);
  if (!e || hashes.get(p) !== e.sha256) throw new Error("Referans dosyası envanterle uyuşmuyor: " + p);
}
// Git clean dönüşümü Windows CRLF farkını davranış farkı saymaz.
try {
  git("diff", "--quiet", baseline, "--", "src");
} catch {
  throw new Error("İncelenen TS çalışma kaynağı referanstan farklı.");
}
const matrix = path.join(root, "docs/isler/2026-11-01-unity-tam-aktarim.md");
for (const match of fs.readFileSync(matrix, "utf8").matchAll(/\]\((\.\.\/[^)#]+)(?:#[^)]*)?\)/g))
  if (!fs.existsSync(path.resolve(path.dirname(matrix), match[1])))
    throw new Error("Bozuk matris bağlantısı: " + match[1]);
console.log(
  `${entries.length}/${sources.length} TS referans dosyası kapsandı; ${manifest.groups.length} kaynak grubu; SHA, çalışma kaynağı ve matris bağlantıları aynı. Bu bir işlevsel eşdeğerlik testi değildir.`,
);
