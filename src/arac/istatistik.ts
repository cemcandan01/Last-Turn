// Garaj değerleri sürüşte kullanılan motor/vites/fren modelinden gelir; eski klasik hız tahmini kullanılmaz.
import { CARS, type Arac } from "./araclar";
import { performansPuani } from "./performans";

const olcu = (c: Arac) => performansPuani(CARS.findIndex((a) => a.k == c.k));

/** Kuru asfalt referans azami hızı (km/sa). Ad eski çağıranlarla uyum için korunur. */
export const estTop = (c: Arac) => olcu(c).hiz;

/** [ad, çubuk oranı (0-1), yazı]; takılı parçaların hesaplanmış değeri ayrıca verilebilir. */
export const STAT = (c: Arac, p = olcu(c)): [string, number, string][] => [
  ["Azami hız", p.hiz / 400, Math.round(p.hiz) + " km/sa"],
  ["Hızlanma", 2 / p.ivme, "0-100: " + p.ivme.toFixed(1) + " sn"],
  ["Güç", c.hp / 1100, c.hp + " hp"],
  ["Yol tutuşu", p.tutus / (24 * 2.5), ""],
  ["Arazi", p.arazi / (24 * 1.5), ""],
  ["Fren", (30 - p.fren) / 23, "100-0: " + p.fren.toFixed(1) + " m"],
  ["Çeviklik", 0.62 / c.t90, ""],
];
