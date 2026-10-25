// Pist dışı sayacı: yalnız aktif yarışın sabit adımlarında ilerler; zeminin malzemesine bağlı değildir.
import { cl } from "../cekirdek/matematik";
import { nearest, type Pist } from "../dunya/pist";

export interface DonusNoktasi {
  x: number;
  z: number;
  h: number;
}
export interface PistDisiSayaci {
  sure: number;
  ilk: DonusNoktasi | null;
}
export const bosPistDisi = (): PistDisiSayaci => ({ sure: 0, ilk: null });

/** Örnek noktalar arasına izdüşüm: pist kenarında örnek aralığı kadar yanlış dışarı algılama olmaz. */
export function pistKonumu(TR: Pist, x: number, z: number, hint: number) {
  const i = nearest(TR, x, z, hint)[0];
  let uzaklik = Infinity;
  let nokta: DonusNoktasi = { x: TR.P[i][0], z: TR.P[i][1], h: Math.atan2(TR.T[i][0], TR.T[i][1]) };
  for (const j of [i - 1, i]) {
    if (TR.open && (j < 0 || j >= TR.N - 1)) continue;
    const a = TR.P[(j + TR.N) % TR.N],
      b = TR.P[(j + 1) % TR.N];
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const u = cl(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const px = a[0] + u * dx,
      pz = a[1] + u * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < uzaklik) {
      uzaklik = d;
      nokta = { x: px, z: pz, h: Math.atan2(dx, dz) };
    }
  }
  return { uzaklik, nokta };
}

/** İlk çıkış konumu kilitlenir; piste dönüş yeni çıkış için sayacı temizler. */
export function pistDisiAdimi(s: PistDisiSayaci, TR: Pist, x: number, z: number, hint: number, dt: number) {
  const p = pistKonumu(TR, x, z, hint);
  if (p.uzaklik <= TR.hw) {
    s.sure = 0;
    s.ilk = null;
    return null;
  }
  s.ilk ??= p.nokta;
  s.sure += dt;
  // 300 adet 1/60 adımın kayan nokta hatası tam 5 saniyede dönüş yaratmasın.
  return s.sure > 5 + 1e-9 ? s.ilk : null;
}
