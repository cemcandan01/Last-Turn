import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "Logs/b-hook-play.json"), "utf8"));
if (p.result !== "b-hook-passed" || p.error || p.runtimeErrors.length)
  throw Error("Kanca Play başarısız: " + p.error);
if (!p.environment.includes("6000.3.9f1") || !p.environment.includes("GameView"))
  throw Error("Grafik ortam eksik");
const native =
  "ArgumentOutOfRangeException: Index was out of range. Must be non-negative and less than the size of the collection.\nParameter name: index";
if (p.editorDiagnostics.some((x) => x.replaceAll("\r", "").trim() !== native))
  throw Error("Beklenmeyen Editor tanısı");
if (p.editorDiagnostics.length)
  console.warn(
    "UnityEditor.Search tanısı: " + p.editorDiagnostics.length + "; Console tamamen temiz değildir.",
  );
for (const label of [
  "Iki onceki istek yeniden kayitli",
  "Yeni pistte onceki dunya hedefi yok",
  "Hak yok bekleme gercek dolumdan",
  "Rakip ve kose kabul ayri",
  "Iki baglanmada fizik etkisi",
  "Kariyer profil ayni",
  "Kalici kayit hashleri ayni",
])
  if (!p.checks.includes(label)) throw Error("Eksik kabul: " + label);
for (const phase of ["old-4", "old-6"]) {
  const a = p.attempts.find((a) => a.phase === phase);
  if (!a || a.open || a.blocker !== "hedef" || !a.candidates.length || a.kind || a.reason !== "no-corner")
    throw Error("Önceki reddin gerçek sorgu kanıtı eksik: " + phase);
}
for (const [phase, kind] of [
  ["bind-first", "rakip"],
  ["bind-reuse", "kose"],
]) {
  const a = p.attempts.find((a) => a.phase === phase && a.open && a.kind === kind);
  if (!a) throw Error("Gerçek bağlanma yok: " + phase);
}
for (const phase of ["release-first", "release-second"])
  if (!p.attempts.some((a) => a.phase === phase && !a.open)) throw Error("Gerçek bırakma yok: " + phase);
for (const kind of ["rakip", "kose"])
  if (
    !p.samples.some(
      (s) =>
        s.open &&
        s.kind === kind &&
        Math.abs(s.appliedX) + Math.abs(s.appliedZ) + Math.abs(s.opAx) + Math.abs(s.opAz) > 1e-6,
    )
  )
    throw Error("Fizik köprüsü etkisi eksik: " + kind);
const files = fs
  .readdirSync(path.join(root, "Assets/LastTurn"), { recursive: true })
  .filter((f) => /\.(cs|uss|json|png)$/.test(f));
if (p.sources.length !== files.length) throw Error("Kaynak kapsamı eski");
for (const file of files) {
  const name = "Assets/LastTurn/" + file.replaceAll("\\", "/");
  const hash = createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex")
    .toUpperCase();
  if (!p.sources.some((s) => s.path === name && s.hash === hash)) throw Error("Eski kaynak: " + name);
}
for (const name of [
  "no-target",
  "target-opponent",
  "bound-first",
  "cooldown",
  "target-corner",
  "bound-reuse",
  "cooldown-reuse",
])
  for (const width of [1280, 1920]) {
    const file = `b-hook-${name}-${width}.png`;
    if (!p.images.includes(file)) throw Error("Eksik Game View: " + file);
    const png = fs.readFileSync(path.join(root, "Logs", file));
    if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== (width === 1280 ? 720 : 1080))
      throw Error("PNG boyutu: " + file);
    for (const label of ["HUD gercek durum / ", "HUD hak ve hedef / ", "HUD ekranda / "])
      if (!p.checks.includes(label + name + width)) throw Error("Eksik görsel kontrol: " + name + width);
  }
const out = path.join(root, "../tests/cikti/kanca");
fs.mkdirSync(out, { recursive: true });
const data = JSON.stringify({
  images: p.images,
  samples: p.samples,
  attempts: p.attempts,
  utc: p.utc,
}).replaceAll("<", "\\u003c");
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><html lang="tr"><meta charset="utf-8"><title>Kanca kabul kanıtı</title><style>body{margin:24px auto;max-width:1200px;padding:0 18px;font:16px system-ui;background:#071217;color:#e8efe5}h1{color:#b7ff32}select,button{padding:8px;background:#14282a;color:inherit;border:1px solid #a2d34d}img{width:100%;margin-top:16px}pre{white-space:pre-wrap;background:#112024;padding:12px}table{width:100%;border-collapse:collapse}td,th{padding:8px;text-align:left;border-bottom:1px solid #365246}</style><h1>Kanca: hedef → bağlanma → bırakma</h1><p>Video değil: zaman damgalı Game View durum kareleri ve gerçek komut telemetrisi. Araç/skill başlangıcı fixture; bağlı durum ve sonuç enjekte edilmedi. Rakip ve köşe test edildi; bina Unity pilotunda denenmedi.</p><button id="prev">Önceki</button> <select id="frames"></select> <button id="next">Sonraki</button><img id="frame" alt="Unity Game View kanıtı"><pre id="info"></pre><h2>Gerçek istekler</h2><table><thead><tr><th>İstek</th><th>Yarış sn</th><th>Tür</th><th>Bağlı</th><th>Ret</th><th>Aday mesafe / açı</th></tr></thead><tbody id="rows"></tbody></table><script>const p=${data};const el=id=>document.getElementById(id);const escape=s=>String(s??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));p.images.forEach((f,i)=>el('frames').add(new Option(f,i)));function show(){const f=p.images[Number(el('frames').value)||0];el('frame').src='../../../Unity/Logs/'+f;const m=f.match(/^b-hook-(.+)-(1280|1920)\\.png$/);const s=m&&p.samples.find(s=>s.phase==='shot-'+m[1]+m[2]);el('info').textContent=JSON.stringify({utc:p.utc,frame:f,telemetry:s},null,2)}el('frames').onchange=show;el('prev').onclick=()=>{el('frames').selectedIndex=Math.max(0,el('frames').selectedIndex-1);show()};el('next').onclick=()=>{el('frames').selectedIndex=Math.min(p.images.length-1,el('frames').selectedIndex+1);show()};el('rows').innerHTML=p.attempts.map(a=>'<tr>'+[a.phase,a.time.toFixed(3),a.kind,a.open,a.blocker,(a.candidates||[]).map(c=>c.Distance.toFixed(2)+' m / '+(c.Angle*180/Math.PI).toFixed(1)+'°').join('; ')].map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('');show();</script></html>`,
);
console.log(
  `Kanca: ${p.checks.length} Play kontrolü,${p.attempts.length} gerçek istek,${p.samples.length} örnek,14 Game View,${files.length} güncel kaynak; Runtime ${p.runtimeErrors.length}/Editor ${p.editorDiagnostics.length}; ${p.utc}. Rakip/köşe kabulü; bina Unity pilotunda test edilmedi, insan kabulü değildir.`,
);
