// Sınıf = altı görünür özellik puanının toplamı. Ortak ölçek ozellikler.ts'te; modifiyeler
// gerçek motor, kütle, lastik/fren ve aktarma oranlarıyla bu özellikleri değiştirir.
// Tur modeli yalnız performans/denge tanısı içindir; sınıfı pist veya pilot süresi belirlemez.
import { ozellikPuani } from "./ozellikler";
import { sm } from "../cekirdek/matematik";
import { mkTrack } from "../dunya/pist";
import { cizPist } from "../dunya/pist-ciz";
import type { SurusKurulumu } from "../fizik/tipler";
import { CARS, type YarisTuru } from "./araclar";
import { TIRES, YERCEKIMI } from "../fizik/veriler";
import { aracFizigi, RHO, torkEgrisi, VITESLER } from "../fizik/yeni/arac-fizigi";
import { GEVSEK_ARKA, GEVSEK_TUTUS, TUTUS } from "../fizik/yeni/model";
import { parcaBul, parcaliKurulum, parcalariDuzenle } from "./parcalar";

export type SinifHarfi = "D" | "C" | "B" | "A" | "S" | "X";

/** sınıflar: harf, en düşük ve en yüksek puan, renk */
export const SINIFLAR: { h: SinifHarfi; min: number; max: number; renk: string }[] = [
  { h: "D", min: 100, max: 400, renk: "#3fa7d6" },
  { h: "C", min: 401, max: 500, renk: "#e9c46a" },
  { h: "B", min: 501, max: 600, renk: "#f4a261" },
  { h: "A", min: 601, max: 700, renk: "#e76f51" },
  { h: "S", min: 701, max: 800, renk: "#b5179e" },
  { h: "X", min: 801, max: 999, renk: "#43aa8b" },
];

export const sinifHarfi = (puan: number): SinifHarfi =>
  (SINIFLAR.find((s) => puan <= s.max) ?? SINIFLAR[SINIFLAR.length - 1]).h;

/**
 * kalibrasyon (zemine göre): nokta kütlenin yanal tutuş payı ve tutuş üssü (süreye etkisi doğrusal değil), fren ve
 * çekiş payı, güç verimi; otomatik pilotun turlarına uydurulur (sapma: asfalt ~%3, rallikros ~%2,5, ralli ~%6;
 * ralli etabında pilot zıplama ve tümseklerde oynak).
 * Bu katsayılar yalnız tur tanısında kullanılır; sınıf puanına girmez.
 */
export const KALIBRE = {
  asfalt: { yanal: 0.7, us: 0.6, fren: 1, cekis: 0.85, guc: 0.85 },
  rallikros: { yanal: 0.7, us: 1.4, fren: 1, cekis: 1.1, guc: 0.5 },
  ralli: { yanal: 0.7, us: 0.3, fren: 1, cekis: 0.4, guc: 0.7 },
};
export type KalibreAnahtari = keyof typeof KALIBRE;

/** referans pist parçaları: [uzunluk (m), yarıçap (m, 0 düz)] */
type Parcalar = [number, number][];

/** asfalt: kapalı tur; yavaş, orta ve hızlı virajlar, uzun düzlük */
const ASFALT_PIST: Parcalar = [
  [420, 0],
  [55, 25],
  [160, 0],
  [95, 60],
  [90, 0],
  [50, 45],
  [50, 45],
  [260, 0],
  [125, 80],
  [140, 0],
  [55, 22],
  [200, 0],
  [95, 120],
  [230, 0],
  [65, 40],
  [110, 0],
  [150, 160],
  [60, 0],
];

/**
 * rallikros: rallikros pistleri 1-4'ün tarifleri (dunya/pist-tanimlari.ts'ten kopya; pist değişse de puan
 * değişmesin diye sabit)
 */
const RALLIKROS_TARIF = [
  "D160 L50/90 D126 L40/90 D259 L45/120 R60/60 L50/60 D20 L45/60 K40",
  "D111 L35/90 D84 R30/45 L30/45 D60 L25/180 D80 R40/90 D159 L30/90 D36 L35/90 K40",
  "D140 R30/90 D60 R25/90 D50 L20/180 D60 R25/90 D20 R30/90 D110 L25/40 R25/80 L25/40 D60 R35/90 D138 R40/90 K40",
  "D154 L18/150 D90 R25/100 L40/40 D94 L16/170 R30/80 L30/80 D86 R18/150 L30/60 L25/90 D60 L35/100 K40",
];

