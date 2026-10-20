// Menü müziği: oyunun içinde çalınan bir rock parçası (150 vuruş/dk, Mi minör). Distorsiyonlu iki gitar (sol ve
// sağ kanalda, birbirinden hafif farklı: stüdyodaki çift kayıt gibi), bas, davul ve nakaratta gecikmeli solo gitar.
// Bölümler: giriş, kıta, nakarat, ağır bölüm, kıta, nakarat; sonra kıtadan başa döner. Bölüm sonlarında davul
// dolgusu rastgele seçilir. Notalar biraz ileriye planlanır (Web Audio saatine göre, takılmasız).
import { gurultuTampon } from "./motor";
import { bozmaEgrisi, yankiTepkisi } from "./sentez";

const BPM = 150,
  ON6 = 60 / BPM / 4;

/** gitar: [adım (16'lık), kök nota (MIDI), uzunluk (16'lık), susturma (palm mute)] */
type Gitar = [number, number, number, 0 | 1][];
/** solo ve bas: [adım, nota, uzunluk] */
type Nota = [number, number, number][];
interface Davul {
  k: number[];
  s: number[];
  h: number[];
  /** açık hi-hat ya da ride */
  a?: number[];
}
interface Olcu {
  g: Gitar;
  d: Davul;
  b?: Nota;
  l?: Nota;
  zil?: boolean;
  dolgu?: boolean;
}

const E = 40,
  F = 41,
  G = 43,
  A = 45,
  B = 47,
  C = 48,
  D = 50;

const sekizlik = [0, 2, 4, 6, 8, 10, 12, 14];
const RIFF_A: Gitar = [
  [0, E, 1, 1],
  [2, E, 1, 1],
  [3, E, 1, 1],
  [4, G, 2, 0],
  [6, E, 1, 1],
  [8, E, 1, 1],
  [10, E, 1, 1],
  [11, E, 1, 1],
  [12, A, 2, 0],
  [14, G, 2, 0],
];
const RIFF_B: Gitar = [
  [0, E, 1, 1],
  [2, E, 1, 1],
  [3, E, 1, 1],
  [4, G, 2, 0],
  [6, E, 1, 1],
  [8, D, 3, 0],
  [11, C, 3, 0],
  [14, B, 2, 0],
];
const KITA_DAVUL: Davul = { k: [0, 3, 8, 11], s: [4, 12], h: sekizlik };
const nakaratGitar = (c: number): Gitar => [
  [0, c, 3, 0],
  [3, c, 3, 0],
  [6, c, 2, 0],
  [8, c, 4, 0],
  [12, c, 2, 0],
  [14, c, 2, 0],
];
const NAKARAT_DAVUL: Davul = { k: [0, 3, 8, 10], s: [4, 12], h: [], a: sekizlik };
const NAKARAT_SOLO: Nota[] = [
  [
    [0, 67, 4],
    [4, 69, 2],
    [6, 71, 6],
    [12, 69, 2],
    [14, 67, 2],
  ],
  [
    [0, 69, 4],
    [4, 71, 2],
    [6, 74, 8],
    [14, 71, 2],
  ],
  [
    [0, 76, 6],
    [6, 74, 2],
    [8, 71, 4],
    [12, 69, 2],
    [14, 67, 2],
  ],
  [
    [0, 64, 8],
    [10, 67, 2],
    [12, 69, 2],
    [14, 71, 2],
  ],
  [
    [0, 72, 4],
    [4, 71, 2],
    [6, 69, 2],
    [8, 67, 4],
    [12, 69, 4],
  ],
  [
    [0, 74, 6],
    [6, 76, 2],
    [8, 74, 4],
    [12, 71, 4],
  ],
  [
    [0, 71, 4],
    [4, 74, 4],
    [8, 79, 8],
  ],
  [
    [0, 76, 4],
    [4, 74, 2],
    [6, 76, 10],
  ],
];
const AGIR: Gitar = [
  [0, E, 1, 1],
  [1, E, 1, 1],
  [3, E, 1, 1],
  [6, E, 1, 1],
  [8, E, 1, 1],
  [9, E, 1, 1],
  [11, E, 1, 1],
  [14, F, 2, 0],
];

const kita = (n: number): Olcu[] =>
  Array.from({ length: n }, (_, i) => ({
    g: i % 2 ? RIFF_B : RIFF_A,
    d: KITA_DAVUL,
    zil: i == 0,
    dolgu: i == n - 1,
  }));
