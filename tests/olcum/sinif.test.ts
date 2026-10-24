// Ölçüm: sınıf içinde araç-tür uyumu. npm run olcum -- sinif (paralel: GRUP=0/4 … GRUP=3/4; TUR=rl tek tür)
// Her türde türün ilk aracı (★, stok) ile başka türlerin araçları karşılaştırılır:
//   stok          : başka türün aracı stokta (★ belirgin önde olmalı)
//   paketli       : türün paketi + puanı ★'ın puanına (altından en yakın) ayarlayan parçalar (fark ≤ %2-3)
// Puanlar yarış türünün zemininde (sınıf sınırı gibi): rallikros ve ralli toprakta, diğerleri asfaltta.
//   yanlış        : ★ yanlış lastikle (belirgin geride ama bitirir)
// Fark: tur süresinde + yavaş; drift puanında − az puan.
import { it } from "vitest";
import { CARS, type YarisTuru } from "../../src/arac/araclar";
import { PAKETLER } from "../../src/arac/parcalar";
import { performansPuani, sinirdaEnIyi } from "../../src/arac/performans";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { CESARETLER, dragSur, driftPuani, enIyiTur, turSur } from "../yardimci/uyum";

const PISTLER: [YarisTuru, number, string][] = [
  ["gp", 4, "lastik-toprak"],
  ["rx", 2, "lastik-yaris"],
  ["rl", 2, "lastik-yaris"],
  ["dp", 3, "lastik-yaris"],
  ["dg", 3, "lastik-drift"],
];

/** yanlış kurulum: hatasız tur yoksa pist dışı ve spin dahil en iyi bitiriş (bitirebiliyor mu) */
function bitirisi(y: number, a: number, parca: string[]) {
  let en = Infinity;
  for (const c of CESARETLER) en = Math.min(en, turSur(y, a, c, "norm", 1, { parca }).t);
  return en;
}

function deger(t: YarisTuru, y: number, a: number, parca: string[]) {
  if (t == "dp") return driftPuani(y, a, parca);
  if (t == "dg") return dragSur(y, a, 0, { parca });
  return enIyiTur(y, a, undefined, { parca }).t;
}

it("sınıf içi uyum", { timeout: 7200000 }, () => {
  const [g, n] = (process.env.GRUP || "0/1").split("/").map(Number);
  let say = 0;
  for (const [t, lv, yanlis] of PISTLER) {
    if (process.env.TUR && !process.env.TUR.split(",").includes(t)) continue;
    const y = pistNo(t, lv),
      o = CARS.findIndex((c) => c.ty == t),
      p0 = performansPuani(o, [], t).puan,
      pk = PAKETLER.find((p) => p.tur == t)!,
      fark = (v: number, r: number) => (100 * (v - r)) / r,
      yaz = (v: number) => (t == "dp" ? v.toFixed(0) : v.toFixed(2)).padStart(7);
    const v0 = deger(t, y, o, []);
    if (say++ % n == g) {
      let vy = deger(t, y, o, [yanlis]);
      if (!isFinite(vy)) vy = bitirisi(y, o, [yanlis]);
      console.log(
        `${t}${lv} ★ ${CARS[o].n} stok puan ${p0} ${yaz(v0)} | yanlış (${yanlis}) puan ${performansPuani(o, [yanlis], t).puan} ${yaz(vy)} ${fark(vy, v0).toFixed(1)}%`,
      );
    }
    for (let a = 0; a < CARS.length; a++) {
      if (CARS[a].ty == t || say++ % n != g) continue;
      const vs = deger(t, y, a, []),
        ps = performansPuani(a, [], t).puan,
        // uygun modifiye: paketin çekirdek parçaları, gerekirse önerilen çekiş dönüşümü
        oneri = pk.oneri.filter((id) => (id == "cekis-dort" ? CARS[a].awd == 0 : CARS[a].awd > 0)),
        ay = sinirdaEnIyi(a, [...pk.parcalar, ...oneri], p0, t),
        vp = deger(t, y, a, ay.parcalar);
      console.log(
        `${t}${lv}   ${CARS[a].n.padEnd(13)} stok puan ${ps} ${yaz(vs)} ${fark(vs, v0).toFixed(1).padStart(6)}% | paketli puan ${ay.puan} ${yaz(vp)} ${fark(vp, v0).toFixed(1).padStart(6)}%  [${ay.parcalar.join(",")}]`,
      );
    }
  }
});
