// Ekonomi: yarış ödülü (para) ve fiyatlar. Saf tablolar ve formüller; bakiye ve alımlar ilerleme kaydında (oyun/ilerleme.ts).
// İleride mağaza ve modifiye buraya fiyat tablosu ekler; harcama ilerleme.ts → harca(oge, miktar) ile yapılır.
// Denge (gerekçe docs/notlar/altyapi.md, benzetim tests/birim/ekonomi.test.ts):
// - Ödül pistin zorluk seviyesine (sev, 1-6) bağlı: taban 50 + 50 × sev, yeni yıldız başına 100 + 100 × sev.
// - Yeni yıldız yoksa (tekrar) tabanın %40'ı + alınan yıldız başına %10'u: sıfır değil, "kasma" mümkün ama yavaş.
// - Araçlar seviye + para ile açılır: seviye gelince satın alınabilir olur, parayla alınır. Başlangıç araçları ücretsiz.
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
 * araç fiyatları (CARS sırasıyla). Kızıl Ok ve Kor RX başta ücretsiz; diğerleri seviye gelince parayla alınır.
 * Panda başlangıç drift aracı (ucuz, erken: ilk alım ~7-11 yarış); her türün ilk aracı o türün 3. pistinden önce.
 */
export const ARAC_FIYAT: Fiyat[] = [
  { para: 0, seviye: 1 }, // Kızıl Ok
  { para: 0, seviye: 1 }, // Kor RX
  { para: 3000, seviye: 4 }, // Beyaz Kurt
  { para: 4000, seviye: 6 }, // Mavi Yıldız
  { para: 5000, seviye: 7 }, // Gece Mavisi
  { para: 8000, seviye: 10 }, // Gri Atmaca
  { para: 10000, seviye: 11 }, // Kum Fırtınası
  { para: 12000, seviye: 13 }, // Sarı Arı
  { para: 2000, seviye: 3 }, // Panda
  { para: 15000, seviye: 15 }, // Turuncu Ejder
];

export const aracFiyati = (aracNo: number): Fiyat => ARAC_FIYAT[aracNo] ?? { para: 0, seviye: 1 };
