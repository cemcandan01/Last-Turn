// Yeni fizik: lastik modeli. Kayma oranı (κ, teker dönüşü ile yer hızı farkı) ve kayma açısı (α) birlikte
// değerlendirilir: ikisi tepe değerlerine bölünüp tek bir kayma büyüklüğü bulunur, kuvvet bu büyüklüğün
// Pacejka biçimli eğrisinden gelir ve kayma yönüne paylaştırılır (sürtünme elipsi). Böylece patinaj yapan
// teker yanal tutuşunu kaybeder (gazla arka kayar), kilitlenen teker direksiyonu dinlemez.

export interface LastikParam {
  /** yanal ve boylamsal sürtünme katsayısı */
  muY: number;
  muX: number;
  /** tepe kayma oranı ve tepe kayma açısının tanjantı */
  kp: number;
  ap: number;
  /** eğri biçimi (C): büyük değer = tepeden sonra keskin düşüş */
  C: number;
}

export interface LastikSonucu {
  Fx: number;
  Fy: number;
  /** toplam kayma büyüklüğü (1 = tepe) */
  s: number;
}

/** eğrinin tepesi s = 1'de olacak B */
const bOf = (C: number) => Math.tan(Math.PI / (2 * C));

/**
 * lastik kuvveti (lastik ekseninde): Fx ileri, Fy sola. Fz: dikey yük (N).
 * kap: kayma oranı (+ patinaj, − kilitlenme), tanA: kayma açısının tanjantı (+ teker sola kayıyor)
 */
export function lastikKuvveti(
  Fz: number,
  kap: number,
  tanA: number,
  p: LastikParam,
  out: LastikSonucu,
): LastikSonucu {
  const sx = kap / p.kp,
    sy = tanA / p.ap,
    s = Math.hypot(sx, sy);
  out.s = s;
  if (s < 1e-9 || Fz <= 0) {
    out.Fx = out.Fy = 0;
    return out;
  }
  const C = Math.max(1.05, p.C),
    f = Math.sin(C * Math.atan(bOf(C) * s));
  out.Fx = (p.muX * Fz * f * sx) / s;
  out.Fy = (-p.muY * Fz * f * sy) / s;
  return out;
}
