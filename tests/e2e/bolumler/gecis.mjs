/* global LT */
import { TUM_ACIK } from "../../yardimci/ilerleme-acik.mjs";
// Menü arka planı (görseller yüklenemezse çalışan canlı sinematik): çekimden çekime geçişte kararma yok; eski çekimin
// son karesi yakınlaşarak çözülür, sonra kalkar
export default async function ({ p, ok }) {
  const kx = await p
      .context()
      .browser()
      .newContext({ viewport: { width: 844, height: 390 } }),
    q = await kx.newPage();
  await q.addInitScript(TUM_ACIK);
  await q.route("**/img/menu/adet.json", (r) => r.abort());
  await q.goto(p.url().split("?")[0] + "?" + Date.now());
  await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
  const r = await q.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms));
    LT.showMenu(["home"]);
    await w(1500);
    const g = document.querySelector("#gecis"),
      cut = document.querySelector("#cut"),
      eski = LT.CINE,
      r = {};
    eski.t = 1e3; // çekimi bitir
    // geçiş başlayana kadar bekle (en fazla 3 sn)
    for (let i = 0; i < 60 && LT.CINE === eski; i++) await w(50);
    r.yeniCekim = !!LT.CINE && LT.CINE !== eski;
    r.kareGorunur = !g.classList.contains("hidden");
    r.kararmaYok = +getComputedStyle(cut).opacity < 0.05;
    // yakalanan kare boş değil (eski çekimin görüntüsü)
    const d = g.getContext("2d").getImageData(0, 0, g.width, g.height).data;
    let dolu = 0;
    for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) dolu++;
    r.kareDolu = dolu > 20;
    await w(400);
    r.cozuluyor = g.getAnimations().length > 0 || g.classList.contains("hidden");
    for (let i = 0; i < 80 && !g.classList.contains("hidden"); i++) await w(50);
    r.kalkti = g.classList.contains("hidden");
    // menüden çıkınca geçiş karesi kalmaz
    eski.t = 0;
    LT.CINE.t = 1e3;
    await w(30);
    LT.demoStop();
    r.durunca = g.classList.contains("hidden");
    LT.showMenu(["home"]);
    return r;
  });
  await kx.close();
  ok(
    Object.values(r).every(Boolean),
    "menü arka planı: çekim geçişinde kararma yok, eski kare yakınlaşarak çözülüyor ve kalkıyor " +
      JSON.stringify(r),
  );
}
