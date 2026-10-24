/* global LT */
// El freni tuşu: her kontrol türünde görünür, ekranın içinde; basılıyken arka tekerler kilitlenir, araç yavaşlar;
// bırakınca bırakılır; Göstergeler → El freni "Kapalı" seçilince gizlenir
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const sorun = [];
    LT.demoStop();
    // serbest sürüş ölçümü Kor RX ile (yarıştan çıkınca önceki araca döner; varsayılan araç artık başlangıç aracı)
    LT.setCar(1);
    LT.modifiyeUygula(1);
    const dp = LT.EVENTS.findIndex((e) => e.ty == "dp");
    for (const c of [
      { steer: "btn", gas: "btn" },
      { steer: "wheel", gas: "analog" },
      { steer: "tilt", gas: "auto" },
    ]) {
      Object.assign(LT.CT, c);
      Object.assign(LT.gorunum, { elfreni: "acik" });
      LT.hudDuzeniUygula();
      LT.startEvent(dp, 0);
      const e = document.querySelector("#el"),
        k = e && e.getBoundingClientRect();
      if (!k || k.width < 40 || k.height < 40) sorun.push(c.gas + ": el freni tuşu yok ya da küçük");
      else if (k.left < 0 || k.top < 0 || k.right > innerWidth || k.bottom > innerHeight)
        sorun.push(c.gas + ": el freni tuşu ekrandan taşıyor");
      Object.assign(LT.gorunum, { elfreni: "kapali" });
      LT.hudDuzeniUygula();
      if (e && e.getBoundingClientRect().width > 0) sorun.push(c.gas + ": Kapalı seçilince tuş görünüyor");
      Object.assign(LT.gorunum, { elfreni: "acik" });
      LT.hudDuzeniUygula();
    }
    return { sorun };
  });
  // tuşlar + gaz: hızlan, el frenine bas (arka tekerler kilitlenir, araç yavaşlar), bırak (arka yeniden döner)
  const bekle = (sn) =>
    p.evaluate(async (sn) => {
      const t0 = LT.sim.d.zaman;
      while (LT.sim.d.zaman - t0 < sn) await new Promise((r) => setTimeout(r, 20));
    }, sn);
  const durum = () =>
    p.evaluate(() => ({
      v: Math.hypot(LT.sim.S.vx, LT.sim.S.vz),
      el: LT.I.el,
      arka: Math.abs(LT.sim.yeni.tk[2].w) + Math.abs(LT.sim.yeni.tk[3].w),
      on: document.querySelector("#el").classList.contains("on"),
    }));
  await p.evaluate(() => {
    Object.assign(LT.CT, { steer: "btn", gas: "btn" });
    LT.startWorld(1);
    LT.I.g = 1;
  });
  await bekle(2);
  const k = await p.locator("#el").boundingBox(),
    d0 = await durum();
  await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await p.mouse.down();
  await bekle(0.4);
  const d1 = await durum();
  await p.mouse.up();
  await bekle(1);
  const d2 = await durum();
  await p.evaluate(() => (LT.I.g = 0));
  Object.assign(r, {
    basili: d1.el,
    birak: d2.el,
    turuncu: d1.on,
    v0: d0.v,
    v1: d1.v,
    arka1: d1.arka,
    arka2: d2.arka,
  });
  ok(
    r.sorun.length == 0,
    "el freni tuşu her kontrol türünde: " + (r.sorun.join("; ") || "görünür, Kapalı'da gizli"),
  );
  ok(
    r.basili == 1 && r.birak == 0 && r.turuncu,
    `dokunuş el freni girdisine geçiyor (basılı ${r.basili}, bırakınca ${r.birak})`,
  );
  ok(
    r.v1 < r.v0 && r.arka1 < 2 && r.arka2 > 10,
    `basılıyken arka kilitli ve araç yavaşlıyor (${(r.v0 * 3.6).toFixed(0)} → ${(r.v1 * 3.6).toFixed(0)} km/sa, arka teker ${r.arka1.toFixed(1)} rad/sn); bırakınca dönüyor (${r.arka2.toFixed(0)})`,
  );
}
