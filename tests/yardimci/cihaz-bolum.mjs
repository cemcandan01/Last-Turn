// Senaryo bölümleri (cihaz-menu, cihaz-garaj, cihaz-hud) ortak gövdesi: bütün cihaz × ekran denetimi bir kez koşar,
// her bölüm kendi dalının ekranlarının hatalarını raporlar. Kapsam: alan/duman → hızlı alt küme, regresyon → bütün
// cihazlar (tests/kosucu.mjs LT_CIHAZ_KAPSAM'ı ayarlar). Tam çıktı: tests/cikti/cihaz/.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CIHAZLAR, HIZLI } from "../cihazlar.mjs";
import { EKRANLAR } from "./cihaz-ekranlari.mjs";
import { cihazlariDenetle, hataSatirlari, ozetYaz } from "./cihaz-denetim.mjs";

const CIKTI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../cikti/cihaz");
const SATIR_SINIRI = 40;

export async function cihazBolumu(dal, { p, ok }) {
  const tam = process.env.LT_CIHAZ_KAPSAM == "tam";
  const cihazlar = tam ? CIHAZLAR : CIHAZLAR.filter((c) => HIZLI.includes(c.id));
  globalThis.__cihazDenetimi ||= (async () => {
    const t0 = Date.now();
    const hucreler = await cihazlariDenetle({
      br: p.context().browser(),
      adres: p.url().split("?")[0],
      cihazlar,
      ekranlar: EKRANLAR,
      cikti: CIKTI,
      resim: true,
      paralel: 3,
    });
    const sure = (Date.now() - t0) / 1000;
    ozetYaz({ hucreler, cihazlar, ekranlar: EKRANLAR, cikti: CIKTI, sure });
    return { hucreler, sure };
  })();
  const { hucreler, sure } = await globalThis.__cihazDenetimi;
  const benim = hucreler.filter((h) => h.dal == dal);
  const hatali = benim.filter((h) => h.hatalar.length);
  const satirlar = hataSatirlari(benim);
  ok(
    !satirlar.length,
    `${dal}: ${cihazlar.length} cihaz × ${new Set(benim.map((h) => h.ekran)).size} ekran (${benim.length} hücre, ${hatali.length} hatalı, toplam ${Math.round(sure)} sn)`,
  );
  for (const s of satirlar.slice(0, SATIR_SINIRI)) ok(false, s.replace(/\s+/g, " "));
  if (satirlar.length > SATIR_SINIRI)
    ok(false, `… ${satirlar.length - SATIR_SINIRI} hata daha: tests/cikti/cihaz/hatalar.txt`);
}
