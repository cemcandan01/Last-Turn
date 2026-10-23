// Ekran uyum denetimi çalıştırıcısı: sanal cihazlarda oyunun ekranlarını açar, ölçer, görüntü alır, özet üretir.
// Doğrudan kullanım: npm run cihaz (tests/cihaz.mjs); duman/alan/regresyon senaryoları da buradan çağırır.
import fs from "node:fs";
import path from "node:path";
import { DINLEYICI_ISARETI, olc } from "./cihaz-olcum.mjs";
import { EKRANLAR, gec, temizle } from "./cihaz-ekranlari.mjs";
import { TUM_ACIK } from "./ilerleme-acik.mjs";

/** cihaz ölçüsünde, güvenli alan payı uygulanmış, dinleyici işaretli yeni bağlam ve sayfa */
export async function cihazSayfasi(br, cihaz) {
  const ctx = await br.newContext({
    viewport: { width: cihaz.w, height: cihaz.h },
    deviceScaleFactor: cihaz.dpr,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(DINLEYICI_ISARETI);
  await ctx.addInitScript(TUM_ACIK);
  const p = await ctx.newPage();
  p.hatalar = [];
  p.on("pageerror", (e) => p.hatalar.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const g = cihaz.guvenli;
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: g.ust, left: g.sol, bottom: g.alt, right: g.sag },
  });
  return { ctx, p };
}

/** olc() için cihaza göre seçenekler */
export const olcSecenek = (cihaz, ek = {}) => ({
  kok: "#app",
  guvenli: cihaz.guvenli,
  centik: cihaz.centik && { ...cihaz.centik, kesin: cihaz.kesin !== false },
  kose: cihaz.kose,
  tuval: "#c",
  ...ek,
});

/** bir cihazın bütün ekranlarını denetler; [{cihaz, ekran, dal, hatalar, uyarilar, resim, sure}] döner */
export async function cihazDenetle({ br, adres, cihaz, ekranlar = EKRANLAR, cikti, resim = true }) {
  const { ctx, p } = await cihazSayfasi(br, cihaz);
  const sonuc = [];
  try {
    const hatalarSayfa = p.hatalar;
    // yüklenme yavaş çizimde (çok cihaz aynı anda) uzayabilir: bir kez daha dene
    for (let deneme = 0; ; deneme++) {
      try {
        await p.goto(adres + "?" + Date.now());
        await p.waitForFunction(() => window.LT, null, { timeout: deneme ? 60000 : 25000 });
        break;
      } catch (x) {
        if (deneme) {
          return ekranlar.map((ek) => ({
            cihaz: cihaz.id,
            ekran: ek.id,
            dal: ek.dal,
            hatalar: [{ oge: "sayfa", sorun: "oyun açılmadı: " + x.message.split("\n")[0] }],
            uyarilar: [],
            resim: null,
            sure: 0,
          }));
        }
      }
    }
    await gec(800);
    const klasor = cikti && path.join(cikti, cihaz.id);
    if (klasor && resim) fs.mkdirSync(klasor, { recursive: true });
    for (const ek of ekranlar) {
      const t0 = Date.now(),
        h0 = hatalarSayfa.length,
        h = { cihaz: cihaz.id, ekran: ek.id, dal: ek.dal, hatalar: [], uyarilar: [], resim: null };
      try {
        // yavaş çizimde (çok cihaz aynı anda) ekran geç açılabilir: bir kez daha dene, sonra hata say
        for (let deneme = 0; ; deneme++) {
          await temizle(p);
          await gec(150);
          await ek.ac(p);
          try {
            await p.waitForSelector(ek.bekle, { state: "visible", timeout: deneme ? 15000 : 6000 });
            break;
          } catch (x) {
            if (deneme) throw x;
          }
        }
        // animasyonlar bitsin (sonsuz olanlar hariç) ve yerleşim otursun
        await p
          .evaluate(() =>
            Promise.all(
              document
                .getAnimations()
                .filter((a) => a.effect && a.effect.getComputedTiming().endTime <= 1500)
                .map((a) => a.finished.catch(() => 0)),
            ),
          )
          .catch(() => 0);
        await gec(500);
        const o = await p.evaluate(
          olc,
          olcSecenek(cihaz, { dikeyKaydirma: !!ek.dikeyKaydirma, haric: ek.haric || [] }),
        );
        h.hatalar = o.hatalar;
        h.uyarilar = o.uyarilar;
        h.sayac = o.sayac;
        h.boyut = o.boyut;
        if (hatalarSayfa.length > h0)
          h.hatalar.push({ oge: "sayfa", sorun: "sayfa hatası: " + hatalarSayfa[h0] });
        if (klasor && resim) {
          const dosya = path.join(klasor, ek.id + ".png");
          await p.screenshot({ path: dosya, scale: "css" });
          h.resim = path.relative(cikti, dosya);
        }
      } catch (x) {
        h.hatalar.push({ oge: ek.bekle, sorun: "ekran açılmadı: " + x.message.split("\n")[0] });
      }
      h.sure = (Date.now() - t0) / 1000;
      sonuc.push(h);
    }
  } finally {
    await ctx.close();
  }
  return sonuc;
}

