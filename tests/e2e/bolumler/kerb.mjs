/* global LT */
// Asfalt pistlerde (5 araç × 18 asfalt pist) kerbe değmeden sarsıntı yok
export default async function ({ p, ok }) {
  // asfalt pistte duran araçta kerb sarsıntısı (kamera) kapalı: yokuşlu pistte taban yükseklik kerb sayılmaz
  const kb = await p.evaluate(async () => {
    LT.demoStop();
    LT.I.g = 0;
    const acik = [];
    for (let i = 0; i < LT.EVENTS.length; i++) {
      if (!["gp", "dp", "dg"].includes(LT.EVENTS[i].ty)) continue;
      for (let c = 0; c < LT.CARS.length; c++) {
        LT.startEvent(i, c);
        LT.yaris.EV.state = "run";
        const TR = LT.yaris.EV.TR,
          k = Math.floor(TR.N * 0.3),
          P = TR.P[k];
        LT.reset(P[0], P[1], Math.atan2(TR.T[k][0], TR.T[k][1]));
        const t0 = LT.sim.d.zaman;
        let n = 0;
        while (LT.sim.d.zaman - t0 < 0.4) {
          await new Promise((r) => requestAnimationFrame(r));
          n += LT.sim.S.kerb;
        }
        if (n) acik.push(LT.EVENTS[i].n + " / " + LT.CARS[c].n);
      }
    }
    LT.showMenu(["home"]);
    return acik;
  });
  ok(
    !kb.length,
    "asfalt pistlerde (5 araç × 18 asfalt pist) kerbe değmeden sarsıntı yok " + kb.slice(0, 3).join(", "),
  );
}
