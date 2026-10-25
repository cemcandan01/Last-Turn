// Ölçüm: D sınıfı başlangıç araçları. npm run olcum -- sinif-d (TUR=gp,dp tek türler)
// Her türde türün başlangıç aracı (★, ekonomi.ts BASLANGIC_ARACLARI) stokta, D sınıfındaki bütün araçlarla (genel puanı
// ≤ 400) türün Çaylak pistinde ve bir üst pistinde karşılaştırılır: ★ kendi türünde en iyi olmalı. Ayrıca ★'ın pilot
// süresi 1★ eşiğine (tg) göre: başlangıç aracıyla Çaylak pistlerinde yıldız alınabilmeli (ilerleme ve para akar).
import { it } from "vitest";
import { CARS, type YarisTuru } from "../../src/arac/araclar";
import { performansPuani } from "../../src/arac/performans";
import { pistNo, TDEF } from "../../src/dunya/pist-tanimlari";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { yildizEsikleri, yildizSay } from "../../src/oyun/yildiz";
import { dragSur, driftPuani, enIyiTur } from "../yardimci/uyum";

const PISTLER: [YarisTuru, number[]][] = [
  ["gp", [1, 2]],
  ["rx", [1, 2]],
  ["rl", [1, 2]],
  ["dp", [1]],
  ["dg", [1, 2]],
];

function deger(t: YarisTuru, y: number, a: number) {
  if (t == "dp") return driftPuani(y, a);
  if (t == "dg") return dragSur(y, a);
  return enIyiTur(y, a).t;
}

it("D sınıfı başlangıç araçları", { timeout: 3600000 }, () => {
  const D = CARS.map((_, i) => i).filter((i) => performansPuani(i, []).puan <= 400);
  console.log("D sınıfı:", D.map((i) => `${CARS[i].n} ${performansPuani(i, []).puan}`).join(", "));
  for (const [t, lvler] of PISTLER) {
    if (process.env.TUR && !process.env.TUR.split(",").includes(t)) continue;
    const o = BASLANGIC_ARACLARI.find((i) => CARS[i].ty == t)!;
    for (const lv of lvler) {
      const y = pistNo(t, lv),
        v = D.map((a) => ({ a, v: deger(t, y, a) })),
        iyi = (x: number, r: number) => (t == "dp" ? x > r : x < r),
        v0 = v.find((x) => x.a == o)!.v,
        rakip = v.filter((x) => x.a != o),
        enIyi = rakip.every((x) => iyi(v0, x.v)),
        esik = yildizEsikleri(t, lv),
        // yıldız eşiği yarışın tamamı için: asfalt ve rallikros 3 tur
        tam = t == "gp" || t == "rx" ? enIyiTur(y, o, undefined, {}, 3).t : v0,
        yaz = (x: number) => (t == "dp" ? x.toFixed(0) : x.toFixed(2));
      console.log(
        `${t}${lv} ${TDEF[y].n}: ★ ${CARS[o].n} ${yaz(v0)} ${enIyi ? "EN İYİ" : "GERİDE"} | yarış ${yaz(tam)} yıldız ${yildizSay(t, tam, esik)} (eşik ${esik.join("/")}) | ` +
          rakip
            .map(
              (x) =>
                `${CARS[x.a].n} ${yaz(x.v)} (${(t == "dp" ? (100 * (v0 - x.v)) / x.v : (100 * (x.v - v0)) / v0).toFixed(1)}%)`,
            )
            .join(", "),
      );
    }
  }
});
