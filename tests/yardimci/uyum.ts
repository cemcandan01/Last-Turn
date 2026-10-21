// Araç ve yarış türü uyumu (test ve ölçüm ortak): otomatik pilotla tur süresi, drag süresi ve drift puanı.
// Her araç kendi önayarıyla sürülür (yarıştaki gibi). Pilot cesaret aralığında hatasız en iyi süreyi arar.
import { cl } from "../../src/cekirdek/matematik";
import { ipucu, nearest } from "../../src/dunya/pist";
import { DRIFT_PILOT, driftTuru } from "./drift-pilot";
import { egrilik, pilot } from "./pilot";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

/** bir tur (açık pistte A'dan B'ye): süre, pist dışında geçen süre, spin sayısı */
export function turSur(yaris: number, arac: number, cesaret: number, lk: "real" | "norm" | "arc" = "norm") {
  const s = surucuKur({ yaris, arac, lk });
  const TR = s.bolge!.TR!,
    i0 = TR.open ? 4 : TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const K = egrilik(TR),
    pl = pilot(TR, K, cesaret),
    S = s.sim.S;
  let t = 0,
    armed = 0,
    prev = ipucu.ti,
    disari = 0,
    spin = 0,
    sp = false;
  const sinir = TR.open ? 200 : 300;
  while (t < sinir) {
    s.adim(pl(S));
    t += DT;
    const ti = ipucu.ti,
      N = TR.N,
      dd = nearest(TR, S.x, S.z, ti)[1];
    if (dd > TR.hw + 2.5) disari += DT;
    // pistte kalamayan araç: daha fazla sürmeye gerek yok
    if (disari > 10) return { t: Infinity, disari, spin };
    const ab = Math.abs(s.sim.d.D.beta);
    if (ab > 1.3 && !sp) {
      spin++;
      sp = true;
    }
    if (ab < 0.4) sp = false;
    if (TR.open) {
      if (ti > N * 0.5) armed = 1;
      if (armed && ti >= N - 4) return { t, disari, spin };
    } else {
      if (ti > N * 0.4 && ti < N * 0.6) armed = 1;
      if (prev > N * 0.8 && ti < N * 0.2 && armed) return { t, disari, spin };
    }
    prev = ti;
  }
  return { t: Infinity, disari, spin };
}

/** araç sınırında en iyi tur aranırken denenen cesaretler (pilot cesarete göre düzensiz: sık ve geniş tarama) */
export const CESARETLER = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];

/**
 * aracın sınırında en iyi tur: pist dışında 3 sn'den az ve spinsiz turların en hızlısı. Pilot virajı cesarete göre
 * alır; tutuşu çok olan araç daha yüksek cesaretle pistte kalır, böylece tutuş farkı süreye yansır.
 */
export function enIyiTur(yaris: number, arac: number, cesaretler = CESARETLER) {
  let en = Infinity,
    enC = 0;
  for (const c of cesaretler) {
    const r = turSur(yaris, arac, c);
    if (r.spin == 0 && r.disari < 3 && r.t < en) {
      en = r.t;
      enC = c;
    }
  }
  return { t: en, cesaret: enC };
}

/** drag: ışıkta tam gaz, bitiş süresi (sn) */
export function dragSur(yaris: number, arac: number) {
  const s = surucuKur({ yaris, arac, lk: "norm" });
  const TR = s.bolge!.TR!,
    S = s.sim.S,
    z1 = TR.P[TR.N - 1][1];
  s.reset(TR.P[0][0], TR.P[0][1], 0);
  for (let k = 0; k < 60 / DT; k++) {
    s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
    if (S.z >= z1) return k * DT;
  }
  return Infinity;
}

/** drift yarışı: 90 sn'lik puan (drift pilotu, oyundaki puan kuralları) */
export function driftPuani(yaris: number, arac: number) {
  return driftTuru(yaris, "norm", DRIFT_PILOT, 90, false, arac).puan;
}

/**
 * yol tutuşu: düz zeminde (zemin: SURF indeksi; tur: hangi yarış türünün pistinde, uzmanlık için) R yarıçaplı daireyi
 * izlerken hız yavaşça artar
 * (0,4 m/s/sn). Daireden 3 m'den fazla açılınca ya da spin atınca biter. Sonuç, dairede kalırken 1 sn boyunca
 * sürdürülen en yüksek yanal ivme (m/s²; oyunda yerçekimi 24). Gerçekçi seviye (yardım yok), aracın kendi önayarı.
 */
export function virajTutusu(arac: number, zemin: number, tur: string | null = null, R = 35) {
  const s = surucuKur({ dunya: 1, arac, lk: "real" });
  const W = s.cx.dunya,
    h0 = W.H(30, -3550),
    cx = 30 + R,
    cz = -3700;
  W.H = () => h0;
  W.surf = () => zemin;
  W.yakin = () => [];
  W.yolTuru = () => tur;
  W.kutu = () => [-1e5, 1e5, -1e5, 1e5];
  // dairenin batı noktasından kuzeye (+z) başla: daire sola döner
  s.reset(30, cz, 0);
  const S = s.sim.S,
    son: number[] = [];
  let en = 0,
    psi0 = 0;
  for (let k = 0; k < 120 * 60; k++) {
    const a = Math.atan2(S.z - cz, S.x - cx) - 9 / R,
      tx = cx + R * Math.cos(a),
      tz = cz + R * Math.sin(a);
    let e = Math.atan2(tx - S.x, tz - S.z) - S.h;
    e = Math.atan2(Math.sin(e), Math.cos(e));
    const vv = Math.hypot(S.vx, S.vz),
      hz = 6 + Math.max(0, k / 60 - 4) * 0.4;
    s.adim({
      tg: cl(e * 3, -1, 1),
      g: cl((hz - vv) * 0.5 + 0.3, 0, 1),
      b: vv > hz + 1 ? cl((vv - hz) * 0.3, 0, 1) : 0,
      analogDireksiyon: true,
      analogGaz: true,
    });
    // yanal ivme: hız × hız yönünün dönüş hızı
    const psi = Math.atan2(S.vx, S.vz);
    let dpsi = psi - psi0;
    dpsi = Math.atan2(Math.sin(dpsi), Math.cos(dpsi));
    psi0 = psi;
    son.push(Math.abs(vv * dpsi * 60));
    if (son.length > 60) son.shift();
    if (k < 6 * 60) continue;
    if (Math.abs(Math.hypot(S.x - cx, S.z - cz) - R) > 3 || Math.abs(s.sim.d.D.beta) > 1.2) break;
    en = Math.max(en, son.reduce((p, q) => p + q, 0) / son.length);
  }
  return en;
}
