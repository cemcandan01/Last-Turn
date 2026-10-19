// Sürüş senaryosu çalıştırıcı (Node): tests/veri/senaryolar.json'daki girişleri klasik fiziğe verir, her adımın
// durumunu döndürür. Tarayıcı ve çizim gerekmez; dünya yükseklik ve zemin fonksiyonları doğrudan kullanılır.
import fs from "node:fs";
import path from "node:path";
import { CARS } from "../../src/arac/araclar";
import { CarpismaIzgarasi, type Carpisan } from "../../src/fizik/carpisma";
import { Simulasyon } from "../../src/fizik/simulasyon";
import type { DunyaSorgusu, FizikBaglami } from "../../src/fizik/tipler";
import { LEVELS, PRESETS, type OnayarAnahtari, type SeviyeAnahtari } from "../../src/fizik/veriler";
import { REG } from "../../src/dunya/bolgeler";
import { dunya, Hw, surfW, WORLDS } from "../../src/dunya/dunya";
import { idxAt, ipucu, nearest } from "../../src/dunya/pist";
import { havaTutusu } from "../../src/dunya/temalar";
import { regAt } from "../../src/dunya/bolgeler";

export interface Senaryo {
  ad: string;
  dunya?: number;
  yaris?: number;
  arac: number;
  pk: OnayarAnahtari;
  lk: SeviyeAnahtari;
  steer: "btn" | "wheel";
  gas: "btn" | "analog";
  cond?: { tod: string; wx: string };
  set?: { ss?: number; sm?: number; inv?: number };
  start: [number, number, number] | { f: number; back: number };
  cols?: Carpisan[];
  segs: [number, { l?: number; r?: number; g?: number; b?: number; sa?: number }][];
}

export const SENARYOLAR: { dt: number; senaryolar: Senaryo[] } = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "../veri/senaryolar.json"), "utf8"),
);

/** izde kaydedilen alanlar (eski kodun kaydıyla aynı sıra) */
export const ALANLAR = [
  "x",
  "z",
  "y",
  "vy",
  "h",
  "vx",
  "vz",
  "w",
  "axs",
  "air",
  "mud",
  "wet",
  "spin",
  "kerb",
  "gas",
  "delta",
  "st",
  "DRon",
  "DRbt",
  "DRk",
  "beta",
  "score",
  "v",
  "si",
  "hit",
];

/** önayar ve yardım seviyesinden sürüş kurulumu (oyundaki applyPreset ile aynı) */
export function kurulumYap(arac: number, pk: OnayarAnahtari, lk: SeviyeAnahtari, ss = 1, sm = 1) {
  const p = PRESETS[pk];
  const as = { ...LEVELS[lk].v };
  if (p.ast) for (const k in p.ast) as[k] = Math.max(as[k], p.ast[k]!);
  if (p.cap) for (const k in p.cap) as[k] = Math.min(as[k], p.cap[k]!);
  return { car: CARS[arac], pk, tire: p.tire, tu: { ...p.v }, as, ss, sm };
}

/** senaryoyu çalıştır; her adımın satırını döndür */
export function senaryoCalistir(s: Senaryo, rastgele = () => 0.5) {
  const bolge = s.dunya != null ? WORLDS[s.dunya].reg : REG[s.yaris!];
  const kutu = s.dunya != null ? WORLDS[s.dunya].box : REG[s.yaris!].box;
  const tema = (bolge && bolge.th) || "day";
  const cond = s.cond || { tod: "noon", wx: "sun" };
  const cols = new CarpismaIzgarasi();
  for (const c of s.cols || []) cols.ekle(c);
  const set = { ss: 1, sm: 1, inv: 0, ...(s.set || {}) };
  const W: DunyaSorgusu = {
    H: Hw,
    surf: surfW,
    yakin: (x, z) => cols.yakin(x, z),
    kutu: () => kutu,
    kerbli: () => !!(dunya.cur && dunya.cur.kerb),
    havaTutusu: () => havaTutusu(tema, cond.wx),
    karli: () => tema == "snow",
  };
  const cx: FizikBaglami = {
    dunya: W,
    kurulum: kurulumYap(s.arac, s.pk, s.lk, set.ss, set.sm),
    olay: { spin: () => {}, puf: () => {}, caliRengi: () => 0 },
    rng: rastgele,
    gorselRng: rastgele,
  };
  let x: number, z: number, h: number;
  if (Array.isArray(s.start)) [x, z, h] = s.start;
  else {
    const TR = REG[s.yaris!].TR!,
      i = Math.max(0, idxAt(TR, s.start.f) - s.start.back);
    x = TR.P[i][0];
    z = TR.P[i][1];
    h = Math.atan2(TR.T[i][0], TR.T[i][1]);
  }
  const sim = new Simulasyon();
  sim.rng = rastgele;
  const d = sim.d;
  Object.assign(d.DR, { on: 0, dir: 1, hold: 0, bt: 0, t: 0, k: 0, cool: 0, nc: 0 });
  Object.assign(d.D, { act: 0, t: 0, score: 0, gap: 0, beta: 0 });
  sim.sifirla(x, z, h, Hw(x, z));
  // eski reset: bölgenin pistinde en yakın nokta ipucu
  const cur = regAt(x, z);
  dunya.cur = cur;
  if (cur && cur.TR) ipucu.ti = nearest(cur.TR, x, z, 0, true)[0];
  d.delta = 0;
  d.zaman = 0;
  const rows: number[][] = [];
  for (const [k, inp] of s.segs)
    for (let j = 0; j < k; j++) {
      const l = inp.l || 0,
        r = inp.r || 0,
        sa = inp.sa || 0;
      const tg = (s.steer == "btn" ? l - r : sa) * (set.inv ? -1 : 1);
      const o = sim.adim(
        {
          tg,
          g: inp.g || 0,
          b: inp.b || 0,
          analogDireksiyon: s.steer != "btn",
          analogGaz: s.gas == "analog",
        },
        cx,
      );
      const S = d.S;
      rows.push([
        S.x,
        S.z,
        S.y,
        S.vy,
        S.h,
        S.vx,
        S.vz,
        S.w,
        S.axs,
        +S.air,
        S.mud,
        S.wet,
        S.spin,
        S.kerb,
        S.gas,
        d.delta,
        d.st,
        d.DR.on,
        d.DR.bt,
        d.DR.k,
        d.D.beta,
        d.D.score,
        o.v,
        o.si,
        S.hit,
      ]);
    }
  return rows;
}
