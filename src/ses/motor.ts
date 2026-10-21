// Motor sesi: sentezlenmiş katmanlar (sentez.ts) devire göre çapraz geçişle ve hızlandırılarak çalınır, gaz
// açıkken ve kapalıyken iki ayrı katman karışır. Üstüne turbo ıslığı, üfleme valfi, kompresör uğultusu,
// düz dişli vınlaması, devir kesici ve gaz kesince egzoz patlamaları eklenir.
import { sm } from "../cekirdek/matematik";
import {
  gurultu,
  katmanDevirleri,
  motorEq,
  motorKatmani,
  motorProfili,
  patlama,
  valf,
  type MotorProfili,
} from "./sentez";

export interface MotorGirdisi {
  /** motor devri (d/dk) */
  devir: number;
  /** gaz (0-1) */
  gaz: number;
  /** vites geçişinde tork kesik */
  kesik: boolean;
  /** araç hızı (m/s): dişli vınlaması */
  hiz: number;
}

/** garajdaki "motoru dinle" kaydının süresi (sn) */
export const DINLE_SURE = 5;
/** dinleme senaryosu: rölanti, kısa gaz vuruşu, devir kesiciye kadar uzun gaz, gaz kesme (patlamalar), rölanti */
export const dinleGaz = (s: number) => ((s > 0.5 && s < 0.82) || (s > 1.7 && s < 3.1) ? 1 : 0);

/** Float32Array → AudioBuffer */
export function tampon(ctx: BaseAudioContext, s: Float32Array) {
  const b = ctx.createBuffer(1, s.length, ctx.sampleRate);
  b.getChannelData(0).set(s);
  return b;
}

const gurultuTamponu = new WeakMap<BaseAudioContext, AudioBuffer>();
/** bağlam başına bir kez üretilen 2 sn'lik beyaz gürültü */
export function gurultuTampon(ctx: BaseAudioContext) {
  let b = gurultuTamponu.get(ctx);
  if (!b) gurultuTamponu.set(ctx, (b = tampon(ctx, gurultu(2, ctx.sampleRate))));
  return b;
}

/** döngüde çalan kaynak */
export function dongu(ctx: BaseAudioContext, b: AudioBuffer, hedef: AudioNode, t: number, kazanc = 0) {
  const s = ctx.createBufferSource(),
    g = ctx.createGain();
  s.buffer = b;
  s.loop = true;
  g.gain.value = kazanc;
  s.connect(g).connect(hedef);
  s.start(t, Math.random() * b.duration);
  return { s, g };
}

/** tek seferlik çal */
export function cal(
  ctx: BaseAudioContext,
  b: AudioBuffer,
  hedef: AudioNode,
  t: number,
  kazanc: number,
  hiz = 1,
) {
  const s = ctx.createBufferSource(),
    g = ctx.createGain();
  s.buffer = b;
  s.playbackRate.value = hiz;
  g.gain.value = kazanc;
  s.connect(g).connect(hedef);
  s.start(t);
}

/** kısa bekleme: uzun hesabı karelere böl (oyun takılmasın) */
const bekle = () => new Promise<void>((ok) => setTimeout(ok, 0));

interface Katman {
  devir: number;
  gaz: { s: AudioBufferSourceNode; g: GainNode };
  bos: { s: AudioBufferSourceNode; g: GainNode };
}

/** katman önbelleği (araç anahtarı + örnekleme hızı): araç değişince yeniden hesaplanmasın */
const ONBELLEK = new Map<string, { devir: number; gaz: AudioBuffer; bos: AudioBuffer }[]>();

export class MotorSesi {
  /** motor katmanlarının ana kazancı (devir ve yüke göre) */
  private cikis: GainNode;
  /** VTEC: yüksek kama geçince tizler kabarır */
  private vtecF: BiquadFilterNode;
  /** ek parçalar (turbo, valf, patlama) */
  private ek: GainNode;
  private katman: Katman[] = [];
  private p: MotorProfili | null = null;
  private anahtar = "";
  private kurNo = 0;
  private dMax = 7500;
  private yuk = 0;
  private gazOnce = 0;
  private kesikOnce = false;
  private boost = 0;
  private patlamaBitis = 0;
  private sonrakiPatlama = 0;
  private patlamalar: AudioBuffer[] = [];
  private valfB: AudioBuffer | null = null;
  private turbo: { o: OscillatorNode; g: GainNode; n: BiquadFilterNode; ng: GainNode } | null = null;
  private komp: { o: OscillatorNode; g: GainNode } | null = null;
  private disli: { o: OscillatorNode; g: GainNode } | null = null;

  constructor(
    private ctx: BaseAudioContext,
    hedef: AudioNode,
  ) {
    this.cikis = ctx.createGain();
    this.cikis.gain.value = 0;
    this.vtecF = ctx.createBiquadFilter();
    this.vtecF.type = "highshelf";
    this.vtecF.frequency.value = 1400;
    this.vtecF.gain.value = 0;
    this.cikis.connect(this.vtecF).connect(hedef);
    this.ek = ctx.createGain();
    this.ek.gain.value = 0;
    this.ek.connect(hedef);
  }

