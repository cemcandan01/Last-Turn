/* global LT */
// Dokunma: parmak düğmeden kayıp dışarıda kalkarsa tıklama iptal (iOS ilk dokunulan öğeye yine de tıklar; burada
// bu tıklama da gönderilir). Geri dönüp üzerinde bırakınca tıklama olur. Basılıyken "basili", dışına çıkınca söner.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const pe = (tur, el, x, y, id = 7) =>
      el.dispatchEvent(
        new PointerEvent(tur, {
          bubbles: true,
          cancelable: true,
          pointerId: id,
          pointerType: "touch",
          clientX: x,
          clientY: y,
          isPrimary: true,
        }),
      );
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
    pe("pointerdown", k, x, y);
    r.basili = k.classList.contains("basili");
    pe("pointermove", k, x, 40);
    r.dismaSondu = !k.classList.contains("basili");
    pe("pointerup", k, x, 40);
    k.click();
    r.iptal = !!document.querySelector("#menu .mk") && !document.querySelector("#menu .tile");
    // 2) bas, dışarı çık, geri gel, üstünde bırak: tıklanır
    k = kart();
    [x, y] = orta(k);
    pe("pointerdown", k, x, y, 8);
    pe("pointermove", k, x, 40, 8);
    pe("pointermove", k, x + 3, y, 8);
    r.geriYandi = k.classList.contains("basili");
    pe("pointerup", k, x + 3, y, 8);
    k.click();
    r.tiklandi = !!document.querySelector("#menu .tile");
    // 3) iptal edilen dokunuş başka bir düğmeye hemen yapılan tıklamayı yutmaz
    LT.showMenu(["home"]);
    k = kart();
    [x, y] = orta(k);
    pe("pointerdown", k, x, y, 9);
    pe("pointermove", k, x, 40, 9);
    pe("pointerup", k, x, 40, 9);
    document.querySelector("#menu .mk[data-nav='free']").click();
    r.baskaDugme = !!document.querySelector("#menu [data-w]");
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    r.basili && r.dismaSondu && r.iptal && r.geriYandi && r.tiklandi && r.baskaDugme,
    "dokunma: düğmeden kayıp dışarıda bırakınca tıklama iptal, geri dönüp bırakınca tıklanır, başka düğmeyi etkilemez " +
      JSON.stringify(r),
  );
}
