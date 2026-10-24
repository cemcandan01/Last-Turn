// Araçlar: 10 aracın fizik değerleri, garaj istatistikleri ve gövde profilleri (saf veri).
// Gövdeye özel ek parçalar (kanat, numara, kompresör) cizim/arac-modeli.ts'te.
import type { V2 } from "../cekirdek/matematik";
import type { OnayarAnahtari } from "../fizik/veriler";
import { GORUNUM } from "./gorunumler";

export type YarisTuru = "gp" | "rx" | "dp" | "rl" | "dg";

export interface Arac {
  k: string;
  /** önerildiği yarış türü */
  ty: YarisTuru;
  /** ölçülen değerler (garaj çubukları): 0-100 sn, yanal tutuş, 100-0 m, çeviklik */
  a100: number;
  lat: number;
  b100: number;
  t90: number;
  /** simge, öne çıkan özellik, ad, açıklama */
  ic: string;
  st: string;
  n: string;
  d: string;
  /** varsayılan önayar */
  pk: OnayarAnahtari;
  /** zemin tutuşu [toprak, asfalt] */
  gr: [number, number];
  /**
   * uzmanlık: kendi yarış türünün pistinde tutuş çarpanı (asfalt aracı yarış pistinde, rallikros aracı rallikros
   * pistinde, ralli aracı ralli etabında). Başka pistlerde aracın değeri değişmez (yoksa 1)
   */
  uz?: number;
  /** uzmanlık: kendi yarış türünün pistinde motor gücü çarpanı (o yarışa göre ayarlı motor; yoksa 1) */
  uzg?: number;
  /**
   * modifiyeli araçta tür uyumu: yarış türü → [tutuş, güç] çarpanı (aracKur doldurur; varsa uz/uzg yerine bu
   * okunur). Stok araçta yok
   */
  uzT?: Partial<Record<YarisTuru, [number, number]>>;
  /** süspansiyonun doğal frekansı (Hz, ayar yumuşaklığından önce; yoksa aracın kendi değeri). Süspansiyon parçası */
  fq?: number;
  /** arka diferansiyelin kenetleme katsayısı (1/s, yoksa 220): diferansiyel parçası belirler */
  dk?: number;
  /** ön teker açısı sınırı (rad; yoksa 0,8). Açı kiti büyütür */
  dmax?: number;
  /** tork, güç, tepe hız çarpanları; dört çeker payı (0 arkadan itiş) */
  trq: number;
  pw: number;
  top: number;
  awd: number;
  /** yalpa ataleti, kütle çarpanı, ön/arka tutuş, fren, aerodinamik, ağırlık aktarımı */
  iz: number;
  m: number;
  fb: number;
  rb: number;
  brk: number;
  ae: number;
  wk: number;
  /** beygir gücü, kütle (kg), gövde genişliği (m) */
  hp: number;
  kg: number;
  w: number;
  /** gövde rengi, far ve stop yüksekliği */
  col: number;
  hl: number;
  tl: number;
  /** yerden yükseklik farkı */
  lift?: number;
  /** yeni fizik: ön aksın taşıdığı ağırlık oranı, ağırlık merkezi yüksekliği (m), azami devir (d/dk) */
  ff?: number;
  hcg?: number;
  dv?: number;
  /**
   * turbo (yoksa turbosuz): torkun basınçtan gelen payı (0-1), basıncın dolma süresi (sn), basıncın tam
   * dolduğu devir oranı (devir / azami devir). hp dolu basınçtaki güçtür.
   */
  tb?: number;
  tbs?: number;
  tbu?: number;
  /** far yok (drag arabasında yuvarlak farlar ayrıca) */
  rhl?: number;
  /** yan profil (z ileri, y yukarı), yan cam, ön cam, arka cam */
  p: V2[];
  gh: V2[];
  ws: [V2, V2];
  rw: [V2, V2];
  /** renk panelleri: [profil, renk] */
  pan?: [V2[], number][];
  /** tekerler: yarıçap, genişlik, jant rengi, yarı iz genişliği, ön/arka aks z; arka farklıysa rr, rwd, rx */
  wh: {
    r: number;
    wd: number;
    rim: number;
    x: number;
    zf: number;
    zr: number;
    rr?: number;
    rwd?: number;
    rx?: number;
  };
}

