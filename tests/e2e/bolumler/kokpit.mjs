/* global LT */
// Kokpit: kapı panelleri göz hizasının altında (yan camdan dışarısı görünür); yan aynalar ve dikiz aynası
// kokpitte arka görüntüyü gösterir, başka kameralarda çizilmez
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    LT.demoStop();
    const sonuc = [];
    for (let c = 0; c < LT.CARS.length; c++) {
      LT.startEvent(0, c);
      LT.yaris.EV.state = "run";
      LT.oyun.camMode = 3;
      await bekle(600);
      const a = LT.aynaDurumu(LT.R);
      sonuc.push({
        n: LT.CARS[c].n,
        esik: LT.kokpit.EYE[1] - LT.kokpit.kt,
        yuz: a.yuz,
        acik: a.acik,
        cizim: a.cizim,
        orta: a.orta,
      });
    }
    LT.oyun.camMode = 0;
    await bekle(400);
    const once = LT.aynaDurumu(LT.R);
    await bekle(400);
    const sonra = LT.aynaDurumu(LT.R);
    LT.showMenu(["home"]);
    return { sonuc, disarida: { acik: sonra.acik, ciziliyor: sonra.cizim != once.cizim } };
  });
  ok(
    r.sonuc.every((s) => s.esik >= 0.15),
    "kokpitte kapı panelleri göz hizasının altında: " + r.sonuc.map((s) => s.esik.toFixed(2)).join(", "),
  );
  ok(
    r.sonuc.every((s) => s.yuz == 3 && s.acik && s.cizim > 0 && s.orta.some((v) => v > 0)),
    "kokpitte iki yan ayna ve dikiz aynası arka görüntüyü gösteriyor " +
      JSON.stringify(r.sonuc.map((s) => [s.yuz, s.cizim, s.orta])),
  );
  ok(!r.disarida.acik && !r.disarida.ciziliyor, "kokpit dışında aynalar çizilmiyor (kare hızı)");
}