/** ralli: ralli etapları 1-4'ün tarifleri (A'dan B'ye, duran kalkış; sabit kopya) */
const RALLI_TARIF = [
  "D80 L80/40 D150 R100/60 D120 L70/70 D100 R90/50 L60/40 D150 R80/60 D100 L100/30 D80",
  "D80 L60/50 D100 R40/80 D60 L20/160 D120 R50/60 L50/60 D100 R25/120 D90 L60/80 R40/90 D120 L30/100 R30/50 D100",
  "D60 R45/70 L35/90 D80 R18/170 D100 L40/60 R40/60 D80 L22/150 D70 R30/80 L60/40 D120 R20/120 L25/60 D100 L35/90 D80",
  "D60 L30/80 R25/100 L25/80 D60 R15/160 D80 L40/40 R40/80 L30/120 D50 R14/170 D90 L25/70 R30/90 L20/130 D70 R35/60 " +
    "L35/60 D100 L16/160 D80 R40/90 D60",
];

/** tariften pistin eğriliği (oyundaki pist çizimiyle; ±3 noktalık eğrilik, otomatik pilottaki gibi) ve aralıklar */
function tarifEgriligi(tarif: string, kapali: boolean) {
  const TR = mkTrack(cizPist(tarif, kapali), 6, !kapali),
    N = TR.N,
    g = (j: number) => (kapali ? (j + N) % N : Math.min(Math.max(j, 0), N - 1)),
    k: number[] = [],
    dx: number[] = [];
  for (let i = 0; i < (kapali ? N : N - 1); i++) {
    const a = TR.T[g(i - 3)],
      b = TR.T[g(i + 3)],
      ac = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])),
      d = Math.max(1, Math.abs(TR.S[g(i + 3)] - TR.S[g(i - 3)]));
    k.push(ac / d);
    const s = g(i + 1);
    dx.push(Math.max(0.05, Math.hypot(TR.P[s][0] - TR.P[i][0], TR.P[s][1] - TR.P[i][1])));
  }
  return { k, dx, kapali };
}

const ADIM_M = 2;

interface Bolum {
  k: number[];
  dx: number[];
  kapali: boolean;
}

interface ReferansPist {
  /** pist bölümleri: süre toplanır (kapalıda uçan tur, açıkta duran kalkış) */
  bolum: Bolum[];
  zemin: 0 | 1;
  kal: KalibreAnahtari;
  /** puanı 500 olan aracın süresi (sn) */
  orta: number;
}

function referans(bolum: Bolum[], kal: KalibreAnahtari, orta: number): ReferansPist {
  return { bolum, zemin: kal == "asfalt" ? 1 : 0, kal, orta };
}

/** parçalardan bölüm (2 m adım) */
function parcaBolumu(p: Parcalar, kapali: boolean): Bolum {
  const k: number[] = [];
  for (const [L, R] of p) for (let i = 0; i < L / ADIM_M; i++) k.push(R > 0 ? 1 / R : 0);
  return { k, dx: k.map(() => ADIM_M), kapali };
}

export type PuanTuru = "asfalt" | "rallikros" | "ralli" | "drag";

/**
 * puan türleri ve referans pistleri: asfalt (yarış pisti, drift), rallikros ve ralli (toprak; kısa düzlüklü kıvrımlı
 * pistte tepe hız değil tutuş belirler), drag (duran kalkıştan 400 m). orta: stok Kızıl Ok asfaltta 579, Kor RX
 * rallikrosta 410, Mavi Yıldız rallide 430, Gece Mavisi dragda 461
 */
let REFERANS: Record<PuanTuru, ReferansPist> | null = null;
/** referans pistler ilk puan hesabında kurulur (modül yüklenirken iş yapılmaz) */
const referanslar = (): Record<PuanTuru, ReferansPist> =>
  (REFERANS ??= {
    asfalt: referans([parcaBolumu(ASFALT_PIST, true)], "asfalt", 53.7),
    rallikros: referans(
      RALLIKROS_TARIF.map((t) => tarifEgriligi(t, true)),
      "rallikros",
      116.98,
    ),
    ralli: referans(
      RALLI_TARIF.map((t) => tarifEgriligi(t, false)),
      "ralli",
      167.95,
    ),
    drag: referans([parcaBolumu([[400, 0]], false)], "asfalt", 8.932),
  });

