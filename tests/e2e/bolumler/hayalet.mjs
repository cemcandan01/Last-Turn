/* global LT */
export default async function ({ p, ok }) {
  const r = await p.evaluate(() => {
    LT.demoStop();
    const i = LT.EVENTS.findIndex((e) => e.ty === "gp" && e.lv === 4);
    LT.startEvent(i, 10);
    LT.yaris.EV.state = "run";
    LT.oyun.mode = "pause";
    LT.I.g = 1;
    for (let n = 0; n < 120; n++) LT.surusAdimi();
    LT.I.g = 0;
    const beklenen = { x: LT.sim.S.x, z: LT.sim.S.z, h: LT.sim.S.h };
    LT.endEvent();
    const anahtar = LT.EVENTS[i].k;
    const kayit = LT.hayaletOku(anahtar);
    LT.startEvent(i, 0);
    const H = LT.rekorHayaleti;
    const kurulum = H.aktif && H.cx.kurulum.car.hp === LT.CARS[10].hp;
    LT.yaris.EV.state = "run";
    LT.oyun.mode = "pause";
    // Ayar: kapalıyken çizilmez ama oynatma sürer; açınca kaldığı adımdan görünür.
    const cizili = () => LT.uzak.araclar.some((a) => a.id === "hayalet");
    for (let n = 0; n < 100; n++) LT.surusAdimi();
    LT.set.rh = 0;
    LT.surusAdimi();
    const kapali = !cizili() && H.adimIndex === 101;
    LT.set.rh = 1;
    LT.surusAdimi();
    const acik = cizili() && H.adimIndex === 102;
    for (let n = 0; n < 18; n++) LT.surusAdimi();
    const ayni = H.adimIndex === 120 && Math.hypot(H.sim.S.x - beklenen.x, H.sim.S.z - beklenen.z) < 1e-6;
    const ti = LT.ipucu.ti,
      bolge = LT.dunya.cur;
    H.cx.dunya.surf(LT.EVENTS[i].g[1], LT.EVENTS[i].g[2]);
    const bagimsiz = ti === LT.ipucu.ti && bolge === LT.dunya.cur;
    const E = LT.yaris.EV,
      k = Math.floor(E.TR.N / 3),
      P = E.TR.P[k],
      T = E.TR.T[k];
    LT.sim.S.x = P[0] + T[1] * (E.TR.hw + 10);
    LT.sim.S.z = P[1] - T[0] * (E.TR.hw + 10);
    LT.ipucu.ti = k;
    const adim = H.adimIndex;
    LT.evTick(6.1, { si: 0, v: 0 });
    const donus = LT.yerel.kayit.kesik && H.adimIndex === adim;
    localStorage.removeItem("lt_hayalet_" + anahtar);
    for (let n = 0; n < 10; n++) LT.surusAdimi();
    LT.endEvent();
    const yarim = LT.hayaletOku(anahtar) === null;
    LT.startWorld(0);
    return { kayit: !!kayit, kurulum, ayni, kapali, acik, bagimsiz, donus, yarim, durdu: !H.aktif };
  });
  for (const [k, v] of Object.entries(r)) ok(v, "hayalet: " + k);
}
