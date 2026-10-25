// Sürüş denemeleri (test ve ölçüm ortak): sanal düz zeminde tam direksiyon, pistte frensiz tam gaz
import { ipucu, nearest } from "../../src/dunya/pist";
import type { OnayarAnahtari, SeviyeAnahtari } from "../../src/fizik/veriler";
import { egrilik, pilot } from "./pilot";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

/**
 * sanal düz zeminde (zemin: SURF indeksi) hiz m/s'ye çık, sonra sn boyunca tam sol direksiyon ve gaz (g).
 * Döndürür: başlangıç ve bitiş hızı, en büyük kayma açısı, spin
 */
export function duzZemin(
  arac: number,
  lk: SeviyeAnahtari,
  hiz: number,
  o: {
    sn?: number;
    zemin?: number;
    g?: number;
    pk?: OnayarAnahtari;
    izle?: (t: number) => void;
    parca?: readonly string[];
  } = {},
) {
  const s = surucuKur({ dunya: 1, arac, lk, pk: o.pk, parca: o.parca });
  const W = s.cx.dunya,
    h0 = W.H(30, -3550),
    zemin = o.zemin ?? 0,
    g = o.g ?? 1;
  W.H = () => h0;
  W.surf = () => zemin;
  W.yakin = () => [];
  s.reset(30, -3700, 0);
  const S = s.sim.S;
  for (let k = 0; k < 20 / DT && Math.hypot(S.vx, S.vz) < hiz; k++)
    s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
  const v0 = Math.hypot(S.vx, S.vz);
  let bMax = 0,
    aMax = 0,
    spin = 0;
  for (let k = 0; k < (o.sn ?? 3) / DT; k++) {
    s.adim({ tg: 1, g, b: 0, analogDireksiyon: false, analogGaz: g < 1 });
    const b = Math.abs(s.sim.d.D.beta);
    bMax = Math.max(bMax, b);
    for (const t of s.sim.yeni?.tk ?? []) aMax = Math.max(aMax, Math.abs(Math.atan(t.tanA)));
    if (b > 1.3) spin = 1;
    o.izle?.(k * DT);
  }
  return { v0, v1: Math.hypot(S.vx, S.vz), bMax, aMax, spin: spin || s.olaylar.spin, s };
}

/** pistte otomatik pilotla ısın, sonra 2,5 sn tam direksiyon + tam gaz */
export function tamKirik(yaris: number, arac: number, lk: SeviyeAnahtari, sn = 6) {
  const s = surucuKur({ yaris, arac, lk });
  const TR = s.bolge!.TR!,
    i0 = TR.open ? 4 : TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const pl = pilot(TR, egrilik(TR), 0.9),
    S = s.sim.S;
  for (let k = 0; k < sn / DT; k++) s.adim(pl(S));
  const v0 = Math.hypot(S.vx, S.vz);
  let bMax = 0,
    spin = 0;
  const sp0 = s.olaylar.spin;
  for (let k = 0; k < 2.5 / DT; k++) {
    s.adim({ tg: 1, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
    bMax = Math.max(bMax, Math.abs(s.sim.d.D.beta));
    if (Math.abs(s.sim.d.D.beta) > 1.3) spin = 1;
  }
  return { v0, v1: Math.hypot(S.vx, S.vz), bMax, spin: spin || s.olaylar.spin - sp0 };
}

/** otomatik pilot direksiyonuyla, hiç fren yapmadan tam gaz bir tur (ralli: etap) */
export function frensiz(
  yaris: number,
  arac: number,
  lk: SeviyeAnahtari,
  sinir = 120,
  parca: readonly string[] = [],
) {
  const s = surucuKur({ yaris, arac, lk, parca });
  const TR = s.bolge!.TR!,
    i0 = TR.open ? 4 : TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const pl = pilot(TR, egrilik(TR), 0.9),
    S = s.sim.S;
  let t = 0,
    disari = 0,
    spin = 0,
    sp = false,
    armed = 0,
    prev = ipucu.ti;
  while (t < sinir) {
    const gi = pl(S);
    gi.g = 1;
    gi.b = 0;
    gi.analogGaz = false;
    s.adim(gi);
    t += DT;
    const ti = ipucu.ti,
      N = TR.N;
    if (nearest(TR, S.x, S.z, ti)[1] > TR.hw + 2.5) disari += DT;
    const ab = Math.abs(s.sim.d.D.beta);
    if (ab > 1.3 && !sp) {
      spin++;
      sp = true;
    }
    if (ab < 0.4) sp = false;
    if (TR.open) {
      if (ti > N * 0.5) armed = 1;
      if (armed && ti >= N - 4) break;
    } else {
      if (ti > N * 0.4 && ti < N * 0.6) armed = 1;
      if (prev > N * 0.8 && ti < N * 0.2 && armed) break;
    }
    prev = ti;
  }
  return { t, disari, spin };
}

/**
 * sanal düz asfaltta v m/s'de st direksiyonla 1 sn az gazla viraja gir, sonra 1,5 sn tam gaz: en büyük kayma açısı
 * (derece). Gazla arkayı kaydırma (diferansiyel, güç) ölçüsü. Gerçekçi seviye
 */
export function gazlaKaydir(arac: number, parca: readonly string[], v: number, st: number) {
  const s = surucuKur({ dunya: 1, arac, lk: "real", parca });
  const W = s.cx.dunya,
    h0 = W.H(30, -3550);
  W.H = () => h0;
  W.surf = () => 1;
  W.yakin = () => [];
  s.reset(30, -3700, 0);
  const S = s.sim.S;
  for (let k = 0; k < 20 / DT && Math.hypot(S.vx, S.vz) < v; k++)
    s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: true, analogGaz: true });
  for (let k = 0; k < 1 / DT; k++) s.adim({ tg: st, g: 0.25, b: 0, analogDireksiyon: true, analogGaz: true });
  let b = 0,
    dlt = 0;
  for (let k = 0; k < 1.5 / DT; k++) {
    s.adim({ tg: st, g: 1, b: 0, analogDireksiyon: true, analogGaz: true });
    b = Math.max(b, Math.abs(s.sim.d.D.beta));
    dlt = Math.max(dlt, Math.abs(s.sim.d.delta));
  }
  return { kayma: b * 57.3, delta: dlt };
}