export interface PerformansDegerleri {
  /** puan (100-999) ve sınıf */
  puan: number;
  sinif: SinifHarfi;
  /** Toplamı tam olarak puan alanına eşit olan özellik puanları. */
  ozellikler: { ad: string; puan: number }[];
  /** azami hız (km/sa), 0-100 (sn), yanal tutuş (m/s², 25 m/s'de, en iyi zeminde), 100-0 (m) */
  hiz: number;
  ivme: number;
  tutus: number;
  fren: number;
  /** ortak kuru toprak referansı, yanal ivme (m/s²) */
  arazi: number;
  /** referans tur süresi (sn) */
  tur: number;
  /** tur tanısının zemini; sınıfı etkilemez */
  zemin: PuanTuru;
}

interface NoktaKutle {
  m: number;
  g: number;
  /** yanal ve boylamsal tutuş (ivme, m/s²; bastırma hariç; kalibre), yanal tutuşun ham değeri (gösterim) */
  ay: number;
  ayHam: number;
  ax: number;
  /** bastırma (ivme / v²) ve sürükleme (ivme / v²), yuvarlanma (m/s²) */
  cl: number;
  cd: number;
  rol: number;
  /** fren torkunun verdiği en çok yavaşlama */
  fren: number;
  /** çekiş sınırı (ivme; bastırmanın sürüş aksına düşen payı ayrıca) */
  cekis: number;
  cekisCl: number;
  /** hızda (m/s) ve turbo basıncında motorun verdiği en büyük itiş ivmesi */
  itis: (v: number, basinc: number) => number;
  /** turbo: tork payı, dolma süresi */
  tb: number;
  tbs: number;
}

function noktaKutle(K: SurusKurulumu, kal: KalibreAnahtari, kalibrasyon = true): NoktaKutle {
  const c = K.car,
    tu = K.tu,
    as = K.as,
    F = aracFizigi(c, K),
    T = TIRES[K.tire],
    g = YERCEKIMI,
    m = F.m,
    ff = c.ff ?? 0.55,
    ortak = (1 + 0.25 * as.grip) * TUTUS,
    zemin = kal == "asfalt" ? 1 : 0,
    gevsek = zemin == 0,
    pb = gevsek ? 0.35 : 0.15,
    zt = gevsek ? (26 / 30) * GEVSEK_TUTUS : 1,
    KL = kalibrasyon ? KALIBRE[kal] : { ...KALIBRE[kal], guc: 1, cekis: 1 },
    // tutuş üssünün dayanağı: zeminin tipik tutuşu
    mu0 = gevsek ? 0.85 : 1.3,
    lg = T.lg ? T.lg[zemin] : 1,
    muF = T.g[zemin] * c.gr[zemin] * ortak * zt * (1 - pb * (tu.tpf - 1)) * c.fb,
    muR = T.g[zemin] * c.gr[zemin] * ortak * zt * (1 - pb * (tu.tpr - 1)) * c.rb * (gevsek ? GEVSEK_ARKA : 1),
    // yanal: zayıf aks sınırı belirler, güçlü aks biraz yardım eder
    muY = 0.6 * Math.min(muF, muR) + 0.4 * (ff * muF + (1 - ff) * muR),
    muX = (ff * muF + (1 - ff) * muR) * lg,
    rArka = F.tk[2].r,
    wMax = (F.devirMax * 2 * Math.PI) / 60,
    awd = F.awd,
    // çekiş: sürülen aksların yükü (dört çekerde önce doyan aks sınırlar)
    cekisPay =
      awd <= 0
        ? (1 - ff) * muR
        : awd >= 1
          ? ff * muF
          : Math.min(((1 - ff) * muR) / (1 - awd), (ff * muF) / awd),
    clA = (0.5 * RHO * F.ClA) / m,
    tb = c.tb ?? 0,
    tbu = c.tbu ?? 0.6;
  const itis = (v: number, basinc: number) => {
    let en = 0;
    for (const o of VITESLER) {
      const oran = o * F.son,
        u = ((v / rArka) * oran) / wMax;
      if (u > (kalibrasyon ? 1 : 1.02)) continue;
      const uE = Math.max(u, F.kalkis / F.devirMax),
        turbo = tb ? 1 - tb * (1 - Math.min(basinc, sm(tbu - 0.2, tbu, uE))) : 1,
        Fx = (F.tork * torkEgrisi(uE) * turbo * oran * F.verim) / rArka;
      en = Math.max(en, (KL.guc * Fx) / m);
    }
    return en;
  };
  return {
    m,
    g,
    // pilot tutuşu sınıra kadar kullanamaz ve tutuş farkının süreye etkisi doğrusal değil (kalibrasyon)
    ay: KL.yanal * Math.pow(muY / mu0, KL.us) * mu0 * g,
    ayHam: muY * g,
    ax: KL.fren * muX * g,
    cl: clA,
    cd: (0.5 * RHO * F.CdA) / m,
    rol: 0.012 * g,
    fren: F.fren / (F.tk[0].r * m),
    cekis: KL.cekis * cekisPay * lg * g,
    cekisCl: KL.cekis * (awd >= 1 ? 0.45 : awd > 0 ? 0.5 : 0.55) * lg,
    itis,
    tb,
    tbs: c.tbs ?? 1,
  };
}

