// Ses sentezi (saf): motor sesi katmanları, çakıl, egzoz patlaması, üfleme valfi, çarpma ve gürültü örnekleri
// Float32Array olarak hesaplanır. Web Audio'ya bağlı değildir (Node'da test edilir); ses katmanı bunları
// AudioBuffer'a koyup döngüyle çalar.
//
// Motor sesi fiziksel bir modelden gelir: her silindirin ateşlemesi egzozda bir basınç darbesi üretir, darbeler
// egzoz kolunda (manifold) yankılanır (tarak süzgeci), susturucudan geçer (alçak geçiren), gövde gümbürtüsü ve
// doygunluk eklenir. Silindir dizilimi (V8, boxer, sıra 6) ateşleme aralıklarını ve kollara dağılımı belirler;
// sesin karakteri buradan doğar. Her katman belirli bir devirde, gazda ya da gaz kapalıyken üretilir; oyunda
// katmanlar devire göre çapraz geçişle ve hızlandırılarak çalınır (kayıtlı motor seslerinin çalınma biçimi).
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";

/** motor karakteri: silindir dizilimi, egzoz, susturucu ve ek parçalar */
export interface MotorProfili {
  ad: string;
  /** ateşlemeler: 720° çevrimde krank açısı (derece) ve egzoz kolu (0 ya da 1) */
  ates: [number, number][];
  /** egzoz kollarının ek gecikmesi (sn): eşit olmayan manifold boyu boxer homurtusunu verir */
  kolGecikme: [number, number];
  /** manifold yankısı: tarak süzgeci gecikmesi (sn) ve geri beslemesi */
  boru: number;
  boruGb: number;
  /** darbe süresi (sn): kısa darbe sert ve cırtlak, uzun darbe tok */
  darbe: number;
  /** yanma pürüzü (0-1): darbe gürültüsü ve ateşlemeler arası düzensizlik */
  puruz: number;
  /** silindirler arası fark (0-1): düşük devirde "lope", büyük kamlı V8 homurtusu */
  lope: number;
  /** susturucu kesim frekansı (Hz): gazda ve gaz kapalıyken */
  kesim: [number, number];
  /** gövde gümbürtüsü: frekans (Hz) ve kazanç (dB) */
  gumbur: [number, number];
  /** doygunluk (distorsiyon) sürüşü */
  surus: number;
  /** ek parçalar (0 yok, 1 tam): turbo ıslığı, kompresör uğultusu, düz dişli vınlaması, gaz kesince patlama */
  turbo: number;
  /** üfleme valfi: 0 yok, 1 klasik "pısss", 2 kesik kesik (flutter) */
  valf: 0 | 1 | 2;
  kompresor: number;
  disli: number;
  patlama: number;
  /** egzoz türbülansı (0-1): her ateşlemeden sonra alçak frekanslı uğultu; sesi dolgunlaştırır */
  govde: number;
  /** VTEC: bu devir oranının (devir / azami) üstünde yüksek kam: ses sertleşir ve yükselir */
  vtec?: number;
}

// ateşleme sıraları (krank açısı, egzoz kolu)
const SIRA4: [number, number][] = [
  [0, 0],
  [180, 0],
  [360, 0],
  [540, 0],
];
/** boxer 4: kollar sırayla, sağ kol gecikmeli (eşit olmayan manifold) */
const BOXER4: [number, number][] = [
  [0, 0],
  [180, 1],
  [360, 0],
  [540, 1],
];
/** 90° V6, kaydırılmış krank muylusu: 120° eşit aralıklı ateşleme, sıralar sırayla */
const V6: [number, number][] = [0, 120, 240, 360, 480, 600].map((a, i) => [a, i % 2]);
/** çapraz krank V8 (1-8-7-2-6-5-4-3): her kolda aralıklar eşit değil (homurtu) */
const V8_CAPRAZ: [number, number][] = [0, 1, 0, 1, 1, 0, 1, 0].map((k, i) => [i * 90, k]);

