// Drift pilotu (test için): pisti izlerken aracı driftte tutar. Ön tekerleri gitmek istediği yöne (hız yönü +
// pist düzeltmesi) çevirir: driftte bu kendiliğinden karşı direksiyondur. Gaz kayma açısını hedefte tutar.
// Drift yarışının puan kuralları da burada (oyundaki evTick ile aynı): kombo çime çıkınca, çarpınca ya da
// spin atınca yanar; 0,8 sn drift yoksa bankaya geçer.
import { ad, cl } from "../../src/cekirdek/matematik";
import { ipucu, type Pist } from "../../src/dunya/pist";
import type { AracDurumu, FizikGirdisi, SimDurumu } from "../../src/fizik/tipler";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { bosDriftSayaci, driftAdimi, driftBankala, type DriftSayaci } from "../../src/oyun/yaris-kurallari";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

export interface DriftPilotAyari {
  /** hedef kayma açısı (rad) */
  aci: number;
  /** bakış uzaklığı: sabit (m) + hız çarpanı (sn) */
  bak: number;
  bakV: number;
  /** yön değiştirme eşiği: gereken ters eğrilik (1/m) */
  esik: number;
  /** temel gaz ve yol düzeltme kazancı (eğrilik farkı başına gaz) */
  gaz: number;
  kazanc: number;
}

export const DRIFT_PILOT: DriftPilotAyari = {
  aci: 0.45,
  bak: 8,
  bakV: 0.7,
  esik: 0.01,
  gaz: 0.75,
  kazanc: 40,
};

/** pistte i noktasından mesafe kadar ilerideki nokta */
function ileri(TR: Pist, i: number, mesafe: number) {
  const g = (j: number) => (TR.open ? cl(j, 0, TR.N - 1) : (j + TR.N) % TR.N);
  let j = i,
    d = 0;
  while (d < mesafe && (TR.open ? j < TR.N - 1 : d < TR.len)) {
    const k = g(j + 1);
    d += Math.hypot(TR.P[k][0] - TR.P[g(j)][0], TR.P[k][1] - TR.P[g(j)][1]);
    j = k;
  }
  return g(j);
}

/** pistin işaretli eğriliği (1/m): her nokta için, + bir yöne, − öbür yöne */
export function isaretliEgrilik(TR: Pist): number[] {
  const g = (j: number) => (TR.open ? cl(j, 0, TR.N - 1) : (j + TR.N) % TR.N);
  return TR.P.map((_p, i) => {
    const a = TR.T[g(i - 3)],
      b = TR.T[g(i + 3)],
      d = Math.max(1, Math.abs(TR.S[g(i + 3)] - TR.S[g(i - 3)]));
    return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / d;
  });
}

/**
 * Drift pilotu. Direksiyon kayma açısını hedefte tutar (oyuncunun drift desteğiyle yaptığı gibi: açı azsa içe,
 * çoksa dışa). Gaz çizgiyi belirler: araç gerekenden dar dönüyorsa gaz artar (yarıçap büyür), genişse azalır.
 * Driftte değilken virajın yönüne tam direksiyon + gazla drifte girer; yol başka yöne dönünce karşı tarafa
 * savurur (sarkaç: drift kesilmeden yön değişir).
 */
export function driftPilot(TR: Pist, d: SimDurumu, a: DriftPilotAyari = DRIFT_PILOT) {
  let pvOnce = NaN;
  return (S: AracDurumu): FizikGirdisi => {
    const DR = d.DR,
      v = Math.hypot(S.vx, S.vz),
      pv = Math.atan2(S.vx, S.vz),
      ab = Math.abs(d.D.beta),
      La = a.bak + a.bakV * v,
      q = TR.P[ileri(TR, ipucu.ti, La)],
      e = ad(Math.atan2(q[0] - S.x, q[1] - S.z) - pv),
      // gereken eğrilik (saf takip) ve şimdiki yol eğriliği (hız yönünün dönüşü)
      kGerek = (2 * Math.sin(e)) / La,
      kSimdi = Number.isNaN(pvOnce) ? 0 : ad(pv - pvOnce) / (1 / 60) / Math.max(v, 1);
    pvOnce = pv;
    const yon = Math.sign(kGerek) || 1;
    if (!DR.on || v < 11) {
      // drifte giriş: virajın yönüne tam direksiyon ve gaz (yavaşken ya da düzlükte pisti izle)
      if (v < 14 || Math.abs(kGerek) < 0.004)
        return { tg: cl(e * 3, -1, 1), g: 1, b: 0, analogDireksiyon: true, analogGaz: true };
      return { tg: yon, g: 1, b: 0, analogDireksiyon: true, analogGaz: true };
    }
    // yön değişti: karşı tarafa savur (direksiyon yeni yöne, gaz kes)
    if (DR.dir != yon && Math.abs(kGerek) > a.esik)
      return { tg: yon, g: 0.2, b: 0, analogDireksiyon: true, analogGaz: true };
    const tg = DR.dir * cl(2.2 * (a.aci - ab), -1, 1),
      fark = (kSimdi - kGerek) * DR.dir,
      g = cl(a.gaz + a.kazanc * fark, 0, 1);
    return { tg, g, b: 0, analogDireksiyon: true, analogGaz: true };
  };
}

