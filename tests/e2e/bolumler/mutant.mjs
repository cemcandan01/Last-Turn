/* global LT */
// MUTANT: menüde Serbest sürüş yerine MUTANT, dünya → garaj → perk seçimi → görev; Tutuş Darbesi tuşu enerjiyle
// tutuşu çarpar, tuş iPhone 13 yatayda tuşlara/göstergelere değmez; koşu biter, özet; yarışta çarpan 1.
export default async function ({ p, ok }) {
  const akis = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
    const r = {};
    LT.demoStop();
    LT.showMenu(["home"]);
    const menu = document.querySelector("#menu").textContent;
    r.menuMutant = menu.includes("MUTANT") && !menu.includes("Serbest sürüş");
    LT.showMenu(["free"]);
    document.querySelector("[data-w='1']").click();
    r.garaj = !document.querySelector("#gar").classList.contains("hidden");
    document.querySelector("#gok").click();
    const res = document.querySelector("#res");
    r.secim = LT.oyun.mode == "result" && res.querySelectorAll("[data-perk]").length == 3;
    res.querySelector("[data-perk]").click();
    r.surus = LT.oyun.mode == "drive" && !!LT.mutant.kosu?.gorev && !!document.querySelector("#ctl #mdb");
    await bekle(200);
    r.panel =
      document.querySelector("#ev").textContent.includes("/") &&
      document.querySelector("#hName").textContent.startsWith("MUTANT");
    // darbe: enerji ver, tuşa bas
    const k = LT.mutant.kosu,
      g0 = LT.yerel.cx.dunya.havaTutusu();
    k.mek = { ...k.mek, enerji: k.mek.kapasite };
    document.querySelector("#mdb").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await bekle(250);
    r.darbe = k.mek.etkiKalan > 0 && document.querySelector("#mdb").classList.contains("on");
    r.carpan = LT.yerel.cx.dunya.havaTutusu() / g0;
    // görev süresi dolsun: koşu biter, özet
    k.gorev.kalan = 0.01;
    await bekle(250);
    r.ozet =
      LT.oyun.mode == "result" && res.textContent.includes("Koşu bitti") && !!res.querySelector("#mYeni");
    res.querySelector("#mMenu").click();
    r.kapandi = LT.oyun.mode == "menu" && LT.mutant.kosu === null;
    // yarışta MUTANT yok, tutuş çarpanı 1
    LT.startEvent(0, 0);
    r.yarisCarpan = LT.yerel.cx.dunya.havaTutusu() === LT.ortam.g && !document.querySelector("#mdb");
    LT.showMenu(["home"]);
    return r;
  });
  ok(akis.menuMutant, "ana menüde Serbest sürüş yerine MUTANT");
  ok(akis.garaj && akis.secim, "MUTANT: dünya → garaj → 3 perkli seçim ekranı");
  ok(akis.surus && akis.panel, "perk seçilince sürüş, görev paneli ve Tutuş Darbesi tuşu");
  ok(
    akis.darbe && Math.abs(akis.carpan - 1.2) < 1e-6,
    `Tutuş Darbesi enerjiyle açılıyor, tutuş x${akis.carpan.toFixed(2)}`,
  );
  ok(akis.ozet && akis.kapandi, "süre dolunca koşu özeti; ana menüye dönünce koşu kapanıyor");
  ok(akis.yarisCarpan, "yarışta MUTANT tuşu yok, tutuş çarpanı 1");

  // iPhone 13 yatay: darbe tuşu her kontrol türünde tuşlara ve göstergelere değmez, ekrandan taşmaz
  const yer = await p.evaluate(async () => {
    const sorun = [];
    const a = document.querySelector("#app").style;
    for (const [k, v] of [
      ["--sal", "47px"],
      ["--sar", "47px"],
      ["--sab", "21px"],
      ["--sat", "0px"],
    ])
      a.setProperty(k, v);
    const kesisir = (x, y) => x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
    for (const c of [
      { steer: "btn", gas: "btn" },
      { steer: "wheel", gas: "analog" },
      { steer: "tilt", gas: "auto" },
    ]) {
      Object.assign(LT.CT, c);
      LT.demoStop();
      LT.mutantBasla(1);
      document.querySelector("#res [data-perk]").click();
      await new Promise((r) => setTimeout(r, 120));
      const m = document.querySelector("#mdb").getBoundingClientRect();
      if (m.left < 0 || m.right > innerWidth || m.top < 0 || m.bottom > innerHeight)
        sorun.push(`${c.steer}/${c.gas}: tuş ekrandan taşıyor`);
      for (const s of ["#l", "#r", "#wz", "#cal", "#dbr", "#b", "#g", "#pd", ".hTL", ".hSP", "#mm", ".hBt"]) {
        const e = document.querySelector(s);
        if (!e || e.offsetParent === null) continue;
        if (kesisir(m, e.getBoundingClientRect())) sorun.push(`${c.steer}/${c.gas}: ${s} ile çakışıyor`);
      }
    }
    Object.assign(LT.CT, { steer: "btn", gas: "btn" });
    for (const k of ["--sal", "--sar", "--sab", "--sat"]) a.removeProperty(k);
    LT.showMenu(["home"]);
    return sorun;
  });
  ok(
    !yer.length,
    "Tutuş Darbesi tuşu 3 kontrol türünde çakışmasız" + (yer.length ? " — " + yer.join("; ") : ""),
  );
}
