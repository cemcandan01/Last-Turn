/* global LT */
import fs from "node:fs";
export default async function ({ p, ok }) {
  const r = await p.evaluate(() => {
    LT.demoStop();
    const eskiIlerleme = LT.ilerlemeVerisi(),
      eskiYildiz = localStorage.getItem("lt_yildiz"),
      eskiParca = localStorage.getItem("lt_parca");
    const anahtarlar = [
      "sv_asphalt_1",
      "sv_deneme_asphalt_1",
      "lt_hayalet_asphalt_1",
      "lt_hayalet_deneme_asphalt_1",
    ];
    const eski = Object.fromEntries(anahtarlar.map((k) => [k, localStorage.getItem(k)]));
    try {
      const i = LT.EVENTS.findIndex((e) => e.ty == "gp" && e.lv == 1);
      localStorage.removeItem("lt_yildiz");
      LT.takiliYukle({}, true);
      LT.startEvent(i, 10);
      const uygun = LT.yaris.EV.kariyer;
      LT.yaris.EV.state = "run";
      LT.yaris.EV.t = LT.yaris.EV.ys[1];
      LT.endEvent();
      const b = LT.ilerlemeVerisi(),
        para = LT.para();
      LT.endEvent();
      const tekil = LT.para() === para && LT.ilerlemeVerisi().xp === b.xp;
      const yildiz = JSON.stringify(LT.ilerlemeVerisi().yildiz);
      const rekor = localStorage.getItem("sv_asphalt_1");
      LT.startEvent(i, 0);
      const deneme = !LT.yaris.EV.kariyer && LT.yaris.EV.k.startsWith("deneme_");
      LT.yaris.EV.state = "run";
      LT.yaris.EV.t = 1;
      LT.endEvent();
      const odulsuz =
        LT.yaris.EV.xp === 0 &&
        LT.yaris.EV.para === 0 &&
        LT.para() === para &&
        JSON.stringify(LT.ilerlemeVerisi().yildiz) === yildiz &&
        localStorage.getItem("sv_asphalt_1") === rekor;
      const acik = !!document.querySelector("#res")?.textContent.includes("Serbest deneme");
      LT.openGarage(i);
      return {
        uygun,
        tekil,
        deneme,
        odulsuz,
        acik,
        onerilen: document.querySelector("#gok")?.textContent.includes("Yarış:"),
        kupa: document.querySelector("#gar")?.textContent.includes("Kupa D200"),
      };
    } finally {
      LT.leaveEvent();
      LT.ilerlemeYukle(eskiIlerleme, true);
      localStorage.setItem("lt_ilerleme", JSON.stringify(eskiIlerleme));
      if (eskiYildiz == null) localStorage.removeItem("lt_yildiz");
      else localStorage.setItem("lt_yildiz", eskiYildiz);
      if (eskiParca == null) localStorage.removeItem("lt_parca");
      else localStorage.setItem("lt_parca", eskiParca);
      for (const [k, v] of Object.entries(eski))
        if (v == null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      LT.ilerlemeSifirla();
      LT.modifiyeSifirla();
      LT.showMenu(["home"]);
      LT.demoStop();
    }
  });
  for (const [k, v] of Object.entries(r)) ok(v, "kariyer: " + k);
  await p.evaluate(() => {
    LT.demoStop();
    const i = LT.EVENTS.findIndex((e) => e.ty == "gp" && e.lv == 1);
    LT.openGarage(i);
  });
  fs.mkdirSync("tests/cikti", { recursive: true });
  await p.waitForTimeout(100);
  await p.screenshot({ path: "tests/cikti/kariyer-kupa-iphone13.png" });
  await p.evaluate(() => LT.showMenu(["home"]));
}
