/* global LT */
import fs from "node:fs";
export default async function ({ p, ok }) {
  const sonuc = await p.evaluate(() => {
    LT.demoStop();
    const son = { si: 0, v: 0 };
    const baslat = (ty) => {
      LT.startEvent(LT.EVENTS.findIndex((e) => e.ty == ty));
      const E = LT.yaris.EV;
      E.state = "run";
      LT.oyun.mode = "pause"; // gerçek kare döngüsü yerine belirlenimci sabit adımlar
      return E;
    };
    const koy = (E, k, ofset) => {
      const P = E.TR.P[k],
        T = E.TR.T[k];
      LT.sim.S.x = P[0] + T[1] * ofset;
      LT.sim.S.z = P[1] - T[0] * ofset;
      LT.ipucu.ti = k;
    };
    const sonuc = [];
    for (const ty of ["gp", "rx", "rl", "dp", "dg"]) {
      const E = baslat(ty),
        k = Math.floor(E.TR.N * 0.25);
      E.lap = 1;
      E.t = 20;
      E.score = 100;
      E.combo = 30;
      koy(E, k, E.TR.hw + 8);
      LT.evTick(1 / 60, son);
      const ilk = { ...E.pistDisi.ilk };
      koy(E, Math.floor(E.TR.N * 0.6), E.TR.hw + 8);
      for (let n = 1; n < 360; n++) LT.evTick(1 / 60, son);
      const erken = E.pistDisi.ilk !== null;
      LT.sim.S.vx = 30;
      LT.sim.S.vz = 20;
      LT.evTick(1 / 60, son);
      sonuc.push([
        ty,
        erken &&
          E.pistDisi.ilk === null &&
          Math.hypot(LT.sim.S.x - ilk.x, LT.sim.S.z - ilk.z) < 0.01 &&
          Math.abs(LT.sim.S.h - ilk.h) < 0.001 &&
          LT.sim.S.vx === 0 &&
          LT.sim.S.vz === 0 &&
          E.lap === 1 &&
          E.score === 100 &&
          E.combo === 0 &&
          E.t > 25 &&
          E.state === "run",
      ]);
    }
    const E = baslat("gp"),
      k = Math.floor(E.TR.N * 0.3);
    koy(E, k, E.TR.hw + 8);
    LT.evTick(2, son);
    koy(E, k, 0);
    LT.evTick(1 / 60, son);
    const erkenDonus = E.pistDisi.ilk === null && E.pistDisi.sure === 0;
    // ekran ortasında geri sayım: kısa taşmada yok, sonra kalan saniye, piste dönünce kaybolur
    const gsy = document.querySelector("#gsy"),
      gorunen = () => (gsy.classList.contains("hidden") ? "" : gsy.querySelector("b").textContent);
    koy(E, k, E.TR.hw + 8);
    LT.evTick(0.3, son);
    LT.hudGuncelle(0);
    const kisa = gorunen();
    LT.evTick(1, son);
    LT.hudGuncelle(0);
    const bes = gorunen();
    const r = gsy.getBoundingClientRect();
    const ortada =
      Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2 &&
      r.top + r.height / 2 > innerHeight / 3 &&
      r.top + r.height / 2 < (innerHeight * 2) / 3;
    LT.evTick(4.3, son);
    LT.hudGuncelle(0);
    const bir = gorunen();
    koy(E, k, 0);
    LT.evTick(1 / 60, son);
    LT.hudGuncelle(0);
    const geriSayim = kisa === "" && bes === "5" && bir === "1" && ortada && gorunen() === "";
    E.state = "count";
    koy(E, k, E.TR.hw + 8);
    LT.evTick(6, son);
    return { sonuc, erkenDonus, geriSayim, sayim: E.pistDisi.sure === 0 };
  });
  for (const [ty, gecti] of sonuc.sonuc)
    ok(gecti, ty + ": 1+5 sn sınırı, ilk çıkış hizası, hız/yön/süre/tur/puan");
  ok(sonuc.erkenDonus && sonuc.sayim, "erken dönüş temizler, geri sayımda otomatik dönüş yok");
  ok(
    sonuc.geriSayim,
    "pist dışında 1 sn sonra ekran ortasında 5…1 geri sayım, ilk saniyede ve dönüşte gizli",
  );
  const durmus = await p.evaluate(() => ({ t: LT.yaris.EV.t, sure: LT.yaris.EV.pistDisi.sure }));
  await p.waitForTimeout(150);
  ok(
    await p.evaluate((d) => LT.yaris.EV.t === d.t && LT.yaris.EV.pistDisi.sure === d.sure, durmus),
    "duraklatmada yarış ve pist dışı süresi donuk",
  );
  await p.evaluate(() => {
    LT.oyun.mode = "drive";
    LT.showSet();
  });
  const once = await p.evaluate(() => ({
    i: LT.yaris.EV.i,
    car: LT.oyun.CAR.n,
    sv: JSON.stringify(LT.yaris.EV.sv),
  }));
  ok(await p.locator("#restart").isVisible(), "yarış duraklatma menüsünde Yeniden başlat görünür");
  fs.mkdirSync("tests/cikti", { recursive: true });
  await p.screenshot({ path: "tests/cikti/yarista-reset-iphone13.png" });
  const dugme = await p.locator("#restart").boundingBox();
  ok(
    dugme && dugme.x >= 0 && dugme.y >= 0 && dugme.x + dugme.width <= 844 && dugme.y + dugme.height <= 390,
    "yeniden başlat düğmesi iPhone 13 yatay alana sığıyor",
  );
  await p.locator("#restart").click();
  ok(
    await p.evaluate((once) => {
      const E = LT.yaris.EV;
      return (
        E.i === once.i &&
        LT.oyun.CAR.n === once.car &&
        JSON.stringify(E.sv) === once.sv &&
        E.state === "count" &&
        E.t === 0 &&
        E.score === 0 &&
        E.lap === 0 &&
        E.pistDisi.sure === 0 &&
        LT.oyun.mode === "drive" &&
        document.querySelector("#set").classList.contains("hidden") &&
        LT.sim.S.x === E.g[1] &&
        LT.sim.S.z === E.g[2]
      );
    }, once),
    "yeniden başlat aynı yarış/araç/kurulumla sıfır sayaç ve geri sayım açar",
  );
  await p.evaluate(() => {
    LT.startWorld(0);
    LT.showSet();
  });
  ok((await p.locator("#restart").count()) === 0, "serbest sürüşte yarış yeniden başlatma görünmez");
  const lastikler = await p.evaluate(() => {
    LT.startWorld(0);
    LT.kurulum.tire = 5;
    LT.kurulum.custom = true;
    const once = JSON.stringify(LT.kurulum);
    const sonuc = [];
    for (const [ty, tire] of [
      ["gp", 0],
      ["rx", 2],
      ["rl", 1],
      ["dp", 3],
      ["dg", 6],
    ]) {
      LT.startEvent(LT.EVENTS.findIndex((e) => e.ty === ty));
      const otomatik = LT.kurulum.tire === tire;
      LT.lastikDegistir();
      LT.showSet();
      const kilitli =
        LT.kurulum.tire === tire &&
        document.querySelector("#ts").classList.contains("hidden") &&
        !document.querySelector("#set [data-t]");
      LT.applyPreset();
      const yardim = LT.kurulum.tire === tire;
      LT.yarisiYenidenBaslat();
      const tekrar = LT.kurulum.tire === tire;
      LT.startWorld(0);
      sonuc.push([ty, otomatik && kilitli && yardim && tekrar && JSON.stringify(LT.kurulum) === once]);
    }
    LT.lastikDegistir();
    LT.showSet();
    return {
      sonuc,
      serbest:
        LT.kurulum.tire === 6 &&
        !document.querySelector("#ts").classList.contains("hidden") &&
        !!document.querySelector("#set [data-t]"),
    };
  });
  for (const [ty, gecti] of lastikler.sonuc)
    ok(gecti, ty + ": uygun lastik, yarışta kilit, yardım/restart koruma, önceki lastiğe dönüş");
  ok(lastikler.serbest, "lastik kısayolu ve seçim listesi yalnız serbest sürüşte çalışır");
}
