// Last Turn Merkezi verisi: dalların, sürümün ve regresyonun durumu git'ten çıkarılır (tests/cikti/merkez.json).
// Önce: git fetch origin --prune. Çıktı Merkez sayfasına yüklenir (.claude/skills/merkez/SKILL.md).
//   node tests/surec/merkez-durumu.mjs [--yaz dosya]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  deger = (a) => (process.argv.indexOf(a) > 0 ? process.argv[process.argv.indexOf(a) + 1] : null),
  CIKTI = deger("--yaz") || path.join(KOK, "tests", "cikti", "merkez.json");

const git = (...a) => {
  try {
    return execFileSync("git", a, { cwd: KOK, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};
const var_ = (ref) => git("rev-parse", "--verify", "--quiet", ref) != "";
const sayi = (aralik, ...yol) => Number(git("rev-list", "--count", "--no-merges", aralik, ...yol) || 0);
// yeni iş = oyunu değiştiren commit: sürüm açma ("Sürüm 0.2 başladı"), sürüm numarası, kural ve test altyapısı sayılmaz
const OYUN = ["--", "src", "public", "index.html", "vite.config.ts", "tsconfig.json"];
const dosya = (ref, yol) => {
  const t = git("show", `${ref}:${yol}`);
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
};
const surumu = (ref) => dosya(ref, "package.json")?.version || "-";

const OZEL = new Set(["HEAD", "master", "gelistirme", "regresyon"]);
const dallar = git("branch", "-r", "--format=%(refname:short)")
  .split("\n")
  .filter((b) => b.startsWith("origin/") && !OZEL.has(b.slice(7)))
  .map((b) => b.slice(7))
  .sort();

const rows = [];
const simdi = new Date().toISOString();

// dallar
const bekleyenler = [];
for (const d of dallar) {
  const ref = "origin/" + d,
    bekleyen = sayi(`origin/gelistirme..${ref}`),
    canliyaGitmemis = sayi(`origin/master..${ref}`),
    [son_is = "", son_tarih = ""] = git("log", "-1", "--no-merges", "--format=%s%x1f%cI", ref).split("\x1f");
  if (bekleyen) bekleyenler.push(`${d} (${bekleyen})`);
  rows.push({
    tur: "dal",
    dal: d,
    durum: bekleyen ? "Push bekliyor" : canliyaGitmemis ? "Denemede" : "Güncel",
    bekleyen,
    denemede: Math.max(0, canliyaGitmemis - bekleyen),
    son_is,
    son_tarih,
  });
}

// sürüm ve aşama
const deneme = surumu("origin/gelistirme"),
  canli = surumu("origin/master"),
  yeniIs = sayi("origin/master..origin/gelistirme", ...OYUN),
  rdurum = var_("origin/regresyon") ? dosya("origin/regresyon", "docs/regresyon/durum.json") : null,
  // dal silinemediyse "tamamlandi" yazılır: dondurma kalkmıştır
  regresyon = var_("origin/regresyon") && rdurum?.asama != "tamamlandi";
let asama, yapilacak;
if (regresyon && rdurum?.asama == "onay-bekliyor") {
  asama = "Canlı onayı bekliyor";
  yapilacak = `${rdurum.surum || deneme} hazır. Raporu regression sohbetinde oku; onaylıyorsan "push" de.`;
} else if (regresyon) {
  asama = "Regresyon sürüyor";
  yapilacak = rdurum?.not || `${deneme} test ediliyor; sürüm donduruldu, denemeye gönderim bekler.`;
} else if (bekleyenler.length) {
  asama = "Geliştirme sürüyor";
  yapilacak = `Push bekleyen: ${bekleyenler.join(", ")}. O sohbetlerde kontrol edip "push" de.`;
} else if (yeniIs) {
  asama = "Testlere hazır";
  yapilacak = `${deneme} canlı geçişi öncesi testlerine hazır. Regression sohbetinde "başlat" de; yoksa 04:00'te başlar.`;
} else {
  asama = "Canlı güncel";
  yapilacak = "Denemede canlıda olmayan iş yok.";
}
rows.unshift({ tur: "surum", deneme, canli, asama, yapilacak, yeni_is: yeniIs, guncellendi: simdi });

// son olaylar: denemeye ve canlıya giren commit'ler (ilk ebeveyn zinciri)
const guzel = (s) =>
  s
    .replace(/^Merge branch '([^']+)' (of \S+ )?into gelistirme$/, "$1 denemeye birleştirildi")
    .replace(/^Merge branch '([^']+)' (of \S+ )?into master$/, "$1 canlıya birleştirildi")
    .replace(/^Merge remote-tracking branch '([^']+)'.*$/, "$1 birleştirildi");
const olaylar = [];
for (const [ref, yer] of [
  ["origin/gelistirme", "Deneme"],
  ["origin/master", "Canlı"],
])
  for (const l of git("log", "--first-parent", "-12", "--format=%cI%x1f%s", ref)
    .split("\n")
    .filter(Boolean)) {
    const [zaman, s] = l.split("\x1f");
    olaylar.push({ tur: "olay", zaman, yer, olay: guzel(s) });
  }
olaylar.sort((a, b) => b.zaman.localeCompare(a.zaman));
rows.push(...olaylar.slice(0, 15));

// son regresyon raporu (regression sohbeti docs/regresyon/ altına yazar)
const kaynak = regresyon ? "origin/regresyon" : "origin/gelistirme",
  son = dosya(kaynak, "docs/regresyon/son-rapor.json"),
  ilk = dosya(kaynak, "docs/regresyon/ilk-rapor.json");
if (son?.ozet)
  for (const [dal, o] of Object.entries(son.ozet))
    rows.push({
      tur: "test",
      dal,
      senaryo: o.senaryo,
      ilk_hata: ilk?.ozet?.[dal]?.kaldi ?? o.kaldi,
      gecti: o.gecti,
      kaldi: o.kaldi,
      kosulmadi: o.kosulmadi,
      surum: son.surum || deneme,
      tarih: son.tarih || "",
    });

fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
fs.writeFileSync(CIKTI, JSON.stringify(rows, null, 2));
const s = rows[0];
console.log(`${s.asama} · deneme ${s.deneme} · canlı ${s.canli}\n${s.yapilacak}`);
for (const r of rows.filter((r) => r.tur == "dal")) console.log(`  ${r.dal.padEnd(10)} ${r.durum}`);
console.log("→ " + path.relative(KOK, CIKTI));
