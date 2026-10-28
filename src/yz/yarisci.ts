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

/** rakibin sürüş kurulumu: araç (parçalarıyla; yoksa stok), oyuncunun yardım seviyesi, türün yarış lastiği */
export function rakipKurulumu(
  arac: number,
  ty: YarisTuru,
  lk: SeviyeAnahtari,
  ss = 1,
  sm = 1,
  parca: readonly string[] = [],
): SurusKurulumu {
  const k = parcaliKurulum(arac, parca, lk, ss, sm);
  k.tire = yarisLastigi(ty);
  return k;
}

/** ızgarada rakip oyuncunun yanında (sol normal yönünde, m) */
export const IZGARA_YAN = 4.5;

/** pist ilerlemesi (m): ızgara başlangıç çizgisinin gerisinde negatif, her tur pist uzunluğu kadar */
export function pistIlerlemesi(TR: Pist, tur: number, ti: number, kurulu: boolean) {
  const s = TR.S[ti];
  if (TR.open) return s;
  return tur * TR.len + (tur == 0 && !kurulu && ti > TR.N * 0.5 ? s - TR.len : s);
}

/** bir rakip yarışçı (oyun dışı da kurulabilir: testler ve ölçüm aynı yolu kullanır) */
export interface Yarisci {
  ornek: AracOrnegi;
  plan: PilotPlani;
  pilot: PilotDurumu;
  TR: Pist;
  turlar: number;
  /** açık pist (ralli, drag): bitiş çizgisi son noktadan bu kadar önce (oyuncunun evTick'iyle aynı: ralli 4, drag 1) */
  acikSon: number;
  /** yarış sayaçları (oyuncunun evTick'iyle aynı kural) */
  tur: number;
  kurulu: boolean;
  ti: number;
  t: number;
  /** bitiş süresi (sn); bitmediyse null */
  bitis: number | null;
  turSureleri: number[];
  turBas: number;
  /** piste dönüş (oyuncunun pist dışı kuralının karşılığı): son ilerleme, ilerlemesiz geçen süre, dönüş sayısı */
  sonIlerleme: number;
  ilerlemesiz: number;
  pisteDonus: number;
}

/** rakip bu kadar süre ilerleyemezse (dik yokuşta ya da engelde takılı) pistte biraz geriye konur (sn, m) */
export const RAKIP_DONUS = { sure: 8, ilerleme: 5, geri: 3 };

export function yarisciYap(
  dunya: DunyaSorgusu,
  kurulum: SurusKurulumu,
  TR: Pist,
  turlar: number,
  kisilik: KisilikAdi,
  tohum: number,
  bas: { x: number; z: number; h: number; y?: number },
  acikSon = 4,
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
    acikSon,
    tur: 0,
    kurulu: false,
    ti: nearest(TR, bas.x, bas.z, 0, true)[0],
    t: 0,
    bitis: null,
    turSureleri: [],
    turBas: 0,
    sonIlerleme: 0,
    ilerlemesiz: 0,
    pisteDonus: 0,
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
  pisteDonAdimi(y);
  if (TR.open) {
    // A'dan B'ye: yarıyı geçince kurulur, son noktaya varınca biter
    if (ti > N * 0.5) y.kurulu = true;
    if (y.kurulu && ti >= N - y.acikSon) {
      y.tur = 1;
      y.turSureleri.push(y.t);
      y.bitis = y.t;
    }
    return gi;
  }
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

/**
 * Oyuncu pist dışında kalınca piste geri konur; rakip de takılı kalınca (ilerlemeden RAKIP_DONUS.sure) pistte biraz
 * geride, pist yönünde ve duran araçla yeniden başlar. Hız ya da konum avantajı vermez: kaybedilen süre rakipte kalır.
 */
function pisteDonAdimi(y: Yarisci) {
  const d = y.pilot;
  if (d.ilerleme > y.sonIlerleme + RAKIP_DONUS.ilerleme) {
    y.sonIlerleme = d.ilerleme;
    y.ilerlemesiz = 0;
    return;
  }
  y.ilerlemesiz += ADIM;
  if (y.ilerlemesiz < RAKIP_DONUS.sure) return;
  const TR = y.TR,
    N = TR.N,
    j = TR.open ? Math.max(0, y.ti - RAKIP_DONUS.geri) : (y.ti - RAKIP_DONUS.geri + N) % N,
    [x, z] = TR.P[j];
  aracSifirla(y.ornek, x, z, Math.atan2(TR.T[j][0], TR.T[j][1]), y.ornek.cx.dunya.H(x, z));
  const yeni = pilotDurumu(y.plan, x, z);
  y.pilot = {
    ...yeni,
    mod: "yaris",
    sure: d.sure,
    tur: d.tur,
    ilerleme: d.ilerleme,
    toparlanma: d.toparlanma,
    takili: -1.5,
  };
  y.ti = nearest(TR, x, z, y.ti)[0];
  y.sonIlerleme = d.ilerleme;
  y.ilerlemesiz = 0;
  y.pisteDonus++;
}
