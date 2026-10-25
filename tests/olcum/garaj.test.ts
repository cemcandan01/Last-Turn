// Ölçüm: garaj değerleri tablosunu üretir (src/arac/olculen.ts). npm run olcum -- garaj
// Her stok araç sonsuz düz asfaltta gerçek fizikle (Dengeli) ölçülür: azami hız, 0-100, 100-0. Araç ya da fizik
// değişince yeniden üret; tests/birim/garaj-degerleri.test.ts tablo eskiyince kalır.
import fs from "node:fs";
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { duzYolOlcumu } from "../../src/arac/olcum";
import { parcaliKurulum } from "../../src/arac/parcalar";

it("garaj değerleri", { timeout: 600000 }, () => {
  const satir = CARS.map((c, i) => {
    const d = duzYolOlcumu(parcaliKurulum(i, [], "norm"));
    console.log(
      `${c.n.padEnd(14)} ${d.hiz.toFixed(0)} km/sa  0-100 ${d.ivme.toFixed(2)} sn  100-0 ${d.fren.toFixed(1)} m`,
    );
    return `  ${c.k}: [${+d.hiz.toFixed(1)}, ${+d.ivme.toFixed(2)}, ${+d.fren.toFixed(1)}], // ${c.n}`;
  });
  fs.writeFileSync(
    "src/arac/olculen.ts",
    `// Üretilmiş dosya (npm run olcum -- garaj): stok araçların sonsuz düz asfaltta gerçek fizikle ölçülen değerleri
// (Dengeli). [azami hız km/sa, 0-100 sn, 100-0 m]. Elle düzenleme; araç ya da fizik değişince yeniden üret.
export const OLCULEN: Record<string, [number, number, number]> = {
${satir.join("\n")}
};
`,
  );
});
