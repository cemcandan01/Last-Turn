/* global LT */
// Ekran görüntüleri (yalnız --goruntu): menü, garaj, yarış, kokpit, 15 pist, HUD düzenleri → tests/cikti/
export default async function ({ sayfa, fs, path, CIKTI }) {
  fs.mkdirSync(CIKTI, { recursive: true });
  console.log("Ekran görüntüleri → tests/cikti/");
  const g = await sayfa();
  const kare = async (ad, js, arg) => {
    await g.evaluate(js, arg);
    await g.waitForTimeout(1200);
    await g.screenshot({ path: path.join(CIKTI, ad + ".png") });
  };
  await kare("menu", () => LT.showMenu(["home"]));
  await kare("yaris_turu", () => LT.showMenu(["race"]));
  await kare("pist_listesi", () => LT.showMenu(["race", "t:dp"]));
  await kare("garaj", () => {
    LT.demoStop();
    LT.openGarage(null);
  });
  await kare("yaris", () => {
    LT.closeGarage();
    LT.startEvent(0, 0);
    LT.yaris.EV.state = "run";
  });
  await kare("kokpit", () => {
    LT.oyun.camMode = 3;
  });
  for (let i = 0; i < 15; i++) {
    const d = await g.evaluate(async (i) => {
      LT.oyun.camMode = 0;
      LT.startEvent(
        i,
        LT.CARS.findIndex((c) => c.ty == LT.EVENTS[i].ty),
      );
      LT.yaris.EV.state = "run";
      const TR = LT.yaris.EV.TR,
        k = Math.floor(TR.N * 0.3),
        P = TR.P[k];
      LT.reset(P[0], P[1], Math.atan2(TR.T[k][0], TR.T[k][1]));
      LT.oyun.camMode = 1;
      LT.kamera.lp = 0.25;
      LT.kamera.ly = 0.5;
      LT.kamera.lastDrag = performance.now() + 1e7;
      await new Promise((r) => setTimeout(r, 500));
      LT.R.render(LT.scene, LT.cam);
      return LT.R.domElement.toDataURL("image/jpeg", 0.8);
    }, i);
    fs.writeFileSync(
      path.join(CIKTI, `pist_${String(i).padStart(2, "0")}.jpg`),
      Buffer.from(d.split(",")[1], "base64"),
    );
  }
  // HUD düzenleri: drift yarışında kombo sürerken
  for (const hud of ["kose", "kadran", "bant", "sade"])
    await kare(
      "hud_" + hud,
      async (hud) => {
        LT.oyun.camMode = 0;
        Object.assign(LT.gorunum, LT.HUDLAR[hud].p);
        LT.hudDuzeniUygula();
        LT.startEvent(
          LT.EVENTS.findIndex((e) => e.ty == "dp"),
          2,
        );
        Object.assign(LT.yaris.EV, { score: 2844, combo: 1240, mult: 3, ct: 6.1 });
        LT.sim.S.vx = 26;
      },
      hud,
    );
  await kare("hud_duzenleyici", () => {
    LT.showMenu(["settings"]);
    LT.hudDuzenleyiciAc();
  });
  await g.evaluate(() => {
    LT.hudDuzenleyiciKapat();
    Object.assign(LT.gorunum, LT.HUDLAR.kose.p);
    LT.hudDuzeniUygula();
  });
  // virajda gövde yatışı (araç kendi kamerasıyla, otoparkta)
  const yv = await g.evaluate(async () => {
    LT.oyun.camMode = 1;
    LT.startWorld(1);
    const t0 = LT.sim.d.zaman;
    LT.I.g = 1;
    while (LT.sim.d.zaman - t0 < 2.5) await new Promise((r) => setTimeout(r, 20));
    LT.I.l = 1;
    while (LT.sim.d.zaman - t0 < 3.6) await new Promise((r) => setTimeout(r, 20));
    LT.R.render(LT.scene, LT.cam);
    const d = LT.R.domElement.toDataURL("image/jpeg", 0.85);
    LT.I.g = LT.I.l = 0;
    return d;
  });
  fs.writeFileSync(path.join(CIKTI, "viraj.jpg"), Buffer.from(yv.split(",")[1], "base64"));
  await g.close();
}
