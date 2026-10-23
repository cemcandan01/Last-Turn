/* global LT */
// Yıldızlar ve ters sürüş: ters sürünce EV.ters kalkar; drift yarışı tur sayısıyla biter, sonuçta yıldız ve eşikler
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    LT.demoStop();
    // simülasyon saatiyle bekle (yarış bitince sim durur: en çok 20 sn gerçek süre)
    const bekle = async (sn, kosul = () => false) => {
      const t0 = LT.sim.d.zaman,
        g0 = performance.now();
      while (LT.sim.d.zaman - t0 < sn && !kosul() && performance.now() - g0 < 20000)
        await new Promise((q) => setTimeout(q, 20));
    };
    // asfalt yarışında pistin tersine gaz: bayrak kalkar; doğru yöne dönünce iner
    const gp = LT.EVENTS.findIndex((e) => e.ty == "gp" && e.lv == 1);
    LT.startEvent(
      gp,
      LT.CARS.findIndex((c) => c.ty == "gp"),
    );
    const EV = LT.yaris.EV,
      TR = EV.TR,
      k = Math.floor(TR.N * 0.3);
    EV.state = "run";
    LT.reset(TR.P[k][0], TR.P[k][1], Math.atan2(-TR.T[k][0], -TR.T[k][1]));
    LT.I.g = 0.6;
    await bekle(2.5);
    const ters = EV.ters;
    LT.reset(TR.P[k][0], TR.P[k][1], Math.atan2(TR.T[k][0], TR.T[k][1]));
    await bekle(1.5);
    const duz = EV.ters;
    LT.I.g = 0;
    // drift yarışı: son turun bitiş çizgisi geçilince yarış biter, sonuç ekranında yıldız satırları
    const dp = LT.EVENTS.findIndex((e) => e.ty == "dp" && e.lv == 1);
    LT.startEvent(
      dp,
      LT.CARS.findIndex((c) => c.ty == "dp"),
    );
    const D = LT.yaris.EV,
      DT = D.TR;
    D.state = "run";
    D.lap = D.laps - 1;
    D.armed = 1;
    D.prev = Math.floor(DT.N * 0.9);
    LT.reset(DT.P[2][0], DT.P[2][1], Math.atan2(DT.T[2][0], DT.T[2][1]));
    await bekle(1, () => D.state == "done");
    const sonuc = document.querySelector("#res").textContent;
    LT.showMenu(["home"]);
    return { ters, duz, laps: D.laps, durum: D.state, ys: D.ys.length, sonuc };
  });
  ok(
    r.ters === true && r.duz === false,
    `ters sürüşte EV.ters kalkıyor (${r.ters}), doğru yönde iniyor (${r.duz})`,
  );
  ok(
    r.laps >= 1 && r.durum == "done" && r.ys == 3 && r.sonuc.includes("Yıldız"),
    `drift yarışı ${r.laps}. tur bitince bitiyor (${r.durum}), sonuçta yıldız ve eşikler var`,
  );
}
