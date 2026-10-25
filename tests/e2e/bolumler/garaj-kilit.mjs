/* global LT */
// Garajda yalnız sahip olunan araçlar: temiz profilde kilitli/satılık araç gezilmez, satın alma düğmesi yok;
// ralli yarışında türün alınmamış aracı varsa "Kurulumunu geliştir" ipucu modifiyeyi açar, Geri garaja döner.
// Ekran görüntüsü: tests/cikti/garaj-sahip.png (iPhone 13 yatay).
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
    LT.openGarage(ev("rl", 1));
    s.mod = LT.oyun.mode;
    s.recAcik = LT.aracAcikMi(LT.CARS.indexOf(LT.oyun.CAR));
    s.ziyaret = [];
    for (let k = 0; k < LT.CARS.length + 2; k++) {
      s.ziyaret.push(LT.CARS.indexOf(LT.oyun.CAR));
      s.kilitSinifi ||= ["kilitli", "satilik"].some((c) =>
        document.querySelector("#gar").classList.contains(c),
      );
      s.alDugmesi ||= !!document.querySelector("#gok.al, .bdg.kilit, .bdg.fiyat");
      document.querySelector("#gnx").click();
    }
    s.hepsiAcik = s.ziyaret.every((i) => LT.aracAcikMi(i));
    s.sahipSayisi = new Set(s.ziyaret).size;
    s.beklenen = LT.CARS.filter((_, i) => LT.aracAcikMi(i)).length;
    s.ipucu = !!document.querySelector("#gmg");
    return s;
  });
  ok(r.mod == "garage", "garaj açıldı");
  ok(r.recAcik, "ralli önerisi sahip olunan araca düştü");
  ok(
    r.hepsiAcik && r.sahipSayisi == r.beklenen,
    "garajda yalnız sahip olunan araçlar gezilir: " + JSON.stringify(r.ziyaret),
  );
  ok(!r.kilitSinifi && !r.alDugmesi, "garajda kilit, fiyat ve satın alma düğmesi yok");
  ok(r.ipucu, "kupa tamamlanmamış: mevcut aracı geliştirme ipucu");
  await q.waitForTimeout(500);
  fs.mkdirSync("tests/cikti", { recursive: true });
  await q.screenshot({ path: "tests/cikti/garaj-sahip.png" });
  const m = await q.evaluate(() => {
    document.querySelector("#gmg").click();
    const s = {
      mod: LT.oyun.mode,
      modifiye: document.querySelector("#gar").classList.contains("modifiye"),
    };
    s.sahip = LT.aracAcikMi(LT.CARS.indexOf(LT.oyun.CAR));
    document.querySelector("#gmgeri").click();
    s.geriGaraj = LT.oyun.mode == "garage" && !document.querySelector("#gar").classList.contains("magaza");
    return s;
  });
  ok(m.mod == "garage" && m.modifiye && m.sahip, "ipucu modifiyeyi açtı: " + JSON.stringify(m));
  ok(m.geriGaraj, "modifiyeden Geri yarış öncesi garaja döndü");
  await kx.close();
}
