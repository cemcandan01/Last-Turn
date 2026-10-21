/*! Menü ikonları. Harita, araba, kask ve dişli: Tabler Icons 3.49 (https://tabler.io/icons), MIT Lisansı,
 * Telif (c) 2020-2026 Paweł Kuna. Lisans metni: public/lisanslar.txt. Yarış bayrağı oyunun kendi çizimi. */
// Çizgi ikonlar (24×24, stroke=currentColor); yalnız <path> içerikleri, çerçeve ikon() ile eklenir.

const IKON = {
  /** dama bayrak (oyunun çizimi) */
  yaris: '<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/><path d="M9 4v8M13 4v8M5 8h13"/>',
  /** tabler: map */
  harita: '<path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13"/><path d="M9 4v13"/><path d="M15 7v13"/>',
  /** tabler: car (yandan) */
  araba:
    '<path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>',
  /** tabler: helmet */
  kask: '<path d="M12 4a9 9 0 0 1 5.656 16h-11.312a9 9 0 0 1 5.656 -16"/><path d="M20 9h-8.8a1 1 0 0 0 -.968 1.246c.507 2 1.596 3.418 3.268 4.254c2 1 4.333 1.5 7 1.5"/>',
  /** tabler: settings (dişli) */
  disli:
    '<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
};
export type IkonAdi = keyof typeof IKON;

/** çizgi ikon: rengi yazı renginden alır */
export const ikon = (ad: IkonAdi) =>
  `<svg class="ik" viewBox="0 0 24 24" aria-hidden="true">${IKON[ad]}</svg>`;
