// Tek ölçek: aynı fizik değeri her araçta aynı puanı verir. Tür/pilot/araç kimliği puanı değiştirmez.
export const OZELLIK_ADLARI = [
  "Güç/ağırlık",
  "Hızlanma",
  "Azami hız",
  "Yol tutuşu",
  "Fren",
  "Arazi",
] as const;
/** Sınıfın üst yarısı stok araçla doldurulmaz. */
export const STOK_TAVAN = { D: 200, C: 450, B: 550, A: 650, S: 750, X: 900 } as const;
export function ozellikPuani(o: {
  gucAgirlik: number;
  ivme: number;
  hiz: number;
  tutus: number;
  fren: number;
  arazi: number;
}) {
  const ham = [
      300 * Math.pow(o.gucAgirlik, 1.25),
      150 / o.ivme,
      o.hiz / 3,
      Math.max(0, o.tutus - 12) * 3.1,
      Math.max(0, 600 / o.fren - 15),
      o.arazi * 6,
    ],
    toplam = ham.reduce((a, b) => a + b, 0),
    hedef = Math.max(100, Math.min(999, Math.round(toplam))),
    kesir = ham.map((x) => (x * hedef) / toplam),
    tam = kesir.map(Math.floor);
  // Tam sayı alt değerlerinin toplamı her zaman toplam puana eşittir.
  let kalan = hedef - tam.reduce((a, b) => a + b, 0);
  for (const i of kesir.map((_, i) => i).sort((a, b) => kesir[b] - tam[b] - (kesir[a] - tam[a]))) {
    if (kalan-- <= 0) break;
    tam[i]++;
  }
  return OZELLIK_ADLARI.map((ad, i) => ({ ad, puan: tam[i] }));
}
