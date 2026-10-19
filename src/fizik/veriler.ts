// Fizik verileri: zeminler, lastikler, araç ayarları, sürüş yardımları, yardım seviyeleri ve önayarlar.
// Saf veri: three ve DOM kullanmaz.

/** aks mesafesi (m), klasik modelin azami hızı (m/s), yalpa ataleti çarpanı */
export const L = 3.2,
  VMAX = 77.2,
  IZ = 1.9;

/** oyunun yerçekimi (m/s²): zıplamalar çabuk ve net olsun diye gerçeğin yaklaşık 2,4 katı */
export const YERCEKIMI = 24;

export interface Zemin {
  /** ad */
  n: string;
  /** temel tutuş */
  a: number;
  /** lastik tablosunda hangi sütun: 0 toprak, 1 asfalt */
  ti: 0 | 1;
  /** ek sürtünme */
  dr: number;
}

/** zemin indeksleri: 0 toprak, 1 asfalt, 2 çim, 3 çamur, 4 kar, 5 derin kar */
export const SURF: Zemin[] = [
  { n: "Toprak", a: 26, ti: 0, dr: 0 },
  { n: "Asfalt", a: 30, ti: 1, dr: 0 },
  { n: "Çim", a: 19, ti: 0, dr: 0.5 },
  { n: "Çamur", a: 20, ti: 0, dr: 0.9 },
  { n: "Kar", a: 16, ti: 0, dr: 0.12 },
  { n: "Derin kar", a: 12, ti: 0, dr: 0.8 },
];

export interface Lastik {
  n: string;
  d: string;
  /** tutuş çarpanı [toprak, asfalt] */
  g: [number, number];
  /** Pacejka B (sertlik) */
  B: [number, number];
  /** Pacejka C (biçim) */
  C: [number, number];
  /** azami hız çarpanı */
  t: [number, number];
  /** ileri yönde çekiş çarpanı (drift lastiği) */
  lg?: [number, number];
}

export const TIRES: Lastik[] = [
  {
    n: "Yarış",
    d: "Asfaltta en iyi, toprakta kayar",
    g: [0.45, 1.15],
    B: [6, 10],
    C: [1.7, 1.58],
    t: [0.78, 1.08],
  },
  {
    n: "Toprak",
    d: "Toprakta tam tutuş, asfaltta yavaş",
    g: [1.25, 0.78],
    B: [4.5, 7],
    C: [1.3, 1.48],
    t: [1, 0.9],
  },
  {
    n: "Karışık",
    d: "Dengeli, uçlarda zayıf",
    g: [0.8, 0.97],
    B: [5.5, 8.5],
    C: [1.45, 1.52],
    t: [0.9, 0.97],
  },
  {
    n: "Drift",
    d: "Yanlamasına düşük tutuş, yumuşak ve uzun kayma; ileri yönde iyi çekiş",
    lg: [1.35, 1.3],
    g: [0.68, 0.76],
    B: [4.2, 5.5],
    C: [1.22, 1.28],
    t: [0.9, 0.95],
  },
];

/** araç ayarları: [anahtar, ad, açıklama, en az, en çok, adım] */
export type AyarSatiri = [string, string, string, number, number, number];

export const TUNE: AyarSatiri[] = [
  ["pow", "Motor gücü", "Hızlanma", 0.6, 1.5, 0.05],
  ["top", "Vites oranı", "Yüksek: tepe hız artar, çıkış yavaşlar", 0.85, 1.15, 0.01],
  ["brk", "Fren gücü", "", 0.6, 1.4, 0.05],
  ["bb", "Fren dengesi (ön)", "Düşük: arka erken kilitlenir, araç frende döner", 0.4, 0.8, 0.01],
  [
    "tpf",
    "Ön lastik basıncı",
    "Düşük: affedici, toprakta tutuş. Yüksek: keskin, erken kayar",
    0.8,
    1.25,
    0.01,
  ],
  ["tpr", "Arka lastik basıncı", "Yüksek: arka kolay kayar (drift)", 0.8, 1.25, 0.01],
  ["bal", "Viraj dengesi", "Düşük: arka gevşek, araç döner. Yüksek: stabil, önden kayar", 0.7, 1.15, 0.01],
  ["diff", "Diferansiyel kilidi", "Yüksek: gaz arkayı daha kolay kaydırır", 0.2, 1.2, 0.05],
  ["lock", "Direksiyon açısı", "Yüksek: driftte daha fazla karşı direksiyon payı", 0.4, 0.8, 0.01],
  ["sens", "Direksiyon hassasiyeti", "Düşük: yumuşak, yüksek: çabuk", 0.4, 1.6, 0.05],
  ["susp", "Süspansiyon yumuşaklığı", "Yüksek: frende ve gazda ağırlık daha çok aktarılır", 0.4, 1.6, 0.05],
  ["aero", "Aerodinamik bastırma", "Yüksek hızda tutuş artar, tepe hız biraz düşer", 0, 2, 0.1],
  ["thr", "Gaz tepkisi", "Düşük: gaz yavaş açılır, araç ağır ve dengeli kalkar", 0.2, 1, 0.05],
  ["lch", "Kalkış torku", "Yüksek: kalkışta patinaj artar (özellikle toprakta)", 0, 1, 0.05],
];

