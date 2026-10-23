/* global LT */
// Menü arka plan görselleri: menüde görseller akarken 3B sahne çizilmez (pil ve ısı), canlı sinematik durur; art arda
// aynı görsel gelmez; sürüşte gizlenir, menüye dönünce yine akar.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms)),
      k = document.querySelector("#arka"),
      aktif = () => [...k.querySelectorAll("img.on")].map((i) => i.getAttribute("src")),
      r = {};
    LT.showMenu(["home"]);
    for (let i = 0; i < 60 && !(aktif().length && LT.CINE == null); i++) await w(100);
    r.akiyor = aktif().length == 1 && !k.classList.contains("hidden");
    r.sinematikDurdu = LT.CINE == null;
    const f0 = LT.R.info.render.frame;
    await w(600);
    r.cizimYok = LT.R.info.render.frame == f0;
    // alt ekranlarda (ayarlar dahil) görsel sürer
    LT.showMenu(["settings"]);
    await w(200);
    r.ayarlardaGorunur = !k.classList.contains("hidden");
    // sürüşte gizli, sahne çizilir
    LT.startWorld(1);
    await w(300);
    r.surusteGizli = k.classList.contains("hidden");
    const f1 = LT.R.info.render.frame;
    await w(400);
    r.surusteCizim = LT.R.info.render.frame > f1;
    LT.showMenu(["home"]);
    for (let i = 0; i < 40 && k.classList.contains("hidden"); i++) await w(100);
    r.donunceGorunur = !k.classList.contains("hidden") && aktif().length >= 1;
    return r;
  });
  ok(
    Object.values(r).every(Boolean),
    "menü arka plan görselleri: menüde akıyor, 3B çizim duruyor; sürüşte gizli, dönünce yine akıyor " +
      JSON.stringify(r),
  );
}