/** birkaç cihazı en çok `paralel` tanesi aynı anda olacak şekilde koşar */
export async function cihazlariDenetle({
  br,
  adres,
  cihazlar,
  ekranlar,
  cikti,
  resim = true,
  paralel = 2,
  ekranSec = null, // (cihaz) => o cihazda koşacak ekranlar; yoksa hepsi `ekranlar`
  log = () => {},
}) {
  const tum = [];
  let sira = 0;
  const is = async () => {
    while (sira < cihazlar.length) {
      const c = cihazlar[sira++],
        t0 = Date.now();
      const r = await cihazDenetle({
        br,
        adres,
        cihaz: c,
        ekranlar: ekranSec ? ekranSec(c) : ekranlar,
        cikti,
        resim,
      });
      tum.push(...r);
      log(
        `  ${c.id.padEnd(22)} ${((Date.now() - t0) / 1000).toFixed(0)} sn · ${r.filter((x) => x.hatalar.length).length}/${r.length} ekranda hata`,
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(paralel, cihazlar.length) }, is));
  const sira0 = new Map(cihazlar.map((c, i) => [c.id, i])),
    sira1 = new Map(ekranlar.map((e, i) => [e.id, i]));
  return tum.sort(
    (a, b) => sira0.get(a.cihaz) - sira0.get(b.cihaz) || sira1.get(a.ekran) - sira1.get(b.ekran),
  );
}

/** hata satırı: "<sahip dal> | <cihaz> | <ekran> | <öğe seçici> | <sorun>" */
export const hataSatirlari = (hucreler) =>
  hucreler.flatMap((h) => h.hatalar.map((x) => `${h.dal} | ${h.cihaz} | ${h.ekran} | ${x.oge} | ${x.sorun}`));
export const uyariSatirlari = (hucreler) =>
  hucreler.flatMap((h) =>
    h.uyarilar.map((x) => `${h.dal} | ${h.cihaz} | ${h.ekran} | ${x.oge} | ${x.sorun}`),
  );

