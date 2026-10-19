// Test sürücüsü (Node): gerçek pistte ve gerçek çarpışma nesneleriyle, otomatik pilotla sürüş.
// Oyunun sürüş katmanını (oyun/surus.ts) kullanmaz; aynı fizik bağlamını burada kurar.
import "./sahte-tuval";
import { CARS } from "../../src/arac/araclar";
import { REG, regAt } from "../../src/dunya/bolgeler";
import { dunya, ensureBuilt, Hw, loadWorld, surfW, WORLDS } from "../../src/dunya/dunya";
import { ipucu, nearest } from "../../src/dunya/pist";
import { havaTutusu } from "../../src/dunya/temalar";
import type { AdimSonucu } from "../../src/fizik/klasik";
import { Simulasyon } from "../../src/fizik/simulasyon";
import type { DunyaSorgusu, FizikBaglami, FizikGirdisi } from "../../src/fizik/tipler";
import type { OnayarAnahtari, SeviyeAnahtari } from "../../src/fizik/veriler";
import { kurulumYap } from "./senaryo";

export interface SurusAyari {
  /** açık dünya ya da yarış (bölge) */
  dunya?: number;
  yaris?: number;
  arac: number;
  pk?: OnayarAnahtari;
  lk: SeviyeAnahtari;
  wx?: string;
}

export function surucuKur(a: SurusAyari) {
  loadWorld();
  const bolge = a.dunya != null ? WORLDS[a.dunya].reg : REG[a.yaris!];
  if (bolge) ensureBuilt(bolge);
  const kutu = a.dunya != null ? WORLDS[a.dunya].box : REG[a.yaris!].box,
    tema = (bolge && bolge.th) || "day",
    wx = a.wx || "sun";
  const W: DunyaSorgusu = {
    H: Hw,
    surf: surfW,
    yakin: (x, z) => dunya.cols.yakin(x, z),
    kutu: () => kutu,
    kerbli: () => !!(dunya.cur && dunya.cur.kerb),
    havaTutusu: () => havaTutusu(tema, wx),
    karli: () => tema == "snow",
  };
  const sim = new Simulasyon(7);
  const olaylar = { spin: 0 };
  const cx: FizikBaglami = {
    dunya: W,
    kurulum: kurulumYap(a.arac, a.pk || CARS[a.arac].pk, a.lk),
    olay: { spin: () => olaylar.spin++, puf: () => {}, caliRengi: () => 0 },
    rng: sim.rng,
    gorselRng: Math.random,
  };
  const reset = (x: number, z: number, h: number) => {
    sim.sifirla(x, z, h, Hw(x, z));
    dunya.cur = regAt(x, z);
    if (dunya.cur && dunya.cur.TR) ipucu.ti = nearest(dunya.cur.TR, x, z, 0, true)[0];
  };
  const adim = (gi: FizikGirdisi): AdimSonucu => sim.adim(gi, cx);
  return { sim, cx, olaylar, reset, adim, bolge };
}