const nakarat = (): Olcu[] =>
  [C, D, E, E, C, D, G, A].map((c, i) => ({
    g: nakaratGitar(c),
    d: NAKARAT_DAVUL,
    b: sekizlik.map((a) => [a, c, 2] as [number, number, number]),
    l: NAKARAT_SOLO[i],
    zil: i == 0 || i == 4,
    dolgu: i == 7,
  }));
const agir = (): Olcu[] =>
  [0, 1, 2, 3].map((i) => ({
    g: i == 3 ? [...AGIR.slice(0, 6), [12, G, 2, 0], [14, A, 2, 0]] : AGIR,
    d: { k: AGIR.map((x) => x[0]).filter((a) => a != 14), s: [8], h: [0, 4, 8, 12] },
    zil: i % 2 == 0,
    dolgu: i == 3,
  }));
const giris = (): Olcu[] =>
  kita(4).map((o, i) => (i < 2 ? { ...o, d: { k: [0], s: [], h: sekizlik }, zil: false } : o));

/** parça: giriş bir kez, sonra BASA'dan döngü */
const PARCA: Olcu[] = [...giris(), ...kita(8), ...nakarat(), ...agir(), ...kita(4), ...nakarat()];
const BASA = 4;

const frek = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Muzik {
  private cikis: GainNode;
  private gitarG: GainNode[];
  private solo: GainNode;
  private bas: GainNode;
  private davul: GainNode;
  private yanki: GainNode;
  private gurultu: AudioBuffer;
  private olcu = 0;
  private adim = 0;
  private sonraki = 0;
  private dolguTipi = 0;
  caliyor = false;

  constructor(
    private ctx: BaseAudioContext,
    hedef: AudioNode,
  ) {
    const c = ctx,
      sr = c.sampleRate;
    this.cikis = c.createGain();
    this.cikis.gain.value = 0.9;
    this.cikis.connect(hedef);
    this.gurultu = gurultuTampon(c);
    // yankı (konvolüsyon)
    {
      const cv = c.createConvolver(),
        [l, r] = yankiTepkisi(1.8, sr),
        b = c.createBuffer(2, l.length, sr);
      b.getChannelData(0).set(l);
      b.getChannelData(1).set(r);
      cv.buffer = b;
      this.yanki = c.createGain();
      this.yanki.gain.value = 0.5;
      this.yanki.connect(cv).connect(this.cikis);
    }
    // gitar zinciri (sol ve sağ): pedal (alçakları kes, ortaları kabart) → distorsiyon → amfi EQ (alt kalın,
    // orta oyuk, tizde kabarık) → kabin (alçak geçiren)
    const egri = bozmaEgrisi(14);
    this.gitarG = [-0.6, 0.6].map((pan) => {
      const giris = c.createGain(),
        f = (tip: BiquadFilterType, fr: number, q: number, db = 0) => {
          const x = c.createBiquadFilter();
          x.type = tip;
          x.frequency.value = fr;
          x.Q.value = q;
          x.gain.value = db;
          return x;
        },
        ws = c.createWaveShaper(),
        p = c.createStereoPanner(),
        g = c.createGain();
      ws.curve = egri;
      ws.oversample = "2x";
      p.pan.value = pan;
      g.gain.value = 0.3;
      giris
        .connect(f("highpass", 260, 0.7))
        .connect(f("peaking", 850, 0.9, 7))
        .connect(ws)
        .connect(f("highpass", 75, 0.7))
        .connect(f("lowshelf", 140, 0.7, 5))
        .connect(f("peaking", 480, 0.9, -6))
        .connect(f("peaking", 2400, 1.1, 5))
        .connect(f("lowpass", 5200, 0.9))
        .connect(f("lowpass", 8000, 0.7))
        .connect(p)
        .connect(g)
        .connect(this.cikis);
      return giris;
    });
    // solo: distorsiyon, gecikme ve yankı
    {
      const ws = c.createWaveShaper(),
        lp = c.createBiquadFilter(),
        g = c.createGain(),
        gec = c.createDelay(1),
        gb = c.createGain(),
        islak = c.createGain();
      ws.curve = bozmaEgrisi(6);
      ws.oversample = "2x";
      lp.type = "lowpass";
      lp.frequency.value = 4200;
      g.gain.value = 0.085;
      gec.delayTime.value = ON6 * 3;
      gb.gain.value = 0.32;
      islak.gain.value = 0.3;
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 150;
      this.solo = c.createGain();
      this.solo.connect(ws).connect(hp).connect(lp).connect(g);
      g.connect(this.cikis);
      g.connect(gec);
      gec.connect(gb).connect(gec);
      gec.connect(islak).connect(this.cikis);
      g.connect(this.yanki);
    }
    this.bas = c.createGain();
    this.bas.gain.value = 0.11;
    {
      const ws = c.createWaveShaper(),
        hp = c.createBiquadFilter();
      ws.curve = bozmaEgrisi(1.6);
      hp.type = "highpass";
      hp.frequency.value = 35;
      this.bas.connect(ws).connect(hp).connect(this.cikis);
    }
    this.davul = c.createGain();
    this.davul.gain.value = 0.85;
    this.davul.connect(this.cikis);
  }

  /** yalnız bir çalgı grubunu duyur (kayıtta karışım dengesine bakmak için): gitar, solo, bas, davul */
  yalniz(ad: string) {
    const g: Record<string, AudioParam[]> = {
      gitar: this.gitarG.map((x) => x.gain),
      solo: [this.solo.gain],
      bas: [this.bas.gain],
      davul: [this.davul.gain, this.yanki.gain],
    };
    for (const [k, p] of Object.entries(g)) if (k != ad) for (const x of p) x.value = 0;
  }

  /** baştan (ilk açılışta girişten, sonra kıtadan) çalmaya başla */
  baslat(t: number, giristen = true) {
    this.olcu = giristen ? 0 : BASA;
    this.adim = 0;
    this.sonraki = t + 0.05;
    this.caliyor = true;
  }

  durdur() {
    this.caliyor = false;
  }

  /** t1'e kadar olan notaları planla */
  planla(t1: number) {
    if (!this.caliyor) return;
    while (this.sonraki < t1) {
      this.adimCal(PARCA[this.olcu], this.adim, this.sonraki);
      this.sonraki += ON6;
      if (++this.adim == 16) {
        this.adim = 0;
        if (++this.olcu >= PARCA.length) this.olcu = BASA;
        this.dolguTipi = Math.floor(Math.random() * 3);
      }
    }
  }

  private adimCal(o: Olcu, a: number, t: number) {
    const dolgu = o.dolgu && a >= 8;
    // davul
    if (dolgu) this.dolgu(a, t);
    else {
      if (o.d.k.includes(a)) this.kick(t);
      if (o.d.s.includes(a)) this.trampet(t, 1);
      if (o.d.h.includes(a)) this.hihat(t, a % 4 == 0 ? 0.32 : 0.2, 0.04);
      if (o.d.a?.includes(a)) this.hihat(t, a % 4 == 0 ? 0.26 : 0.18, 0.24);
      // ara sıra hayalet trampet
      if (a == 15 && o.d.s.length > 1 && Math.random() < 0.3) this.trampet(t, 0.25);
    }
    if (a == 0 && o.zil) this.zil(t);
    // gitar ve bas
    for (const [s, k, u, m] of o.g)
      if (s == a) {
        this.gitar(t, k, u * ON6, !!m);
        if (!o.b) this.basNota(t, k - 12, (m ? 0.6 : u) * ON6);
      }
    if (o.b) for (const [s, k, u] of o.b) if (s == a) this.basNota(t, k - 12, u * ON6);
    if (o.l) for (const [s, k, u] of o.l) if (s == a) this.soloNota(t, k, u * ON6, s == 0);
  }

  // ---------- çalgılar

  private gitar(t: number, kok: number, sure: number, susturma: boolean) {
    const c = this.ctx;
    this.gitarG.forEach((giris, yan) => {
      const t0 = t + yan * 0.011,
        g = c.createGain(),
        f = c.createBiquadFilter(),
        son = t0 + sure + (susturma ? 0.02 : 0.08);
      f.type = "lowpass";
      f.frequency.value = susturma ? 900 : 3800;
      f.Q.value = 0.7;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.4, t0 + 0.004);
      if (susturma) g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.11);
      else g.gain.setValueAtTime(0.38, t0 + Math.max(0.01, sure - 0.03));
      g.gain.linearRampToValueAtTime(0, son);
      g.connect(f).connect(giris);
      for (const [ar, dt, a] of [
        [0, -6 + yan * 9, 1],
        [7, 4 - yan * 7, 0.8],
        [12, 2 + yan * 5, 0.5],
      ]) {
        const o = c.createOscillator(),
          og = c.createGain();
        o.type = "sawtooth";
        o.frequency.value = frek(kok + ar);
        o.detune.value = dt;
        og.gain.value = a;
        o.connect(og).connect(g);
        o.start(t0);
        o.stop(son + 0.02);
      }
    });
  }

  private basNota(t: number, nota: number, sure: number) {
    const c = this.ctx,
      o = c.createOscillator(),
      s = c.createOscillator(),
      f = c.createBiquadFilter(),
      g = c.createGain(),
      son = t + sure + 0.04;
    o.type = "sawtooth";
    s.type = "sine";
    o.frequency.value = s.frequency.value = frek(nota);
    f.type = "lowpass";
    f.Q.value = 2;
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(380, t + 0.12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.006);
    g.gain.setValueAtTime(0.7, t + Math.max(0.01, sure - 0.02));
    g.gain.linearRampToValueAtTime(0, son);
    o.connect(f);
    const sg = c.createGain();
    sg.gain.value = 0.35;
    s.connect(sg).connect(g);
    f.connect(g).connect(this.bas);
    for (const x of [o, s]) {
      x.start(t);
      x.stop(son + 0.02);
    }
  }

  private soloNota(t: number, nota: number, sure: number, bukme: boolean) {
    const c = this.ctx,
      g = c.createGain(),
      lfo = c.createOscillator(),
      lg = c.createGain(),
      son = t + sure + 0.12;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.01);
    g.gain.setValueAtTime(0.45, t + Math.max(0.02, sure - 0.02));
    g.gain.linearRampToValueAtTime(0, son);
    g.connect(this.solo);
    // titreşim (vibrato) uzun notalarda yavaşça girer
    lfo.frequency.value = 5.6;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(sure > 0.35 ? 22 : 6, t + Math.min(sure, 0.4));
    lfo.connect(lg);
    lfo.start(t);
    lfo.stop(son + 0.02);
    for (const [tip, dt, a, ok] of [
      ["sawtooth", -5, 0.6, 0],
      ["sawtooth", 6, 0.6, 0],
      ["square", 0, 0.25, -12],
    ] as [OscillatorType, number, number, number][]) {
      const o = c.createOscillator(),
        og = c.createGain();
      o.type = tip;
      o.frequency.value = frek(nota + ok);
      // ilk notaya alttan bükerek gir
      if (bukme) {
        o.detune.setValueAtTime(dt - 200, t);
        o.detune.linearRampToValueAtTime(dt, t + 0.07);
      } else o.detune.value = dt;
      lg.connect(o.detune);
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(son + 0.02);
    }
  }

  private kick(t: number) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.08);
    g.gain.setValueAtTime(0.75, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g).connect(this.davul);
    o.start(t);
    o.stop(t + 0.45);
    this.gurultuVur(t, "highpass", 3000, 0.7, 0.25, 0.006);
  }

  private trampet(t: number, s: number) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(165, t + 0.08);
    g.gain.setValueAtTime(0.55 * s, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.davul);
    o.start(t);
    o.stop(t + 0.14);
    this.gurultuVur(t, "bandpass", 2600, 0.5, 0.75 * s, 0.17, 0.35);
  }

  private hihat(t: number, s: number, sure: number) {
    this.gurultuVur(t, "highpass", 7500, 0.8, s, sure);
  }

  private zil(t: number) {
    this.gurultuVur(t, "highpass", 4200, 0.6, 0.32, 1.6, 0.4);
    this.gurultuVur(t, "bandpass", 6500, 1.5, 0.12, 0.9);
  }

  private tom(t: number, f: number) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(f * 1.4, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.davul);
    o.start(t);
    o.stop(t + 0.32);
    this.gurultuVur(t, "bandpass", f * 6, 1, 0.15, 0.05);
  }

  /** bölüm sonu dolgusu: üç tipten biri (trampet dizisi, tomlar, ikisi karışık) */
  private dolgu(a: number, t: number) {
    const i = a - 8,
      tip = this.dolguTipi;
    if (tip == 0) {
      this.trampet(t, 0.45 + i * 0.08);
      if (i % 4 == 0) this.kick(t);
    } else if (tip == 1) {
      if (i < 4) this.trampet(t, 0.6 + i * 0.1);
      else this.tom(t, [210, 210, 150, 150][i - 4] ?? 110);
      if (i >= 6) this.tom(t, 100);
    } else {
      if (i % 2 == 0) this.kick(t);
      if (i < 3 || i == 4) this.trampet(t, 0.8);
      else this.tom(t, [220, 170, 130, 100, 85][i - 3] ?? 90);
    }
  }

  private gurultuVur(
    t: number,
    tip: BiquadFilterType,
    f: number,
    q: number,
    k: number,
    sure: number,
    yanki = 0,
  ) {
    const c = this.ctx,
      s = c.createBufferSource(),
      fl = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.gurultu;
    fl.type = tip;
    fl.frequency.value = f;
    fl.Q.value = q;
    g.gain.setValueAtTime(k, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    s.connect(fl).connect(g).connect(this.davul);
    if (yanki) {
      const y = c.createGain();
      y.gain.value = yanki;
      g.connect(y).connect(this.yanki);
    }
    s.start(t, Math.random() * 1.5);
    s.stop(t + sure + 0.02);
  }
}
