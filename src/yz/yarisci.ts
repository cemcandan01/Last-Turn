// YZ yarışçı (A3, issue #22; saf): oyuncuyla aynı fizik çekirdeğiyle süren araç. Kendi araç örneği (fizik, tohumlu
// rastgelelik, dünya sorgusu) vardır; pilot (yz/pilot.ts) her sabit adımda yalnız gaz, fren ve direksiyon üretir,
// araç aracAdimi ile ilerler. Konum yazılmaz, ışınlanma, yakalama yardımı, gizli güç/tutuş yoktur: kurulum
// oyuncununkiyle aynı yoldan (stok araç, yardım seviyesi, yarış lastiği). Oyun bağı oyun/rakip.ts; testler ve
// ölçüm bu modülü doğrudan kullanır.
import { parcaliKurulum } from "../arac/parcalar";
import { yarisLastigi } from "../arac/yaris-lastigi";
import type { YarisTuru } from "../arac/araclar";
import { nearest, type Pist } from "../dunya/pist";
import { aracAdimi, aracOrnegiYap, aracSifirla, type AracOrnegi } from "../fizik/arac-ornegi";
import { ADIM } from "../fizik/simulasyon";
import type { DunyaSorgusu, FizikGirdisi, SurusKurulumu } from "../fizik/tipler";
import type { SeviyeAnahtari } from "../fizik/veriler";
import { KISILIKLER, type KisilikAdi } from "./kisilik";
import { pilotAdimi, pilotDurumu, pilotPlani, type PilotDurumu, type PilotPlani } from "./pilot";

/** rakibin sürüş kurulumu: başlangıç aracının stok hâli, oyuncunun yardım seviyesi, türün yarış lastiği */
export function rakipKurulumu(
  arac: number,
  ty: YarisTuru,
  lk: SeviyeAnahtari,
  ss = 1,
  sm = 1,
): SurusKurulumu {
  const k = parcaliKurulum(arac, [], lk, ss, sm);
  k.tire = yarisLastigi(ty);
  return k;
}

/** ızgarada rakip oyuncunun yanında (sol normal yönünde, m) */
export const IZGARA_YAN = 4.5;

/** pist ilerlemesi (m): ızgara başlangıç çizgisinin gerisinde negatif, her tur pist uzunluğu kadar */
export function pistIlerlemesi(TR: Pist, tur: number, ti: number, kurulu: boolean) {
  const s = TR.S[ti];
  return tur * TR.len + (tur == 0 && !kurulu && ti > TR.N * 0.5 ? s - TR.len : s);
}

/** bir rakip yarışçı (oyun dışı da kurulabilir: testler ve ölçüm aynı yolu kullanır) */
export interface Yarisci {
  ornek: AracOrnegi;
  plan: PilotPlani;
  pilot: PilotDurumu;
  TR: Pist;
  turlar: number;
  /** yarış sayaçları (oyuncunun evTick'iyle aynı kural) */
  tur: number;
  kurulu: boolean;
  ti: number;
  t: number;
  /** bitiş süresi (sn); bitmediyse null */
  bitis: number | null;
  turSureleri: number[];
  turBas: number;
}

export function yarisciYap(
  dunya: DunyaSorgusu,
  kurulum: SurusKurulumu,
  TR: Pist,
  turlar: number,
  kisilik: KisilikAdi,
  tohum: number,
  bas: { x: number; z: number; h: number; y?: number },
): Yarisci {
  const ornek = aracOrnegiYap(
    {
      dunya,
      kurulum,
      olay: { spin: () => {}, puf: () => {}, caliRengi: () => 0 },
      gorselRng: Math.random,
    },
    tohum,
  );
  aracSifirla(ornek, bas.x, bas.z, bas.h, bas.y ?? dunya.H(bas.x, bas.z));
  const plan = pilotPlani(TR, KISILIKLER[kisilik], tohum);
  return {
    ornek,
    plan,
    pilot: pilotDurumu(plan, bas.x, bas.z),
    TR,
    turlar,
    tur: 0,
    kurulu: false,
    ti: nearest(TR, bas.x, bas.z, 0, true)[0],
    t: 0,
    bitis: null,
    turSureleri: [],
    turBas: 0,
  };
}

/** bir sabit adım: pilot girdisi → aynı fizik → tur sayacı. Bitirdikten sonra yavaşlayıp pistte kalır */
export function yarisciAdimi(y: Yarisci, basla = true): FizikGirdisi {
  const sim = y.ornek.sim,
    S = sim.S;
  let gi = pilotAdimi(
    y.plan,
    y.pilot,
    { x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz, beta: sim.d.D.beta },
    ADIM,
    basla,
  );
  if (y.bitis != null) {
    const v = Math.hypot(S.vx, S.vz);
    gi = { ...gi, g: v > 12 ? 0 : Math.min(gi.g, 0.3), b: v > 16 ? 0.3 : 0 };
  }
  aracAdimi(y.ornek, gi);
  if (!basla) return gi;
  y.t += ADIM;
  const TR = y.TR,
    N = TR.N,
    onceki = y.ti,
    ti = (y.ti = nearest(TR, S.x, S.z, onceki)[0]);
  if (y.bitis != null) return gi;
  if (ti > N * 0.4 && ti < N * 0.6) y.kurulu = true;
  if (onceki > N * 0.8 && ti < N * 0.2 && y.kurulu) {
    y.kurulu = false;
    y.tur++;
    y.turSureleri.push(y.t - y.turBas);
    y.turBas = y.t;
    if (y.tur >= y.turlar) y.bitis = y.t;
  }
  return gi;
}

export const yarisciIlerlemesi = (y: Yarisci) =>
  y.bitis != null ? Infinity : pistIlerlemesi(y.TR, y.tur, y.ti, y.kurulu);