/**
 * nokta kütle turu: viraj sınırı, geriye fren geçişi, ileriye ivme geçişi (turbo gecikmeli). k: her noktada eğrilik
 * (1/m), dx: sonraki noktaya uzaklık (m). Kapalı pistte uçan tur (ikinci tur), açıkta A'dan B'ye; ayakta: duran
 * araçla başla (kapalı pistte de yalnız bir tur)
 */
function noktaTuru(
  N: NoktaKutle,
  k: ArrayLike<number>,
  dx: ArrayLike<number>,
  kapali: boolean,
  ayakta: boolean,
) {
  const n = k.length,
    vl = new Float64Array(n),
    vb = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // v²·k = ay·(1 + cl·v²/g) çözümü (bastırma hızla artar)
    const p = k[i] - (N.ay * N.cl) / N.g;
    vl[i] = p > 1e-6 ? Math.sqrt(N.ay / p) : 200;
  }
  // geriye: fren (sürtünme elipsi, sürükleme yardım eder); kapalı tur için iki kez dolaş
  vb.set(vl);
  for (let j = (kapali ? 2 * n : n) - 2; j >= 0; j--) {
    const i = j % n,
      v = vb[(i + 1) % n],
      ayMax = N.ay * (1 + (N.cl * v * v) / N.g),
      yan = Math.min(1, (v * v * k[i]) / ayMax),
      a =
        Math.min(N.fren, N.ax * (1 + (N.cl * v * v) / N.g)) * Math.sqrt(1 - yan * yan) + N.cd * v * v + N.rol;
    vb[i] = Math.min(vl[i], Math.sqrt(v * v + 2 * a * dx[i]));
  }
  // ileriye: itiş, çekiş sınırı ve sürtünme elipsi
  let v = 0.5,
    basinc = 0,
    t = 0;
  for (let r = 0; r < (kapali && !ayakta ? 2 : 1); r++) {
    t = 0;
    for (let i = 0; i < (kapali ? n : n - 1); i++) {
      const ayMax = N.ay * (1 + (N.cl * v * v) / N.g),
        yan = Math.min(1, (v * v * k[i]) / ayMax),
        cek = (N.cekis + N.cekisCl * N.cl * v * v) * Math.sqrt(1 - yan * yan),
        a = Math.min(N.itis(v, basinc), cek) - N.cd * v * v - N.rol,
        v2 = Math.sqrt(Math.max(0.25, v * v + 2 * a * dx[i])),
        yeni = Math.min(v2, vb[(i + 1) % n]),
        dt = (2 * dx[i]) / (v + yeni);
      // turbo: gaz açıkken (sınırda değil) dolar, frende ve sınırda boşalır
      if (N.tb)
        basinc +=
          yeni >= v2 - 1e-9
            ? (1 - basinc) * Math.min(1, dt / N.tbs)
            : -basinc * Math.min(1, dt / (0.3 * N.tbs));
      v = yeni;
      t += dt;
    }
  }
  return t;
}

const referansTur = (N: NoktaKutle, R: ReferansPist) =>
  R.bolum.reduce((t, b) => t + noktaTuru(N, b.k, b.dx, b.kapali, !b.kapali), 0);

