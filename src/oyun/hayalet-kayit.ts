// Hayalet tur kaydı: her pistin en iyi tur girdilerini ve araç bilgisini depoda saklar/okur.
// Fizik belirlenimci olduğu için kaydedilen girdiler oynatıldığında birebir aynı sürüşü üretir.
import { oku, yazJson } from "../cekirdek/depo";
import { kaydiCoz, kaydiSerilestir, type GirdiKaydi } from "../fizik/girdi-kaydi";

export interface HayaletKaydiVerisi {
  k: string;
  arac: number;
  sure: number;
  girdiJson: string;
}

const HAYALET_ON_EKI = "lt_hayalet_";

export function hayaletAnahtari(k: string): string {
  return HAYALET_ON_EKI + k;
}

/** Kayıtlı hayalet verisini oku (yoksa null) */
export function hayaletOku(k: string): HayaletKaydiVerisi | null {
  const metin = oku(hayaletAnahtari(k));
  if (!metin) return null;
  try {
    return JSON.parse(metin) as HayaletKaydiVerisi;
  } catch {
    return null;
  }
}

/**
 * Yeni en iyi tur yapıldığında hayalet kaydını sakla.
 * sure: Zaman bazlı yarışlarda saniye (düşük iyi), drift yarışında puan (yüksek iyi; driftMı boolean ile).
 */
export function hayaletKaydet(
  k: string,
  arac: number,
  sure: number,
  kayit: GirdiKaydi,
  driftMi = false,
): boolean {
  if (kayit.kesik || kayit.n <= 0) return false;
  const mevcut = hayaletOku(k);
  if (mevcut) {
    const iyilesti = driftMi ? sure > mevcut.sure : sure < mevcut.sure;
    if (!iyilesti) return false;
  }
  const veri: HayaletKaydiVerisi = {
    k,
    arac,
    sure,
    girdiJson: kaydiSerilestir(kayit),
  };
  yazJson(hayaletAnahtari(k), veri);
  return true;
}

/** Kayıtlı hayaletin girdi kaydını çöz (yoksa null) */
export function hayaletGirdiKaydiOku(k: string): { arac: number; sure: number; kayit: GirdiKaydi } | null {
  const h = hayaletOku(k);
  if (!h || !h.girdiJson) return null;
  try {
    const kayit = kaydiCoz(h.girdiJson);
    return { arac: h.arac, sure: h.sure, kayit };
  } catch {
    return null;
  }
}
