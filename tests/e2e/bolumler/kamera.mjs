/* global LT */
import fs from "node:fs";

// Gerçek çizim kamerasında bütün araçların kapladığı alanı ölçer.
export default async function ({ p, ok }) {
  const sonuc = await p.evaluate(async () => {
    LT.demoStop();
    LT.I.g = LT.I.l = LT.I.r = 0;
    const bekle = () => new Promise((r) => setTimeout(r, 350));
    const kare = () => {
      LT.cam.updateMatrixWorld();
      const konum = LT.cam.position.clone();
      const s = LT.sim.S;
      const merkez = konum
        .clone()
        .set(s.x, s.y + 0.7, s.z)
        .project(LT.cam);
      // Araçların hepsini kapsayan 5,6 × 2,6 × 2,4 metrelik kutu.
      const noktalar = [];
      for (const x of [-1.3, 1.3])
        for (const y of [0, 2.4])
          for (const z of [-2.8, 2.8]) {
            const dx = x * Math.cos(s.h) + z * Math.sin(s.h);
            const dz = z * Math.cos(s.h) - x * Math.sin(s.h);
            const v = konum
              .clone()
              .set(s.x + dx, s.y + y, s.z + dz)
              .project(LT.cam);
            noktalar.push({ x: v.x, y: v.y, z: v.z });
          }
      return { uzaklik: Math.hypot(konum.x - s.x, konum.z - s.z), merkez, noktalar };
    };
    const araclar = [];
    for (let i = 0; i < LT.CARS.length; i++) {
      LT.startEvent(0, i);
      LT.yaris.EV.state = "run";
      LT.oyun.camMode = 0;
      LT.kamera.ly = LT.kamera.lp = 0;
      await bekle();
      araclar.push({ ad: LT.CARS[i].n, ...kare() });
    }
    LT.oyun.camMode = 1;
    await bekle();
    const uzak = kare();
    LT.oyun.camMode = 0;
    await bekle();
    return { araclar, uzak };
  });
  ok(
    sonuc.araclar.every((a) => a.uzaklik > 5.5 && a.uzaklik < 7.5),
    "yakın takip bütün araçlarda 5,5–7,5 m aralığında: " +
      sonuc.araclar.map((a) => a.uzaklik.toFixed(1)).join(", "),
  );
  ok(
    sonuc.araclar.every((a) =>
      a.noktalar.every((v) => Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z > -1 && v.z < 1),
    ),
    "tüm araçların çevre kutusu iPhone 13 yatay kadrajında kesilmeden görünüyor",
  );
  ok(sonuc.uzak.uzaklik > 12, "uzak takip açısı korunuyor");
  fs.mkdirSync("tests/cikti", { recursive: true });
  await p.screenshot({ path: "tests/cikti/kamera-yakin-iphone13.png" });
  await p.evaluate(() => LT.showMenu(["home"]));
}
