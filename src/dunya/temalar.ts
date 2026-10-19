// Pist temaları: gökyüzü, sis, ışık, zemin ve bitki renkleri. Yalnız etkin bölgenin teması uygulanır.

export interface Tema {
  sky: number;
  /** sis başlangıcı ve sonu (m) */
  fog: [number, number];
  /** yarımküre ışığı: gök rengi, yer rengi, şiddet */
  hemi: [number, number, number];
  /** güneş: renk, şiddet */
  sun: [number, number];
  /** zemin dokusu renkleri */
  gr: [string, string, string];
  leaf: number;
  trunk: number;
  rock: number;
  bush: number;
  asp: number;
  water?: number;
  /** gece teması (farlar yanar) */
  night?: number;
}

const TH0: Tema = {
  sky: 0x9fd0e8,
  fog: [140, 900],
  hemi: [0xffffff, 0x7a6a50, 0.8],
  sun: [0xfff1d6, 0.9],
  gr: ["#3f7a3a", "#376d33", "#4a8743"],
  leaf: 0x2f6b3a,
  trunk: 0x5b4430,
  rock: 0x8a8a86,
  bush: 0x3f7d33,
  asp: 0x3a3f4a,
};

const TH: Record<string, Partial<Tema>> = {
  day: {},
  coast: {
    sky: 0xf2b27c,
    fog: [170, 950],
    hemi: [0xffe2c4, 0x8a7055, 0.68],
    sun: [0xffb070, 0.9],
    gr: ["#cfb17a", "#c3a46e", "#d9bc88"],
    leaf: 0x5a9a40,
    bush: 0x6a9a48,
    water: 0x2f7fa8,
  },
  city: {
    sky: 0x0b1428,
    fog: [50, 480],
    hemi: [0x6a7aa8, 0x15151c, 0.36],
    sun: [0x8899cc, 0.22],
    gr: ["#2c3036", "#262a2f", "#33373d"],
    leaf: 0x1d3a2a,
    night: 1,
    asp: 0x2e3138,
  },
  quarry: {
    sky: 0xd9b48a,
    fog: [80, 620],
    hemi: [0xfff0dc, 0x8a7a66, 0.8],
    sun: [0xffe0b0, 0.95],
    gr: ["#8d8a84", "#7f7c76", "#9b9890"],
    leaf: 0x6b7a4a,
    rock: 0x9b968c,
    bush: 0x7a7a5a,
  },
  mist: {
    sky: 0xa9b9a8,
    fog: [25, 280],
    hemi: [0xdde8dd, 0x4a5a44, 0.72],
    sun: [0xe8f0e8, 0.45],
    gr: ["#3c6634", "#345c2e", "#46703c"],
    leaf: 0x1f4a28,
  },
  port: {
    sky: 0xd88a6a,
    fog: [120, 800],
    hemi: [0xffd2b8, 0x5a4a50, 0.72],
    sun: [0xff9a6a, 0.9],
    gr: ["#5a5d62", "#525559", "#63666b"],
    water: 0x3a6f8a,
  },
  mount: {
    sky: 0xf0a878,
    fog: [120, 850],
    hemi: [0xffe0c8, 0x5a5040, 0.76],
    sun: [0xffa060, 0.95],
    gr: ["#4a6a3a", "#425f33", "#557545"],
    leaf: 0x1f4a2a,
  },
  snow: {
    sky: 0xb9cfe0,
    fog: [55, 520],
    hemi: [0xe8eef4, 0x8a96a0, 0.55],
    sun: [0xf4f8ff, 0.45],
    gr: ["#d9e1e7", "#cdd6dd", "#e4eaee"],
    leaf: 0x4f7562,
    trunk: 0x4a3a2c,
    rock: 0x8f989e,
    bush: 0x6a8a78,
  },
  desert: {
    sky: 0xe6c896,
    fog: [120, 820],
    hemi: [0xfff0d8, 0x8a6a48, 0.62],
    sun: [0xfff0c8, 0.8],
    gr: ["#c9a46c", "#bd9862", "#d3b078"],
    leaf: 0x7a8a4a,
    rock: 0xb08a60,
    bush: 0x8a8a50,
  },
};

export const thOf = (k: string | undefined): Tema => ({ ...TH0, ...(TH[k || ""] || {}) });

/** hava tutuş çarpanı: yağmurda ve karda zemin kayganlaşır (karlı pistin kendi karı daha az kaygan) */
export const havaTutusu = (temaAnahtari: string, wx: string) =>
  wx == "rain" ? 0.84 : wx == "snow" ? (temaAnahtari == "snow" ? 0.9 : 0.74) : 1;
