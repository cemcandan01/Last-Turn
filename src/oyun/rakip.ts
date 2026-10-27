// Rakip (oyun bağı, A3): yarışa tek YZ rakip ekler. Yarışçı saf modülde (yz/yarisci.ts); burası onu oyuncunun
// yanına ızgaraya koyar, her sabit adımda oyuncudan sonra ilerletir, uzak araç olarak çizdirir ve sırayı verir.
// Rakip yalnız MUTANT düellosunda açılır (oyun/mutant.ts → mutantRakibi); kariyer yarışları etkilenmez.
import { nearest, type Pist } from "../dunya/pist";
import type { YarisTuru } from "../arac/araclar";
import { aracAnligi } from "../fizik/arac-ornegi";
import { ADIM } from "../fizik/simulasyon";
import type { KisilikAdi } from "../yz/kisilik";
import {
  IZGARA_YAN,
  pistIlerlemesi,
  rakipKurulumu,
  yarisciAdimi,
  yarisciIlerlemesi,
  yarisciYap,
  type Yarisci,
} from "../yz/yarisci";
import { set } from "./ayarlar";
import { kurulum } from "./kurulum";
import { dunyaSorgusuYap } from "./surus";
import { uzak, uzakAnlikEkle, uzakAracEkle, uzakAracSil } from "./uzak";

export const RAKIP = "rakip";

export interface RakipAyari {
  kisilik: KisilikAdi;
  /** araç (başlangıç aracının stok hâli) */
  arac: number;
  tohum: number;
}

export const rakip = { y: null as Yarisci | null, ayar: null as RakipAyari | null };

/** yarış başlarken (startEvent, oyuncu ızgaraya konduktan sonra): rakibi oyuncunun yanına koy */
export function rakipBaslat(
  EV: { TR: Pist; ty: YarisTuru; laps?: number; g: [string, number, number, number] },
  r: RakipAyari,
) {
  const TR = EV.TR,
    [, x0, z0, h] = EV.g,
    i = nearest(TR, x0, z0, 0, true)[0],
    x = x0 + TR.T[i][1] * IZGARA_YAN,
    z = z0 - TR.T[i][0] * IZGARA_YAN;
  rakip.ayar = r;
  rakip.y = yarisciYap(
    dunyaSorgusuYap({ cur: null }),
    rakipKurulumu(r.arac, EV.ty, kurulum.lk, set.ss, set.sm),
    TR,
    EV.laps ?? 1,
    r.kisilik,
    r.tohum,
    { x, z, h },
  );
  // yerel simülasyon: ağ gecikmesi yok, bir adım geriden ara değer (oyuncunun çizimi gibi)
  uzakAnlikEkle(uzakAracEkle(RAKIP, r.arac, ADIM), aracAnligi(rakip.y.ornek));
}

export function rakipDurdur() {
  rakip.y = null;
  rakip.ayar = null;
  uzakAracSil(RAKIP);
}

/** her sabit adımda (oyuncunun adımından ve yarış mantığından sonra) */
export function rakipAdimi(basla: boolean) {
  const y = rakip.y;
  if (!y) return;
  yarisciAdimi(y, basla);
  const u = uzak.araclar.find((a) => a.id == RAKIP);
  if (u) uzakAnlikEkle(u, aracAnligi(y.ornek));
}

/** sıra ve fark (m; pozitif oyuncu önde). Rakip yoksa null */
export function rakipSirasi(oyuncuTur: number, oyuncuTi: number, kurulu: boolean) {
  const y = rakip.y;
  if (!y) return null;
  const fark = pistIlerlemesi(y.TR, oyuncuTur, oyuncuTi, kurulu) - yarisciIlerlemesi(y);
  return { sira: fark >= 0 ? 1 : 2, fark, bitti: y.bitis != null };
}

/** oyuncu bitirdi (t sn): rakipten önce mi */
export const rakibiGecti = (t: number) => {
  const b = rakip.y?.bitis;
  return b == null || t < b;
};
