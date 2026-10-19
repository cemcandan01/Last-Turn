// Simülasyon: araç fiziğini sabit adımla ilerletir. Çizim kare hızından bağımsızdır; ekran 30, 60 ya da 120 Hz
// olsun, aynı girişler aynı sonucu verir (tekrar izleme, hayalet araç, testler). Çizim iki adım arasını ara değerle bulur.
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";
import { klasikAdim, type AdimSonucu, type SimDurumu } from "./klasik";
import type { AracDurumu, FizikBaglami, FizikGirdisi } from "./tipler";

/** sabit fizik adımı (sn): klasik model bu adımı içeride 8'e böler (480 Hz) */
export const ADIM = 1 / 60;

export type FizikMotoru = "klasik";

/** çizim için ara değer alınan alanlar */
export interface Poz {
  x: number;
  y: number;
  z: number;
  h: number;
}

export function yeniAracDurumu(x = 0, z = 0, h = 0, y = 0): AracDurumu {
  return {
    x,
    z,
    y,
    vy: 0,
    h,
    vx: 0,
    vz: 0,
    w: 0,
    axs: 0,
    air: false,
    mud: 0,
    gas: 0,
    wet: 0,
    hit: -9,
    kerb: 0,
    spin: 0,
  };
}

export class Simulasyon {
  d: SimDurumu = {
    S: yeniAracDurumu(),
    DR: { on: 0, dir: 1, hold: 0, bt: 0, t: 0, k: 0, cool: 0, nc: 0 },
    D: { act: 0, t: 0, score: 0, gap: 0, beta: 0 },
    st: 0,
    delta: 0,
    zaman: 0,
  };
  /** önceki adımın konumu (ara değer için) */
  onceki: Poz = { x: 0, y: 0, z: 0, h: 0 };
  motor: FizikMotoru = "klasik";
  /** fizik içi rastgelelik: tohumlu */
  rng: Rastgele;

  constructor(tohum = 1) {
    this.rng = mulberry32(tohum);
  }

  get S() {
    return this.d.S;
  }

  /** aracı (x, z) noktasına h yönüyle koy; hız ve drift durumu sıfırlanır */
  sifirla(x: number, z: number, h: number, y: number) {
    const d = this.d;
    Object.assign(d.S, yeniAracDurumu(x, z, h, y));
    delete d.S.pv;
    d.st = 0;
    d.D.act = d.D.t = d.D.score = 0;
    d.DR.on = d.DR.k = 0;
    d.DR.cool = 0;
    this.pozKaydet();
  }

  /** şimdiki konumu ara değerin başlangıcı yap (ışınlanma, sıfırlama) */
  pozKaydet() {
    const S = this.d.S;
    this.onceki.x = S.x;
    this.onceki.y = S.y;
    this.onceki.z = S.z;
    this.onceki.h = S.h;
  }

  /** bir sabit adım */
  adim(gi: FizikGirdisi, cx: FizikBaglami): AdimSonucu {
    this.pozKaydet();
    const r = klasikAdim(this.d, gi, cx, ADIM);
    this.d.zaman += ADIM;
    return r;
  }
}