/** kalibrasyon için: kurulumun verilen pistte nokta kütle tur süresi (kal: zemin ve katsayılar; ayakta kalkış) */
export function noktaKutleTuru(
  K: SurusKurulumu,
  k: ArrayLike<number>,
  dx: ArrayLike<number>,
  kapali: boolean,
  kal: KalibreAnahtari,
) {
  return noktaTuru(noktaKutle(K, kal), k, dx, kapali, true);
}

/** azami hız (m/s) ve 0-100 (sn), 100-0 (m) */
function duzCizgi(N: NoktaKutle) {
  let vmax = 0;
  for (let v = 1; v < 150; v += 0.1) {
    if (N.itis(v, 1) - N.cd * v * v - N.rol <= 0) break;
    vmax = v;
  }
  let v = 0,
    t = 0,
    basinc = 0;
  const h = 1 / 120;
  while (v < 27.78 && t < 30) {
    const a = Math.min(N.itis(v, basinc), N.cekis + N.cekisCl * N.cl * v * v) - N.cd * v * v - N.rol;
    v += a * h;
    t += h;
    if (N.tb) basinc += (1 - basinc) * Math.min(1, h / N.tbs);
  }
  let x = 0;
  v = 27.78;
  while (v > 0.3) {
    const a = Math.min(N.fren, N.ax * (1 + (N.cl * v * v) / N.g)) + N.cd * v * v + N.rol;
    x += v * h;
    v -= a * h;
  }
  return { vmax, t100: t, b100: x };
}

/** sürüş kurulumunun performans değerleri (Dengeli yardım seviyesinde kurulmuş olmalı) */
/**
 * puanın ölçüldüğü sabit lastik. Sınıf/puan aracın kendi özelliğidir: takılı lastikten ve pist türünden bağımsız.
 * Stok aracın değerleri sabittir (kendi stok kurulumuyla ölçülmüş); parçalar bu değeri sabit lastikle ölçülen oranla
 * değiştirir, bu yüzden lastik parçası puanı değiştirmez.
 */
export const PUAN_LASTIGI = TIRES.findIndex((t) => t.n == "Karışık");

/** yanal tutuş ve arazi göstergesi (bastırma payıyla) */
const yanal = (n: NoktaKutle, pay: number) => n.ayHam * (1 + (n.cl * pay) / n.g);

/** stok aracın sabit değerleri (kendi stok kurulumuyla) ve sabit lastikle oran tabanı; araç başına bir kez */
const STOK_DEGER = new Map<
  string,
  { d0: ReturnType<typeof duzCizgi>; tutus0: number; arazi0: number; tutus: number; arazi: number }
>();
function stokDegeri(stok: (typeof CARS)[number]) {
  let v = STOK_DEGER.get(stok.k);
  if (!v) {
    const kendi = parcaliKurulum(CARS.indexOf(stok), [], "norm"),
      K0 = { ...kendi, tire: PUAN_LASTIGI };
    v = {
      d0: duzCizgi(noktaKutle(K0, "asfalt", false)),
      tutus0: yanal(noktaKutle(K0, "asfalt"), 625),
      arazi0: yanal(noktaKutle(K0, "ralli"), 400),
      tutus: yanal(noktaKutle(kendi, "asfalt"), 625),
      arazi: yanal(noktaKutle(kendi, "ralli"), 400),
    };
    STOK_DEGER.set(stok.k, v);
  }
  return v;
}

