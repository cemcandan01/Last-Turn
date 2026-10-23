/* global LT */
// Garaj araç kilitleri: temiz profilde kilitli araç vitrinde görünür, Seç devre dışı, öneri açık araca düşer.
// Ekran görüntüsü: tests/cikti/garaj-kilit.png (iPhone 13 yatay).
import fs from "node:fs";
export default async function ({ p, ok }) {
  const url = p.url().split("?")[0] + "?" + Date.now();
  const kx = await p
    .context()
    .browser()
    .newContext({ viewport: { width: 844, height: 390 } });
  const q = await kx.newPage();
  await q.goto(url);
  await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
  const r = await q.evaluate(() => {
    LT.demoStop();
    const ev = (ty, lv) => LT.EVENTS.findIndex((e) => e.ty == ty && e.lv == lv),
      s = {};
    // ralli Çaylak: Mavi Yıldız (3) kilitli -> öneri açık araç
    LT.openGarage(ev("rl", 1));
    s.mod = LT.oyun.mode;
    s.recAcik = LT.aracAcikMi(LT.CARS.indexOf(LT.oyun.CAR));
    s.recBadge = !!document.querySelector(".bdg.rec");
    s.baslangicKilitli = document.querySelector("#gar").classList.contains("kilitli");
    // kilitli araca git (Beyaz Kurt=2)
    for (let k = 0; k < 6 && LT.CARS.indexOf(LT.oyun.CAR) != 2; k++) document.querySelector("#gnx").click();
    s.kilitliSecili = LT.CARS.indexOf(LT.oyun.CAR) == 2;
    const b = document.querySelector("#gok");
    s.disabled = b.disabled;
    s.yazi = b.textContent;
    s.rozet = !!document.querySelector(".bdg.kilit");
    s.panelKilit = document.querySelector("#gar").classList.contains("kilitli");
    document.querySelector("#gok").click();
    s.hala = LT.oyun.mode == "garage" && !LT.yaris.EV;
    // açık araca dönünce Seç etkin
    document.querySelector("#gpv").click();
    document.querySelector("#gpv").click();
    s.acikEtkin = !document.querySelector("#gok").disabled && !document.querySelector(".bdg.kilit");
    return s;
  });
  ok(r.mod == "garage", "garaj açıldı");
  ok(r.recAcik && r.recBadge, "ralli önerisi açık araca düştü");
  ok(!r.baslangicKilitli, "açık araçta kilit yok");
  ok(
    r.kilitliSecili && r.disabled && r.rozet && r.panelKilit,
    "kilitli araç gezilir, Seç devre dışı: " + JSON.stringify(r),
  );
  ok(/Seviye 4/.test(r.yazi), "Seç yerine seviye yazısı: " + r.yazi);
  ok(r.hala, "kilitli araçla yarış başlamadı");
  ok(r.acikEtkin, "açık araca dönünce Seç etkin");
  await q.evaluate(() => {
    for (let k = 0; k < 6 && LT.CARS.indexOf(LT.oyun.CAR) != 2; k++) document.querySelector("#gnx").click();
  });
  await q.waitForTimeout(600);
  fs.mkdirSync("tests/cikti", { recursive: true });
  await q.screenshot({ path: "tests/cikti/garaj-kilit.png" });
  await kx.close();
}
