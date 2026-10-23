// Yeni fizik: aracın fiziksel değerleri. Garajdaki araç verisinden (CARS) ve sürüş kurulumundan (önayar, araç
// ayarları, yardımlar) türetilir: kütle ve atalet, ağırlık merkezi, teker geometrisi, yay ve amortisörler,
// viraj denge çubukları, motor tork eğrisi, vitesler, frenler, aerodinamik.
import type { Arac } from "../../arac/araclar";
import type { SurusKurulumu } from "../tipler";
import { TIRES, VMAX, YERCEKIMI } from "../veriler";

/** hava yoğunluğu (kg/m³) */
export const RHO = 1.2;
/** ileri vitesler (son oran ayrı) */
export const VITESLER = [3.2, 2.15, 1.6, 1.28, 1.06, 0.88];

export interface TekerGeo {
  /** gövde ekseninde konum (model koordinatı: x sol, z ileri), yarıçap */
  x: number;
  z: number;
  r: number;
  on: boolean;
  /** süspansiyon bağlantı yüksekliği (model koordinatı), boş boy, yay, amortisör (basma, açılma), tampon başlangıcı */
  ay: number;
  Lr: number;
  k: number;
  cb: number;
  cr: number;
  tampon: number;
  /** durağan sıkışma ve durağan yük */
  c0: number;
  Fz0: number;
  /** teker ataleti (aktarma dahil) */
  I: number;
}

export interface AracFizigi {
  m: number;
  /** atalet: [yunuslama (sol eksen), yalpa (yukarı), yatış (ileri)] */
  I: [number, number, number];
  /** ağırlık merkezi (model koordinatı) */
  cgY: number;
  cgZ: number;
  aks: number;
  tk: TekerGeo[];
  /** viraj denge çubukları (N/m) [ön, arka] */
  arb: [number, number];
  /** motor: en yüksek tork (Nm), azami ve rölanti devri, kalkış devri */
  tork: number;
  devirMax: number;
  devirMin: number;
  kalkis: number;
  /** son oran, aktarma verimi, dört çeker ön payı */
  son: number;
  verim: number;
  awd: number;
  /** toplam fren torku (Nm), ön pay */
  fren: number;
  frenOn: number;
  /** aerodinamik: sürükleme ve bastırma katsayıları (m²), bastırmanın ön payı */
  CdA: number;
  ClA: number;
  /** diferansiyel kilidi (0 açık, 1 kilitli) */
  diff: number;
  /** tasarım azami hızı (m/s, vites hesabı için) */
  vTasarim: number;
}

/** tork eğrisi: u = devir / azami devir. Tepe tork ~%55'te, tepe güç ~%88'de */
export const torkEgrisi = (u: number) => Math.max(0.45, 1 - 1.4 * (u - 0.55) * (u - 0.55));

const FREKANS: Record<string, number> = {
  gt: 2.4,
  rx: 1.9,
  dr: 2.1,
  rl: 1.6,
  dg: 1.8,
  gt3: 2.3,
  t16: 2.05,
  int: 1.85,
  ae86: 2.0,
  supra: 2.05,
};

export function aracFizigi(c: Arac, K: SurusKurulumu): AracFizigi {
  const tu = K.tu,
    as = K.as,
    g = YERCEKIMI,
    m = c.kg,
    ff = c.ff ?? 0.55,
    hcg = c.hcg ?? 0.48,
    W = c.wh,
    aks = W.zf - W.zr,
    cgZ = W.zr + ff * aks,
    lift = c.lift || 0;
  // süspansiyon: köşe kütlesine göre yay (doğal frekans), sönüm oranı ~0,35 basma / 0,55 açılma
  const fn = (FREKANS[c.k] ?? 1.9) / Math.sqrt(tu.susp),
    tk: TekerGeo[] = [];
  for (const [sx, on] of [
    [1, true],
    [-1, true],
    [1, false],
    [-1, false],
  ] as [number, boolean][]) {
    const mc = (m * (on ? ff : 1 - ff)) / 2,
      k = mc * (2 * Math.PI * fn) ** 2,
      c0 = (mc * g) / k,
      r = on ? W.r : W.rr || W.r,
      Lr = c0 + 0.1,
      kr = 2 * Math.sqrt(k * mc);
    tk.push({
      x: sx * (on ? W.x : W.rx || W.x),
      z: on ? W.zf : W.zr,
      r,
      on,
      // durağanken teker merkezi model koordinatında y = r olsun
      ay: r + Lr - c0,
      Lr,
      k,
      cb: 0.35 * kr,
      cr: 0.55 * kr,
      tampon: c0 + 0.12,
      c0,
      Fz0: mc * g,
      I: 1.2 + 4 * r * r,
    });
  }
  // viraj dengesi: yüksek değer ön denge çubuğunu sertleştirir (araç önden kayar, kararlı)
  const kOn = tk[0].k,
    kArka = tk[2].k,
    arb: [number, number] = [kOn * 0.7 * tu.bal, kArka * 0.7 * (2 - tu.bal)];
  // motor: tepe güç (W) → tepe tork
  const devirMax = c.dv ?? 7500,
    wMax = (devirMax * 2 * Math.PI) / 60,
    guc = c.hp * 745.7 * tu.pow * as.acc,
    tork = guc / (wMax * 0.747);
  // vitesler: tasarım azami hızında son viteste azami devir
  const T = TIRES[K.tire],
    vTasarim = VMAX * T.t[1] * tu.top * c.top * (1 - 0.04 * (tu.aero - 1)),
    rArka = W.rr || W.r,
    son = (wMax * rArka) / (VITESLER[VITESLER.length - 1] * vTasarim * 1.02);
  // aerodinamik: azami hız tasarım hızının %92'si olacak sürükleme; bastırma klasik modeldeki tutuş artışı kadar
  const verim = 0.9,
    vSon = vTasarim * 0.92,
    CdA = Math.max(0.25, (2 * (verim * guc - 0.012 * m * g * vSon)) / (RHO * vSon ** 3)),
    ClA = (0.5 * tu.aero * c.ae * m * g) / (0.5 * RHO * VMAX * VMAX);
  // frenler: klasik modelin fren ivmesi kadar tork (tutuşu aşarsa teker kilitlenir, ABS bunu önler)
  const fren = 30 * as.bra * tu.brk * c.brk * m * W.r * 1.05;
  return {
    m,
    I: [0.28 * m * aks * aks, 0.3 * m * aks * aks * Math.sqrt(c.iz), 0.32 * m],
    cgY: hcg + lift,
    cgZ,
    aks,
    tk,
    arb,
    tork,
    devirMax,
    devirMin: 900,
    kalkis: 1800 + 2600 * tu.lch,
    son,
    verim,
    awd: c.awd,
    fren,
    frenOn: tu.bb,
    CdA,
    ClA,
    diff: Math.min(1, tu.diff),
    vTasarim,
  };
}