/** özet dosyaları: ozet.html (kontak tablosu), ozet.md, hatalar.txt, sonuc.json */
export function ozetYaz({ hucreler, cihazlar, ekranlar, cikti, sure }) {
  fs.mkdirSync(cikti, { recursive: true });
  const hucre = (c, e) => hucreler.find((h) => h.cihaz == c && h.ekran == e);
  const satirlar = hataSatirlari(hucreler),
    uyarilar = uyariSatirlari(hucreler);
  fs.writeFileSync(path.join(cikti, "hatalar.txt"), satirlar.join("\n") + (satirlar.length ? "\n" : ""));
  fs.writeFileSync(path.join(cikti, "uyarilar.txt"), uyarilar.join("\n") + (uyarilar.length ? "\n" : ""));
  fs.writeFileSync(
    path.join(cikti, "sonuc.json"),
    JSON.stringify({ sure, cihazlar: cihazlar.map((c) => c.id), hucreler }, null, 1),
  );
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  let html = `<!doctype html><meta charset="utf-8"><title>Cihaz uyum özeti</title><style>
body{font:12px system-ui;background:#10252b;color:#eef3ee;margin:12px}
table{border-collapse:collapse}th,td{border:1px solid #2d5a63;padding:3px;vertical-align:top}
th{background:#19383f;position:sticky;top:0}td img{width:150px;display:block;border-radius:3px}
.ok{color:#7be28f}.kotu{color:#ff7a6a;font-weight:700}.uy{color:#e8c25a}
.hc{max-width:150px;font-size:10px;line-height:1.25;word-break:break-word}
td.k{background:#3a1f1f}td.g{background:#16301f}
</style><h2>Cihaz × ekran özeti</h2><p>${hucreler.length} hücre · ${satirlar.length} hata · ${uyarilar.length} uyarı · ${sure ? Math.round(sure) + " sn" : ""}</p><table><tr><th>cihaz</th>`;
  for (const e of ekranlar) html += `<th>${esc(e.ad)}<br><small>${e.dal}</small></th>`;
  html += "</tr>";
  for (const c of cihazlar) {
    html += `<tr><th style="text-align:left">${esc(c.ad)}<br><small>${c.w}×${c.h} @${c.dpr}x</small></th>`;
    for (const e of ekranlar) {
      const h = hucre(c.id, e.id);
      if (!h) {
        html += "<td>-</td>";
        continue;
      }
      const img = h.resim ? `<a href="${esc(h.resim)}"><img loading="lazy" src="${esc(h.resim)}"></a>` : "";
      const durum = h.hatalar.length
        ? `<span class="kotu">✗ ${h.hatalar.length} hata</span>`
        : `<span class="ok">✓</span>${h.uyarilar.length ? ` <span class="uy">(${h.uyarilar.length} uyarı)</span>` : ""}`;
      html += `<td class="${h.hatalar.length ? "k" : "g"}">${img}${durum}<div class="hc">${h.hatalar
        .slice(0, 3)
        .map((x) => esc(x.oge + ": " + x.sorun))
        .join("<br>")}</div></td>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  fs.writeFileSync(path.join(cikti, "ozet.html"), html);
  // tablo: cihaz × ekran
  const kisa = (e) => e.id.replace("yaris-", "y-").replace("garaj-", "g-").slice(0, 10);
  let md = `# Cihaz uyum özeti\n\n${cihazlar.length} cihaz × ${ekranlar.length} ekran = ${hucreler.length} hücre · ${satirlar.length} hata · ${uyarilar.length} uyarı\n\n`;
  md +=
    "| cihaz | " + ekranlar.map(kisa).join(" | ") + " |\n|---|" + ekranlar.map(() => "---").join("|") + "|\n";
  for (const c of cihazlar)
    md +=
      `| ${c.id} | ` +
      ekranlar
        .map((e) => {
          const h = hucre(c.id, e.id);
          return !h ? "-" : h.hatalar.length ? "✗" + h.hatalar.length : "✓";
        })
        .join(" | ") +
      " |\n";
  const dal = {};
  for (const h of hucreler) dal[h.dal] = (dal[h.dal] || 0) + h.hatalar.length;
  md +=
    "\nDal dal hata: " +
    Object.entries(dal)
      .map(([d, n]) => `${d} ${n}`)
      .join(", ") +
    "\n";
  fs.writeFileSync(path.join(cikti, "ozet.md"), md);
  return { md, satirlar, uyarilar, dal };
}