/** drift yarışı puan kuralları: en uzun kesintisiz kombonun pistte aldığı yol */
export class KomboSayaci {
  combo = 0;
  gap = 0;
  /** komboda pist boyunca alınan yol (m) */
  yol = 0;
  enUzun = 0;
  yanma = 0;
  private onceki = -1;
  constructor(private TR: Pist) {}

  adim(d: SimDurumu, si: number, dt: number) {
    const S = d.S,
      D = d.D,
      ti = ipucu.ti,
      lost = si == 2 || d.zaman - S.hit < 0.05 || Math.abs(D.beta) > 1.4;
    let ds = 0;
    if (this.onceki >= 0) {
      ds = this.TR.S[ti] - this.TR.S[this.onceki];
      if (ds < -this.TR.len / 2) ds += this.TR.len;
      if (ds > this.TR.len / 2) ds -= this.TR.len;
    }
    this.onceki = ti;
    if (this.combo > 0 && lost) {
      this.bitir();
      this.yanma++;
    } else if (D.act && !lost) {
      this.combo += 1;
      this.gap = 0;
      this.yol += ds;
    } else if (this.combo > 0) {
      this.gap += dt;
      this.yol += ds;
      if (this.gap > 0.8) this.bitir();
    }
  }

  bitir() {
    this.enUzun = Math.max(this.enUzun, this.yol);
    this.combo = 0;
    this.gap = 0;
    this.yol = 0;
  }
}

/** drift yarışının puanı (oyundaki evTick ile aynı kural: oyun/yaris-kurallari.ts) */
export class PuanSayaci {
  private E: DriftSayaci = bosDriftSayaci();
  get puan() {
    return this.E.score;
  }
  adim(d: SimDurumu, si: number, v: number, dt: number, ters = false, tg = 0.5) {
    const lost = si == 2 || d.zaman - d.S.hit < 0.05 || Math.abs(d.D.beta) > 1.4;
    driftAdimi(this.E, !!d.D.act, d.D.beta, lost, v, ters, dt, tg, d.zaman);
  }
  bankala() {
    driftBankala(this.E);
  }
}

/**
 * drift yarışını pilotla sür (varsayılan Beyaz Kurt; her araç kendi önayarıyla): en uzun kombo, yanma, spin.
 * tur verilirse oyundaki gibi o kadar tur bitince durur (sn üst sınır olur); tur süresi `sure`
 */
export function driftTuru(
  yaris: number,
  lk: SeviyeAnahtari,
  a: DriftPilotAyari = DRIFT_PILOT,
  sn = 150,
  iz = false,
  arac = 2,
  tur = 0,
) {
  const s = surucuKur({ yaris, arac, lk });
  const TR = s.bolge!.TR!,
    i0 = TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const pl = driftPilot(TR, s.sim.d, a),
    ks = new KomboSayaci(TR),
    ps = new PuanSayaci(),
    S = s.sim.S;
  let yol = 0,
    onceki = ipucu.ti,
    cim = 0,
    armed = 0,
    biten = 0,
    sure = sn;
  for (let k = 0; k < sn / DT; k++) {
    const gi = pl(S);
    const o = s.adim(gi);
    ks.adim(s.sim.d, o.si, DT);
    ps.adim(s.sim.d, o.si, o.v, DT, false, gi.tg);
    let ds = TR.S[ipucu.ti] - TR.S[onceki];
    if (ds < -TR.len / 2) ds += TR.len;
    yol += ds;
    if (o.si == 2) cim += DT;
    if (tur) {
      const N = TR.N,
        ti = ipucu.ti;
      if (ti > N * 0.4 && ti < N * 0.6) armed = 1;
      if (armed && onceki > N * 0.8 && ti < N * 0.2) {
        armed = 0;
        if (++biten >= tur) {
          sure = (k + 1) * DT;
          break;
        }
      }
    }
    onceki = ipucu.ti;
    if (iz && k % 30 == 0)
      console.log(
        `t ${(k * DT).toFixed(1)} s ${TR.S[ipucu.ti].toFixed(0)} v ${(o.v * 3.6).toFixed(0)} beta ${(s.sim.d.D.beta * 57.3).toFixed(0)} DR ${s.sim.d.DR.on} act ${s.sim.d.D.act} tg ${gi.tg.toFixed(2)} g ${gi.g.toFixed(2)} kombo ${ks.yol.toFixed(0)} si ${o.si}`,
      );
  }
  ks.bitir();
  ps.bankala();
  return {
    puan: ps.puan,
    enUzun: ks.enUzun,
    oran: ks.enUzun / TR.len,
    yanma: ks.yanma,
    spin: s.olaylar.spin,
    yol,
    cim,
    len: TR.len,
    sure,
    tur: biten,
  };
}
