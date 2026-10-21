/* global LT */
// Menü arka plan videosu: menüde video oynarken 3B sahne çizilmez (pil ve ısı), canlı sinematik durur; sürüşte video
// durur ve gizlenir, menüye dönünce yine oynar. Test Chromium'u H.264 oynatamadığı için video isteği küçük bir WebM
// ile karşılanır ve tarayıcı MP4 oynatabiliyormuş gibi gösterilir (tests/veri/menu-deneme.webm).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEBM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../veri/menu-deneme.webm");

export default async function ({ p, ok }) {
  const br = p.context().browser(),
    kx = await br.newContext({ viewport: { width: 844, height: 390 } }),
    q = await kx.newPage();
  await q.addInitScript(() => {
    const k = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (t) {
      return t.startsWith("video/mp4") ? "probably" : k.call(this, t);
    };
  });
  await q.route("**/video/menu.mp4", (r) =>
    r.fulfill({ status: 200, contentType: "video/webm", body: fs.readFileSync(WEBM) }),
  );
  await q.goto(p.url().split("?")[0] + "?" + Date.now());
  await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
  const r = await q.evaluate(async () => {
    const w = (ms) => new Promise((ok) => setTimeout(ok, ms)),
      v = document.querySelector("#arka"),
      r = {};
    LT.showMenu(["home"]);
    for (let i = 0; i < 60 && !(v.classList.contains("on") && LT.CINE == null); i++) await w(100);
    r.oynuyor = !v.paused && v.classList.contains("on") && !v.classList.contains("hidden");
    r.sinematikDurdu = LT.CINE == null;
    let f0 = LT.R.info.render.frame;
    await w(600);
    r.cizimYok = LT.R.info.render.frame == f0;
    // alt ekranlarda (ayarlar dahil) video sürer
    LT.showMenu(["settings"]);
    await w(200);
    r.ayarlardaOynuyor = !v.paused && !v.classList.contains("hidden");
    // sürüşte video durur, sahne çizilir
    LT.startWorld(1);
    await w(300);
    r.surusteGizli = v.paused && v.classList.contains("hidden");
    f0 = LT.R.info.render.frame;
    await w(400);
    r.surusteCizim = LT.R.info.render.frame > f0;
    // menüye dönünce yine oynar
    LT.showMenu(["home"]);
    for (let i = 0; i < 40 && v.paused; i++) await w(100);
    r.donunceOynuyor = !v.paused && !v.classList.contains("hidden");
    return r;
  });
  await kx.close();
  ok(
    Object.values(r).every(Boolean),
    "menü arka plan videosu: menüde oynuyor, 3B çizim duruyor; sürüşte gizli, dönünce yine oynuyor " +
      JSON.stringify(r),
  );
}
