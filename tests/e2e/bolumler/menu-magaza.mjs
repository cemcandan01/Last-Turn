/* global LT */
// Ana menü Mağaza paneli: altı panel sırayla (Yarış, Serbest sürüş, Garaj, Mağaza, Profil, Ayarlar), Mağaza'ya dokununca
// mağaza ekranı (garaj #gar, mg kipi) açılır, Geri ana menüye döner.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms));
    LT.showMenu(["home"]);
    await w(900);
    const sira = [...document.querySelectorAll("#menu .mk")].map((e) => e.dataset.nav);
    const k = document.querySelector("#menu .mk[data-nav='store']");
    const tasma = document.documentElement.scrollWidth > innerWidth;
    k?.click();
    await w(900);
    const gar = document.querySelector("#gar");
    const acildi = !!gar && !gar.classList.contains("hidden") && !!document.querySelector("#gbk");
    document.querySelector("#gbk")?.click();
    await w(900);
    return { sira, tasma, acildi, geriMenu: !!document.querySelector("#menu .mk[data-nav='store']") };
  });
  ok(
    r.sira.join() == "race,free,garage,store,profile,settings" && !r.tasma && r.acildi && r.geriMenu,
    "menü: altı panel, Mağaza paneli mağazayı açar, Geri ana menüye döner " + JSON.stringify(r),
  );
}
