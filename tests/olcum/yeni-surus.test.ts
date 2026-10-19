// Ölçüm: yeni fizikte otomatik pilot (spin, ilerleme) ve drift dengesi; klasikle karşılaştırma
import { it } from "vitest";
import { cl } from "../../src/cekirdek/matematik";
import { ipucu } from "../../src/dunya/pist";
import { surucuKur } from "../yardimci/surucu";

const DT = 1 / 60;
for (const motor of ["klasik", "yeni"] as const)
  it(motor, () => {
    for (const [yaris, arac, ad] of [
      [0, 0, "Grand Prix"],
      [9, 3, "Orman Etabı"],
      [3, 1, "Çamur Vadisi"],
    ] as const) {
      const s = surucuKur({ yaris, arac, lk: "real", motor });
      const TR = s.bolge!.TR!,
        rally = TR.open,
        i0 = rally ? 4 : TR.N - 6,
        P = TR.P[i0 % TR.N];
      s.reset(P[0], P[1], Math.atan2(TR.T[i0 % TR.N][0], TR.T[i0 % TR.N][1]));
      let spin = 0,
        sp = false,
        maxB = 0;
      for (let k = 0; k < 15 / DT; k++) {
        const S = s.sim.S,
          ti = ipucu.ti,
          q = TR.P[TR.open ? Math.min(ti + 7, TR.N - 1) : (ti + 7) % TR.N];
        let a = Math.atan2(q[0] - S.x, q[1] - S.z) - S.h;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        const v = Math.hypot(S.vx, S.vz);
        s.adim({
          tg: (a > 0.06 ? 1 : 0) - (a < -0.06 ? 1 : 0),
          g: v < (rally ? 16 : 24) ? 1 : 0,
          b: v > (rally ? 20 : 30) ? 1 : 0,
          analogDireksiyon: false,
          analogGaz: false,
        });
        const ab = Math.abs(s.sim.d.D.beta);
        maxB = Math.max(maxB, ab);
        if (ab > 1.3 && !sp) {
          spin++;
          sp = true;
        }
        if (ab < 0.4) sp = false;
      }
      console.log(
        `${motor} ${ad}: spin ${spin}, ilerleme %${((100 * ipucu.ti) / TR.N).toFixed(0)}, en büyük kayma ${(maxB * 57.3).toFixed(0)}°`,
      );
    }
    for (const [lk, st] of [
      ["real", "usta"],
      ["real", "abartan"],
      ["arc", "usta"],
      ["norm", "usta"],
    ] as const) {
      const s = surucuKur({ dunya: 1, arac: 2, pk: "dr", lk, motor });
      s.reset(30, -3550, 0);
      const DR = s.sim.d.DR,
        D = s.sim.d.D;
      let ph = 0,
        act = 0,
        n = 0,
        sp = 0,
        c = 0;
      const surus = (sn: number) => {
        for (let k = 0; k < sn / DT; k++) {
          let sa = 0;
          if (ph == 1) {
            sa = 1;
            if (DR.on) ph = 2;
          } else if (ph == 2) {
            if (DR.cool > 1.15 && !c) {
              sp++;
              c = 1;
            }
            if (DR.cool < 1) c = 0;
            const be = Math.abs(D.beta);
            sa = st == "usta" ? DR.dir * cl(2.2 * (0.55 - be), -1, 1) : DR.dir;
            n++;
            if (D.act) act++;
          }
          s.adim({ tg: sa, g: 1, b: 0, analogDireksiyon: true, analogGaz: false });
        }
      };
      surus(3);
      ph = 1;
      surus(6);
      console.log(
        `${motor} drift ${lk}/${st}: driftte %${Math.round((100 * act) / Math.max(n, 1))}, spin ${sp}, faz ${ph}`,
      );
    }
  });
