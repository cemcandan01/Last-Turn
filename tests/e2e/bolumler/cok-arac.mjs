/* global LT */
// Çok araç: geliştirici hayaleti (uzak araç) yarışta yerel aracı ~2 sn geriden izler ve çizilir; yerel aracın
// girdi kaydı adım adım tutulur. Hayalet açıkken kare süresi ölçülür; ekran görüntüsü tests/cikti/cok-arac.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const bekle = (s) =>
      new Promise((ok) => {
        const t0 = LT.sim.d.zaman,
          d = () => (LT.sim.d.zaman - t0 >= s ? ok() : setTimeout(d, 20));
        d();
      });
    LT.demoStop();
    LT.startEvent(0, 0);
    LT.yaris.EV.state = "run";
    const olc = async () => {
      LT.I.g = 1;
      await bekle(1.5);
      const k0 = LT.perf.kare;
      await bekle(1.5);
      return (k0 + LT.perf.kare) / 2;
    };
    const kareOnce = await olc();
    LT.startEvent(0, 0);
    LT.yaris.EV.state = "run";
    LT.hayalet.zorla = true;
    LT.hayalet.gecikme = 0.5; // görüntüde yakın dursun (geliştirici modunda 2 sn)
    const n0 = LT.yerel.kayit.n;
    const kareSonra = await olc();
    const u = LT.uzak.araclar.find((a) => a.id == "hayalet");
    let gorunen = 0;
    LT.scene.traverse((o) => {
      if (o.isMesh && o.material && o.material.transparent && o.material.opacity < 0.5 && o.visible)
        gorunen++;
    });
    const S = LT.sim.S,
      sonuc = {
        var: !!u,
        hazir: !!u && u.hazir,
        mesafe: u ? Math.hypot(u.goster.x - S.x, u.goster.z - S.z) : 0,
        v: Math.hypot(S.vx, S.vz) * 3.6,
        gorunen,
        kayit: LT.yerel.kayit.n - n0,
        kareOnce,
        kareSonra,
      };
    return sonuc;
  });
  ok(r.var && r.hazir, "hayalet uzak araç açıldı ve görüntü aldı");
  ok(r.mesafe > 3, `hayalet yerel aracın gerisinde: ${r.mesafe.toFixed(1)} m (${r.v.toFixed(0)} km/sa)`);
  ok(r.gorunen > 10, `hayaletin yarı saydam modeli çiziliyor (${r.gorunen} parça)`);
  ok(r.kayit > 100, `yerel aracın girdi kaydı tutuluyor (${r.kayit} adım)`);
  console.log(
    `  (kare süresi: hayaletsiz ${r.kareOnce.toFixed(1)} ms, hayaletli ${r.kareSonra.toFixed(1)} ms)`,
  );
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  fs.mkdirSync(path.join(kok, "tests", "cikti"), { recursive: true });
  // hayalet görünsün: kamera arkaya döner (sürükleme gibi), araç gazda
  await p.evaluate(async () => {
    LT.oyun.camMode = 1;
    LT.kamera.ly = Math.PI * 0.85;
    LT.kamera.lastDrag = performance.now() + 1e6;
    LT.I.g = 1;
    const t0 = LT.sim.d.zaman;
    while (LT.sim.d.zaman - t0 < 0.5) await new Promise((r) => setTimeout(r, 20));
  });
  await p.screenshot({ path: path.join(kok, "tests", "cikti", "cok-arac.png") });
  await p.evaluate(() => {
    LT.oyun.camMode = 0;
    LT.kamera.ly = 0;
    LT.kamera.lastDrag = 0;
    LT.I.g = 0;
    LT.hayalet.zorla = false;
    LT.hayalet.gecikme = 2;
    LT.showMenu(["home"]);
  });
}
