// Kariyerin tek veri sözleşmesi: pist kimliği, aşama, performans bütçesi ve hedef kurulum.
// Yeni pist aynı zorluk aşamasının kurallarını alır; ölçülen hedefler pist verisine yazılır.
import { CARS, type YarisTuru } from "../arac/araclar";
import { TDEF } from "../dunya/pist-tanimlari";
import { performansPuani, sinifHarfi } from "../arac/performans";

export const KARIYER_SURUM = 1;
/** Önceki sınırsız/başka fizik kurallı rekorlar yeni kupanın rekoruyla karışmaz. */
export const kariyerRekorAnahtari = (eski: string, surum = KARIYER_SURUM) => `kariyer${surum}_${eski}`;
export const KARIYER_TAVAN = [200, 250, 400, 500, 600, 999] as const;
export const KARIYER_PARA_DAKIKA = [140, 170, 205, 245, 290, 340] as const;
export const KARIYER_XP_DAKIKA = [18, 21, 25, 30, 36, 43] as const;
export const BASLANGIC: Record<YarisTuru, number> = { gp: 10, rx: 11, rl: 12, dp: 13, dg: 14 };
export const PLATFORM: Record<YarisTuru, number> = { gp: 0, rx: 1, rl: 3, dp: 2, dg: 4 };
const UZMAN: Record<YarisTuru, string[]> = {
  gp: ["suspansiyon-spor", "diferansiyel-lsd"],
  rx: ["suspansiyon-rallikros", "diferansiyel-ralli"],
  rl: ["suspansiyon-ralli", "koruma"],
  dp: ["diferansiyel-kilitli", "aci-kiti"],
  dg: ["suspansiyon-drag", "sanziman-uzun"],
};

/** Hedef kurulum ulaşılabilir bir bütçedir; parçalar oyuncuya otomatik verilmez. */
export function kariyerKurulumu(tur: YarisTuru, asama: number) {
  // Usta drift kupaları gerçek proje kurulumu ister; yalnız stok yeni araç referans olamaz.
  if (tur == "dp" && asama >= 4)
    return {
      arac: asama == 5 ? 8 : 2,
      parca: [
        "motor-degisim",
        "turbo-kucuk",
        asama >= 5 ? "agirlik-3" : "agirlik-2",
        asama >= 5 ? "lastik-yaris" : "lastik-spor",
        "diferansiyel-kilitli",
        "aci-kiti",
      ],
    };
  // Sert rampalı D400 kupası: satın alınan rallikros platformu, kısıtlayıcıyla sınıfa hazırlanır.
  if (tur == "rx" && asama == 3)
    return { arac: 1, parca: ["motor-kisitli", "agirlik-balast", "lastik-spor"] };
  // Efsane asfalt güç yığmaktan önce fren/aero/şasi ister; dengeli üst platform referansı.
  if (tur == "gp" && asama == 6)
    return {
      arac: 5,
      parca: [
        "motor-yaris",
        "agirlik-3",
        "lastik-yaris",
        "suspansiyon-yaris",
        "diferansiyel-lsd",
        "fren-yaris",
        "aero-buyuk",
      ],
    };
  const arac = asama <= 3 ? BASLANGIC[tur] : PLATFORM[tur];
  const parca =
    asama == 1
      ? []
      : asama == 2
        ? ["motor-sokak", "lastik-sokak", ...UZMAN[tur]]
        : asama == 3
          ? ["motor-yaris", "turbo-kucuk", "agirlik-2", "lastik-spor", ...UZMAN[tur]]
          : asama == 4
            ? ["lastik-spor", ...UZMAN[tur]]
            : asama == 5
              ? ["motor-spor", "agirlik-2", "lastik-yaris", ...UZMAN[tur]]
              : ["motor-yaris", "turbo-buyuk", "agirlik-3", "lastik-yaris", ...UZMAN[tur]];
  return { arac, parca };
}

export function kariyerKurali(tur: YarisTuru, lv: number) {
  const pist = TDEF.find((d) => d.t == tur && d.lv == lv);
  if (!pist) return null;
  const asama = pist.sev ?? pist.lv;
  const tavan = KARIYER_TAVAN[asama - 1];
  if (tavan == null) throw new Error(`Kariyer aşaması tanımsız: ${tur}/${lv}`);
  // Driftte süre verisi ölçümle yazılır; diğer türlerde 3★ hedefi sabit referanstır.
  const referansSn = pist.odulSn ?? (tur == "dp" ? 180 : (pist.ys?.[1] ?? pist.tg ?? 60));
  return {
    asama,
    tavan,
    ad: `${sinifHarfi(tavan)}${tavan}`,
    referansSn: referansSn + 12,
    ...kariyerKurulumu(tur, asama),
  };
}

/** Türdeki önceki aşamanın %60 yıldızı, başka disipline gitmeden bir sonraki aşamayı açar. */
export function kariyerYildizKapisi(tur: YarisTuru, lv: number, oku: (tur: YarisTuru, lv: number) => number) {
  const k = kariyerKurali(tur, lv);
  if (!k || k.asama == 1) return { acik: !!k, alinan: 0, gereken: 0 };
  const onceki = TDEF.filter((d) => d.t == tur && (d.sev ?? d.lv) == k.asama - 1);
  const alinan = onceki.reduce((n, d) => n + oku(tur, d.lv), 0);
  const gereken = Math.ceil(onceki.length * 3 * 0.6);
  return { acik: onceki.length > 0 && alinan >= gereken, alinan, gereken };
}

/** Araç için aynı disiplinde önerilen erişim aşaması (seviye alternatifi). */
export const aracKariyerAsamasi = (no: number) => (no >= 10 ? 1 : CARS[no].ty == "dp" ? 2 : no == 9 ? 5 : 4);

/** Sabit ortak puan bütçesi: yardım ve yarış türü puanı değiştirmez. */
export function kariyereUygun(tur: YarisTuru, lv: number, arac: number, parca: readonly string[]) {
  const k = kariyerKurali(tur, lv);
  return !!k && performansPuani(arac, parca).puan <= k.tavan;
}
