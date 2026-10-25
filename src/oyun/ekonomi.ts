// Süreye normalize kariyer ekonomisi. Kimlik/zorluk/kurulum sözleşmesi kariyer.ts'te;
// ölçülmüş referanslar pist-tanimlari.ts'te, sahiplik ve net alım kredisi ilerleme.ts'te.
// Her geçerli bitiriş olağan ödül, yalnız iyileşen yıldızlar birikimli bonus verir.
import type { YarisTuru } from "../arac/araclar";
import { kariyerKurali, KARIYER_PARA_DAKIKA, KARIYER_XP_DAKIKA } from "./kariyer";

/** Yarış kimliğinden süre ve zorluk birlikte alınır; lv hiçbir zaman zorluk değildir. */
export function yarisOdulTabani(tur: YarisTuru, lv: number) {
  const k = kariyerKurali(tur, lv);
  if (!k) return { para: 0, xp: 0 };
  return {
    para: Math.max(10, Math.round(((k.referansSn / 60) * KARIYER_PARA_DAKIKA[k.asama - 1]) / 10) * 10),
    xp: Math.max(2, Math.round(((k.referansSn / 60) * KARIYER_XP_DAKIKA[k.asama - 1]) / 2) * 2),
  };
}

/** Yıldız bonusu birikimli: doğrudan 3★ ile 1→2→3 aynı toplam bonusu verir. */
export function yarisOdulu(tur: YarisTuru, lv: number, yildiz: number, oncekiYildiz: number) {
  const b = yarisOdulTabani(tur, lv),
    simdi = Math.max(0, Math.min(3, Math.trunc(yildiz))),
    once = Math.max(0, Math.min(3, Math.trunc(oncekiYildiz))),
    bonus = Math.max(0, simdi - once) * 0.5,
    // Yeni yıldızın bonusu dışında her geçerli bitiriş aynı olağan ödül çizgisindedir.
    katsayi = (simdi > 0 ? 1 : 0.35) + bonus;
  return { para: Math.round(b.para * katsayi), xp: Math.round(b.xp * katsayi) };
}
export const yarisSonuPara = (tur: YarisTuru, lv: number, yildiz: number, oncekiYildiz: number) =>
  yarisOdulu(tur, lv, yildiz, oncekiYildiz).para;

export interface Fiyat {
  /** satın alma bedeli (0: seviye gelince ücretsiz açık) */
  para: number;
  /** satın alınabilir olduğu seviye */
  seviye: number;
}

/** Araç başına edinme bedeli; beş başlangıç aracı ücretsiz. Sınıf değişimi yeni platform yatırımıdır. */
export const ARAC_FIYAT: Fiyat[] = [
  { para: 18000, seviye: 8 }, // Kızıl Ok (C)
  { para: 12500, seviye: 5 }, // Kor RX (C)
  { para: 8500, seviye: 4 }, // Beyaz Kurt
  { para: 14000, seviye: 6 }, // Mavi Yıldız
  { para: 16000, seviye: 7 }, // Gece Mavisi
  { para: 22000, seviye: 10 }, // Gri Atmaca
  { para: 25000, seviye: 11 }, // Kum Fırtınası
  { para: 26000, seviye: 13 }, // Sarı Arı
  { para: 7000, seviye: 3 }, // Panda
  { para: 35000, seviye: 15 }, // Turuncu Ejder
  { para: 0, seviye: 1 }, // Gümüş Serçe (başlangıç, asfalt)
  { para: 0, seviye: 1 }, // Bozkır Tavşanı (başlangıç, rallycross)
  { para: 0, seviye: 1 }, // Haki Keçi (başlangıç, ralli)
  { para: 0, seviye: 1 }, // Bordo Tilki (başlangıç, drift)
  { para: 0, seviye: 1 }, // Kara Boğa (başlangıç, drag)
];

/** yeni oyuncunun başlangıç araçları: ücretsiz ve 1. seviyede açık olanlar */
export const BASLANGIC_ARACLARI = ARAC_FIYAT.flatMap((f, i) => (f.para <= 0 && f.seviye <= 1 ? [i] : []));
/** yeni oyuncunun ilk seçili aracı (asfalt başlangıç aracı) */
export const ILK_ARAC = BASLANGIC_ARACLARI[0];
/** 0.5.x'e dek ücretsiz olan araçlar (Kızıl Ok, Kor RX): eski kayıtta sahip sayılır */
export const ESKI_UCRETSIZ = [0, 1];

export const aracFiyati = (aracNo: number): Fiyat => ARAC_FIYAT[aracNo] ?? { para: 0, seviye: 1 };

/**
 * modifiye parçası fiyatı: seviye tabanı × kategori çarpanı, 50'ye yuvarlı. Zayıf parçalar (seviye 0: kısıtlayıcı,
 * balast, sokak freni…) ücretsizdir; puanı sınıf sınırına indirmek para istemez. Parça araç başına alınır.
 * İlk parça yaklaşık 2–4 dakika, uzmanlık kurulumu birkaç tamamlayıcı yatırım. Net bedel kategori kredisiyle bulunur.
 */
export const PARCA_TABAN = [0, 350, 1000, 2400];
/** Büyük dönüşümler normal kademe fiyatını kullanmaz. */
export const PARCA_OZEL_FIYAT: Record<string, number> = { "motor-degisim": 9000, "turbo-buyuk": 5500 };
export const PARCA_KAT_CARPAN: Record<string, number> = {
  motor: 1.3,
  turbo: 1.5,
  sanziman: 0.8,
  lastik: 0.6,
  suspansiyon: 0.9,
  diferansiyel: 0.8,
  fren: 0.7,
  agirlik: 1.2,
  aero: 0.8,
  cekis: 1.6,
  direksiyon: 0.7,
  koruma: 0.4,
};
export const parcaFiyatHesapla = (sv: number, kat: string) =>
  Math.round(((PARCA_TABAN[sv] ?? 0) * (PARCA_KAT_CARPAN[kat] ?? 1)) / 50) * 50;
