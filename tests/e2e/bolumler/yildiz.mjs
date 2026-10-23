/* global LT */
// Yıldız görselleri: pist kartında en iyi yıldız, yarış ayrıntısında 3 eşik, yarış sonu ekranında alınan yıldızlar ve eşikler.
export default async function ({ p, ok }) {
  const r = await p.evaluate(() => {
    const r = {},
      i = LT.EVENTS.findIndex((e) => e.ty == "gp" && e.lv == 3);
    localStorage.setItem("lt_yildiz", JSON.stringify({ asphalt_3: 2 }));
    LT.showMenu(["race", "t:gp"]);
    const kart = document.querySelector('#menu .rc[data-ev="' + i + '"]');
    r.liste = kart.querySelectorAll(".ys i").length == 3 && kart.querySelectorAll(".ys i.dolu").length == 2;
    LT.showMenu(["race", "t:gp", "e:" + i]);
    r.detay = document.querySelectorAll("#menu .yes > span").length == 3;
    LT.startEvent(i);
    const E = LT.yaris.EV;
    E.t = E.ys[2] - 1;
    LT.endEvent();
    const res = document.querySelector("#res");
    r.sonuc3 =
      res.querySelectorAll(".ys.buyuk i.dolu").length == 3 &&
      res.querySelectorAll(".yres small span").length == 3;
    r.eskiSatirYok = !/Yıldız eşikleri/.test(res.textContent);
    LT.leaveEvent?.();
    res.classList.add("hidden");
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    Object.values(r).every(Boolean),
    "yıldız görselleri: pist kartı, ayrıntı eşikleri, sonuç ekranı " + JSON.stringify(r),
  );
}