export const CARS: Arac[] = [
  {
    k: "gt",
    ty: "gp",
    a100: 3.0,
    lat: 3.31,
    b100: 7,
    t90: 0.67,
    ic: "🧲",
    st: "Viraj tutuşu",
    n: "Kızıl Ok",
    d: "Ortadan motorlu pist arabası. Asfaltta yüksek tutuş, keskin yön değişimi.",
    pk: "ar",
    uz: 1.12,
    gr: [0.88, 1.15],
    trq: 1.0,
    pw: 1.2,
    top: 1.1,
    awd: 0,
    iz: 0.8,
    m: 1.0,
    fb: 1.08,
    rb: 1.0,
    brk: 1.25,
    ae: 1.5,
    wk: 0.7,
    hp: 480,
    kg: 1240,
    ff: 0.43,
    hcg: 0.42,
    dv: 8200,
    w: 1.8,
    col: 0xd01f26,
    hl: 0.62,
    tl: 0.72,
    p: [
      [-2.18, 0.3],
      [-2.22, 0.55],
      [-2.2, 0.86],
      [-2.0, 0.92],
      [-1.2, 0.98],
      [-0.62, 1.16],
      [0.3, 1.17],
      [1.1, 0.84],
      [2.05, 0.66],
      [2.22, 0.52],
      [2.2, 0.36],
      [2.05, 0.28],
    ],
    gh: [
      [-0.6, 0.98],
      [-0.5, 1.12],
      [0.26, 1.13],
      [0.98, 0.87],
    ],
    ws: [
      [1.1, 0.84],
      [0.3, 1.17],
    ],
    rw: [
      [-0.62, 1.16],
      [-1.2, 0.98],
    ],
    pan: [
      [
        [
          [-0.62, 1.1],
          [0.3, 1.11],
          [0.3, 1.24],
          [-0.62, 1.23],
        ],
        0x111214,
      ],
      [
        [
          [-1.15, 0.55],
          [-0.72, 0.86],
          [-0.66, 0.55],
        ],
        0x111214,
      ],
    ],
    wh: { r: 0.33, wd: 0.26, rim: 0xc8ccd2, x: 0.8, zf: 1.3, zr: -1.36 },
  },
  {
    k: "rx",
    ty: "rx",
    a100: 2.3,
    lat: 2.92,
    b100: 12,
    t90: 1.28,
    ic: "⚡",
    st: "Hızlanma",
    n: "Kor RX",
    d: "Dört çeker rallikros hatchback. Güçlü kalkış, kısa toprak pistlerde çevik.",
    pk: "tr",
    gr: [1.12, 1.0],
    uz: 1.25,
    trq: 1.4,
    pw: 1.0,
    top: 0.86,
    awd: 0.45,
    iz: 0.72,
    m: 0.92,
    fb: 0.98,
    rb: 0.94,
    brk: 1.05,
    ae: 0.9,
    wk: 1.0,
    hp: 600,
    kg: 1300,
    ff: 0.6,
    hcg: 0.5,
    dv: 7800,
    w: 1.84,
    col: 0x1b2340,
    hl: 0.72,
    tl: 0.86,
    p: [
      [-1.98, 0.32],
      [-2.05, 0.55],
      [-2.02, 0.82],
      [-1.92, 1.06],
      [-1.62, 1.4],
      [0.12, 1.45],
      [1.0, 1.0],
      [1.88, 0.86],
      [2.05, 0.66],
      [2.05, 0.42],
      [1.92, 0.3],
    ],
    gh: [
      [-1.56, 1.08],
      [-1.5, 1.36],
      [0.08, 1.4],
      [0.86, 1.04],
    ],
    ws: [
      [1.0, 1.0],
      [0.12, 1.45],
    ],
    rw: [
      [-1.62, 1.4],
      [-1.92, 1.06],
    ],
    pan: [
      [
        [
          [0.35, 0.34],
          [0.35, 0.96],
          [0.98, 0.98],
          [1.86, 0.84],
          [2.0, 0.6],
          [2.0, 0.34],
        ],
        0xd42a2a,
      ],
      [
        [
          [-0.55, 0.36],
          [-0.2, 0.98],
          [0.3, 0.98],
          [0.3, 0.36],
        ],
        0xf2c200,
      ],
      [
        [
          [-1.95, 0.34],
          [-1.95, 0.8],
          [-1.2, 0.8],
          [-1.0, 0.34],
        ],
        0xd42a2a,
      ],
    ],
    wh: { r: 0.36, wd: 0.28, rim: 0x222428, x: 0.86, zf: 1.28, zr: -1.28 },
  },
  {
    k: "dr",
    ty: "dp",
    a100: 3.3,
    lat: 2.49,
    b100: 15,
    t90: 0.93,
    ic: "🌀",
    st: "Drift",
    n: "Beyaz Kurt",
    d: "Geniş gövdeli arkadan itişli drift arabası. Kilitli diferansiyel, büyük kanat.",
    pk: "dr",
    gr: [0.95, 1.0],
    trq: 1.05,
    pw: 1.12,
    top: 1.0,
    awd: 0,
    iz: 0.78,
    m: 0.96,
    fb: 1.08,
    rb: 0.86,
    brk: 1.0,
    ae: 1.0,
    wk: 1.1,
    hp: 450,
    kg: 1250,
    ff: 0.52,
    hcg: 0.46,
    dv: 7600,
    w: 2.02,
    col: 0xf0f0ec,
    hl: 0.62,
    tl: 0.74,
    p: [
      [-2.22, 0.24],
      [-2.3, 0.5],
      [-2.26, 0.82],
      [-2.1, 0.92],
      [-1.45, 0.95],
      [-1.0, 1.24],
      [0.2, 1.26],
      [1.0, 0.92],
      [2.12, 0.77],
      [2.36, 0.56],
      [2.38, 0.32],
      [2.3, 0.2],
    ],
    gh: [
      [-0.98, 0.97],
      [-0.88, 1.22],
      [0.17, 1.23],
      [0.92, 0.94],
    ],
    ws: [
      [1.0, 0.92],
      [0.2, 1.26],
    ],
    rw: [
      [-1.0, 1.24],
      [-1.45, 0.95],
    ],
    pan: [
      [
        [
          [-0.15, 0.26],
          [-0.15, 0.9],
          [0.95, 0.9],
          [2.0, 0.74],
          [2.25, 0.52],
          [2.25, 0.26],
        ],
        0xf2b81e,
      ],
      [
        [
          [-2.25, 0.3],
          [-2.25, 0.5],
          [-1.5, 0.5],
          [-1.4, 0.3],
        ],
        0x15171a,
      ],
    ],
    wh: { r: 0.35, wd: 0.32, rim: 0x18181a, x: 0.96, zf: 1.35, zr: -1.32 },
  },
  {
    k: "rl",
    ty: "rl",
    a100: 2.8,
    lat: 2.83,
    b100: 13,
    t90: 1.25,
    ic: "⛰️",
    st: "Arazi",
    n: "Mavi Yıldız",
    d: "Dört çeker ralli sedanı. Uzun süspansiyon: ralli etaplarında çakılda ve karda en iyi tutuş.",
    pk: "rl",
    gr: [1.18, 0.95],
    uz: 1.15,
    uzg: 1.4,
    trq: 1.2,
    pw: 0.98,
    top: 0.95,
    awd: 0.5,
    iz: 1.05,
    m: 1.05,
    fb: 1.0,
    rb: 1.02,
    brk: 0.95,
    ae: 0.8,
    wk: 1.5,
    hp: 330,
    kg: 1230,
    ff: 0.58,
    hcg: 0.52,
    dv: 7500,
    w: 1.76,
    col: 0x1d4fc4,
    hl: 0.7,
    tl: 0.84,
    lift: 0.06,
    p: [
      [-2.15, 0.36],
      [-2.25, 0.6],
      [-2.22, 0.9],
      [-2.1, 0.98],
      [-1.35, 1.0],
      [-1.0, 1.38],
      [0.3, 1.42],
      [1.08, 0.99],
      [2.0, 0.86],
      [2.22, 0.66],
      [2.22, 0.42],
      [2.08, 0.36],
    ],
    gh: [
      [-0.98, 1.03],
      [-0.9, 1.34],
      [0.27, 1.38],
      [0.98, 1.02],
    ],
    ws: [
      [1.08, 0.99],
      [0.3, 1.42],
    ],
    rw: [
      [-1.0, 1.38],
      [-1.35, 1.0],
    ],
    pan: [
      [
        [
          [-2.18, 0.46],
          [-1.2, 0.7],
          [0.4, 0.62],
          [2.15, 0.66],
          [2.15, 0.5],
          [0.4, 0.48],
          [-1.2, 0.56],
          [-2.18, 0.38],
        ],
        0x9de03a,
      ],
    ],
    wh: { r: 0.35, wd: 0.25, rim: 0xc9a227, x: 0.82, zf: 1.36, zr: -1.32 },
  },
  {
    k: "dg",
    ty: "dg",
    a100: 2.2,
    lat: 2.32,
    b100: 23,
    t90: 1.58,
    ic: "🚀",
    st: "Azami hız",
    n: "Gece Mavisi",
    d: "Kompresörlü klasik drag arabası. Çok güçlü, düz çizgide rakipsiz, virajda hantal.",
    pk: "dg",
    gr: [0.8, 0.88],
    trq: 2.0,
    pw: 1.85,
    top: 1.2,
    awd: 0,
    iz: 1.4,
    m: 1.4,
    fb: 0.84,
    rb: 0.96,
    brk: 0.72,
    ae: 0.4,
    wk: 1.3,
    hp: 1100,
    kg: 1550,
    ff: 0.56,
    hcg: 0.5,
    dv: 6800,
    w: 1.86,
    col: 0x1d3a8c,
    hl: 0.72,
    tl: 0.8,
    p: [
      [-2.32, 0.4],
      [-2.36, 0.62],
      [-2.32, 0.88],
      [-2.2, 0.98],
      [-1.5, 1.0],
      [-1.05, 1.3],
      [0.1, 1.31],
      [0.82, 1.0],
      [2.2, 0.93],
      [2.36, 0.86],
      [2.38, 0.5],
      [2.3, 0.4],
    ],
    gh: [
      [-1.02, 1.03],
      [-0.94, 1.27],
      [0.07, 1.28],
      [0.78, 1.02],
    ],
    ws: [
      [0.82, 1.0],
      [0.1, 1.31],
    ],
    rw: [
      [-1.05, 1.3],
      [-1.5, 1.0],
    ],
    rhl: 1,
    wh: { r: 0.32, wd: 0.18, rim: 0xd8dbe0, x: 0.8, zf: 1.42, zr: -1.36, rr: 0.44, rwd: 0.42, rx: 0.84 },
  },
];

