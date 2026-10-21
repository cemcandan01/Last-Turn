/* global LT */
// Yarış türü kapak akışı: ortadaki tür seçili; ok, kaydırma ve yan karta dokunma türü değiştirir; ortadaki karta
// dokununca o türün pistleri açılır. Pist listesi ve yarış ayrıntısı türün rengiyle (#menu.tema, --c).
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms)),
      orta = () => [...document.querySelectorAll("#menu .tk")].findIndex((k) => k.classList.contains("on")),
      r = {};
    LT.showMenu(["race"]);
    // önceki ekranlardan hangi tür seçili kalmış olursa olsun en başa dön
    for (let i = 0; i < 6; i++) document.querySelector("#kfs").click();
    r.bes = document.querySelectorAll("#menu .tk").length == 5;
    r.basta = orta() == 0;
    document.querySelector("#kfg").click();
    r.ok = orta() == 1;
    // yan karta dokununca ortaya gelir, pist açılmaz
    document.querySelectorAll("#menu .tk")[3].click();
    r.yanKart = orta() == 3 && !document.querySelector("#menu .rlist");
    // parmakla sola kaydırınca sonraki tür
    const kf = document.querySelector("#menu .kf"),
      t = (x) => new Touch({ identifier: 1, target: kf, clientX: x, clientY: 200 });
    kf.dispatchEvent(
      new TouchEvent("touchstart", { bubbles: true, touches: [t(500)], changedTouches: [t(500)] }),
    );
    kf.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [t(380)] }));
    r.kaydirma = orta() == 4;
    // kaydırmanın hemen ardından gelen tıklama sayılmaz; biraz sonra dokunmak çalışır
    document.querySelectorAll("#menu .tk")[4].click();
    r.kaydirmaTiklamaYok = !document.querySelector("#menu .rlist");
    await w(450);
    // ortadaki karta dokununca o türün pistleri, türün rengiyle
    document.querySelectorAll("#menu .tk")[4].click();
    const m = document.querySelector("#menu");
    r.pistler = !!m.querySelector(".rlist") && m.classList.contains("tema");
    r.renk = getComputedStyle(m).getPropertyValue("--c").trim().toLowerCase() == "#ffd23c";
    r.baslikIkon = !!m.querySelector(".mti svg.ik");
    // geri dönünce aynı tür seçili
    document.querySelector("#mbk").click();
    await w(50);
    r.geriAyniTur = orta() == 4 && !m.classList.contains("tema");
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    Object.values(r).every(Boolean),
    "yarış türü kapak akışı: ok, kaydırma ve yan kartla dönüyor, ortadaki kart pistleri türün rengiyle açıyor " +
      JSON.stringify(r),
  );
}