/** araç türüne göre motor: esinlenilen gerçek aracın motor dizilimi ve egzoz karakteri */
export const MOTORLAR: Record<string, MotorProfili> = {
  // Kızıl Ok (Acura NSX'ten esinlenir): ortadan motorlu, atmosferik 90° V6, 8000 devire çıkar; VTEC'te ses sertleşir
  gt: {
    ad: "Atmosferik V6 (VTEC)",
    ates: V6,
    kolGecikme: [0, 0.0004],
    boru: 0.0034,
    boruGb: 0.5,
    darbe: 0.0036,
    puruz: 0.25,
    lope: 0.12,
    kesim: [5200, 1700],
    gumbur: [160, 6],
    surus: 2,
    turbo: 0,
    valf: 0,
    kompresor: 0,
    disli: 0,
    patlama: 0.35,
    govde: 0.7,
    vtec: 0.7,
  },
  // Kor RX (Ford Focus rallikrostan esinlenir): turbolu sıra 4, anti-lag patlamaları, düz dişli şanzıman
  rx: {
    ad: "Turbo sıra 4 (rallikros)",
    ates: SIRA4,
    kolGecikme: [0, 0],
    boru: 0.0042,
    boruGb: 0.5,
    darbe: 0.0042,
    puruz: 0.5,
    lope: 0.18,
    kesim: [4600, 1500],
    gumbur: [160, 6],
    surus: 2.8,
    turbo: 1,
    valf: 1,
    kompresor: 0,
    disli: 0.8,
    patlama: 1,
    govde: 0.8,
  },
  // Beyaz Kurt (Nissan Silvia S15'ten esinlenir): turbolu 2.0 sıra 4, kalın drift egzozu, valf kesik kesik öter
  dr: {
    ad: "Turbo sıra 4 (drift)",
    ates: SIRA4,
    kolGecikme: [0, 0],
    boru: 0.0055,
    boruGb: 0.55,
    darbe: 0.0048,
    puruz: 0.35,
    lope: 0.15,
    kesim: [3800, 1300],
    gumbur: [140, 7],
    surus: 2.4,
    turbo: 0.8,
    valf: 2,
    kompresor: 0,
    disli: 0,
    patlama: 0.5,
    govde: 0.7,
  },
  // Mavi Yıldız (Subaru Impreza'dan esinlenir): turbolu boxer 4, eşit olmayan manifold homurtusu
  rl: {
    ad: "Turbo boxer 4",
    ates: BOXER4,
    kolGecikme: [0, 0.0028],
    boru: 0.005,
    boruGb: 0.5,
    darbe: 0.005,
    puruz: 0.4,
    lope: 0.25,
    kesim: [3600, 1200],
    gumbur: [130, 7],
    surus: 2.4,
    turbo: 1,
    valf: 1,
    kompresor: 0,
    disli: 0.5,
    patlama: 0.8,
    govde: 0.8,
  },
  // Gece Mavisi (Dodge Charger'dan esinlenir): kompresörlü büyük V8, çapraz krank, derin homurtu
  dg: {
    ad: "Kompresörlü V8",
    ates: V8_CAPRAZ,
    kolGecikme: [0, 0.0006],
    boru: 0.0062,
    boruGb: 0.6,
    darbe: 0.006,
    puruz: 0.35,
    lope: 0.6,
    kesim: [3000, 1000],
    gumbur: [110, 8],
    surus: 2.6,
    turbo: 0,
    valf: 0,
    kompresor: 1,
    disli: 0,
    patlama: 0.35,
    govde: 1,
  },
};

export const motorProfili = (k: string): MotorProfili => MOTORLAR[k] ?? MOTORLAR.gt;

// ---------- süzgeçler (RBJ biquad)

