/* global LT */
import fs from "node:fs";
export default async function ({ p, ok }) {
  await p.evaluate(() => {
    LT.demoStop();
    LT.openGarage(0);
  });
  const kontrol = await p.evaluate(() => {
    const sonuc = [];
    for (let n = 0; n < LT.CARS.length; n++) {
      const sinif = document.querySelector("#gsnf");
      const ses = document.querySelector("#gses");
      const a = sinif.getBoundingClientRect(),
        b = ses.getBoundingClientRect();
      sonuc.push(
        !!ses.closest(".gust") &&
          b.top > a.bottom &&
          b.left < innerWidth / 2 &&
          parseFloat(getComputedStyle(sinif).fontSize) >= 17 &&
          a.height >= 42 &&
          !document.querySelector("#gpara"),
      );
      document.querySelector("#gnx").click();
    }
    const bilgi = document.querySelector("#gbil");
    if (bilgi.getAttribute("aria-pressed") !== "true") bilgi.click();
    const ust = document.querySelector(".gust").getBoundingClientRect();
    const aciklama = document.querySelector("#gdes").getBoundingClientRect();
    return { hepsi: sonuc.every(Boolean), aciklama: aciklama.top >= ust.bottom };
  });
  ok(
    kontrol.hepsi,
    "tüm araçlarda büyük sınıf/puan, altında motor düğmesi; sağda durum/çekiş/seçim kutusu yok",
  );
  ok(kontrol.aciklama, "açık araç açıklaması sınıf ve motor düğmesinin altına yerleşir");
  await p.evaluate(() => {
    const b = document.querySelector("#gbil");
    if (b.getAttribute("aria-pressed") === "true") b.click();
  });
  fs.mkdirSync("tests/cikti", { recursive: true });
  await p.screenshot({ path: "tests/cikti/garaj-duzen-iphone13.png" });
  await p.locator("#gses").click();
  ok(
    await p.locator("#gses").evaluate((e) => e.classList.contains("on")),
    "taşınan Motoru dinle düğmesi çalışır",
  );
  await p.locator("#gses").click();
  await p.locator("#gmod").click();
  ok(
    await p.locator("#gar").evaluate((e) => e.classList.contains("modifiye")),
    "sağdaki Modifiye düğmesi çalışır",
  );
  await p.evaluate(() => {
    LT.closeGarage();
    LT.openGarage(null, 0);
  });
  ok(
    (await p.locator("#gpara").count()) === 0 && (await p.locator("#gses").isVisible()),
    "serbest sürüş öncesinde de sade düzen korunur",
  );
  await p.evaluate(() => {
    LT.closeGarage();
    LT.ilerlemeyiSifirla();
    LT.openStore();
  });
  ok(
    (await p.locator("#gpara").isVisible()) &&
      (await p.locator("#gpara").innerText()).includes("Fiyat") &&
      (await p.locator("#gpara").innerText()).includes("Bakiye"),
    "mağazanın fiyat ve bakiye alanları korunur",
  );
}
