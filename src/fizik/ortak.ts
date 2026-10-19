// İki fizik modelinin (klasik ve yeni) ortak sürüş mantığı: zemin izleri (çamur, ıslaklık), direksiyon ve gaz
// süzgeci, drift penceresi (DR), drift göstergesi ve puanı (D), toz ve duman. Kullanıcı kararları burada:
// drift modu yalnız bilinçli driftte açılır (açı eşiği + gaz + 0,25 sn), abartan spin atar.
import { cl } from "../cekirdek/matematik";
import type { AracDurumu, FizikBaglami, FizikGirdisi } from "./tipler";
import { DRIFT_ONAYARLARI } from "./veriler";
import type { SimDurumu } from "./klasik";

/** çamur: içindeyken %100, dışarıda hızla orantılı temizlenir; ıslaklık 2,5 sn'de kurur */
export function zeminIzleri(S: AracDurumu, si: number, dt: number) {
  if (si == 3) S.mud = 1;
  else S.mud = Math.max(0, S.mud - (dt * Math.hypot(S.vx, S.vz)) / (si == 1 ? 120 : 200));
  S.wet = Math.max(0, S.wet - dt / 2.5);
}

/** direksiyon ve gaz süzgeci: tuşta kademeli, analogda hassasiyete bağlı */
export function direksiyonVeGaz(sim: SimDurumu, gi: FizikGirdisi, cx: FizikBaglami, dt: number) {
  const K = cx.kurulum,
    tu = K.tu,
    tg = gi.tg,
    rate = gi.analogDireksiyon ? 14 * tu.sens : tg == 0 ? 10 : K.sm ? 6.5 * tu.sens : 30;
  sim.st += (tg - sim.st) * Math.min(1, rate * dt);
  sim.S.gas += (+gi.g - sim.S.gas) * Math.min(1, dt * (2 + 18 * tu.thr));
}

/** drift açısının en büyük güvenli değeri: hız arttıkça daralır */
export const driftSiniri = (v: number) => 0.9 - 0.35 * cl((v - 10) / 45, 0, 1);

/**
 * drift penceresi: açı pencere içinde kaldıkça drift sürer; çok düşerse araç düzelir, abartılırsa spin.
 * v: hız, be: kayma açısı (işaretli), ab: |be|, bmax: driftSiniri(v)
 */
export function driftPenceresi(
  sim: SimDurumu,
  gi: FizikGirdisi,
  cx: FizikBaglami,
  v: number,
  be: number,
  ab: number,
  bmax: number,
  dt: number,
) {
  const { S, DR } = sim,
    K = cx.kurulum,
    as = K.as,
    st = sim.st;
  if (DR.cool > 0) DR.cool -= dt;
  if (!S.air) {
    if (!DR.on && DR.cool <= 0) {
      const full = Math.abs(st) > (gi.g > 0.5 ? 0.6 : 0.7);
      DR.hold = full && v > 11 ? DR.hold + dt : 0;
      const dth = DRIFT_ONAYARLARI.includes(K.pk) ? 0.35 : 0.55;
      DR.nc = ab > dth && gi.g > 0.5 && v > 11 ? (DR.nc || 0) + dt : 0;
      if (as.dft > 0 && DR.nc > 0.25) {
        DR.on = 1;
        DR.dir = -Math.sign(be);
        DR.bt = Math.min(ab, bmax);
      } else if (as.ini > 0 && full && ((v > 13 && DR.hold > 0.15) || (as.ini >= 0.8 && v > 11 && gi.b))) {
        DR.on = 1;
        DR.dir = Math.sign(st);
        DR.bt = 0.35;
      }
      if (DR.on) DR.t = 0;
    } else if (DR.on) {
      DR.t += dt;
      const into = st * DR.dir,
        gz = Math.min(1, +gi.g);
      const hd = 1.6 - as.dft; // destek azaldıkça açı daha hızlı büyür: denge oyuncuya kalır
      if (into > 0.3) DR.bt += (0.5 + 0.3 * gz) * hd * into * dt;
      else if (into < -0.3) DR.bt += 0.9 * into * dt;
      else DR.bt += (gz > 0.5 ? 0.12 * hd : -0.2) * dt;
      if (gz < 0.2) DR.bt -= 0.5 * dt;
      DR.bt = Math.min(DR.bt, bmax + 0.9);
      if (ab > bmax + 0.6) {
        DR.on = 0;
        DR.cool = 1.2;
        cx.olay.spin();
      } else if (DR.bt < 0.1 || v < 6 || (ab < 0.07 && DR.t > 0.5)) DR.on = 0;
    }
  }
  DR.k += ((DR.on ? 1 : 0) - DR.k) * Math.min(1, dt * (DR.on ? 7 : 3));
}

/** drift göstergesi ve puanı; döndürdüğü değer: araç drift ediyor mu */
export function driftSkoru(sim: SimDurumu, v: number, vl: number, vt: number, dt: number): boolean {
  const { S, DR, D } = sim;
  const beta = Math.atan2(vt, Math.max(Math.abs(vl), 1)),
    dri = !S.air && v > 10 && (!!DR.on || Math.abs(beta) > 0.5);
  D.beta = beta;
  D.act = dri ? 1 : 0;
  if (dri) {
    D.t += dt;
    D.gap = 0;
    D.score += v * Math.abs(beta) * dt * 4;
  } else {
    D.gap += dt;
    if (D.gap > 0.6) {
      D.t = 0;
      D.score = 0;
    }
  }
  return dri;
}

/** zemin rengi: toz ve duman parçacıkları için */
export const zeminRengi = (si: number) =>
  si >= 4 ? 0xf2f6f8 : si == 3 ? 0x4a3524 : si == 1 ? 0xe6e6e6 : si == 2 ? 0x9a8f6a : 0xbfa07a;

/** lastik dumanı (kayarken) ve toz (gevşek zeminde) arka tekerlerden */
export function tozVeDuman(sim: SimDurumu, cx: FizikBaglami, si: number, v: number, duman: boolean) {
  const S = sim.S,
    grng = cx.gorselRng;
  const dust = !S.air && (si == 0 || si == 3 || si >= 4) && v > 6;
  if ((duman || dust) && grng() < 0.85) {
    const col = zeminRengi(si),
      fx = Math.sin(S.h),
      fz = Math.cos(S.h);
    for (const s2 of [-0.9, 0.9]) {
      if (grng() < 0.6)
        cx.olay.puf(
          S.x - fx * 1.6 + Math.cos(S.h) * s2,
          S.y,
          S.z - fz * 1.6 - Math.sin(S.h) * s2,
          S.vx,
          S.vz,
          col,
        );
    }
  }
}
