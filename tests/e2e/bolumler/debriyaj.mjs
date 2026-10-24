/* global LT */
// Debriyaj tuşu: her kontrol türünde görünür, ekranın içinde; basılı tutunca motor devirlenir, araç hızlanmaz;
// bırakınca vuruş; Göstergeler → Debriyaj "Kapalı" seçilince gizlenir
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const sorun = [];
    LT.demoStop();
    const dp = LT.EVENTS.findIndex((e) => e.ty == "dp");
    for (const c of [
      { steer: "btn", gas: "btn" },
      { steer: "wheel", gas: "analog" },
      { steer: "tilt", gas: "auto" },
    ]) {
      Object.assign(LT.CT, c);
      Object.assign(LT.gorunum, { debriyaj: "acik" });
      LT.hudDuzeniUygula();
      LT.startEvent(dp, 0);
      const e = document.querySelector("#dbr"),
        k = e && e.getBoundingClientRect();
      if (!k || k.width < 40 || k.height < 40) sorun.push(c.gas + ": debriyaj tuşu yok ya da küçük");
      else if (k.left < 0 || k.top < 0 || k.right > innerWidth || k.bottom > innerHeight)
        sorun.push(c.gas + ": debriyaj tuşu ekrandan taşıyor");
      Object.assign(LT.gorunum, { debriyaj: "kapali" });
      LT.hudDuzeniUygula();
      if (e && e.getBoundingClientRect().width > 0) sorun.push(c.gas + ": Kapalı seçilince tuş görünüyor");
      Object.assign(LT.gorunum, { debriyaj: "acik" });
      LT.hudDuzeniUygula();
    }
    return { sorun };
  });
  // tuşlar + gaz: hızlan, debriyaja bas (devir yükselir, hız artmaz), bırak (motor yeniden bağlanır)
  const bekle = (sn) =>
    p.evaluate(async (sn) => {
      const t0 = LT.sim.d.zaman;
      while (LT.sim.d.zaman - t0 < sn) await new Promise((r) => setTimeout(r, 20));
    }, sn);
  const durum = () =>
    p.evaluate(() => ({
      v: Math.hypot(LT.sim.S.vx, LT.sim.S.vz),
      dbr: LT.I.dbr,
      rpm: LT.sim.yeni.rpm,
      on: document.querySelector("#dbr").classList.contains("on"),
      bagli: LT.sim.yeni.serbestDevir == 0,
    }));
  await p.evaluate(() => {
    Object.assign(LT.CT, { steer: "btn", gas: "btn" });
    LT.startWorld(1);
    LT.I.g = 1;
  });
  await bekle(2);
  const k = await p.locator("#dbr").boundingBox(),
    d0 = await durum();
  await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await p.mouse.down();
  await bekle(0.5);
  const d1 = await durum();
  await p.mouse.up();
  await bekle(1);
  const d2 = await durum();
  await p.evaluate(() => (LT.I.g = 0));
  Object.assign(r, {
    basili: d1.dbr,
    birak: d2.dbr,
    turuncu: d1.on,
    v0: d0.v,
    v1: d1.v,
    rpm: d1.rpm,
    bagli: d2.bagli,
  });
  ok(
    r.sorun.length == 0,
    "debriyaj tuşu her kontrol türünde: " + (r.sorun.join("; ") || "görünür, Kapalı'da gizli"),
  );
  ok(
    r.basili == 1 && r.birak == 0 && r.turuncu,
    `dokunuş debriyaj girdisine geçiyor (basılı ${r.basili}, bırakınca ${r.birak})`,
  );
  ok(
    r.v1 <= r.v0 + 0.05 && r.rpm > 6000 && r.bagli,
    `basılıyken hızlanmıyor (${(r.v0 * 3.6).toFixed(0)} → ${(r.v1 * 3.6).toFixed(0)} km/sa), devir ${Math.round(r.rpm)}; bırakınca motor bağlı`,
  );
}
