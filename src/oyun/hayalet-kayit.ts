// Hayalet tur kaydı: her pistin en iyi tur girdilerini ve araç bilgisini depoda saklar/okur.
// Fizik belirlenimci olduğu için kaydedilen girdiler oynatıldığında birebir aynı sürüşü üretir.
import { CARS } from "../arac/araclar";
import type { SurusKurulumu } from "../fizik/tipler";
import { oku, yazJson } from "../cekirdek/depo";
import { kaydiCoz, kaydiSerilestir, type GirdiKaydi } from "../fizik/girdi-kaydi";

export interface HayaletKaydiVerisi {
  k: string;
  arac: number;
  sure: number;
  girdiJson: string;
  surum?: number;
  kurulum?: SurusKurulumu;
  baslangicAdimi?: number;
  hava?: { tutus: number; karli: boolean };
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
  kurulum?: SurusKurulumu,
  baslangicAdimi = 0,
  hava?: { tutus: number; karli: boolean },
): boolean {
  if (
    !Number.isFinite(sure) ||
    sure < 0 ||
    !Number.isInteger(baslangicAdimi) ||
    baslangicAdimi < 0 ||
    baslangicAdimi >= kayit.n
  )
    return false;
  if (kayit.kesik || kayit.tasti || kayit.n <= 0) return false;
  const mevcut = hayaletOku(k);
  if (mevcut?.surum === 3 && mevcut.kurulum) {
    const iyilesti = driftMi ? sure > mevcut.sure : sure < mevcut.sure;
    if (!iyilesti) return false;
  }
  const veri: HayaletKaydiVerisi = {
    k,
    arac,
    surum: 3,
    baslangicAdimi,
    hava,
    sure,
    girdiJson: kaydiSerilestir(kayit),
    kurulum: kurulum ? structuredClone(kurulum) : undefined,
  };
  yazJson(hayaletAnahtari(k), veri);
  return true;
}

/** Kayıtlı hayaletin girdi kaydını çöz (yoksa null) */
export function hayaletGirdiKaydiOku(k: string): {
  arac: number;
  sure: number;
  kayit: GirdiKaydi;
  kurulum: SurusKurulumu;
  baslangicAdimi: number;
  hava?: { tutus: number; karli: boolean };
} | null {
  const h = hayaletOku(k);
  if (
    !h ||
    h.surum !== 3 ||
    h.k !== k ||
    !h.girdiJson ||
    !h.kurulum?.car ||
    !h.kurulum.tu ||
    !h.kurulum.as ||
    !Number.isFinite(h.kurulum.car.hp) ||
    !Number.isFinite(h.kurulum.car.kg) ||
    !CARS[h.arac] ||
    !Number.isInteger(h.arac) ||
    !Number.isFinite(h.sure)
  )
    return null;
  try {
    const kayit = kaydiCoz(h.girdiJson);
    if (
      !Number.isInteger(kayit.n) ||
      kayit.kesik ||
      kayit.tasti ||
      kayit.n <= 0 ||
      kayit.n * 4 > kayit.veri.length
    )
      return null;
    const baslangicAdimi = h.baslangicAdimi ?? 0;
    if (!Number.isInteger(baslangicAdimi) || baslangicAdimi < 0 || baslangicAdimi >= kayit.n) return null;
    return { arac: h.arac, sure: h.sure, kayit, kurulum: h.kurulum, baslangicAdimi, hava: h.hava };
  } catch {
    return null;
  }
}
