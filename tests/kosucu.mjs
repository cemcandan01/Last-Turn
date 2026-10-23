// Test koşucusu: tests/senaryolar/<dal>.mjs dosyalarındaki senaryoları önem sırasıyla koşar ve dal dal raporlar.
//   node tests/kosucu.mjs duman                 hızlı tur: duman: true senaryolar (~30 sn)
//   node tests/kosucu.mjs alan fizik[,hud]      yalnız bu dalların bütün senaryoları (konu sohbeti, denemeye göndermeden önce)
//   node tests/kosucu.mjs regresyon [--sure 55] bütün dallar, P1 → P2 → P3, süre (dk) dolunca durur
//   node tests/kosucu.mjs liste                 senaryo listesi, kayıtsız testler
// Ek seçenekler: --adres https://…/ (tarayıcı senaryoları canlı adreste, derlemesiz), --derlemeden (dist/ hazır),
//   --ilk tests/cikti/rapor-ilk.json (düzeltme sonrası koşumda: tabloya ilk koşumdaki hata sayısı da yazılır)
// Rapor: tests/cikti/rapor.json ve rapor.md. Başarısız senaryo varsa çıkış kodu 1.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  CIKTI = path.join(KOK, "tests", "cikti"),
  [kip, dallarArg] = process.argv.slice(2),
  deger = (a) => (process.argv.indexOf(a) > 0 ? process.argv[process.argv.indexOf(a) + 1] : null),
  ADRES = deger("--adres"),
  SURE = Number(deger("--sure") || 55) * 60 * 1000,
  basla = Date.now();

if (!["duman", "alan", "regresyon", "liste"].includes(kip)) {
  console.error("kullanım: node tests/kosucu.mjs duman | alan <dal>[,<dal>] | regresyon [--sure dk] | liste");
  process.exit(2);
}

// senaryolar: dal adı dosya adından gelir
const SENARYOLAR = [];
const SDIR = path.join(KOK, "tests", "senaryolar");
for (const f of fs
  .readdirSync(SDIR)
  .filter((f) => f.endsWith(".mjs"))
  .sort()) {
  const dal = f.replace(/\.mjs$/, "");
  for (const s of (await import(pathToFileURL(path.join(SDIR, f)))).default) SENARYOLAR.push({ ...s, dal });
}

// kayıtsız testler: hiçbir senaryoya bağlanmamış tarayıcı bölümleri ve birim test dosyaları
const bolumler = fs
  .readdirSync(path.join(KOK, "tests", "e2e", "bolumler"))
  .map((f) => f.replace(/\.mjs$/, ""))
  .filter((b) => b != "goruntu");
const kayitsizBolum = bolumler.filter((b) => !SENARYOLAR.some((s) => s.tarayici == b));
const birimDosyalar = fs
  .readdirSync(path.join(KOK, "tests", "birim"))
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => "tests/birim/" + f);
for (const b of kayitsizBolum)
  SENARYOLAR.push({ id: b, ad: "kayıtsız tarayıcı bölümü", p: 3, tarayici: b, dal: "kayitsiz" });
// birim dosyalarındaki kayıtsız gruplar: regresyonun sonunda, kayıtlı grupların dışındaki her şey
SENARYOLAR.push({
  id: "kayitsiz-birim",
  ad: "senaryoya bağlanmamış birim testleri",
  p: 9,
  kayitsizBirim: true,
  dal: "kayitsiz",
});

if (kip == "liste") {
  for (const s of [...SENARYOLAR].sort((a, b) => a.p - b.p || a.dal.localeCompare(b.dal)))
    console.log(`P${s.p} ${s.dal.padEnd(9)} ${s.id.padEnd(16)} ${s.duman ? "duman " : "      "}${s.ad}`);
  process.exit(0);
}

const dallar = (dallarArg || "").split(",").filter(Boolean);
if (kip == "alan" && !dallar.length) {
  console.error("alan için dal adı gerekli: node tests/kosucu.mjs alan fizik");
  process.exit(2);
}
const secili = SENARYOLAR.filter((s) =>
  kip == "duman" ? s.duman : kip == "alan" ? dallar.includes(s.dal) : true,
).sort((a, b) => a.p - b.p);
if (kip == "alan")
  for (const d of dallar)
    if (!SENARYOLAR.some((s) => s.dal == d))
      console.log(`(${d} dalının kayıtlı senaryosu yok: koşacak bir şey yok)`);

