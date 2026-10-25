// Drifte giriş denemesi (test için): otoparkın açık alanında ya da drift pistinin başlangıç düzlüğünde düz
// hızlan, sonra tam direksiyon + tam gazla 1 sn tutunarak dön; ardından gaz ve direksiyon basılıyken debriyaja
// 0,3 sn basılıp bırakılır (debriyaj vuruşu). Karşılaştırma: aynısı debriyajsız.
import type { FizikGirdisi } from "../../src/fizik/tipler";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { PARK } from "../../src/dunya/bolgeler";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

export interface DriftGirisi {
  /** en büyük kayma açısı (derece) */
  aci: number;
  /** arka tekerlerin en büyük boylamsal kayması (oran) */
  patinaj: number;
  /** drift modu açıldı mı */
  drift: boolean;
  /** drift sayılan süre (sn; puan alan kayma) */
  driftSure: number;
  spin: number;
}

export function driftGirisi(
  arac: number,
  lk: SeviyeAnahtari,
  hiz: number,
  debriyaj: boolean,
  yaris?: number,
): DriftGirisi {
  const s = yaris == null ? surucuKur({ dunya: 1, arac, lk }) : surucuKur({ yaris, arac, lk });
  if (yaris == null) {
    const [, x, z, h] = PARK.tele![0];
    s.reset(x, z, h);
  } else {
    const TR = s.bolge!.TR!,
      i0 = TR.N - 6;
    s.reset(TR.P[i0][0], TR.P[i0][1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  }
  const gi = (tg: number, g: number, dbr = false): FizikGirdisi => ({
    tg,
    g,
    b: 0,
    analogDireksiyon: false,
    analogGaz: false,
    dbr,
  });
  // düz hızlan (en fazla 15 sn), sonra 1 sn tam gaz + tam direksiyonla tutunarak dön
  for (let t = 0; t < 15 && Math.hypot(s.sim.S.vx, s.sim.S.vz) < hiz; t += DT) s.adim(gi(0, 1));
  for (let t = 0; t < 1; t += DT) s.adim(gi(1, 1));
  let aci = 0,
    patinaj = 0,
    drift = false,
    driftSure = 0;
  // ölçüm: gaz ve direksiyon basılı kalır; debriyajlı denemede ilk 0,3 sn debriyaj basılı
  for (let t = 0; t < 2; t += DT) {
    s.adim(gi(1, 1, debriyaj && t < 0.3));
    const S = s.sim.S,
      Y = s.sim.yeni!,
      v = Math.hypot(S.vx, S.vz);
    if (v > 3) {
      const vl = S.vx * Math.sin(S.h) + S.vz * Math.cos(S.h),
        vt = S.vx * Math.cos(S.h) - S.vz * Math.sin(S.h);
      aci = Math.max(aci, (Math.abs(Math.atan2(vt, Math.max(vl, 0.5))) * 180) / Math.PI);
    }
    patinaj = Math.max(patinaj, Math.abs(Y.tk[2].kap), Math.abs(Y.tk[3].kap));
    drift ||= s.sim.d.DR.on > 0;
    if (s.sim.d.D.act) driftSure += DT;
  }
  return { aci, patinaj, drift, driftSure, spin: s.olaylar.spin };
}
