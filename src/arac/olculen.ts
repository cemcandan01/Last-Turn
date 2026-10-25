// Üretilmiş dosya (npm run olcum -- garaj): stok araçların sonsuz düz asfaltta gerçek fizikle ölçülen değerleri
// (Dengeli). [azami hız km/sa, 0-100 sn, 100-0 m]. Elle düzenleme; araç ya da fizik değişince yeniden üret.
export const OLCULEN: Record<string, [number, number, number]> = {
  gt: [290.3, 2.43, 10], // Kızıl Ok
  rx: [184.7, 2.1, 17.7], // Kor RX
  dr: [223.1, 2.6, 15.8], // Beyaz Kurt
  rl: [200, 3.38, 18.8], // Mavi Yıldız
  dg: [343.2, 2.22, 18.3], // Gece Mavisi
  gt3: [293.7, 2.47, 9.9], // Gri Atmaca
  t16: [185.4, 2.33, 17.5], // Kum Fırtınası
  int: [203.5, 3.18, 18.3], // Sarı Arı
  ae86: [195.6, 2.83, 16.2], // Panda
  supra: [395.9, 2.62, 16.1], // Turuncu Ejder
  e30: [174.9, 3.17, 11.5], // Gümüş Serçe
  golf: [171, 3.28, 16.4], // Bozkır Tavşanı
  niva: [161.9, 3.9, 19.9], // Haki Keçi
  c33: [178.1, 2.9, 16.2], // Bordo Tilki
  fox: [218.6, 2.63, 16.6], // Kara Boğa
};
