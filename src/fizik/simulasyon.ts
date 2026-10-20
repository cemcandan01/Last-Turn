// Simülasyon: araç fiziğini sabit adımla ilerletir. Çizim kare hızından bağımsızdır; ekran 30, 60 ya da 120 Hz
// olsun, aynı girişler aynı sonucu verir (tekrar izleme, hayalet araç, testler). Çizim iki adım arasını ara değerle bulur.
// Fizik motoru: katı gövde, 4 teker, süspansiyon, lastik modeli, aktarma (yeni/model.ts).
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";
import type { AdimSonucu, AracDurumu, FizikBaglami, FizikGirdisi, SimDurumu } from "./tipler";
import { yeniAdim, yeniBaslat, type YeniDurum } from "./yeni/model";

/** sabit fizik adımı (sn): model bu adımı içeride 8'e böler (480 Hz) */
export const ADIM = 1 / 60;

/** çizim için ara değer alınan alanlar (konum ve gövde yönelimi) */
export interface Poz {
  x: number;
  y: number;
  z: number;
  h: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
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
  onceki: Poz = { x: 0, y: 0, z: 0, h: 0, qx: 0, qy: 0, qz: 0, qw: 1 };
  /** gövde, tekerler ve motorun durumu; sıfırlamadan sonra ilk adımda aracın durumundan kurulur */
  yeni: YeniDurum | null = null;
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
    this.yeni = null;
    this.pozKaydet();
  }

  /** şimdiki konumu ara değerin başlangıcı yap (ışınlanma, sıfırlama) */
  pozKaydet() {
    const S = this.d.S,
      o = this.onceki,
      Y = this.yeni;
    o.x = S.x;
    o.y = S.y;
    o.z = S.z;
    o.h = S.h;
    if (Y) {
      o.qx = Y.qx;
      o.qy = Y.qy;
      o.qz = Y.qz;
      o.qw = Y.qw;
    }
  }

  /** bir sabit adım */
  adim(gi: FizikGirdisi, cx: FizikBaglami): AdimSonucu {
    if (!this.yeni) this.yeni = yeniBaslat(this.d, cx);
    this.pozKaydet();
    const r = yeniAdim(this.d, this.yeni, gi, cx, ADIM);
    this.d.zaman += ADIM;
    return r;
  }
}