  get hazir() {
    return !!this.p;
  }

  /** çalan katmanların aracı (araç türü + azami devir); yeni araç hesaplanırken eskisi çalmaya devam eder */
  kurulu = "";

  /** aracın motorunu kur (k: araç türü). Katmanlar karelere bölünerek hesaplanır */
  async kur(k: string, devirMax: number) {
    const anahtar = k + ":" + devirMax;
    if (anahtar == this.anahtar) return;
    this.anahtar = anahtar;
    const no = ++this.kurNo,
      ctx = this.ctx,
      sr = ctx.sampleRate,
      p = motorProfili(k);
    let tamponlar = ONBELLEK.get(anahtar + ":" + sr);
    if (!tamponlar) {
      tamponlar = [];
      const devirler = katmanDevirleri(devirMax);
      for (let i = 0; i < devirler.length; i++) {
        const d = devirler[i],
          gaz = tampon(ctx, motorKatmani(p, d, 1, devirMax, sr, 11 + i, motorEq(k, i)));
        if (ctx instanceof AudioContext) await bekle();
        const bos = tampon(ctx, motorKatmani(p, d, 0, devirMax, sr, 31 + i, motorEq(k, i)));
        if (ctx instanceof AudioContext) await bekle();
        if (no != this.kurNo) return;
        tamponlar.push({ devir: d, gaz, bos });
      }
      ONBELLEK.set(anahtar + ":" + sr, tamponlar);
      // en çok iki aracın sesi bellekte kalsın
      while (ONBELLEK.size > 2) ONBELLEK.delete(ONBELLEK.keys().next().value!);
    }
    if (no != this.kurNo) return;
    this.durdur();
    const t = ctx.currentTime;
    this.katman = tamponlar.map((b) => ({
      devir: b.devir,
      gaz: dongu(ctx, b.gaz, this.cikis, t),
      bos: dongu(ctx, b.bos, this.cikis, t),
    }));
    this.p = p;
    this.kurulu = anahtar;
    this.dMax = devirMax;
    if (!this.patlamalar.length)
      for (let i = 0; i < 4; i++) this.patlamalar.push(tampon(ctx, patlama(sr, 40 + i)));
    this.valfB = p.valf ? tampon(ctx, valf(sr, p.valf)) : null;
    if (p.turbo) {
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        n = ctx.createBiquadFilter(),
        ng = ctx.createGain();
      o.type = "sine";
      g.gain.value = 0;
      o.connect(g).connect(this.ek);
      n.type = "bandpass";
      n.Q.value = 4;
      ng.gain.value = 0;
      dongu(ctx, gurultuTampon(ctx), n, t, 1).g.gain.value = 1;
      n.connect(ng).connect(this.ek);
      o.start(t);
      this.turbo = { o, g, n, ng };
    }
    if (p.kompresor) {
      const o = ctx.createOscillator(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain();
      o.type = "sawtooth";
      f.type = "bandpass";
      f.Q.value = 3;
      f.frequency.value = 900;
      g.gain.value = 0;
      o.connect(f).connect(g).connect(this.ek);
      o.start(t);
      this.komp = { o, g };
    }
    if (p.disli) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "triangle";
      g.gain.value = 0;
      o.connect(g).connect(this.ek);
      o.start(t);
      this.disli = { o, g };
    }
  }

  /** kaynakları durdur (araç değişince) */
  durdur() {
    for (const k of this.katman) {
      k.gaz.s.stop();
      k.bos.s.stop();
      k.gaz.s.disconnect();
      k.bos.s.disconnect();
    }
    this.katman = [];
    for (const x of [this.turbo, this.komp, this.disli]) if (x) x.o.stop();
    this.turbo = this.komp = this.disli = null;
    this.p = null;
    this.kurulu = "";
  }