// ---------- yeni araçlar (5-9): görünüm (gövde profili, tekerler, renk) gorunumler.ts'te, k anahtarına göre
CARS.push(
  {
    k: "gt3",
    ty: "gp",
    a100: 3.0,
    lat: 3.2,
    b100: 7,
    t90: 0.72,
    ic: "🦅",
    st: "Fren",
    n: "Gri Atmaca",
    d: "Arkadan motorlu pist arabası. Frende çok güçlü, kalkışta iyi çeker; virajdan çıkarken gaza dikkat: kuyruk savurur.",
    pk: "ar",
    uz: 1.12,
    gr: [0.85, 1.18],
    trq: 1.1,
    pw: 1.25,
    top: 1.1,
    awd: 0,
    iz: 0.88,
    m: 1.05,
    fb: 1.1,
    rb: 1.06,
    brk: 1.45,
    ae: 1.5,
    wk: 0.8,
    hp: 540,
    kg: 1420,
    ff: 0.4,
    hcg: 0.44,
    dv: 9000,
    ...GORUNUM.gt3,
  },
  {
    k: "t16",
    ty: "rx",
    a100: 2.5,
    lat: 2.95,
    b100: 12,
    t90: 1.15,
    ic: "🌪️",
    st: "Turbo",
    n: "Kum Fırtınası",
    d: "Hafif, ortadan motorlu dört çeker rallikros efsanesi. Turbo geç dolar, dolunca sert vurur.",
    pk: "tr",
    gr: [1.15, 0.98],
    uz: 1.25,
    trq: 1.3,
    pw: 1.05,
    top: 0.86,
    awd: 0.4,
    iz: 0.66,
    m: 0.8,
    fb: 0.97,
    rb: 0.99,
    brk: 1.05,
    ae: 0.9,
    wk: 1.0,
    hp: 600,
    kg: 1020,
    ff: 0.44,
    hcg: 0.45,
    dv: 7600,
    tb: 0.55,
    tbs: 0.7,
    tbu: 0.68,
    ...GORUNUM.t16,
  },
  {
    k: "int",
    ty: "rl",
    a100: 2.7,
    lat: 2.85,
    b100: 13,
    t90: 1.2,
    ic: "🐝",
    st: "Denge",
    n: "Sarı Arı",
    d: "Dengeli, affedici dört çeker ralli hatchback'i. Hata yapanı da yolda tutar.",
    pk: "rl",
    gr: [1.18, 0.96],
    uz: 1.15,
    uzg: 1.4,
    trq: 1.15,
    pw: 0.95,
    top: 0.96,
    awd: 0.47,
    iz: 0.95,
    m: 1.0,
    fb: 1.0,
    rb: 1.04,
    brk: 0.98,
    ae: 0.8,
    wk: 1.4,
    hp: 345,
    kg: 1180,
    ff: 0.6,
    hcg: 0.47,
    dv: 7200,
    tb: 0.15,
    tbs: 0.35,
    tbu: 0.45,
    ...GORUNUM.int,
  },
  {
    k: "ae86",
    ty: "dp",
    a100: 3.6,
    lat: 2.4,
    b100: 15,
    t90: 0.85,
    ic: "🐼",
    st: "Hafiflik",
    n: "Panda",
    d: "Hafif, az güçlü, arkadan itişli küçük coupe. Hızı korumayı öğreten başlangıç drift arabası.",
    pk: "dr",
    gr: [0.95, 1.0],
    trq: 0.8,
    pw: 0.75,
    top: 0.88,
    awd: 0,
    iz: 0.68,
    m: 0.78,
    fb: 1.06,
    rb: 0.88,
    brk: 1.0,
    ae: 0.8,
    wk: 1.0,
    hp: 290,
    kg: 950,
    ff: 0.53,
    hcg: 0.46,
    dv: 8000,
    ...GORUNUM.ae86,
  },
  {
    k: "supra",
    ty: "dg",
    a100: 2.6,
    lat: 2.4,
    b100: 20,
    t90: 1.45,
    ic: "🐉",
    st: "Tepe hızı",
    n: "Turuncu Ejder",
    d: "Büyük turbolu coupe. Kalkışta turbo gecikir, basınç dolunca tepede rakipsiz.",
    pk: "dg",
    gr: [0.82, 0.92],
    trq: 1.7,
    pw: 2.0,
    top: 1.38,
    awd: 0,
    iz: 1.1,
    m: 1.25,
    fb: 0.9,
    rb: 0.96,
    brk: 0.85,
    ae: 0.5,
    wk: 1.2,
    hp: 1400,
    kg: 1500,
    ff: 0.54,
    hcg: 0.47,
    dv: 7400,
    tb: 0.58,
    tbs: 1.0,
    tbu: 0.72,
    ...GORUNUM.supra,
  },
);
