/* global LT */
// Garajda "Motoru dinle" butonu: o an gösterilen araç için lt:motor-dinle olayı, çalarken durum, bitince eski hâl
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const olaylar = [];
    document.addEventListener("lt:motor-dinle", (e) => olaylar.push(e.detail.arac));
    LT.demoStop();
    LT.openGarage(null);
    document.querySelector("#gnx").click();
    const b = () => document.querySelector("#gses"),
      arac = LT.CARS.indexOf(LT.oyun.CAR),
      r = { var: !!b(), yazi: b()?.textContent.trim() };
    b().click();
    r.olay = olaylar[0] === arac;
    r.calarken = b().classList.contains("on");
    // tekrar basınca yine olay (ses baştan başlar)
    b().click();
    r.tekrar = olaylar.length == 2;
    // başka araca geçince o aracın düğmesi boşta
    document.querySelector("#gnx").click();
    r.baskaAracBos = !b().classList.contains("on");
    document.querySelector("#gpv").click();
    // ses tarafı bitti deyince eski hâline döner
    document.dispatchEvent(new CustomEvent("lt:motor-dinle-bitti", { detail: { arac } }));
    r.bitti = !b().classList.contains("on");
    // panelde görünür ve ekranın içinde
    const k = b().getBoundingClientRect();
    r.gorunur = k.width > 40 && k.height > 20 && k.top >= 0 && k.bottom <= innerHeight;
    // araca bakmak sesi kendiliğinden başlatmaz
    r.kendiliginden = olaylar.length == 2;
    LT.closeGarage();
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    r.var && r.olay && r.calarken && r.tekrar && r.baskaAracBos && r.bitti && r.gorunur && r.kendiliginden,
    "garaj: Motoru dinle butonu olayı gönderiyor, çalarken durum gösteriyor, bitince eski hâline dönüyor " +
      JSON.stringify(r),
  );
}
