/*! Menü ikonları. Harita, araba, mağaza, kask, dişli, dağ, dönüş, start ışıkları, Google, zarf, kilit, para, yıldız, ok, ses ve ızgara: Tabler Icons 3.49 (https://tabler.io/icons), MIT Lisansı,
 * Telif (c) 2020-2026 Paweł Kuna. Lisans metni: public/lisanslar.txt. Yarış bayrağı ve pist oyunun kendi çizimi. */
// Çizgi ikonlar (24×24, stroke=currentColor); yalnız <path> içerikleri, çerçeve ikon() ile eklenir.

const IKON = {
  /** dama bayrak (oyunun çizimi) */
  yaris: '<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/><path d="M9 4v8M13 4v8M5 8h13"/>',
  /** tabler: map */
  harita: '<path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13"/><path d="M9 4v13"/><path d="M15 7v13"/>',
  /** tabler: car (yandan) */
  araba:
    '<path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>',
  /** tabler: building-store (mağaza) */
  magaza:
    '<path d="M3 21l18 0"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4"/><path d="M5 21l0 -10.15"/><path d="M19 21l0 -10.15"/><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4"/>',
  /** tabler: helmet */
  kask: '<path d="M12 4a9 9 0 0 1 5.656 16h-11.312a9 9 0 0 1 5.656 -16"/><path d="M20 9h-8.8a1 1 0 0 0 -.968 1.246c.507 2 1.596 3.418 3.268 4.254c2 1 4.333 1.5 7 1.5"/>',
  /** tabler: settings (dişli) */
  disli:
    '<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  /** tabler: star (yıldız; dolu hâli CSS ile) */
  yildiz:
    '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>',
  /** tabler: coin (madeni para) */
  para: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1"/><path d="M12 7v10"/>',
  /** tabler: brand-google (hesap türü) */
  google:
    '<path d="M20.945 11a9 9 0 1 1 -3.284 -5.997l-2.655 2.392a5.5 5.5 0 1 0 2.119 6.605h-4.125v-3h7.945"/>',
  /** tabler: mail (e-posta hesabı) */
  eposta:
    '<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z"/><path d="M3 7l9 6l9 -6"/>',
  /** tabler: lock */
  kilit:
    '<path d="M5 11a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -6"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 9v-4a4 4 0 0 1 8 0v4"/>',
  /** tabler: chevron-left */
  sol: '<path d="M15 6l-6 6l6 6"/>',
  /** tabler: chevron-right */
  sag: '<path d="M9 6l6 6l-6 6"/>',
  /** tabler: x (kapat) */
  kapat: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  /** tabler: chevron-down */
  asagi: '<path d="M6 9l6 6l6 -6"/>',
  /** tabler: chevron-up */
  yukari: '<path d="M6 15l6 -6l6 6"/>',
  /** tabler: arrow-right (yönlendirme) */
  ok: '<path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>',
  /** tabler: volume (motoru dinle) */
  ses: '<path d="M15 8a5 5 0 0 1 0 8"/><path d="M17.7 5a9 9 0 0 1 0 14"/><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5"/>',
  /** tabler: layout-grid (tümü) */
  izgara:
    '<path d="M4 4h6v6h-6z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6h-6z"/><path d="M14 14h6v6h-6z"/>',
  // yarış türleri
  /** asfalt: firketeli kapalı pist ve start çizgisi (oyunun çizimi) */
  pist: '<path d="M5 7.5a2.5 2.5 0 0 1 2.5 -2.5h9a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1 -2.5 2.5h-3.5a1.5 1.5 0 0 0 0 3h3.5a2.5 2.5 0 0 1 2.5 2.5v.5a2.5 2.5 0 0 1 -2.5 2.5h-9a2.5 2.5 0 0 1 -2.5 -2.5z"/><path d="M9 3.5v3"/>',
  /** rallycross: rampadan uçan araç, zemin yarı asfalt (düz) yarı toprak (kesik); araç tabler: car */
  rallycross:
    '<g transform="translate(5 -2.5) rotate(-16 12 12) scale(.66)" style="stroke-width:3"><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/></g><path d="M2 21.5h7l4 -4"/><path d="M14.5 21.5h2M18.5 21.5h3"/><path d="M3.5 17l2 -.8M3 14l2.2 -.6"/>',
  /** ralli (dağ etapları), tabler: mountain */
  dag: '<path d="M3 20h18l-6.921 -14.612a2.3 2.3 0 0 0 -4.158 0l-6.921 14.612"/><path d="M7.5 11l2 2.5l2.5 -2.5l2 3l2.5 -2"/>',
  /** drift, tabler: rotate-360 */
  donus:
    '<path d="M12 16h4v4"/><path d="M19.458 11.042c.86 -2.366 .722 -4.58 -.6 -5.9c-2.272 -2.274 -7.185 -1.045 -10.973 2.743c-3.788 3.788 -5.017 8.701 -2.744 10.974c2.227 2.226 6.987 1.093 10.74 -2.515"/>',
  /** drag, tabler: traffic-lights */
  isik: '<path d="M7 7a5 5 0 0 1 5 -5a5 5 0 0 1 5 5v10a5 5 0 0 1 -5 5a5 5 0 0 1 -5 -5l0 -10"/><path d="M11 7a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M11 17a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
};
export type IkonAdi = keyof typeof IKON;

/** çizgi ikon: rengi yazı renginden alır */
export const ikon = (ad: IkonAdi) =>
  `<svg class="ik" viewBox="0 0 24 24" aria-hidden="true">${IKON[ad]}</svg>`;

/** 0-3 yıldız şeridi: alınanlar dolu, kalanlar boş; anim=true ise sırayla belirir (sonuç ekranı) */
export const yildizSerit = (n: number, sinif = "", anim = false) =>
  `<span class="ys ${sinif}" aria-label="${n} / 3 yıldız">${[0, 1, 2]
    .map(
      (i) =>
        `<i class="${i < n ? "dolu" : ""}"${anim ? ` style="--d:${0.35 + i * 0.45}s"` : ""}>${ikon("yildiz")}</i>`,
    )
    .join("")}</span>`;
