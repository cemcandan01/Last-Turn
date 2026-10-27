// Sürüş ve arayüz efektleri: lastik ötmesi ve kayma uğultusu, zemin (çakıl, çim, çamur, kar), yol ve rüzgâr,
// kerb tırtılı, çarpma, iniş; geri sayım, bitiş, drift kombosu ve menü tıkları.
import { cl } from "../cekirdek/matematik";
import { cal, dongu, gurultuTampon, tampon } from "./motor";
import { cakil, carpma, cim, lastikOtmesi } from "./sentez";

export interface SurusGirdisi {
  /** hız (m/s) */
  hiz: number;
  /** asfaltta kayma şiddeti (0-1+): yanal kayma açısı ve patinaj */
  kayma: number;
  /** drift ya da tam yan kayma (uğultu) */
  savrulma: number;
  /** tekerlerin zemin payları (SURF sırası: toprak, asfalt, çim, çamur, kar, derin kar) */
  zemin: number[];
  /** gevşek zeminde kayma */
  gevsekKayma: number;
  havada: boolean;
  kerb: boolean;
  /** kokpit kamerası */
  kokpit: boolean;
}

/**
 * zemin sesleri: [çakıl kazancı, çakıl hızı, çim/yumuşak hışırtı kazancı, hışırtı hızı, çamur şapırtısı kazancı].
 * Hız: döngünün çalınma hızı (1 = ~15 m/s'deki tını); araç hızlandıkça ayrıca artar.
 */
const ZEMIN: [number, number, number, number, number][] = [
  [1, 1, 0.3, 1, 0], // toprak
  [0, 1, 0, 1, 0], // asfalt (yol uğultusu ayrı)
  [0.1, 0.9, 1, 1, 0], // çim
  [0.15, 0.6, 0.5, 0.7, 1], // çamur
  [0.6, 1.25, 0.3, 1.2, 0], // kar: daha ince, gıcırtılı ezilme
  [0.35, 0.9, 0.9, 0.8, 0], // derin kar
];

type Kanal = { s: AudioBufferSourceNode; g: GainNode };

export class SurusSesleri {
  private otme: Kanal;
  private surtunme: { f: BiquadFilterNode; g: GainNode };
  private cakil: Kanal;
  private cim: Kanal;
  private camur: { f: BiquadFilterNode; g: GainNode };
  private yol: { f: BiquadFilterNode; g: GainNode };
  private ruzgar: { f: BiquadFilterNode; g: GainNode };
  private kerb: { o: OscillatorNode; g: GainNode; d: GainNode; a: GainNode };
  private carpmalar: AudioBuffer[] = [];
  private seviye = 0;

  constructor(
    private ctx: BaseAudioContext,
    private hedef: AudioNode,
  ) {
    const t = ctx.currentTime,
      g0 = gurultuTampon(ctx),
      sr = ctx.sampleRate;
    // tek gürültü kaynağı, ayrı süzgeçlerle ayrı seslere
    const n = dongu(ctx, g0, hedef, t, 1);
    n.g.disconnect();
    const yol = (tip: BiquadFilterType, f: number, q: number) => {
      const fl = ctx.createBiquadFilter(),
        g = ctx.createGain();
      fl.type = tip;
      fl.frequency.value = f;
      fl.Q.value = q;
      g.gain.value = 0;
      n.g.connect(fl).connect(g).connect(hedef);
      return { f: fl, g };
    };
    // lastik ötmesi: tonlu döngü (gerçek ötme kayıtlarının ölçüsüne göre üretilir, sentez.ts → lastikOtmesi)
    this.otme = dongu(ctx, tampon(ctx, lastikOtmesi(sr)), hedef, t);
    // kayarken lastiğin yola sürtünmesi: alçak, boğuk; ötmenin altında kalır (rüzgâr gibi duyulmasın)
    this.surtunme = yol("lowpass", 700, 0.7);
    this.camur = yol("lowpass", 450, 0.9);
    this.yol = yol("lowpass", 380, 0.8);
    this.ruzgar = yol("bandpass", 500, 0.5);
    this.cakil = dongu(ctx, tampon(ctx, cakil(sr)), hedef, t);
    this.cim = dongu(ctx, tampon(ctx, cim(sr)), hedef, t);
    // kerb: alçak gürültü, kare dalgayla kesilip açılır (tırtıl)
    {
      const fl = ctx.createBiquadFilter(),
        d = ctx.createGain(),
        a = ctx.createGain(),
        g = ctx.createGain(),
        o = ctx.createOscillator();
      fl.type = "lowpass";
      fl.frequency.value = 260;
      // d.gain = derinlik + derinlik × kare dalga: 0 ile 2 × derinlik arasında açılıp kapanır
      d.gain.value = 0;
      a.gain.value = 0;
      g.gain.value = 0;
      o.type = "square";
      o.frequency.value = 20;
      o.connect(a).connect(d.gain);
      n.g.connect(fl).connect(d).connect(g).connect(hedef);
      o.start(t);
      this.kerb = { o, g, d, a };
    }
    for (let i = 0; i < 3; i++) this.carpmalar.push(tampon(ctx, carpma(sr, 70 + i)));
  }

