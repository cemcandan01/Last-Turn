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
  /** kombodaki bonus puan (çarpansız; kombo yanarsa yanar) */
  bonus: number;
  /** bonus sayaçları (sn): kesintisiz drift, direksiyonsuz drift, kıç aynı tarafta drift; kıçın tarafı (-1/0/1) */
  uzunT: number;
  dirT: number;
  yanT: number;
  yan: number;
  /** verilen bonuslar (hud okuyup tüketir; yarış başında boş) */
  driftOlay: DriftOlay[];
}

export interface DriftOlay {
  ad: "UZUN DRIFT" | "DİREKSİYONSUZ" | "TEK YÖN" | "ÇARPAN x6";
  puan: number;
  /** sim zamanı (sn) */
  t: number;
}

/** bonus puanları: koşul `bas` sn kesintisiz sürünce başlar, sonra her tam saniye için `puan` verilir */
export const DRIFT_BONUS = {
    uzun: { puan: 100, bas: 1 },
    direksiyonsuz: { puan: 100, bas: 1 },
    tekYon: { puan: 250, bas: 1 },
  },
  /** direksiyon girişi bunun altındaysa "direksiyonsuz" (ölü bölge), kıç tarafı için en az açı (rad) */
  DIREKSIYON_OLU = 0.1,
  YAN_ACI = 0.1;

export function bosDriftSayaci(): DriftSayaci {
  return {
    score: 0,
    combo: 0,
    ct: 0,
    mult: 1,
    gap: 0,
    best: 0,
    bonus: 0,
    uzunT: 0,
    dirT: 0,
    yanT: 0,
    yan: 0,
    driftOlay: [],
  };
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

/** puan açısı en çok 60° (rad): ötesi puan artırmaz (risk-ödül: açı büyüdükçe spin riski fizikten) */
export const DRIFT_AZAMI_ACI = (60 * Math.PI) / 180,
  /** puan hızı her zaman m/s'dir (gösterim birimi km/sa ya da mph olsa da aynı sürüş aynı puanı verir); bunun altında puan azalır */
  DRIFT_HIZ_ALT = 4,
  DRIFT_HIZ_TAM = 12;

/** drift sürerken puan açısı tabanı (10°): yön değiştirirken açı sıfıra yaklaşsa da puan düşmez */
export const DRIFT_ASGARI_ACI = (10 * Math.PI) / 180,
  /** kombo açıkken drift kesilse de kayma sürüyorsa taban açıyla puan akan süre (sn) ve kayma sayılan en az açı (rad) */
  GECIS_SURE = 0.6,
  GECIS_KAYMA = 0.05,
  /** 1. turda bu orandan fazlası drift hâlinde geçilirse 2. turda çarpan x6 */
  X6_ORAN = 0.9,
  X6_CARPAN = 6;

/** anlık drift puan hızı (puan/sn, kombo çarpanından önce): clamp(açı, 10°, 60°) (rad) × hız (m/s); düşük hızda küçülür. Yalnız drift sürerken çağrılır */
export function driftPuanHizi(beta: number, v: number) {
  const aci = Math.min(Math.max(Math.abs(beta), DRIFT_ASGARI_ACI), DRIFT_AZAMI_ACI),
    t = Math.min(1, Math.max(0, (v - DRIFT_HIZ_ALT) / (DRIFT_HIZ_TAM - DRIFT_HIZ_ALT)));
  return 3 * v * aci * t * t * (3 - 2 * t);
}

function sifirla(E: DriftSayaci) {
  E.combo = 0;
  E.ct = 0;
  E.mult = 1;
  E.gap = 0;
  E.bonus = 0;
}

/** komboyu puana çevir; kazanılan puan */
export function driftBankala(E: DriftSayaci) {
  const p = Math.round(E.combo * E.mult) + E.bonus;
  if (p > 0) {
    E.score += p;
    E.best = Math.max(E.best, p);
  }
  sifirla(E);
  return p;
}

/**
 * drift puanı adımı: lost (çim, çarpma, spin) komboyu yakar; drift sürdükçe kombo anlık açı × hızla büyür (driftPuanHizi), çarpan 2,5 sn'de
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
  /** direksiyon girişi (-1..1) ve sim zamanı (bonuslar için) */
  tg = 0.5,
  zaman = 0,
  /** 2. turda x6 kazanıldı: çarpan en az 6 */
  x6 = false,
): { olay: "yandi" | "carpan" | "bank" | null; p: number } {
  const surer = act && !lost && !ters;
  bonusAdimi(E, surer, beta, tg, dt, zaman);
  if (E.combo > 0 && lost) {
    sifirla(E);
    return { olay: "yandi", p: 0 };
  }
  if (act && !lost && !ters) {
    E.combo += driftPuanHizi(beta, v) * dt;
    E.ct += dt;
    E.gap = 0;
    const m = x6 ? X6_CARPAN : Math.min(5, 1 + Math.floor(E.ct / 2.5)),
      artti = m > E.mult;
    E.mult = m;
    return { olay: artti ? "carpan" : null, p: 0 };
  }
  if (E.combo > 0) {
    E.gap += dt;
    // yön değiştirme: drift bayrağı kısa süre düşse de kayma sürüyorsa kombo taban açıyla akar
    if (!lost && !ters && E.gap <= GECIS_SURE && Math.abs(beta) > GECIS_KAYMA)
      E.combo += driftPuanHizi(DRIFT_ASGARI_ACI, v) * dt;
    if (E.gap > 0.8) return { olay: "bank", p: driftBankala(E) };
  }
  return { olay: null, p: 0 };
}

/** bonus sayaçlarını ilerlet; her tam saniyede (en az 1) puan ver */
function bonusAdimi(E: DriftSayaci, surer: boolean, beta: number, tg: number, dt: number, zaman: number) {
  const yan = Math.abs(beta) > YAN_ACI ? Math.sign(beta) : E.yan;
  if (!surer) {
    E.uzunT = E.dirT = E.yanT = 0;
    E.yan = 0;
    return;
  }
  const ver = (onceki: number, simdi: number, ad: DriftOlay["ad"], b: { puan: number; bas: number }) => {
    if (Math.floor(simdi + 1e-9) > Math.floor(onceki + 1e-9) && simdi >= b.bas - 1e-9) {
      E.bonus += b.puan;
      E.driftOlay.push({ ad, puan: b.puan, t: zaman });
    }
  };
  let c = E.uzunT;
  E.uzunT += dt;
  ver(c, E.uzunT, "UZUN DRIFT", DRIFT_BONUS.uzun);
  c = E.dirT;
  E.dirT = Math.abs(tg) < DIREKSIYON_OLU ? E.dirT + dt : 0;
  ver(c, E.dirT, "DİREKSİYONSUZ", DRIFT_BONUS.direksiyonsuz);
  c = E.yanT;
  E.yanT = E.yan != 0 && yan != E.yan ? 0 : E.yanT + dt;
  E.yan = yan;
  ver(c, E.yanT, "TEK YÖN", DRIFT_BONUS.tekYon);
}
