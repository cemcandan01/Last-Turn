/* global LT */
// Dokunma: parmak düğmeden kayıp dışarıda kalkarsa tıklama iptal (iOS ilk dokunulan öğeye yine de tıklar; burada
// bu tıklama da gönderilir). Geri dönüp üzerinde bırakınca tıklama olur. Basılıyken "basili", dışına çıkınca söner.
// Kaydırılabilir alanda (Serbest sürüş) iOS parmak kayınca pointercancel gönderir; parmak uzun süre tutulsa da iptal.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const te = (tur, el, x, y, id) => {
      const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
      el.dispatchEvent(
        new TouchEvent(tur, {
          bubbles: true,
          cancelable: true,
          touches: tur == "touchend" ? [] : [t],
          changedTouches: [t],
        }),
      );
    };
    const orta = (el) => {
      const b = el.getBoundingClientRect();
      return [b.left + b.width / 2, b.top + b.height / 2];
    };
    LT.showMenu(["home"]);
    await w(900);
    const kart = () => document.querySelector("#menu .mk[data-nav='race']"),
      r = {};
    // 1) kartta bas, yukarı (boş alana) kaydır, orada bırak; iOS yine de karta tıklar
    let k = kart(),
      [x, y] = orta(k);
    te("touchstart", k, x, y, 1);
    r.basili = k.classList.contains("basili");
    te("touchmove", k, x, 40, 1);
    r.dismaSondu = !k.classList.contains("basili");
    te("touchend", k, x, 40, 1);
    k.click();
    r.iptal = !!document.querySelector("#menu .mk") && !document.querySelector("#menu .tk");
    // 2) bas, dışarı çık, geri gel, üstünde bırak: tıklanır
    k = kart();
    [x, y] = orta(k);
    te("touchstart", k, x, y, 2);
    te("touchmove", k, x, 40, 2);
    te("touchmove", k, x + 3, y, 2);
    r.geriYandi = k.classList.contains("basili");
    te("touchend", k, x + 3, y, 2);
    k.click();
    r.tiklandi = !!document.querySelector("#menu .tk");
    // 3) iptal edilen dokunuş başka bir düğmeye hemen yapılan tıklamayı yutmaz
    LT.showMenu(["home"]);
    k = kart();
    [x, y] = orta(k);
    te("touchstart", k, x, y, 3);
    te("touchmove", k, x, 40, 3);
    te("touchend", k, x, 40, 3);
    document.querySelector("#menu .mk[data-nav='free']").click();
    r.baskaDugme = !!document.querySelector("#menu [data-w]");
    // 4) Serbest sürüş (kaydırılabilir alan): dünya kartında bas, iOS pointercancel gönderir, parmak 1 sn dışarıda
    //    tutulup kalkar; iOS karta tıklar ama garaj açılmamalı
    k = document.querySelector("#menu [data-w='0']");
    [x, y] = orta(k);
    te("touchstart", k, x, y, 4);
    k.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 4, pointerType: "touch" }));
    te("touchmove", k, x, innerHeight - 20, 4);
    await w(1000);
    te("touchend", k, x, innerHeight - 20, 4);
    k.click();
    r.kaydirmaIptal =
      document.querySelector("#gar").classList.contains("hidden") &&
      !!document.querySelector("#menu [data-w]");
    // 5) aynı yerde: üstünde bırakınca garaj açılır
    k = document.querySelector("#menu [data-w='1']");
    [x, y] = orta(k);
    te("touchstart", k, x, y, 5);
    te("touchend", k, x, y, 5);
    k.click();
    r.dunyaTiklandi = !document.querySelector("#gar").classList.contains("hidden");
    LT.closeGarage();
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    r.basili &&
      r.dismaSondu &&
      r.iptal &&
      r.geriYandi &&
      r.tiklandi &&
      r.baskaDugme &&
      r.kaydirmaIptal &&
      r.dunyaTiklandi,
    "dokunma: düğmeden kayıp dışarıda bırakınca tıklama iptal (kaydırılabilir ekranda da), geri dönüp bırakınca tıklanır, başka düğmeyi etkilemez " +
      JSON.stringify(r),
  );
}
