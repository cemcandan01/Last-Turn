// Titreşim ölçümü (test ve ölçüm ortak): araç asfalt pistte otomatik pilotla sürülür, çizimin okuduğu poz
// (S.y, gövde eğimi, yatışı, yönü) 60 Hz'de kaydedilir. Yalnız dört teker asfaltta iken ölçülür (kerb, çim ve
// duvar darbesi gerçek sarsıntıdır). Titreşim, bir adımın komşu iki adımın ortalamasından
// sapmasıdır (s[k] − (s[k−1] + s[k+1]) / 2): düzgün hareket için ~0, adımdan adıma sıçrayan poz için büyük.
import { nearest } from "../../src/dunya/pist";
import { aracFizigi } from "../../src/fizik/yeni/arac-fizigi";
import { egrilik, pilot } from "./pilot";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

export interface TitresimSonucu {
  /** en büyük sıçrama: yükseklik (mm), eğim, yatış, yön (derece) */
  y: number;
  egim: number;
  yatis: number;
  yon: number;
  /** en büyük dikey ivme (m/s²) */
  ay: number;
  /** kerb sarsıntısının açık olduğu adımların oranı; tekerler kerbe değmezken (asfaltta) açık olanların oranı */
  kerb: number;
  yanlisKerb: number;
  /** ölçülen adımların asfaltta geçen oranı (sıçrama ve ivme yalnız asfaltta ölçülür) */
  asfalt: number;
}

export function titresimOlc(yaris: number, arac: number, sn = 25, cesaret = 0.9): TitresimSonucu {
  const s = surucuKur({ yaris, arac, lk: "norm" });
  const TR = s.bolge!.TR!,
    i0 = TR.open ? 2 : TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const F = aracFizigi(s.cx.kurulum.car, s.cx.kurulum),
    pl = pilot(TR, egrilik(TR), cesaret),
    S = s.sim.S,
    R = 180 / Math.PI;
  const iz: number[][] = [];
  let ay = 0,
    vy0 = 0,
    kerb = 0,
    yanlis = 0,
    say = 0;
  for (let k = 0; k < sn / DT; k++) {
    s.adim(pl(S));
    const Y = s.sim.yeni!;
    // gövde ekseni: ileri ve sol vektörlerinin dikey bileşeni (eğim, yatış)
    const onY = 2 * (Y.qy * Y.qz - Y.qw * Y.qx),
      solY = 2 * (Y.qx * Y.qy + Y.qw * Y.qz);
    if (k < 120) {
      vy0 = Y.vy;
      continue;
    }
    // drag pistinin sonunda durur: bitişten sonrası ölçülmez
    if (TR.open && nearest(TR, S.x, S.z, 0, true)[0] >= TR.N - 3) break;
    // asfaltta: dört teker de pistin içinde (kerbe, çime değmiyor) ve son 1 sn'de çarpışma yok
    const sh = Math.sin(S.h),
      ch = Math.cos(S.h),
      asfalt =
        s.sim.d.zaman - S.hit > 1 &&
        F.tk.every(
          (t) => nearest(TR, S.x + t.x * ch + t.z * sh, S.z - t.x * sh + t.z * ch, 0, true)[1] < TR.hw - 0.15,
        );
    iz.push([S.y * 1000, Math.asin(onY) * R, Math.asin(solY) * R, S.h * R, asfalt ? 1 : 0]);
    if (asfalt) {
      ay = Math.max(ay, Math.abs((Y.vy - vy0) / DT));
      say++;
      if (S.kerb) yanlis++;
    }
    vy0 = Y.vy;
    if (S.kerb) kerb++;
  }
  const m = [0, 0, 0, 0];
  for (let k = 1; k < iz.length - 1; k++)
    if (iz[k - 1][4] && iz[k][4] && iz[k + 1][4])
      for (let j = 0; j < 4; j++) {
        let a = iz[k - 1][j],
          c = iz[k + 1][j];
        const b = iz[k][j];
        if (j == 3) {
          // yön açısı ±180°'de sarar
          a = b + ((((a - b + 540) % 360) + 360) % 360) - 180;
          c = b + ((((c - b + 540) % 360) + 360) % 360) - 180;
        }
        m[j] = Math.max(m[j], Math.abs(b - (a + c) / 2));
      }
  return {
    y: m[0],
    egim: m[1],
    yatis: m[2],
    yon: m[3],
    ay,
    kerb: kerb / iz.length,
    yanlisKerb: yanlis / Math.max(1, say),
    asfalt: say / iz.length,
  };
}