export const AST: AyarSatiri[] = [
  ["grip", "Yol tutuş desteği", "Tüm lastiklere ek tutuş", 0, 1, 0.05],
  ["str", "Viraj desteği", "Araç direksiyonun gösterdiği çizgiye çekilir", 0, 1, 0.05],
  ["stm", "Denge kontrolü", "Savrulmayı söndürür (driftte devre dışı)", 0, 1, 0.05],
  ["tcs", "Çekiş kontrolü", "Gazda patinajı ve istenmeyen arka kaymayı azaltır", 0, 1, 0.05],
  ["abs", "ABS", "Frende kilitlenmeyi ve arka savrulmayı önler", 0, 1, 0.05],
  ["dft", "Drift desteği", "Seçtiğin drift açısını tutar. Açıyı abartırsan yine spin olur", 0, 1, 0.05],
  ["ini", "Drift başlatma", "Hızlıyken direksiyonu tam kırınca arka gevşer", 0, 1, 0.05],
  ["acc", "Güç desteği", "", 1, 1.35, 0.01],
  ["bra", "Fren desteği", "", 1, 1.35, 0.01],
];

/** araç ayar değerleri (TUNE anahtarları) */
export interface Ayarlar {
  pow: number;
  top: number;
  brk: number;
  bb: number;
  tpf: number;
  tpr: number;
  bal: number;
  diff: number;
  lock: number;
  sens: number;
  susp: number;
  aero: number;
  thr: number;
  lch: number;
  [k: string]: number;
}

/** sürüş yardımı değerleri (AST anahtarları) */
export interface Yardimlar {
  grip: number;
  str: number;
  stm: number;
  tcs: number;
  abs: number;
  dft: number;
  ini: number;
  acc: number;
  bra: number;
  [k: string]: number;
}

export type SeviyeAnahtari = "arc" | "norm" | "real";

export const LEVELS: Record<SeviyeAnahtari, { n: string; d: string; v: Yardimlar }> = {
  arc: {
    n: "Arcade",
    d: "Tüm yardımlar açık",
    v: { grip: 1, str: 1, stm: 0.7, tcs: 0.8, abs: 1, dft: 0.75, ini: 1, acc: 1.3, bra: 1.35 },
  },
  norm: {
    n: "Dengeli",
    d: "Orta seviye yardım",
    v: { grip: 0.4, str: 0.4, stm: 0.4, tcs: 0.5, abs: 1, dft: 0.55, ini: 0.5, acc: 1.15, bra: 1.15 },
  },
  real: {
    n: "Gerçekçi",
    d: "Minimum yardım, gerçek tutuş sınırı",
    v: { grip: 0, str: 0, stm: 0, tcs: 0, abs: 0, dft: 0.4, ini: 0, acc: 1, bra: 1 },
  },
};

export type OnayarAnahtari = "ar" | "tr" | "fd" | "fa" | "rl" | "dg" | "dr";

export interface Onayar {
  n: string;
  d: string;
  /** lastik indeksi */
  tire: number;
  /** yardım tavanı: seviye bunu aşamaz */
  cap?: Partial<Yardimlar>;
  /** yardım tabanı: seviye bundan düşük olamaz */
  ast?: Partial<Yardimlar>;
  v: Ayarlar;
}