export function kurulumPerformansi(K: SurusKurulumu, tur?: PuanTuru): PerformansDegerleri {
  // tur süresi takılı lastikle (parçanın sürüşe etkisi); puan ve görünen değerler sabit lastikle ölçülen orandan
  const R = referanslar()[tur ?? "asfalt"],
    turSuresi = referansTur(noktaKutle(K, R.kal), R),
    P: SurusKurulumu = { ...K, tire: PUAN_LASTIGI },
    d = duzCizgi(noktaKutle(P, "asfalt", false));
  // Stok referansları gerçek 4 teker modelinden ölçülür. Parçalar aynı hızlı modelin stok oranıyla taşınır;
  // ekranda her seçimde binlerce fizik adımı çalıştırılmaz. Sınıf toplamı ortak özellik ölçeğinden gelir.
  const stok = CARS.find((c) => c.k == K.car.k) ?? K.car,
    S0 = stokDegeri(stok),
    d0 = S0.d0,
    hiz = ((stok.vmax ?? d0.vmax * 3.6) * d.vmax) / d0.vmax,
    ivme = (stok.a100 * d.t100) / d0.t100,
    tutus = (S0.tutus * yanal(noktaKutle(P, "asfalt"), 625)) / S0.tutus0,
    arazi = (S0.arazi * yanal(noktaKutle(P, "ralli"), 400)) / S0.arazi0,
    fren = (stok.b100 * d.b100) / d0.b100,
    ozellikler = ozellikPuani({ gucAgirlik: K.car.hp / K.car.kg, ivme, hiz, tutus, fren, arazi }),
    puan = ozellikler.reduce((a, b) => a + b.puan, 0);
  return {
    puan,
    sinif: sinifHarfi(puan),
    ozellikler,
    hiz,
    ivme,
    tutus,
    arazi,
    fren,
    tur: turSuresi,
    zemin: tur ?? "asfalt",
  };
}

/** yarış türünün puan türü: rallikros ve ralli kendi toprak pistlerinde, drag 400 m'de, yarış pisti ve drift asfaltta */
export const turPuanTuru = (tur: YarisTuru): PuanTuru =>
  tur == "rx" ? "rallikros" : tur == "rl" ? "ralli" : tur == "dg" ? "drag" : "asfalt";

/**
 * aracın (parçalarıyla) performans puanı, sınıfı ve alt değerleri. tur verilirse o yarış türünün zemininde
 * (sınıf sınırı bununla denetlenir); verilmezse genel puan: aracın en iyi zemini (garajda gösterilen)
 */
export const performansPuani = (aracNo: number, parcaIdleri: readonly string[] = [], tur?: YarisTuru) =>
  kurulumPerformansi(parcaliKurulum(aracNo, parcaIdleri, "norm"), tur && turPuanTuru(tur));

/** parça takılınca (aynı kategorideki parçanın yerine) puan farkı (tur: yarış türünün zemininde) */
export function parcaPuanFarki(aracNo: number, takili: readonly string[], parcaId: string, tur?: YarisTuru) {
  return performansPuani(aracNo, [...takili, parcaId], tur).puan - performansPuani(aracNo, takili, tur).puan;
}

/** puan ayarında denenen performans parçaları (kategori başına; "" stok) */
const AYAR_SECENEKLERI: string[][] = [
  ["", "motor-kisitli", "motor-sokak", "motor-spor", "motor-yaris", "motor-degisim"],
  ["", "turbo-kucuk", "kompresor", "turbo-buyuk"],
  ["", "agirlik-balast", "agirlik-1", "agirlik-2", "agirlik-3"],
  ["", "fren-sokak", "fren-spor", "fren-yaris"],
  ["", "aero-dusuk", "aero-yaris", "aero-buyuk"],
];

/**
 * taban parçaların (ör. bir paket) üstüne güç, ağırlık, fren ve aero parçalarını seçip puanı sınırın altında en
 * yükseğe getirir (sınıf sınırında en güçlü yapı). Taban parçanın kategorisi korunur. Sınırın altına inilemezse en düşük
 * puanlı yapı döner (araç o sınıfa giremez)
 */
export function sinirdaEnIyi(aracNo: number, taban: readonly string[], sinir: number, tur?: YarisTuru) {
  const tk = new Set(taban.map((id) => parcaBul(id)?.kat)),
    secenek = AYAR_SECENEKLERI.filter((s) => !tk.has(parcaBul(s[1])!.kat));
  let en: { parcalar: string[]; puan: number } | null = null,
    yedek = { parcalar: [...taban], puan: 1e9 };
  const dene = (i: number, liste: string[]) => {
    if (i == secenek.length) {
      const p = performansPuani(aracNo, liste, tur).puan;
      if (p <= sinir && (!en || p > en.puan)) en = { parcalar: parcalariDuzenle(liste), puan: p };
      if (p < yedek.puan) yedek = { parcalar: parcalariDuzenle(liste), puan: p };
      return;
    }
    for (const id of secenek[i]) dene(i + 1, id ? [...liste, id] : liste);
  };
  dene(0, [...taban]);
  return en ?? yedek;
}