  /** her kare: t bağlam saati, seviye 0-1 (0: sessiz) */
  guncelle(t: number, dt: number, m: MotorGirdisi, seviye: number) {
    const p = this.p;
    if (!p) return;
    const dMax = this.dMax,
      devir = Math.max(600, m.devir),
      u = Math.min(1, devir / dMax);
    // yük: gaz; vites geçişinde ve devir kesicide kesilir
    let hedef = m.kesik ? 0.12 : m.gaz;
    const kesici = devir > 0.975 * dMax && m.gaz > 0.6;
    if (kesici) hedef = Math.floor(t * 17) % 2 ? 1 : 0.08;
    this.yuk += (hedef - this.yuk) * Math.min(1, dt * (kesici ? 40 : 14));
    const yuk = this.yuk,
      yG = Math.sin((yuk * Math.PI) / 2),
      yB = Math.cos((yuk * Math.PI) / 2);
    // katman ağırlıkları: logaritmik devirde komşu iki katman arası eşit güçlü geçiş
    const K = this.katman,
      w = K.map(() => 0);
    if (devir <= K[0].devir) w[0] = 1;
    else if (devir >= K[K.length - 1].devir) w[K.length - 1] = 1;
    else
      for (let i = 0; i < K.length - 1; i++)
        if (devir < K[i + 1].devir) {
          const f = Math.log(devir / K[i].devir) / Math.log(K[i + 1].devir / K[i].devir);
          w[i] = Math.cos((f * Math.PI) / 2);
          w[i + 1] = Math.sin((f * Math.PI) / 2);
          break;
        }
    K.forEach((k, i) => {
      const hiz = Math.min(3, Math.max(0.3, devir / k.devir));
      k.gaz.s.playbackRate.setTargetAtTime(hiz, t, 0.012);
      k.bos.s.playbackRate.setTargetAtTime(hiz, t, 0.012);
      k.gaz.g.gain.setTargetAtTime(w[i] * yG, t, 0.02);
      k.bos.g.gain.setTargetAtTime(w[i] * yB * 0.75, t, 0.02);
    });
    // VTEC: eşiğin üstünde gazdayken ses birden sertleşir ve yükselir
    const vtec = p.vtec != null && u >= p.vtec && yuk > 0.5 ? 1 : 0;
    this.vtecF.gain.setTargetAtTime(vtec * 6, t, 0.025);
    this.cikis.gain.setTargetAtTime(
      seviye * (0.42 + 0.58 * u) * (0.6 + 0.4 * yuk) * (1 + 0.25 * vtec),
      t,
      0.03,
    );
    this.ek.gain.setTargetAtTime(seviye, t, 0.03);

    const birak = this.gazOnce > 0.5 && m.gaz < 0.2,
      vitesBasi = m.kesik && !this.kesikOnce;
    // turbo: gazla ve devirle dolar, gaz kesilince valf boşaltır
    if (this.turbo) {
      const bh = m.gaz * sm(0.25, 0.7, u) * (m.kesik ? 0.6 : 1);
      this.boost += (bh - this.boost) * Math.min(1, dt / (bh > this.boost ? 0.45 : 0.15));
      const f = 2000 + 4200 * this.boost;
      this.turbo.o.frequency.setTargetAtTime(f, t, 0.03);
      this.turbo.g.gain.setTargetAtTime(0.022 * p.turbo * this.boost ** 1.6, t, 0.03);
      this.turbo.n.frequency.setTargetAtTime(f * 0.55, t, 0.03);
      this.turbo.ng.gain.setTargetAtTime(0.09 * p.turbo * this.boost ** 1.4, t, 0.03);
      if (this.valfB && this.boost > 0.4 && (birak || vitesBasi)) {
        cal(
          this.ctx,
          this.valfB,
          this.ek,
          t,
          (birak ? 0.75 : 0.35) * this.boost,
          0.92 + Math.random() * 0.16,
        );
        this.boost *= 0.2;
      }
    }
    if (this.komp) {
      this.komp.o.frequency.setTargetAtTime((devir / 60) * 5.5, t, 0.015);
      this.komp.g.gain.setTargetAtTime(0.11 * p.kompresor * (0.25 + 0.75 * yuk) * u, t, 0.03);
    }
    if (this.disli) {
      this.disli.o.frequency.setTargetAtTime(60 + m.hiz * 42, t, 0.03);
      this.disli.g.gain.setTargetAtTime(
        0.035 * p.disli * Math.min(1, m.hiz / 25) * (0.3 + 0.7 * yuk),
        t,
        0.05,
      );
    }
    // gaz kesince (ve anti-lag araçlarda vites geçişinde) egzoz patlamaları
    if (p.patlama) {
      // gaz kesince birkaç tok patlama (seyrek, düzensiz aralıklarla); anti-lag araçlarda vites geçişinde de
      if (birak && u > 0.45) {
        this.patlamaBitis = t + 0.3 + 0.8 * p.patlama * u;
        this.sonrakiPatlama = t + 0.04 + Math.random() * 0.08;
      }
      if (vitesBasi && p.patlama > 0.7 && u > 0.5) {
        this.patlamaBitis = Math.max(this.patlamaBitis, t + 0.1);
        this.sonrakiPatlama = Math.min(this.sonrakiPatlama, t + 0.02);
      }
      if (t < this.patlamaBitis && m.gaz < 0.3 && t >= this.sonrakiPatlama) {
        this.pat(t, 0.7 + 0.3 * u);
        this.sonrakiPatlama = t + 0.07 + (Math.random() * 0.25) / (0.5 + p.patlama);
      }
    }
    this.gazOnce = m.gaz;
    this.kesikOnce = m.kesik;
  }

  private pat(t: number, s: number) {
    const b = this.patlamalar[Math.floor(Math.random() * this.patlamalar.length)];
    cal(
      this.ctx,
      b,
      this.ek,
      t + Math.random() * 0.01,
      s * (0.2 + 0.45 * Math.random()),
      0.8 + Math.random() * 0.4,
    );
  }
}
