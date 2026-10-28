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
import { PRESETS } from "../fizik/veriler";
import { toprakDengesi } from "./mutant-kosu";
import { dunyaSorgusuYap } from "./surus";
import { uzak, uzakAnlikEkle, uzakAracEkle, uzakAracSil } from "./uzak";

export const RAKIP = "rakip";

export interface RakipAyari {
  kisilik: KisilikAdi;
  /** araç (başlangıç aracının stok hâli) */
  arac: number;
  tohum: number;
}

export const rakip = {
  y: null as Yarisci | null,
  ayar: null as RakipAyari | null,
  /** rakibin stok gücü (skill hasarı bunun üstünden güç düşürür) */
  tabanHp: 0,
};

/** skill hasarının rakip gücüne etkisi: gövde 0'da en çok %30 güç kaybı (oyuncunun gövde kuralıyla aynı) */
export const RAKIP_GUC_KAYBI = 0.3;

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
  const kur = rakipKurulumu(r.arac, EV.ty, kurulum.lk, set.ss, set.sm);
  // MUTANT kuralı oyuncuyla aynı: yarış lastiği takılmaz, aracın kendi lastiği ve toprak dengesi
  kur.tire = PRESETS[kur.pk].tire;
  kur.car = toprakDengesi(kur.car, kur.tire);
  rakip.tabanHp = kur.car.hp;
  rakip.y = yarisciYap(dunyaSorgusuYap({ cur: null }), kur, TR, EV.laps ?? 1, r.kisilik, r.tohum, {
    x,
    z,
    h,
  });
  // yerel simülasyon: ağ gecikmesi yok, bir adım geriden ara değer (oyuncunun çizimi gibi)
  uzakAnlikEkle(uzakAracEkle(RAKIP, r.arac, ADIM), aracAnligi(rakip.y.ornek));
}

export function rakipDurdur() {
  rakip.y = null;
  rakip.ayar = null;
  rakip.tabanHp = 0;
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

/**
 * MUTANT skill etkisi (sonraki sabit adımda): çekme/itme ivmesi kütle merkezine kuvvet olarak (konum yazılmaz) ve
 * skill hasarından gövdeye göre güç kaybı. Rakibin pilotu yine yalnız gaz/fren/direksiyon üretir
 */
export function rakipEtkisi(ivme: { x: number; z: number } | null, govde: number) {
  const y = rakip.y;
  if (!y) return;
  y.ornek.cx.dis = ivme && (ivme.x || ivme.z) ? { x: ivme.x, z: ivme.z } : undefined;
  const hp = rakip.tabanHp * (1 - RAKIP_GUC_KAYBI * (1 - Math.max(0, Math.min(100, govde)) / 100)),
    K = y.ornek.cx.kurulum;
  if (K.car.hp != hp) y.ornek.cx.kurulum = { ...K, car: { ...K.car, hp } };
}

/** skill dünyası için rakibin gövdesi (yarışta yoksa null) */
export function rakipGovdesi() {
  const y = rakip.y;
  if (!y) return null;
  const S = y.ornek.sim.S;
  return { id: RAKIP, x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz };
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