  /** her kare: seviye 0 sessiz */
  guncelle(t: number, s: SurusGirdisi, seviye: number) {
    this.seviye = seviye;
    const v = s.hiz,
      yer = s.havada ? 0 : 1,
      st = (p: AudioParam, x: number, k = 0.04) => p.setTargetAtTime(x, t, k);
    // lastik ötmesi: kayma arttıkça ve hızlandıkça tizleşir, yükselir
    const k = cl(s.kayma, 0, 1.4) * yer;
    st(this.otme.g.gain, seviye * 0.9 * cl(k * 1.4, 0, 1) ** 1.2, 0.04);
    st(this.otme.s.playbackRate, 0.85 + 0.3 * cl(k, 0, 1) + 0.25 * cl(v / 40, 0, 1), 0.08);
    st(this.surtunme.g.gain, seviye * 0.12 * cl(s.savrulma, 0, 1) * yer * cl(v / 15, 0, 1));
    // zemin: çakıl, çim ve çamur; kayınca (patinaj, yan kayma) daha yüksek
    let cg = 0,
      ch = 0,
      hg = 0,
      hh = 0,
      mg = 0;
    s.zemin.forEach((p, i) => {
      const z = ZEMIN[i];
      cg += p * z[0];
      ch += p * z[1];
      hg += p * z[2];
      hh += p * z[3];
      mg += p * z[4];
    });
    const top = s.zemin.reduce((a, b) => a + b, 0) || 1,
      vh = cl(v / 20, 0, 1.2),
      hiz = 0.6 + 0.9 * cl(v / 30, 0, 1),
      gk = 1 + 1.2 * cl(s.gevsekKayma, 0, 1);
    st(this.cakil.g.gain, seviye * 0.6 * cg * vh * gk * yer);
    st(this.cakil.s.playbackRate, (ch / top) * hiz * (1 + 0.15 * cl(s.gevsekKayma, 0, 1)), 0.1);
    st(this.cim.g.gain, seviye * 0.5 * hg * vh * gk * yer);
    st(this.cim.s.playbackRate, (hh / top) * hiz, 0.1);
    st(this.camur.g.gain, seviye * 0.25 * mg * vh * gk * yer);
    // yol uğultusu (asfalt) ve rüzgâr
    st(this.yol.g.gain, seviye * 0.22 * s.zemin[1] * cl(v / 40, 0, 1) * yer);
    st(this.yol.f.frequency, 160 + v * 6);
    const r = cl(v / 70, 0, 1);
    st(this.ruzgar.g.gain, seviye * (s.kokpit ? 0.05 : 0.12) * r * r);
    st(this.ruzgar.f.frequency, 300 + v * 18);
    // kerb tırtılı
    st(this.kerb.o.frequency, cl(v / 0.9, 4, 60), 0.05);
    const kd = s.kerb && v > 3 ? 0.5 : 0;
    st(this.kerb.d.gain, kd, 0.02);
    st(this.kerb.a.gain, kd, 0.02);
    st(this.kerb.g.gain, seviye * 0.9 * yer, 0.05);
  }

  /** sert çarpma (siddet 0-1) */
  carp(t: number, siddet: number) {
    const b = this.carpmalar[Math.floor(Math.random() * this.carpmalar.length)];
    cal(
      this.ctx,
      b,
      this.hedef,
      t,
      this.seviye * (0.25 + 0.75 * siddet),
      0.85 + Math.random() * 0.3 - siddet * 0.1,
    );
  }

  /** atlayıştan sonra yere iniş: tok gümbürtü */
  inis(t: number, siddet: number) {
    const b = this.carpmalar[0];
    cal(this.ctx, b, this.hedef, t, this.seviye * 0.45 * siddet, 0.55);
  }
}

/** kısa ton (arayüz ve yarış sesleri) */
export function ton(
  ctx: BaseAudioContext,
  hedef: AudioNode,
  t: number,
  f: number,
  sure: number,
  kazanc: number,
  tip: OscillatorType = "sine",
  f2 = f,
) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = tip;
  o.frequency.setValueAtTime(f, t);
  if (f2 != f) o.frequency.exponentialRampToValueAtTime(f2, t + sure);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(kazanc, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  o.connect(g).connect(hedef);
  o.start(t);
  o.stop(t + sure + 0.02);
}

