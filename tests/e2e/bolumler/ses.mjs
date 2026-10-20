/* global LT */
// Ses: dokununca ses açılıyor, motor sesi kuruluyor, menüde müzik, seslerle sürüşte hata yok
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
    return { surus, menu: LT.sesBilgi() };
  });
  ok(
    ss.surus.durum == "running" && ss.surus.motor,
    `dokununca ses açılıyor, motor sesi kuruluyor (${ss.surus.durum})`,
  );
  ok(ss.menu.muzik, "menüde müzik çalıyor");
  ok(p.errs.length == h0, "seslerle sürüşte hata yok " + (p.errs[h0] || ""));
}
