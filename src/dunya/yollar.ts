// Çorak Topraklar'ın asfalt yol ağı (LT-SYS-005, saf: three ve DOM yok). Oval ve uzun düz yol eskiden birbirinden ve
// etkinlik yerlerinden kopuktu; asfalt araçla etkinliğe gitmek toprakta (yarış lastiğiyle ~4 kat az tutuş) uzun bir
// sürüş demekti. Bu yollar ovali, düz yolu, tırmanış yolunu (boss) ve bütün etkinlik/sandık yerlerini bağlar. Zemin
// yalnız yolun üstünde asfalttır; arazi toprak kalır (ralli aracı kestirmeden gider, asfalt aracı yolu izler).
// Araçların tutuşu değişmez. Yol çizgileri: zemin sorgusu, çizim, mini harita ve kanca bağlantı noktası.

/** yeni yolların yarı genişliği (m; oval ve düz yol 11) */
export const YOL_YARI = 7;

/** yol orta çizgileri [x, z] (köşeler kapsül birleşimiyle yuvarlanır) */
export const YOLLAR: readonly (readonly [number, number])[][] = [
  // doğu bağlantısı: oval → uzun düz yol
  [
    [128, 0],
    [212, 0],
  ],
  // kuzey: oval içinden tırmanış yolu boyunca boss tepesine
  [
    [-40, 52],
    [-40, 452],
  ],
  // kuzeydoğu çaprazı: ovalden düz yolu keserek doğu düzlüğüne
  [
    [90, 58],
    [450, 450],
  ],
  // kuzeybatı çaprazı: ovalden kuzeybatı düzlüğüne
  [
    [-90, 58],
    [-550, 350],
  ],
  // güneybatı çaprazı: ovalden güneybatı uç düzlüğe
  [
    [-90, -58],
    [-450, -450],
  ],
  // rampa önü
  [
    [-112, -50],
    [-250, -175],
  ],
  // güney: atölyeden güney düzlüğüne, oradan düz yola
  [
    [0, -96],
    [0, -500],
    [212, -500],
  ],
  // güney düzlüğünden batıya: güneybatı uç düzlükle halka
  [
    [0, -500],
    [-150, -500],
    [-450, -450],
  ],
];

/** (x, z) noktasının en yakın yeni yol orta çizgisine uzaklığı (m) */
export function yolMesafesi(x: number, z: number): number {
  let en = Infinity;
  for (const y of YOLLAR)
    for (let i = 0; i + 1 < y.length; i++) {
      const [ax, az] = y[i],
        [bx, bz] = y[i + 1],
        dx = bx - ax,
        dz = bz - az,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))),
        d = Math.hypot(x - ax - t * dx, z - az - t * dz);
      if (d < en) en = d;
    }
  return en;
}

/** yeni yolun üstünde mi */
export const yoldaMi = (x: number, z: number) => yolMesafesi(x, z) < YOL_YARI;

/** bütün asfalt yolların (yeni yollar + oval + düz yol) orta çizgi noktaları, ~6 m aralıkla (kanca bağlantısı) */
export function yolNoktalari(EA: number, EB: number, SX: number): [number, number][] {
  const r: [number, number][] = [];
  for (const y of YOLLAR)
    for (let i = 0; i + 1 < y.length; i++) {
      const [ax, az] = y[i],
        [bx, bz] = y[i + 1],
        n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 6));
      for (let k = 0; k < n; k++) r.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    r.push([EA * Math.cos(t), EB * Math.sin(t)]);
  }
  for (let z = -800; z <= 800; z += 6) r.push([SX, z]);
  return r;
}

/**
 * kanca için yol bağlantı noktası: oyuncunun önündeki ±0,6 rad konide, enAz–enCok m uzaklıktaki yol noktalarından
 * yöne en yakın olanı (eşitse uzak olan). Hareket yönü yoksa aracın burnu. Yoksa null.
 */
export function yolBaglantisi(
  noktalar: readonly (readonly [number, number])[],
  P: { x: number; z: number; h: number; vx: number; vz: number },
  enAz: number,
  enCok: number,
): [number, number] | null {
  const yon = Math.hypot(P.vx, P.vz) > 3 ? Math.atan2(P.vx, P.vz) : P.h;
  let en: [number, number] | null = null,
    enA = Infinity,
    enD = 0;
  for (const [x, z] of noktalar) {
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < enAz || d > enCok) continue;
    const a = Math.atan2(x - P.x, z - P.z) - yon,
      fa = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    if (fa > 0.6) continue;
    // 0,02 rad'dan küçük açı farkında uzak nokta yeğlenir (halat yol boyunca uzun kalsın)
    if (fa < enA - 0.02 || (Math.abs(fa - enA) <= 0.02 && d > enD)) {
      en = [x, z];
      enA = fa;
      enD = d;
    }
  }
  return en;
}
