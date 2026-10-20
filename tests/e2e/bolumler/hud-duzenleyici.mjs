/* global LT */
// HUD düzenleyici: ayarlardan açılıyor, seçim anında uygulanıyor, kalıcı
export default async function ({ p, ok }) {
  const hd = await p.evaluate(async () => {
    LT.showMenu(["settings"]);
    const ac = document.querySelector("[data-hdac]");
    if (!ac) return { hata: "ayarlarda Göstergeler yok" };
    ac.click();
    const r = {
      acik: LT.duzenleyici.acik,
      hud: !document.querySelector("#hud").classList.contains("hidden"),
      menuGizli: document.querySelector("#menu").classList.contains("hidden"),
    };
    document.querySelector('#hdP [data-pr="hiz"][data-v="bant"]').click();
    r.bant = document.querySelector("#app").dataset.hiz == "bant";
    document.querySelector('#hdP [data-hz="kadran"]').click();
    r.kadran = document.querySelector("#app").dataset.harita == "yuvarlak";
    await new Promise((r) => setTimeout(r, 200));
    r.ornek = document.querySelector("#spd").textContent == "96";
    // seçim paneli göstergelere değmiyor
    const pr = document.querySelector("#hdP").getBoundingClientRect();
    r.cakisma = [".hTL", ".hBt", "#dr", ".hSP", "#mm", "#ctl > *"]
      .flatMap((q) => [...document.querySelectorAll(q)])
      .map((e) => e.getBoundingClientRect())
      .some(
        (b) => b.width && pr.left < b.right && b.left < pr.right && pr.top < b.bottom && b.top < pr.bottom,
      );
    document.querySelector("#hdOk").click();
    r.kapandi = !LT.duzenleyici.acik && !document.querySelector("#menu").classList.contains("hidden");
    r.kayit = JSON.parse(localStorage.getItem("lt_ayar") || "{}").hud?.hiz == "kadran";
    Object.assign(LT.gorunum, LT.HUDLAR.kose.p);
    LT.hudDuzeniUygula();
    return r;
  });
  ok(
    hd.acik &&
      hd.hud &&
      hd.menuGizli &&
      hd.bant &&
      hd.kadran &&
      hd.ornek &&
      !hd.cakisma &&
      hd.kapandi &&
      hd.kayit,
    "HUD düzenleyici: ayarlardan açılıyor, seçim anında uygulanıyor, kalıcı, panel göstergelere değmiyor " +
      JSON.stringify(hd),
  );
}
