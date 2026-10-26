// MUTANT ölçülmüş referansları (issue #16): tests/olcum/mutant.test.ts (TAM=1) gerçek fizik + pilotla, türün başlangıç
// aracıyla, bütün turlar. Anahtar `<tür>_<pist no>` (pist numarası kalıcıdır). Değer: stok / dengeli / uzman build
// sonucu (süre sn, drift puan). Fizik, araç, parça ya da pist değişince ölçümü yenile ve bu tabloyu yeniden üret.
// Rapor: docs/denge/2026-10-26-mutant-olcum.json
import type { Referans } from "./mutant-kosu";

export const MUTANT_REFERANS: Record<string, Referans> = {
  gp_1: { stok: 47.18, dengeli: 45.17, uzman: 45.08, nadir: 40.82, birlesik: 40.5 },
  gp_2: { stok: 62.82, dengeli: 59.8, uzman: 59.12, nadir: 56.88, birlesik: 55.42 },
  gp_3: { stok: 65.17, dengeli: 61.73, uzman: 59.47, nadir: 58.8, birlesik: 59.07 },
  gp_4: { stok: 72.57, dengeli: 68.72, uzman: 66.88, nadir: 66.48, birlesik: 61.33 },
  gp_5: { stok: 65.08, dengeli: 63.45, uzman: 63.23, nadir: 60.58, birlesik: 57.45 },
  gp_6: { stok: 75.1, dengeli: 69.28, uzman: 73.05, nadir: 69.98, birlesik: 68.83 },
  rx_1: { stok: 47.23, dengeli: 44.8, uzman: 43.68, nadir: 45.37, birlesik: 44.9 },
  dp_1: { stok: 1070, dengeli: 1041, uzman: 1055, nadir: 1803, birlesik: 1541 },
  dp_2: { stok: 1177, dengeli: 1278, uzman: 1370, nadir: 1598, birlesik: 1614 },
  dp_3: { stok: 1399, dengeli: 1066, uzman: 772, nadir: 1473, birlesik: 1531 },
  dp_4: { stok: 1456, dengeli: 1449, uzman: 1758, nadir: 2042, birlesik: 2277 },
  dp_5: { stok: 2450, dengeli: 1490, uzman: 3134, nadir: 6542, birlesik: 7720 },
  dp_6: { stok: 2429, dengeli: 3312, uzman: 2438, nadir: 3664, birlesik: 2932 },
  rl_1: { stok: 55.05, dengeli: 52.73, uzman: 53.5, nadir: 46.58, birlesik: 47.72 },
  dg_1: { stok: 8.85, dengeli: 8.35, uzman: 7.93, nadir: 7.28, birlesik: 6.88 },
  dg_2: { stok: 11.67, dengeli: 11.07, uzman: 10.48, nadir: 9.68, birlesik: 9.12 },
  dg_3: { stok: 14.08, dengeli: 13.38, uzman: 12.68, nadir: 11.78, birlesik: 11.08 },
  dg_4: { stok: 16.4, dengeli: 15.65, uzman: 14.78, nadir: 13.87, birlesik: 13.02 },
  dg_5: { stok: 23.23, dengeli: 22.32, uzman: 21.03, nadir: 20.17, birlesik: 18.88 },
  dg_6: { stok: 40.13, dengeli: 39.03, uzman: 36.57, nadir: 36.65, birlesik: 34.15 },
  gp_7: { stok: 75.03, dengeli: 72.63, uzman: 72.27, nadir: 66.58, birlesik: 66.12 },
  gp_8: { stok: 48.92, dengeli: 47.53, uzman: 46.62, nadir: 43.27, birlesik: 42.53 },
  rx_7: { stok: 71.63, dengeli: 69.03, uzman: 68.53, nadir: 66.85, birlesik: 67.05 },
  rx_8: { stok: 68.98, dengeli: 65.45, uzman: 64.43, nadir: 63.7, birlesik: 64.3 },
  dp_7: { stok: 1101, dengeli: 1241, uzman: 1130, nadir: 2330, birlesik: 1600 },
  dp_8: { stok: 1538, dengeli: 1420, uzman: 1174, nadir: 1555, birlesik: 1809 },
  rl_7: { stok: 50.75, dengeli: 47.67, uzman: 47.3, nadir: 47.23, birlesik: 44.52 },
  dg_7: { stok: 10.22, dengeli: 9.67, uzman: 9.17, nadir: 8.43, birlesik: 7.95 },
  dg_8: { stok: 27.42, dengeli: 26.43, uzman: 24.87, nadir: 24.17, birlesik: 22.58 },
};

/**
 * yağmurda ölçülmüş referanslar (A2; HAVA=rain TUR=rx TAM=1, docs/denge/2026-10-26-mutant-olcum-yagmur.json): yağmurlu
 * boss (Çamur Baronu) yalnız bunlardan seçilir. Yalnız beş build'i de temiz bitirilen pist girer: Toz Tepeleri
 * (dengeli/birleşik) ve Kar Kros (stok/nadir) yağmurda pilotla temiz bitmedi, öteki rallikros pistleri hiç bitmedi.
 */
export const MUTANT_REFERANS_YAGMUR: Record<string, Referans> = {
  rx_7: { stok: 74.33, dengeli: 70.45, uzman: 69.38, nadir: 69.5, birlesik: 68.5 },
};