/** süzülmüş gürültü hışırtısı (f1 → f2 Hz, süre sn) */
function hisirti(
  ctx: BaseAudioContext,
  h: AudioNode,
  t: number,
  f1: number,
  f2: number,
  sure: number,
  kazanc: number,
) {
  const s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = gurultuTampon(ctx);
  f.type = "bandpass";
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(f1, t);
  f.frequency.exponentialRampToValueAtTime(f2, t + sure * 0.6);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(kazanc, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  s.connect(f).connect(g).connect(h);
  s.start(t);
  s.stop(t + sure + 0.05);
}

/** arayüz ve yarış sesleri */
export const arayuzSesi = {
  /** menü tıkı */
  tik(ctx: BaseAudioContext, h: AudioNode, t: number, alt = false) {
    ton(ctx, h, t, alt ? 1300 : 1900, 0.035, 0.12, "triangle", alt ? 900 : 1300);
    ton(ctx, h, t, 140, 0.05, 0.08, "sine", 90);
  },
  /** geri sayım: 3, 2, 1 kısa; BAŞLA uzun ve tiz */
  sayim(ctx: BaseAudioContext, h: AudioNode, t: number, basla: boolean) {
    const f = basla ? 1320 : 660,
      d = basla ? 0.7 : 0.22;
    ton(ctx, h, t, f, d, 0.2, "square");
    ton(ctx, h, t, f * 2, d, 0.06, "sine");
  },
  /** yarış bitti: kazanınca yükselen, kaybedince inen notalar */
  bitis(ctx: BaseAudioContext, h: AudioNode, t: number, kazandi: boolean) {
    const n = kazandi ? [523, 659, 784, 1047] : [440, 349, 262];
    n.forEach((f, i) => {
      ton(ctx, h, t + i * 0.13, f, kazandi && i == n.length - 1 ? 0.9 : 0.25, 0.14, "triangle");
      ton(ctx, h, t + i * 0.13, f * 2, 0.2, 0.04, "sine");
    });
  },
  /** drift çarpanı arttı */
  kombo(ctx: BaseAudioContext, h: AudioNode, t: number, carpan: number) {
    const f = 660 * Math.pow(2, (carpan - 1) / 6);
    ton(ctx, h, t, f, 0.18, 0.1, "triangle");
    ton(ctx, h, t + 0.07, f * 1.5, 0.3, 0.09, "triangle");
  },
  /** drift puanı kasaya girdi */
  kasa(ctx: BaseAudioContext, h: AudioNode, t: number) {
    ton(ctx, h, t, 988, 0.12, 0.08, "sine");
    ton(ctx, h, t + 0.06, 1319, 0.35, 0.08, "sine");
  },
  /** MUTANT nitrosu ateşlendi: yükselen hava hışırtısı + alçak gümleme */
  nitro(ctx: BaseAudioContext, h: AudioNode, t: number) {
    const s = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    s.buffer = gurultuTampon(ctx);
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    s.connect(f).connect(g).connect(h);
    s.start(t);
    s.stop(t + 1.05);
    ton(ctx, h, t, 95, 0.3, 0.22, "sine", 45);
  },
  /** nitro söndü: kısa düşen ıslık */
  nitroBitti(ctx: BaseAudioContext, h: AudioNode, t: number) {
    ton(ctx, h, t, 900, 0.25, 0.05, "triangle", 380);
  },
  /** MUTANT skill sesleri (LT-SYS-005). Kanca atıldı: kısa kırbaç (yükselen hışırtı) + metal tık */
  kanca(ctx: BaseAudioContext, h: AudioNode, t: number) {
    hisirti(ctx, h, t, 1200, 5200, 0.22, 0.25);
    ton(ctx, h, t + 0.16, 2400, 0.08, 0.1, "square", 1800);
  },
  /** hayalet fazına giriş: inen, titreşen çift ton; çıkış: yükselen kısa ton */
  hayalet(ctx: BaseAudioContext, h: AudioNode, t: number, giris: boolean) {
    if (giris) {
      ton(ctx, h, t, 1320, 0.6, 0.07, "triangle", 440);
      ton(ctx, h, t + 0.03, 990, 0.7, 0.05, "sine", 330);
    } else ton(ctx, h, t, 440, 0.25, 0.08, "triangle", 1100);
  },
  /** Risk Taker dönüşümü: alçak gümleme + yükselen testere + alev hışırtısı; bitişte inen ton */
  donusum(ctx: BaseAudioContext, h: AudioNode, t: number, giris: boolean) {
    if (!giris) return ton(ctx, h, t, 520, 0.4, 0.07, "sawtooth", 160);
    ton(ctx, h, t, 70, 0.6, 0.25, "sine", 40);
    ton(ctx, h, t, 220, 0.5, 0.08, "sawtooth", 880);
    hisirti(ctx, h, t, 400, 1800, 0.9, 0.28);
  },
  /** Slipstream boşalıyor: kısa rüzgâr */
  ruzgar(ctx: BaseAudioContext, h: AudioNode, t: number) {
    hisirti(ctx, h, t, 800, 3000, 0.5, 0.18);
  },
  /** skill şimdi kullanılamaz (neden yuvada yazar): kısa alçak "bonk" */
  red(ctx: BaseAudioContext, h: AudioNode, t: number) {
    ton(ctx, h, t, 180, 0.14, 0.12, "square", 120);
  },
  /** kombo yandı */
  yandi(ctx: BaseAudioContext, h: AudioNode, t: number) {
    ton(ctx, h, t, 220, 0.35, 0.12, "sawtooth", 110);
  },
};
