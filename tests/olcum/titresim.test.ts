// Ölçüm: asfalt pistlerde titreşim. Her araç her asfalt pistte otomatik pilotla sürülür; çizilen pozun (yükseklik,
// eğim, yatış, yön) adımdan adıma sıçraması ve kerb sarsıntısının (kamera) ne kadar açık kaldığı yazdırılır.
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { titresimOlc } from "../yardimci/titresim";

it("titreşim", () => {
  const satir: string[] = [];
  for (let yaris = 0; yaris < TDEF.length; yaris++) {
    if (!["gp", "dp", "dg"].includes(TDEF[yaris].t)) continue;
    for (let arac = 0; arac < CARS.length; arac++) {
      const o = titresimOlc(yaris, arac);
      satir.push(
        `${TDEF[yaris].n.padEnd(17)} ${CARS[arac].n.padEnd(12)} ` +
          `y ${o.y.toFixed(2).padStart(5)} mm  eğim ${o.egim.toFixed(3)}°  yatış ${o.yatis.toFixed(3)}°  ` +
          `yön ${o.yon.toFixed(3)}°  ay ${o.ay.toFixed(2).padStart(5)} m/s²  kerb %${(o.kerb * 100).toFixed(0).padStart(3)}  ` +
          `asfaltta kerb sarsıntısı %${(o.yanlisKerb * 100).toFixed(0)}  asfalt %${(o.asfalt * 100).toFixed(0)}`,
      );
    }
  }
  console.log("\n" + satir.join("\n"));
});
