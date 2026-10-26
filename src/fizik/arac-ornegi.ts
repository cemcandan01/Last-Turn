// Araç örneği: bir aracın fiziği, rastgeleliği, bağlamı (dünya, kurulum, olaylar) ve girdi kaydı bir arada.
// Oyunda bir yerel oyuncu aracı vardır (kamera, ses, HUD ona bakar); ileride birden çok fizikli araç aynı
// dünyada bu yapıyla yan yana çalışır (her birinin kendi bağlamı ve dünya sorgusu). Saf kod.
import { anlikAl, type AracAnlik } from "./anlik";
import { girdiyiKaydet, kayitBaslat, type GirdiKaydi } from "./girdi-kaydi";
import { Simulasyon } from "./simulasyon";
import type { AdimSonucu, FizikBaglami, FizikGirdisi } from "./tipler";
import { SURF, TIRES } from "./veriler";

export interface AracOrnegi {
  sim: Simulasyon;
  /** bu aracın bağlamı (rng aracın kendi üreteci) */
  cx: FizikBaglami;
  /** son sıfırlamadan beri girdiler */
  kayit: GirdiKaydi;
  /** son adımın sonucu */
  son: AdimSonucu;
}

/** cx.rng verilmez: aracın kendi tohumlu üreteci bağlanır */
export function aracOrnegiYap(cx: Omit<FizikBaglami, "rng">, tohum = 1): AracOrnegi {
  const sim = new Simulasyon(tohum);
  return {
    sim,
    cx: { ...cx, rng: sim.rng },
    kayit: kayitBaslat(tohum, sim.S),
    son: { Sf: SURF[0], T: TIRES[1], v: 0, si: 0, cimTeker: 0 },
  };
}

/** aracı koy; girdi kaydı buradan yeniden başlar */
export function aracSifirla(a: AracOrnegi, x: number, z: number, h: number, y: number) {
  a.sim.sifirla(x, z, h, y);
  kayitBaslat(a.sim.tohum, a.sim.S, a.kayit);
}

const GI: FizikGirdisi = { tg: 0, g: 0, b: 0, analogDireksiyon: false, analogGaz: false };

/** bir sabit adım: girdi kayda yazılır, fizik kaydedilen girdiyle ilerler */
export function aracAdimi(a: AracOrnegi, gi: FizikGirdisi): AdimSonucu {
  a.son = a.sim.adim(girdiyiKaydet(a.kayit, gi, GI), a.cx);
  return a.son;
}

/** aracın şimdiki anlık görüntüsü (ağa ya da hayalete) */
export const aracAnligi = (a: AracOrnegi, out?: AracAnlik) => anlikAl(a.sim.d, a.sim.yeni, out);