export class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  private ayarla(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number) {
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
    return this;
  }
  static alcak(f: number, q: number, sr: number) {
    const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr,
      c = Math.cos(w),
      a = Math.sin(w) / (2 * q);
    return new Biquad().ayarla((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + a, -2 * c, 1 - a);
  }
  static yuksek(f: number, q: number, sr: number) {
    const w = (2 * Math.PI * f) / sr,
      c = Math.cos(w),
      a = Math.sin(w) / (2 * q);
    return new Biquad().ayarla((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + a, -2 * c, 1 - a);
  }
  static bant(f: number, q: number, sr: number) {
    const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr,
      c = Math.cos(w),
      a = Math.sin(w) / (2 * q);
    return new Biquad().ayarla(a, 0, -a, 1 + a, -2 * c, 1 - a);
  }
  static tepe(f: number, q: number, db: number, sr: number) {
    const A = Math.pow(10, db / 40),
      w = (2 * Math.PI * f) / sr,
      c = Math.cos(w),
      a = Math.sin(w) / (2 * q);
    return new Biquad().ayarla(1 + a * A, -2 * c, 1 - a * A, 1 + a / A, -2 * c, 1 - a / A);
  }
  adim(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** geri beslemeli tarak süzgeci: boru yankısı (gecikme hattında sönümleyen tek kutuplu süzgeç) */
class Tarak {
  private b: Float32Array;
  private i = 0;
  private lp = 0;
  constructor(
    n: number,
    private gb: number,
    private son: number,
  ) {
    this.b = new Float32Array(Math.max(1, n));
  }
  adim(x: number) {
    const d = this.b[this.i];
    this.lp += (d - this.lp) * this.son;
    const y = x + this.gb * this.lp;
    this.b[this.i] = y;
    this.i = (this.i + 1) % this.b.length;
    return y;
  }
}

/** egzoz darbesinin biçimi (x: 0-1): ani basınç, ardından kısa emme (eksi) dalgası */
function darbeBicimi(x: number) {
  const a = x * 7;
  return a * Math.exp(1 - a) - 0.38 * Math.exp(-(((x - 0.5) / 0.16) ** 2));
}

/** sinyali hedef RMS'e getir; tepeler yumuşakça 0,95'in altında tutulur (katmanlar eşit yüksek olsun) */
function normallestir(s: Float32Array, rms: number) {
  let t = 0;
  for (const v of s) t += v * v;
  const k = rms / (Math.sqrt(t / s.length) || 1);
  for (let i = 0; i < s.length; i++) {
    const x = s[i] * k;
    s[i] = Math.abs(x) < 0.7 ? x : Math.sign(x) * (0.7 + 0.25 * Math.tanh((Math.abs(x) - 0.7) / 0.25));
  }
  return s;
}

/** katmanların üretildiği devirler (azami devre göre); yakın aralıklar hızlandırmada tını bozulmasın diye */
export function katmanDevirleri(devirMax: number): number[] {
  return [900, 0.24, 0.42, 0.64, 0.9].map((u, i) => (i ? Math.round(u * devirMax) : u));
}

/**
 * Motor sesinin bir katmanı: verilen devirde ve yükte (1 gazda, 0 gaz kapalı) kesintisiz döngü.
 * Döngü tam sayıda çevirimdir; süzgeçler iki tur çalıştırılır, ikinci tur alınır: başı ve sonu dikişsiz birleşir.
 */
export function motorKatmani(
  p: MotorProfili,
  devir: number,
  yuk: number,
  devirMax: number,
  sr: number,
  tohum = 1,
): Float32Array {
  const rng = mulberry32(tohum),
    T = 120 / devir,
    N = Math.max(2, Math.round(1 / T)),
    L = Math.round(N * T * sr),
    Tn = L / N,
    u = devir / devirMax;
  // uyarım: her kol için darbeler (çevrim çevrim küçük düzensizliklerle)
  const kol = [new Float32Array(L), new Float32Array(L)],
    dL = p.darbe * sr * (0.85 + 0.3 * (1 - yuk)),
    // silindirler arası sabit fark: düşük devirde belirgin, yüksekte de biraz kalır (sesin "kalınlığı")
    dusuk = 1 - 0.6 * Math.min(1, u * 1.6),
    silFark = p.ates.map(() => (rng() * 2 - 1) * p.lope * dusuk),
    // büyük kamlı motorda ateşleme anları da kayar (rölantide "lope")
    silZaman = p.ates.map(() => (rng() * 2 - 1) * p.lope * dusuk * 0.0025 * sr),
    gurultu = p.puruz * (0.35 + 0.5 * yuk),
    // egzoz türbülansı: ateşleme aralığının ~%35'i boyunca sönen gürültü (ayrı tampon, alçak geçirilir)
    gov = new Float32Array(L),
    govTau = (0.35 * Tn) / p.ates.length,
    govA = p.govde * (0.5 + 0.5 * yuk);
  for (let c = 0; c < N; c++)
    p.ates.forEach(([aci, k], j) => {
      let A = (0.3 + 0.7 * yuk) * (1 + silFark[j]) * (1 + (rng() - 0.5) * 0.4 * p.puruz);
      // gaz kapalıyken ara sıra zayıf ateşleme (kesik kesik geri vites homurtusu)
      if (yuk < 0.5 && rng() < 0.12 * (1 - yuk)) A *= 0.35;
      const t0 =
          c * Tn +
          (aci / 720) * Tn +
          p.kolGecikme[k] * sr +
          silZaman[j] +
          (rng() - 0.5) * p.puruz * 0.0003 * sr,
        s = kol[k],
        n0 = Math.ceil(t0);
      for (let n = n0; n < t0 + dL; n++) {
        const x = (n - t0) / dL,
          zarf = x < 0.5 ? 1 : 1 - (x - 0.5) * 2;
        s[((n % L) + L) % L] += A * (darbeBicimi(x) + gurultu * (rng() * 2 - 1) * zarf * Math.exp(-x * 3));
      }
      if (govA > 0)
        for (let n = n0; n < t0 + govTau * 4; n++)
          gov[((n % L) + L) % L] += A * govA * (rng() * 2 - 1) * Math.exp(-(n - t0) / govTau);
    });
  // egzoz kolları: her kol kendi borusunda yankılanır, kendi içinde doyar (V8'de kollar arası homurtu)
  const D = Math.round(p.boru * sr),
    tarak = [new Tarak(D, p.boruGb, 0.45), new Tarak(Math.round(D * 1.13), p.boruGb * 0.92, 0.4)],
    // susturucu odası: ikinci, daha uzun ve zayıf yankı (keskin tarak tınısını yumuşatır)
    oda = new Tarak(Math.round(D * 2.7), 0.35, 0.3),
    govLp = [Biquad.alcak(380 + 320 * u, 0.7, sr), Biquad.alcak(380 + 320 * u, 0.7, sr)],
    vtec = p.vtec != null && u >= p.vtec,
    kesim = (p.kesim[1] + (p.kesim[0] - p.kesim[1]) * yuk * (0.6 + 0.4 * u)) * (vtec ? 1.35 : 1),
    sus = [Biquad.alcak(kesim, 0.75, sr), Biquad.alcak(kesim * 1.6, 0.6, sr)],
    gum = Biquad.tepe(p.gumbur[0], 1.1, p.gumbur[1], sr),
    parlak = Biquad.tepe(1500 + 900 * u, 0.9, 1 + 2 * yuk + (vtec ? 3 : 0), sr),
    dc = Biquad.yuksek(28, 0.7, sr),
    surus = p.surus * (0.55 + 0.45 * yuk) * (vtec ? 1.25 : 1),
    ts = Math.tanh(surus),
    out = new Float32Array(L);
  for (let tur = 0; tur < 2; tur++)
    for (let n = 0; n < L; n++) {
      const a = tarak[0].adim(kol[0][n]),
        b = tarak[1].adim(kol[1][n]);
      let y = Math.tanh(a * 1.4) + Math.tanh(b * 1.4);
      y = oda.adim(y) + govLp[1].adim(govLp[0].adim(gov[n]));
      y = sus[1].adim(sus[0].adim(y));
      y = parlak.adim(gum.adim(y));
      y = dc.adim(Math.tanh(y * surus) / ts);
      if (tur) out[n] = y;
    }
  return normallestir(out, 0.22);
}

/** bir aracın tüm katmanları: her devirde gazda ve gaz kapalı */
export function motorKatmanlari(p: MotorProfili, devirMax: number, sr: number) {
  return katmanDevirleri(devirMax).map((d, i) => ({
    devir: d,
    gaz: motorKatmani(p, d, 1, devirMax, sr, 11 + i),
    bos: motorKatmani(p, d, 0, devirMax, sr, 31 + i),
  }));
}

// ---------- tek seferlik ve döngü örnekleri

/** beyaz gürültü (döngü) */
export function gurultu(sn: number, sr: number, tohum = 5) {
  const r = mulberry32(tohum),
    s = new Float32Array(Math.round(sn * sr));
  for (let i = 0; i < s.length; i++) s[i] = r() * 2 - 1;
  return s;
}

/** tek kutuplu sönümlü titreşim ekle (çınlama, tık) */
function cinla(s: Float32Array, n0: number, f: number, sonum: number, A: number, sr: number, sar = true) {
  const w = (2 * Math.PI * f) / sr,
    k = Math.exp(-1 / (sonum * sr)),
    son = Math.min(sar ? s.length : s.length - n0, Math.ceil(sonum * sr * 6));
  let e = A;
  for (let i = 0; i < son; i++) {
    s[(n0 + i) % s.length] += e * Math.sin(w * i);
    e *= k;
  }
}

/** çakıl ve toprak: lastiğin altında ezilen taneler (döngü) */
export function cakil(sr: number, tohum = 7) {
  const r = mulberry32(tohum),
    L = Math.round(1.2 * sr),
    s = new Float32Array(L);
  const tane = Math.round(1.2 * 1100);
  for (let i = 0; i < tane; i++) {
    const A = r() ** 2.2 * (r() < 0.04 ? 1 : 0.4);
    cinla(s, Math.floor(r() * L), 700 + r() * 3800, 0.0006 + r() * 0.0016, A, sr);
  }
  // altta tok bir uğultu
  const al = Biquad.alcak(180, 0.7, sr);
  for (let t = 0; t < 2; t++)
    for (let i = 0; i < L; i++) {
      const v = al.adim(r() * 2 - 1);
      if (t) s[i] += v * 0.9;
    }
  return normallestir(s, 0.2);
}

/** egzoz patlaması (gaz kesince, anti-lag): kısa sert darbe ve tok gümbürtü */
export function patlama(sr: number, tohum: number) {
  const r = mulberry32(tohum),
    L = Math.round(0.18 * sr),
    s = new Float32Array(L),
    f = 55 + r() * 40,
    bp = Biquad.bant(500 + r() * 1400, 0.9, sr);
  for (let i = 0; i < L; i++) {
    const t = i / sr,
      kirpik = (r() * 2 - 1) * Math.exp(-t / (0.004 + r() * 0.003)),
      tok = Math.sin(2 * Math.PI * f * t * (1 - t * 2)) * Math.exp(-t / 0.035);
    // birkaç ardışık çatırtı
    const cat = r() < 0.004 * Math.exp(-t / 0.05) ? (r() * 2 - 1) * 2 : 0;
    s[i] = Math.tanh(2.5 * (bp.adim(kirpik * 3 + cat) + 0.8 * tok));
  }
  return normallestir(s, 0.3);
}

/** üfleme valfi: tip 1 "pısss", tip 2 kesik kesik (flutter) */
export function valf(sr: number, tip: 1 | 2, tohum = 9) {
  const r = mulberry32(tohum),
    sure = tip == 2 ? 0.75 : 0.55,
    L = Math.round(sure * sr),
    s = new Float32Array(L),
    bp1 = Biquad.bant(3200, 1.2, sr),
    bp2 = Biquad.bant(1500, 1.5, sr);
  let faz = 0;
  for (let i = 0; i < L; i++) {
    const t = i / sr,
      zarf = Math.min(1, t / 0.008) * Math.exp(-t / (tip == 2 ? 0.28 : 0.2));
    let a = 1;
    if (tip == 2) {
      // kanat çırpması: 24 Hz'den 13 Hz'e yavaşlayan kesikler
      faz += (24 - 11 * Math.min(1, t / sure)) / sr;
      a = 0.25 + 0.75 * Math.max(0, Math.sin(2 * Math.PI * faz)) ** 0.6;
    }
    const n = r() * 2 - 1;
    s[i] = zarf * a * (bp1.adim(n) * (1 - t / sure) + 0.7 * bp2.adim(n));
  }
  return normallestir(s, 0.2);
}

/** çarpma: tok gümbürtü, sac ezilmesi ve metal çınlaması */
export function carpma(sr: number, tohum: number) {
  const r = mulberry32(tohum),
    L = Math.round(0.7 * sr),
    s = new Float32Array(L),
    bp = Biquad.bant(1400 + r() * 1200, 0.7, sr),
    f0 = 70 + r() * 30;
  for (let i = 0; i < L; i++) {
    const t = i / sr;
    s[i] =
      1.4 * Math.sin(2 * Math.PI * f0 * t * (1 - t * 0.8)) * Math.exp(-t / 0.09) +
      bp.adim((r() * 2 - 1) * Math.exp(-t / 0.05)) * 2.2;
  }
  for (let k = 0; k < 5; k++)
    cinla(s, Math.floor(r() * 0.01 * sr), 600 + r() * 2600, 0.04 + r() * 0.12, 0.25, sr, false);
  for (let i = 0; i < L; i++) s[i] = Math.tanh(s[i] * 1.5);
  return normallestir(s, 0.25);
}

/** WaveShaper için doygunluk eğrisi (gitar distorsiyonu) */
export function bozmaEgrisi(k: number, n = 2048) {
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    // asimetrik yumuşak kırpma: tüp amfiye yakın, çift harmonikler
    e[i] = Math.tanh(k * (x + 0.08 * x * x)) / Math.tanh(k * 1.08);
  }
  return e;
}

/** konvolüsyon yankısı için oda tepkisi (stereo) */
export function yankiTepkisi(sn: number, sr: number, tohum = 3): [Float32Array, Float32Array] {
  const r: Rastgele = mulberry32(tohum),
    L = Math.round(sn * sr),
    k: [Float32Array, Float32Array] = [new Float32Array(L), new Float32Array(L)];
  for (const s of k) {
    const al = Biquad.alcak(6000, 0.7, sr);
    for (let i = 0; i < L; i++) {
      const t = i / sr;
      s[i] = al.adim(r() * 2 - 1) * Math.exp(-t / (sn * 0.28)) * Math.min(1, t / 0.004);
    }
  }
  return k;
}
