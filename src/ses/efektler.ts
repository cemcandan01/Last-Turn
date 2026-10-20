// Sürüş ve arayüz efektleri: lastik ötmesi ve kayma uğultusu, zemin (çakıl, çim, çamur, kar), yol ve rüzgâr,
// kerb tırtılı, çarpma, iniş; geri sayım, bitiş, drift kombosu ve menü tıkları.
import { cl } from "../cekirdek/matematik";
import { cal, dongu, gurultuTampon, tampon } from "./motor";
import { cakil, carpma } from "./sentez";

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

/** zemin sesleri: [çakıl kazancı, çakıl hızı, çakıl süzgeci (Hz), hışırtı kazancı, hışırtı süzgeci (Hz)] */
const ZEMIN: [number, number, number, number, number][] = [
  [1, 1, 5000, 0.35, 1400], // toprak
  [0, 1, 5000, 0, 800], // asfalt (yol uğultusu ayrı)
  [0.15, 0.8, 2500, 0.6, 2600], // çim
  [0.1, 0.5, 700, 0.9, 500], // çamur
  [0.55, 0.65, 3200, 0.35, 3500], // kar
  [0.35, 0.5, 2200, 0.8, 1800], // derin kar
];

type Kanal = { s: AudioBufferSourceNode; g: GainNode };

export class SurusSesleri {
  private otme: { f: BiquadFilterNode[]; g: GainNode };
  private ugultu: { f: BiquadFilterNode; g: GainNode };
  private cakil: Kanal & { f: BiquadFilterNode };
  private hisirti: { f: BiquadFilterNode; g: GainNode };
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
    // lastik ötmesi: dar bantlı, tonlu; frekanslar yavaşça oynar
    {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(hedef);
      const f = [720, 1150, 1720].map((fr, i) => {
        const fl = ctx.createBiquadFilter(),
          a = ctx.createGain();
        fl.type = "bandpass";
        fl.frequency.value = fr;
        fl.Q.value = 18 - i * 4;
        a.gain.value = [1.6, 1.1, 0.6][i];
        n.g.connect(fl).connect(a).connect(g);
        return fl;
      });
      this.otme = { f, g };
    }
    this.ugultu = yol("bandpass", 600, 0.8);
    this.hisirti = yol("lowpass", 1400, 0.7);
    this.yol = yol("lowpass", 380, 0.8);
    this.ruzgar = yol("bandpass", 500, 0.5);
    const cf = ctx.createBiquadFilter();
    cf.type = "lowpass";
    cf.frequency.value = 5000;
    cf.connect(hedef);
    this.cakil = { ...dongu(ctx, tampon(ctx, cakil(sr)), cf, t), f: cf };
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
    // lastik ötmesi
    const k = cl(s.kayma, 0, 1.4) * yer;
    st(this.otme.g.gain, seviye * 1.1 * k ** 1.3, 0.03);
    this.otme.f.forEach((f, i) =>
      st(f.frequency, [720, 1150, 1720][i] * (0.92 + 0.1 * k + 0.05 * Math.sin(t * (3 + i) + i)), 0.05),
    );
    st(this.ugultu.g.gain, seviye * 0.5 * cl(s.savrulma, 0, 1) * yer * cl(v / 15, 0, 1));
    st(this.ugultu.f.frequency, 380 + 12 * v);
    // zemin
    let cg = 0,
      ch = 0,
      cf = 0,
      hg = 0,
      hf = 0;
    s.zemin.forEach((p, i) => {
      const z = ZEMIN[i];
      cg += p * z[0];
      ch += p * z[1];
      cf += p * z[2];
      hg += p * z[3];
      hf += p * z[4];
    });
    const top = s.zemin.reduce((a, b) => a + b, 0) || 1,
      vh = cl(v / 22, 0, 1.3),
      gk = 1 + 1.2 * cl(s.gevsekKayma, 0, 1);
    st(this.cakil.g.gain, seviye * 0.55 * cg * vh * gk * yer);
    st(this.cakil.s.playbackRate, (ch / top) * (0.6 + 0.6 * cl(v / 30, 0, 1)), 0.1);
    st(this.cakil.f.frequency, cf / top, 0.1);
    st(this.hisirti.g.gain, seviye * 0.18 * hg * vh * gk * yer);
    st(this.hisirti.f.frequency, (hf / top) * (0.7 + 0.5 * cl(v / 30, 0, 1)), 0.1);
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
  /** kombo yandı */
  yandi(ctx: BaseAudioContext, h: AudioNode, t: number) {
    ton(ctx, h, t, 220, 0.35, 0.12, "sawtooth", 110);
  },
};
