// Otomatik pilot (test için): pisti ileriden görür, direksiyonu bakış noktasına çevirir, hızı yaklaşan
// virajların eğriliğine göre ayarlar. "cesaret" viraj hızını ve fren mesafesini ölçekler.
import { cl } from "../../src/cekirdek/matematik";
import { ipucu, type Pist } from "../../src/dunya/pist";
import type { AracDurumu, FizikGirdisi } from "../../src/fizik/tipler";

/** her pist noktasında eğrilik (1/m) */
export function egrilik(TR: Pist): number[] {
  const g = (j: number) => (TR.open ? cl(j, 0, TR.N - 1) : (j + TR.N) % TR.N);
  return TR.P.map((_p, i) => {
    const a = TR.T[g(i - 3)],
      b = TR.T[g(i + 3)],
      ac = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])),
      d = Math.max(1, Math.abs(TR.S[g(i + 3)] - TR.S[g(i - 3)]));
    return ac / d;
  });
}

export function pilot(TR: Pist, K: number[], cesaret: number) {
  const g = (j: number) => (TR.open ? cl(j, 0, TR.N - 1) : (j + TR.N) % TR.N);
  return (S: AracDurumu): FizikGirdisi => {
    const ti = ipucu.ti,
      v = Math.hypot(S.vx, S.vz);
    // bakış noktası: hıza göre ileride
    let j = ti,
      d = 0;
    const bak = 7 + 0.45 * v;
    while (d < bak && (TR.open ? j < TR.N - 1 : d < TR.len)) {
      const k = g(j + 1);
      d += Math.hypot(TR.P[k][0] - TR.P[g(j)][0], TR.P[k][1] - TR.P[g(j)][1]);
      j = k;
    }
    const q = TR.P[g(j)];
    let a = Math.atan2(q[0] - S.x, q[1] - S.z) - S.h;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    // hız: ileriki her noktanın izin verdiği hız ve oraya kadar fren mesafesi
    const yan = 30 * cesaret,
      fren = 22 * cesaret;
    let hedef = 1e9;
    d = 0;
    j = ti;
    const menzil = (v * v) / (2 * fren) + 30;
    while (d < menzil && (TR.open ? j < TR.N - 1 : d < TR.len)) {
      const k = g(j + 1);
      d += Math.hypot(TR.P[k][0] - TR.P[g(j)][0], TR.P[k][1] - TR.P[g(j)][1]);
      j = k;
      const vk = Math.sqrt(yan / Math.max(K[g(j)], 1e-4));
      hedef = Math.min(hedef, Math.sqrt(vk * vk + 2 * fren * Math.max(0, d - 6)));
    }
    const fark = hedef - v;
    return {
      tg: cl(a * 2.5, -1, 1),
      g: fark > 0 ? cl(fark / 3, 0, 1) : 0,
      b: fark < -1 ? cl(-fark / 6, 0, 1) : 0,
      analogDireksiyon: true,
      analogGaz: true,
    };
  };
}
