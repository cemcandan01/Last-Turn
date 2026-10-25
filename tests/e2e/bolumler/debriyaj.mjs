/* global LT */
// El freni: tuş girişi basılı tutma ve bırakmada çalışır, görünürlük ayarı ve ekran sınırları korunur.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const sorun = [];
    LT.demoStop();
    for (const c of [
      { steer: "btn", gas: "btn" },
      { steer: "wheel", gas: "analog" },
      { steer: "tilt", gas: "auto" },
    ]) {
      Object.assign(LT.CT, c);
      Object.assign(LT.gorunum, { debriyaj: "acik" });
      LT.hudDuzeniUygula();
      LT.startWorld(1);
      const e = document.querySelector("#dbr"),
        k = e?.getBoundingClientRect();
      if (!k || k.width < 40 || k.height < 40) sorun.push(c.gas + ": el freni tuşu yok ya da küçük");
      else if (k.left < 0 || k.top < 0 || k.right > innerWidth || k.bottom > innerHeight)
        sorun.push(c.gas + ": tuş ekrandan taşıyor");
      if (e?.textContent?.trim() !== "EL FRENİ") sorun.push("EL FRENİ yazısı görünmüyor");
      Object.assign(LT.gorunum, { debriyaj: "kapali" });
      LT.hudDuzeniUygula();
      if (e && e.getBoundingClientRect().width > 0) sorun.push(c.gas + ": Kapalı seçilince tuş görünüyor");
    }
    Object.assign(LT.CT, { steer: "btn", gas: "btn" });
    Object.assign(LT.gorunum, { debriyaj: "acik" });
    LT.hudDuzeniUygula();
    LT.startWorld(1);
    return { sorun };
  });
  const k = await p.locator("#dbr").boundingBox();
  await p.keyboard.down("Space");
  const spaceDown = await p.evaluate(() => LT.I.dbr);
  await p.keyboard.up("Space");
  const spaceUp = await p.evaluate(() => LT.I.dbr);
  await p.keyboard.down("c");
  const cDown = await p.evaluate(() => LT.I.dbr);
  await p.keyboard.up("c");
  const cUp = await p.evaluate(() => LT.I.dbr);
  await p.evaluate(() => (LT.I.g = 1));
  await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await p.mouse.down();
  const touchDown = await p.evaluate(() => ({ dbr: LT.I.dbr, gas: LT.I.g }));
  await p.mouse.up();
  const touchUp = await p.evaluate(() => LT.I.dbr);
  await p.evaluate(() => (LT.I.g = 0));
  ok(
    r.sorun.length == 0,
    "el freni yazısı, görünürlüğü ve ekran sınırları: " + (r.sorun.join("; ") || "uygun"),
  );
  ok(
    spaceDown == 1 && spaceUp == 0 && cDown == 1 && cUp == 0,
    "Space ve C tuşları el frenini basıp bırakıyor",
  );
  ok(
    touchDown.dbr == 1 && touchUp == 0 && touchDown.gas == 1,
    "el freni gazla birlikte basılıyor ve bırakılıyor",
  );
}
