/* global LT */
// MUTANT A1: menüde Serbest sürüş yerine MUTANT; koşu başı boss kartı + 3 kötü araç + 3 pasif; açık dünyada etkinlik
// işaretine girince kart, etkinlik koşu aracıyla ve kariyer ödülü/rekor olmadan; sonuçta koşu parası; atölyede parça;
// süre dolunca zorunlu boss; boss kaybedilince özet ve koşu kapanır; sonra normal yarış etkilenmez.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const res = document.querySelector("#res"),
      r = {};
    LT.demoStop();
    LT.showMenu(["home"]);
    const menu = document.querySelector("#menu").textContent;
    r.menu = menu.includes("MUTANT") && !menu.includes("Serbest sürüş");
    LT.showMenu(["free"]);
    document.querySelector("[data-w='0']").click();
    r.basla =
      LT.oyun.mode == "result" &&
      !!res.querySelector(".mtb") &&
      res.querySelectorAll("[data-arac]").length == 3 &&
      document.querySelector("#gar").classList.contains("hidden");
    res.querySelector("[data-arac]").click();
    r.pasif = res.querySelectorAll("[data-pasif]").length == 3;
    res.querySelector("[data-pasif]").click();
    const k = LT.mutant.kosu;
    await bekle(200);
    r.surus =
      LT.oyun.mode == "drive" &&
      k.faz == "surus" &&
      k.etkinlikler.length == 8 &&
      document.querySelector("#hName").textContent.startsWith("MUTANT") &&
      document.querySelector("#ev").textContent.includes("BOSS");
    // etkinlik işaretine dur: kart
    const e = k.etkinlikler[0],
      ilerleme = localStorage.getItem("lt_ilerleme"),
      p0 = k.para;
    LT.reset(e.x, e.z, 0);
    await bekle(1200);
    r.kart = LT.oyun.mode == "result" && !!res.querySelector("#mBasla");
    res.querySelector("#mBasla").click();
    const EV = LT.yaris.EV;
    r.etkinlik =
      !!EV && EV.mutant === true && EV.kariyer === false && EV.k.startsWith("mutant_") && EV.i == e.i;
    // hedefi geçerek bitir
    EV.state = "run";
    EV.t = 1;
    EV.score = EV.limit + 1;
    LT.endEvent();
    r.sonuc =
      res.textContent.includes("Hedef geçildi") &&
      k.para > p0 &&
      e.yapildi &&
      localStorage.getItem("lt_ilerleme") === ilerleme;
    res.querySelector("#mDevam").click();
    while (LT.oyun.mode == "result" && res.querySelector("[data-pasif]"))
      res.querySelector("[data-pasif]").click();
    await bekle(100);
    r.donus = LT.oyun.mode == "drive" && !LT.yaris.EV && Math.hypot(LT.sim.S.x - e.x, LT.sim.S.z - e.z) < 15;
    // atölye
    k.para = 2000;
    LT.reset(0, -90, 0);
    await bekle(1200);
    r.atolye = res.textContent.includes("Atölye");
    res.querySelector("[data-parca]").click();
    r.parca = k.parcalar.length == 1 && !!LT.kurulum.mod && LT.kurulum.mod.parcalar.includes(k.parcalar[0]);
    res.querySelector("#mKapat").click();
    LT.reset(140, 300, 0);
    // süre dolar: zorunlu boss
    k.kalan = 0.02;
    await bekle(400);
    r.boss =
      res.textContent.includes("Süre doldu") && !!res.querySelector("#mBoss") && !res.querySelector("#mGec");
    res.querySelector("#mBoss").click();
    const B = LT.yaris.EV;
    r.bossYaris = !!B && B.mutant && B.ty == k.boss.ty && LT.mutant.etkinlik == "boss";
    B.state = "run";
    B.t = 99999;
    B.score = 0;
    LT.endEvent();
    r.kaybetti = res.textContent.includes("Boss kazandı") && k.faz == "bitti";
    res.querySelector("#mDevam").click();
    r.ozet = res.textContent.includes("Koşu bitti") && !!res.querySelector("#mYeni");
    res.querySelector("#mMenu").click();
    r.kapandi = LT.oyun.mode == "menu" && LT.mutant.kosu === null;
    // normal yarış etkilenmez
    LT.startEvent(0, 0);
    r.normal = LT.yaris.EV.mutant === false && !LT.yaris.EV.k.startsWith("mutant_");
    LT.showMenu(["home"]);
    return r;
  });
  ok(r.menu, "ana menüde Serbest sürüş yerine MUTANT");
  ok(r.basla && r.pasif, "koşu başı: garaj yok, boss kartı, 3 kötü araç, 3 başlangıç pasifi");
  ok(r.surus, "açık dünyada 8 etkinlik, HUD'da MUTANT ve boss geri sayımı");
  ok(r.kart && r.etkinlik, "etkinlik işaretinde durunca kart; etkinlik koşu aracıyla, kariyer dışı");
  ok(
    r.sonuc && r.donus,
    "hedef geçilince koşu parası, kariyer ilerlemesi değişmez, haritada aynı yere dönüş",
  );
  ok(r.atolye && r.parca, "atölyede koşu parasıyla parça alınır ve araca takılır");
  ok(r.boss && r.bossYaris, "süre dolunca zorunlu boss yarışı, boss türünde pist");
  ok(r.kaybetti && r.ozet && r.kapandi, "boss kaybedilince koşu biter, özet, ana menüde koşu kapanır");
  ok(r.normal, "sonraki normal yarış MUTANT bayrağı taşımaz");
}