const kos = (komut, argv) => {
  const r = spawnSync(komut, argv, { cwd: KOK, stdio: "inherit", shell: process.platform == "win32" });
  return r.status === 0;
};
const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

if (!ADRES && !process.argv.includes("--derlemeden") && secili.some((s) => s.tarayici)) {
  console.log("\n● Derleme");
  if (!kos("npx", ["vite", "build", "--logLevel", "warn"])) {
    console.error("Derleme başarısız");
    process.exit(1);
  }
}
fs.mkdirSync(CIKTI, { recursive: true });

const sonuc = new Map(); // id → { durum: "geçti" | "kaldı" | "koşulmadı", hatalar, sure }
const yaz = (s, durum, hatalar = [], sure = 0) => sonuc.set(s.dal + "/" + s.id, { durum, hatalar, sure });

function birimKos(grup) {
  const kayitli = SENARYOLAR.filter((s) => s.birim);
  const json = path.join(CIKTI, "vitest.json");
  const desen = grup.length
    ? `^(?:${grup.map((s) => kacis(s.birim.grup)).join("|")}) `
    : `^(?!(?:${kayitli.map((s) => kacis(s.birim.grup)).join("|")}) )`;
  const dosyalar = grup.length ? [...new Set(grup.map((s) => s.birim.dosya))] : birimDosyalar;
  fs.rmSync(json, { force: true });
  kos("npx", [
    "vitest",
    "run",
    ...dosyalar,
    "-t",
    desen,
    "--reporter=dot",
    "--reporter=json",
    "--outputFile=" + json,
  ]);
  const r = fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, "utf8")) : { testResults: [] };
  const testler = r.testResults.flatMap((d) =>
    d.assertionResults.map((t) => ({ ...t, dosya: path.relative(KOK, d.name), yuklenemedi: false })),
  );
  // dosya hiç yüklenemediyse (sözdizimi, içe aktarma) o dosyanın bütün grupları kalır
  const bozuk = r.testResults.filter((d) => d.status == "failed" && !d.assertionResults.length);
  if (!grup.length) {
    const s = SENARYOLAR.find((s) => s.kayitsizBirim);
    const t = testler.filter((t) => t.status != "skipped" && t.status != "pending");
    s.ad = `senaryoya bağlanmamış birim testleri (${t.length} test)`;
    const k = t.filter((t) => t.status == "failed");
    if (!t.length && !bozuk.length) {
      s.bos = true;
      return;
    }
    yaz(s, k.length || bozuk.length ? "kaldı" : t.length ? "geçti" : "koşulmadı", [
      ...k.map((t) => t.dosya + ": " + t.fullName),
      ...bozuk.map((d) => d.name + ": " + d.message),
    ]);
    return;
  }
  for (const s of grup) {
    const t = testler.filter(
      (t) => t.dosya == s.birim.dosya && t.ancestorTitles[0] == s.birim.grup && t.status != "skipped",
    );
    const b = bozuk.find((d) => path.relative(KOK, d.name) == s.birim.dosya);
    const k = t.filter((t) => t.status == "failed");
    const sure = t.reduce((a, t) => a + (t.duration || 0), 0) / 1000;
    if (b) yaz(s, "kaldı", ["dosya yüklenemedi: " + (b.message || "")]);
    else if (!t.length)
      yaz(s, "kaldı", ["grup bulunamadı: " + s.birim.grup + " (senaryo dosyasını güncelle)"]);
    else
      yaz(
        s,
        k.length ? "kaldı" : "geçti",
        k.map((t) => t.title + ": " + (t.failureMessages[0] || "").split("\n")[0]),
        sure,
      );
  }
}

