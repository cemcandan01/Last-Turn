// El freniyle drifte giriş denemesi (test için): drift pistinin başlangıç düzlüğünde (ya da otoparkta) düz hızlan,
// sonra tam gaz + tam direksiyonla el frenini `sure` sn çek; bırakınca gaz ve karşı direksiyonla açıyı ~35°'de
// tutmaya çalış (2 sn). Karşılaştırma: aynısı el frenisiz (tam gaz + tam direksiyon). Spin: oyunun spin olayı ya da
// 80°'yi aşan kayma.
import { cl } from "../../src/cekirdek/matematik";
import type { FizikGirdisi } from "../../src/fizik/tipler";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { PARK } from "../../src/dunya/bolgeler";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

export interface DriftGirisi {
  /** en büyük kayma açısı (derece) */
  aci: number;
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
  elFreni: boolean,
  yaris?: number,
  sure = 0.4,
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
  const gi = (tg: number, g: number, el = false): FizikGirdisi => ({
    tg,
    g,
    b: 0,
    analogDireksiyon: true,
    analogGaz: true,
    el,
  });
  for (let t = 0; t < 15 && Math.hypot(s.sim.S.vx, s.sim.S.vz) < hiz; t += DT) s.adim(gi(0, 1));
  let aci = 0,
    drift = false,
    asiri = false,
    driftSure = 0;
  for (let t = 0; t < sure + 2; t += DT) {
    const ab = Math.abs(s.sim.d.D.beta);
    // giriş: tam gaz, tam direksiyon (+ el freni); sonra gaz ve açıyı tutan (karşı) direksiyon
    s.adim(t < sure ? gi(1, 1, elFreni) : gi(cl(2.2 * (0.6 - ab), -1, 1), 0.7));
    if (ab > 1.4) asiri = true;
    const S = s.sim.S,
      v = Math.hypot(S.vx, S.vz);
    if (v > 3) {
      const vl = S.vx * Math.sin(S.h) + S.vz * Math.cos(S.h),
        vt = S.vx * Math.cos(S.h) - S.vz * Math.sin(S.h);
      aci = Math.max(aci, (Math.abs(Math.atan2(vt, Math.max(vl, 0.5))) * 180) / Math.PI);
    }
    drift ||= s.sim.d.DR.on > 0;
    if (s.sim.d.D.act) driftSure += DT;
  }
  return { aci, drift, driftSure, spin: s.olaylar.spin + (asiri ? 1 : 0) };
}
