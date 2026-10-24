// Stok garaj referanslarını yenilemek için gerçek fizik ölçümü.
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { duzPerformans } from "../yardimci/duz-performans";
it("stok araçların gerçek performansı", { timeout: 30000 }, () => {
  CARS.forEach((c, a) => {
    if (!process.env.ARAC || process.env.ARAC.split(",").map(Number).includes(a))
      console.log(c.k, JSON.stringify(duzPerformans(a)));
  });
});
