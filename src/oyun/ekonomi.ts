// Ekonomi: yarış ödülü (para) ve fiyatlar. Saf tablolar ve formüller; bakiye ve alımlar ilerleme kaydında (oyun/ilerleme.ts).
// İleride mağaza ve modifiye buraya fiyat tablosu ekler; harcama ilerleme.ts → harca(oge, miktar) ile yapılır.
// Denge (gerekçe docs/notlar/altyapi.md, benzetim tests/birim/ekonomi.test.ts):
// - Ödül pistin zorluk seviyesine (sev, 1-6) bağlı: taban 50 + 50 × sev, yeni yıldız başına 100 + 100 × sev.
// - Yeni yıldız yoksa (tekrar) tabanın %40'ı + alınan yıldız başına %10'u: sıfır değil, "kasma" mümkün ama yavaş.
// - Araçlar seviye + para ile açılır: seviye gelince satın alınabilir olur, parayla alınır. Başlangıç araçları (her türden
//   bir D sınıfı araç) ücretsiz; Kızıl Ok ve Kor RX 0.5.x'e dek ücretsizdi, artık alınır (eski kayıtta sahip kalır).
import type { YarisTuru } from "../arac/araclar";

/** onluğa yuvarla (göstermesi kolay sayılar) */
const onluk = (x: number) => Math.round(x / 10) * 10;

/** her bitişte (yeni yıldız alınınca) taban ödül */
export const tabanPara = (zorluk: number) => 50 + 50 * zorluk;
/** pistte ilk kez alınan bir yıldızın ödülü */
export const yildizPara = (zorluk: number) => 100 + 100 * zorluk;

/** yarış sonu parası (zorluk: pistin sev'i): yeni yıldız varsa taban + yeni yıldızlar; yoksa küçük tekrar ödülü */
export function yarisSonuPara(tur: YarisTuru, zorluk: number, yildiz: number, oncekiYildiz: number) {
  void tur;
  const yeni = Math.max(0, yildiz - oncekiYildiz);
  if (yeni > 0) return tabanPara(zorluk) + yeni * yildizPara(zorluk);
  return onluk(tabanPara(zorluk) * (0.4 + 0.1 * Math.max(0, Math.min(3, yildiz))));
}

export interface Fiyat {
  /** satın alma bedeli (0: seviye gelince ücretsiz açık) */
  para: number;
  /** satın alınabilir olduğu seviye */
  seviye: number;
}

/**
 * araç fiyatları (CARS sırasıyla). Yeni oyuncu her türün D sınıfı başlangıç aracıyla başlar (ücretsiz); diğerleri seviye
 * gelince parayla alınır. Fiyat sınıf ve puanla artar; her türün ilk alınabilir aracı o türün 3.-4. pistiyle gelir
 * (Panda ~7-11 yarış, Kor RX ve Beyaz Kurt sonra; Kızıl Ok B sınıfı, Gri Atmaca'nın biraz altında).
 */
export const ARAC_FIYAT: Fiyat[] = [
  { para: 6000, seviye: 8 }, // Kızıl Ok (B)
  { para: 3500, seviye: 5 }, // Kor RX (C)
  { para: 3000, seviye: 4 }, // Beyaz Kurt
  { para: 4000, seviye: 6 }, // Mavi Yıldız
  { para: 5000, seviye: 7 }, // Gece Mavisi
  { para: 8000, seviye: 10 }, // Gri Atmaca
  { para: 10000, seviye: 11 }, // Kum Fırtınası
  { para: 12000, seviye: 13 }, // Sarı Arı
  { para: 2000, seviye: 3 }, // Panda
  { para: 15000, seviye: 15 }, // Turuncu Ejder
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
 * Ölçü: bir sokak parçası ~1-2 Çaylak yarışı, tam yarış paketi kabaca bir orta sınıf aracın yarısı (Beyaz Kurt 3000).
 */
export const PARCA_TABAN = [0, 400, 900, 1800];
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
