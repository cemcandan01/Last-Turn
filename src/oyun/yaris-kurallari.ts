// Yarış kuralları (saf: DOM ve oyun durumu yok; oyundaki evTick ve test pilotları aynı kuralı kullanır):
// drift puanı (kombo × çarpan) ve ters sürüş algılama.

export interface DriftSayaci {
  score: number;
  combo: number;
  /** kombo süresi, çarpan, kombo arası */
  ct: number;
  mult: number;
  gap: number;
  best: number;
}

export interface TersSayaci {
  /** araç pist yönüne ters gidiyor (histerezisli) */
  ters: boolean;
  /** durum değiştirme sayacı (sn) */
  tersT: number;
}

/** ters sürüş: bu kadar sn ters gidince bayrak kalkar, bu kadar sn doğru gidince iner; dönüş/spin anında yanıp sönmez */
const TERS_GIRIS = 1,
  TERS_CIKIS = 0.5,
  /** bunun altındaki hızda (m/s) yön değerlendirilmez: duran araç durumunu korur */
  TERS_HIZ = 3;

/**
 * ters sürüş sayacını ilerlet (vx, vz hız; tx, tz pist teğeti). Dönen değer anlık durum: hız pist yönünden 90°'den
 * fazla sapıyor (ters giriş beklenirken de drift puanı bu anda birikmez).
 */
export function tersAdimi(E: TersSayaci, vx: number, vz: number, tx: number, tz: number, dt: number) {
  const v = Math.hypot(vx, vz),
    c = v > TERS_HIZ ? (vx * tx + vz * tz) / v : 0,
    geri = c < -0.5,
    ileri = c > 0.5;
  if (!E.ters) {
    E.tersT = geri ? E.tersT + dt : 0;
    if (E.tersT >= TERS_GIRIS) {
      E.ters = true;
      E.tersT = 0;
    }
  } else {
    E.tersT = ileri ? E.tersT + dt : 0;
    if (E.tersT >= TERS_CIKIS) {
      E.ters = false;
      E.tersT = 0;
    }
  }
  return c < 0;
}

/** komboyu puana çevir; kazanılan puan */
export function driftBankala(E: DriftSayaci) {
  const p = Math.round(E.combo * E.mult);
  if (p > 0) {
    E.score += p;
    E.best = Math.max(E.best, p);
  }
  E.combo = 0;
  E.ct = 0;
  E.mult = 1;
  E.gap = 0;
  return p;
}

/**
 * drift puanı adımı: lost (çim, çarpma, spin) komboyu yakar; drift sürdükçe kombo hız × açıyla büyür, çarpan 2,5 sn'de
 * bir artar (en çok x5); 0,8 sn drift yoksa kombo bankaya geçer. Ters giderken kombo birikmez.
 * Dönen olay: "yandi", "carpan" (çarpan arttı), "bank" (p puan bankaya geçti) ya da null.
 */
export function driftAdimi(
  E: DriftSayaci,
  act: boolean,
  beta: number,
  lost: boolean,
  v: number,
  ters: boolean,
  dt: number,
): { olay: "yandi" | "carpan" | "bank" | null; p: number } {
  if (E.combo > 0 && lost) {
    E.combo = 0;
    E.ct = 0;
    E.mult = 1;
    E.gap = 0;
    return { olay: "yandi", p: 0 };
  }
  if (act && !lost && !ters) {
    E.combo += v * Math.abs(beta) * dt * 3;
    E.ct += dt;
    E.gap = 0;
    const m = Math.min(5, 1 + Math.floor(E.ct / 2.5)),
      artti = m > E.mult;
    E.mult = m;
    return { olay: artti ? "carpan" : null, p: 0 };
  }
  if (E.combo > 0) {
    E.gap += dt;
    if (E.gap > 0.8) return { olay: "bank", p: driftBankala(E) };
  }
  return { olay: null, p: 0 };
}