function tarayiciKos(grup) {
  const json = path.join(CIKTI, "tarayici.json");
  fs.rmSync(json, { force: true });
  const argv = ["tests/e2e/duman.mjs", "--bolum", grup.map((s) => s.tarayici).join(","), "--json", json];
  if (ADRES) argv.push("--adres", ADRES);
  kos("node", argv);
  const r = fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, "utf8")) : {};
  // sayfa hiç açılmadıysa bütün grup kalır
  const yuk = r.yukleme && !r.yukleme.gecti ? r.yukleme.hatalar : null;
  for (const s of grup) {
    const b = r[s.tarayici];
    if (!b) yaz(s, "kaldı", yuk || ["tarayıcı testi yarıda kaldı"]);
    else yaz(s, b.gecti && !yuk ? "geçti" : "kaldı", [...(yuk || []), ...b.hatalar], b.sure);
  }
}

// önem sırasıyla: her önem düzeyinde önce birim, sonra tarayıcı senaryoları
for (const p of [...new Set(secili.map((s) => s.p))].sort((a, b) => a - b)) {
  const duzey = secili.filter((s) => s.p == p);
  for (const [tur, grup] of [
    ["birim", duzey.filter((s) => s.birim)],
    ["tarayıcı", duzey.filter((s) => s.tarayici)],
    ["kayıtsız birim", duzey.filter((s) => s.kayitsizBirim)],
  ]) {
    if (!grup.length) continue;
    if (Date.now() - basla > SURE) {
      for (const s of grup) yaz(s, "koşulmadı", ["süre doldu"]);
      continue;
    }
    console.log(`\n● P${p > 3 ? "-" : p} ${tur}: ${grup.map((s) => s.dal + "/" + s.id).join(", ")}`);
    if (tur == "birim") birimKos(grup);
    else if (tur == "tarayıcı") tarayiciKos(grup);
    else birimKos([]);
  }
}

// rapor
const satirlar = secili.filter((s) => !s.bos).map((s) => ({ ...s, ...sonuc.get(s.dal + "/" + s.id) }));
const ozet = {};
for (const s of satirlar) {
  const o = (ozet[s.dal] ||= { senaryo: 0, gecti: 0, kaldi: 0, kosulmadi: 0 });
  o.senaryo++;
  if (s.durum == "geçti") o.gecti++;
  else if (s.durum == "kaldı") o.kaldi++;
  else o.kosulmadi++;
}
const dk = ((Date.now() - basla) / 60000).toFixed(1);
const kalan = satirlar.filter((s) => s.durum == "kaldı");
let md = `# ${kip == "regresyon" ? "Regresyon" : kip == "alan" ? "Alan testi (" + dallar.join(", ") + ")" : "Duman"} raporu\n\n`;
md += `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · ${dk} dk${ADRES ? " · " + ADRES : ""}\n\n`;
const ILK = deger("--ilk") && JSON.parse(fs.readFileSync(deger("--ilk"), "utf8"));
md += ILK
  ? "| Dal | Senaryo | İlk koşumda hata | Şimdi geçti | Şimdi kaldı | Koşulmadı |\n|---|---|---|---|---|---|\n"
  : "| Dal | Senaryo | Geçti | Kaldı | Koşulmadı |\n|---|---|---|---|---|\n";
for (const [d, o] of Object.entries(ozet))
  md += ILK
    ? `| ${d} | ${o.senaryo} | ${ILK.ozet[d]?.kaldi ?? "-"} | ${o.gecti} | ${o.kaldi} | ${o.kosulmadi} |\n`
    : `| ${d} | ${o.senaryo} | ${o.gecti} | ${o.kaldi} | ${o.kosulmadi} |\n`;
md += kalan.length ? "\n## Hatalar\n\n" : "\nHata yok.\n";
for (const s of kalan) md += `- **${s.dal} / ${s.id}** (P${s.p}, ${s.ad}): ${s.hatalar.join(" · ")}\n`;
const atlanan = satirlar.filter((s) => s.durum == "koşulmadı");
if (atlanan.length)
  md += `\nKoşulmayan: ${atlanan.map((s) => s.dal + "/" + s.id + " (" + s.hatalar[0] + ")").join(", ")}\n`;
fs.writeFileSync(path.join(CIKTI, "rapor.md"), md);
fs.writeFileSync(
  path.join(CIKTI, "rapor.json"),
  JSON.stringify({ kip, dallar, dk: Number(dk), ozet, senaryolar: satirlar }, null, 2),
);

console.log("\n" + md.replace(/\*\*/g, ""));
console.log("Rapor: tests/cikti/rapor.md");
process.exit(kalan.length ? 1 : 0);
