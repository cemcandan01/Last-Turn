// Test sürücüsü (Node): gerçek pistte ve gerçek çarpışma nesneleriyle, otomatik pilotla sürüş.
// Oyunun sürüş katmanını (oyun/surus.ts) kullanmaz; aynı fizik bağlamını burada kurar.
import "./sahte-tuval";
import { CARS } from "../../src/arac/araclar";
import { parcaliKurulum } from "../../src/arac/parcalar";
import { REG, regAt } from "../../src/dunya/bolgeler";
import { dunya, ensureBuilt, Hw, loadWorld, surfW, WORLDS } from "../../src/dunya/dunya";
import { ipucu, nearest } from "../../src/dunya/pist";
import { havaTutusu } from "../../src/dunya/temalar";
import { Simulasyon } from "../../src/fizik/simulasyon";
import type { AdimSonucu, DunyaSorgusu, FizikBaglami, FizikGirdisi } from "../../src/fizik/tipler";
import { LEVELS, PRESETS, type OnayarAnahtari, type SeviyeAnahtari } from "../../src/fizik/veriler";

export interface SurusAyari {
  /** açık dünya ya da yarış (bölge) */
  dunya?: number;
  yaris?: number;
  arac: number;
  pk?: OnayarAnahtari;
  lk: SeviyeAnahtari;
  wx?: string;
  /** modifiye parçaları (src/arac/parcalar.ts; yoksa stok) */
  parca?: readonly string[];
  /** tür uyumu (uzmanlık) kapalı: puan kalibrasyonu için */
  uzmanliksiz?: boolean;
}

/** önayar ve yardım seviyesinden sürüş kurulumu (oyundaki applyPreset ile aynı) */
export function kurulumYap(arac: number, pk: OnayarAnahtari, lk: SeviyeAnahtari, ss = 1, sm = 1) {
  const p = PRESETS[pk];
  const as = { ...LEVELS[lk].v };
  if (p.ast) for (const k in p.ast) as[k] = Math.max(as[k], p.ast[k]!);
  if (p.cap) for (const k in p.cap) as[k] = Math.min(as[k], p.cap[k]!);
  return { car: CARS[arac], pk, tire: p.tire, tu: { ...p.v }, as, ss, sm };
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
    kerb: (x, z) => (dunya.cur && dunya.cur.Hk ? dunya.cur.Hk(x, z) : 0),
    havaTutusu: () => havaTutusu(tema, wx),
    karli: () => tema == "snow",
    yolTuru: () => (a.uzmanliksiz ? null : dunya.cur ? dunya.cur.t : null),
  };
  const sim = new Simulasyon(7);
  const olaylar = { spin: 0 };
  const cx: FizikBaglami = {
    dunya: W,
    kurulum:
      a.parca && a.parca.length && !a.pk
        ? parcaliKurulum(a.arac, a.parca, a.lk)
        : kurulumYap(a.arac, a.pk || CARS[a.arac].pk, a.lk),
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
