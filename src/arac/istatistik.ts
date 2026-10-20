// Garaj özellik puanları: ölçülen değerlerden (Dengeli yardım seviyesi) ve azami hız tahmininden
import { PRESETS, TIRES, VMAX } from "../fizik/veriler";
import type { Arac } from "./araclar";

/** klasik modelde azami hız tahmini (km/sa) */
export function estTop(c: Arac) {
  const pr = PRESETS[c.pk],
    T = TIRES[pr.tire],
    top = VMAX * T.t[1] * pr.v.top * c.top * (1 - 0.04 * (pr.v.aero - 1));
  let v = 1;
  while (v < 150) {
    const E =
      (Math.min(9.5 * c.trq, (240 * c.pw) / v) / c.m) * (1 - Math.pow(Math.min(v / top, 1.2), 4)) -
      1.2 -
      0.05 * v;
    if (E <= 0) break;
    v += 0.05;
  }
  return v * 3.6;
}

/** [ad, çubuk oranı (0-1), yazı] */
export const STAT = (c: Arac): [string, number, string][] => [
  ["Azami hız", estTop(c) / 360, Math.round(estTop(c)) + " km/sa"],
  ["Hızlanma", 2 / c.a100, "0-100: " + c.a100.toFixed(1) + " sn"],
  ["Güç", c.hp / 1100, c.hp + " hp"],
  ["Yol tutuşu", c.lat / 3.4, ""],
  ["Arazi", (c.gr[0] * (1 + 0.35 * c.awd)) / 1.65, ""],
  ["Fren", (30 - c.b100) / 23, "100-0: " + c.b100 + " m"],
  ["Çeviklik", 0.62 / c.t90, ""],
];