export const PRESETS: Record<OnayarAnahtari, Onayar> = {
  ar: {
    n: "Asfalt yarışı",
    d: "Yarış lastiği, sıkı arka, yüksek bastırma",
    tire: 0,
    cap: { ini: 0.3, dft: 0.5 },
    v: {
      pow: 1,
      top: 1,
      brk: 1.1,
      bb: 0.62,
      tpf: 1,
      tpr: 0.97,
      bal: 1.03,
      diff: 0.45,
      lock: 0.5,
      sens: 0.5,
      susp: 0.8,
      aero: 1.3,
      thr: 0.6,
      lch: 0.35,
    },
  },
  tr: {
    n: "Toprak yarışı",
    d: "Toprak lastiği, düşük basınç, yumuşak süspansiyon",
    tire: 1,
    cap: { ini: 0.4, dft: 0.7 },
    v: {
      pow: 1,
      top: 0.95,
      brk: 0.95,
      bb: 0.58,
      tpf: 0.9,
      tpr: 0.9,
      bal: 0.98,
      diff: 0.7,
      lock: 0.6,
      sens: 0.5,
      susp: 1.15,
      aero: 0.6,
      thr: 0.55,
      lch: 0.6,
    },
  },
  fd: {
    n: "Serbest (toprak)",
    d: "Rahat, kaymaya izin veren toprak sürüşü",
    tire: 1,
    v: {
      pow: 1,
      top: 1,
      brk: 1,
      bb: 0.6,
      tpf: 0.9,
      tpr: 0.92,
      bal: 1,
      diff: 0.8,
      lock: 0.55,
      sens: 0.5,
      susp: 1,
      aero: 0.5,
      thr: 0.5,
      lch: 0.55,
    },
  },
  fa: {
    n: "Serbest (asfalt)",
    d: "Toprak hissini asfalta taşır: yumuşak lastik, affedici kayma",
    tire: 2,
    v: {
      pow: 1,
      top: 1,
      brk: 1,
      bb: 0.6,
      tpf: 0.85,
      tpr: 0.88,
      bal: 1.02,
      diff: 0.6,
      lock: 0.55,
      sens: 0.5,
      susp: 0.95,
      aero: 0.8,
      thr: 0.55,
      lch: 0.4,
    },
    ast: { ini: 0.5 },
  },
  rl: {
    n: "Ralli",
    d: "Toprak lastiği, uzun ve yumuşak süspansiyon, dengeli diferansiyel",
    tire: 1,
    cap: { ini: 0.4 },
    v: {
      pow: 1,
      top: 0.97,
      brk: 1,
      bb: 0.6,
      tpf: 0.88,
      tpr: 0.9,
      bal: 1,
      diff: 0.6,
      lock: 0.62,
      sens: 0.5,
      susp: 1.4,
      aero: 0.7,
      thr: 0.6,
      lch: 0.4,
    },
  },
  dg: {
    n: "Drag",
    d: "Yarış lastiği, sert arka, düz çizgi için ayar",
    tire: 0,
    cap: { ini: 0, dft: 0 },
    v: {
      pow: 1,
      top: 1.05,
      brk: 1,
      bb: 0.62,
      tpf: 1.1,
      tpr: 0.9,
      bal: 1.1,
      diff: 1,
      lock: 0.45,
      sens: 0.5,
      susp: 1.3,
      aero: 0.4,
      thr: 0.7,
      lch: 0.7,
    },
  },
  dr: {
    n: "Drift",
    d: "Drift lastiği, kilitli diferansiyel, geniş direksiyon açısı",
    tire: 3,
    v: {
      pow: 1.15,
      top: 0.92,
      brk: 0.9,
      bb: 0.55,
      tpf: 0.95,
      tpr: 1.18,
      bal: 0.92,
      diff: 1.1,
      lock: 0.78,
      sens: 0.5,
      susp: 1.2,
      aero: 0.4,
      thr: 0.8,
      lch: 0.3,
    },
    ast: { ini: 0.8 },
  },
};

/** drift önayarları: drift modu daha düşük açıda açılır */
export const DRIFT_ONAYARLARI: OnayarAnahtari[] = ["dr", "fd", "fa"];
