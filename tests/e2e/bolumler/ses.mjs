/* global LT */
// Ses: dokununca ses açılıyor, motor sesi kuruluyor, menüde müzik, garajda motoru dinle, seslerle sürüşte hata yok
export default async function ({ p, ok }) {
  const h0 = p.errs.length;
  // ses ilk dokunuşta açılır (iOS kuralı)
  await p.mouse.click(420, 60);
  const ss = await p.evaluate(async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 8000 && !(LT.sesBilgi().durum == "running" && LT.sesBilgi().motor))
      await new Promise((r) => setTimeout(r, 50));
    const surus = LT.sesBilgi();
    // kendi sürüşü: önceki testler aracı yarışta ya da menüde bırakmış olabilir
    LT.startWorld(1);
    const t1 = LT.sim.d.zaman,
      g0 = performance.now();
    LT.I.g = 1;
    while (LT.sim.d.zaman - t1 < 1 && performance.now() - g0 < 10000)
      await new Promise((r) => setTimeout(r, 20));
    LT.I.g = 0;
    LT.showMenu(["home"]);
    await new Promise((r) => setTimeout(r, 300));
    const menu = LT.sesBilgi();
    // garaj: araç seçmek motoru çalıştırmaz; "motoru dinle" olayı 5 sn çalar, sonra bitti olayı gelir
    LT.openGarage(null);
    await new Promise((r) => setTimeout(r, 400));
    const garajSessiz = !LT.sesBilgi().dinliyor;
    let bitti = false;
    document.addEventListener("lt:motor-dinle-bitti", () => (bitti = true), { once: true });
    document.dispatchEvent(
      new CustomEvent("lt:motor-dinle", { detail: { arac: LT.CARS.indexOf(LT.oyun.CAR) } }),
    );
    await new Promise((r) => setTimeout(r, 300));
    const dinliyor = LT.sesBilgi().dinliyor;
    const g1 = performance.now();
    while (!bitti && performance.now() - g1 < 9000) await new Promise((r) => setTimeout(r, 100));
    LT.closeGarage();
    LT.showMenu(["home"]);
    return { surus, menu, garajSessiz, dinliyor, bitti, sure: (performance.now() - g1 + 300) / 1000 };
  });
  ok(
    ss.surus.durum == "running" && ss.surus.motor,
    `dokununca ses açılıyor, motor sesi kuruluyor (${ss.surus.durum})`,
  );
  ok(ss.menu.muzik, "menüde müzik çalıyor");
  ok(ss.garajSessiz, "garajda araç seçince motor kendiliğinden çalışmıyor");
  ok(
    ss.dinliyor && ss.bitti && ss.sure > 4 && ss.sure < 7,
    `garajda "motoru dinle": incelenen aracın motoru ~5 sn çalıyor (${ss.sure.toFixed(1)} sn)`,
  );
  ok(p.errs.length == h0, "seslerle sürüşte hata yok " + (p.errs[h0] || ""));
}
