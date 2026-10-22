/* global LT */
// Garaj: araç değişiyor; serbest sürüşten önce garaj; önayar yalnız serbest sürüşte
export default async function ({ p, ok }) {
  const gr = await p.evaluate(() => {
    try {
      LT.openGarage(0);
      document.querySelector("#gnx").click();
      const n = LT.oyun.CAR.n;
      LT.closeGarage();
      return n;
    } catch (x) {
      return "HATA " + x.message;
    }
  });
  ok(!gr.startsWith("HATA"), "garaj açılıyor ve araç değişiyor");
  const sg = await p.evaluate(() => {
    LT.showMenu(["free"]);
    document.querySelector("[data-w='1']").click();
    const gar = !document.querySelector("#gar").classList.contains("hidden");
    document.querySelector("#gnx").click();
    document.querySelector("#gok").click();
    const r = { gar, mod: LT.oyun.mode, w: LT.oyun.CURW.n, pk: LT.kurulum.pk, aracPk: LT.oyun.CAR.pk };
    LT.showSet();
    r.serbestOnayar = !!document.querySelector("#set details[data-sec='pre']");
    LT.showMenu(["home"]);
    LT.demoStop();
    LT.startEvent(
      LT.EVENTS.findIndex((e) => e.ty == "dp"),
      2,
    );
    LT.showSet();
    r.yarisOnayar = !!document.querySelector("#set details[data-sec='pre']");
    r.yarisPk = LT.kurulum.pk;
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    sg.gar && sg.mod == "drive" && sg.w == "Boş Otopark" && sg.pk == sg.aracPk,
    "serbest sürüşten önce garaj açılıyor, araç kendi önayarıyla başlıyor",
  );
  ok(
    sg.serbestOnayar && !sg.yarisOnayar && sg.yarisPk == "dr",
    "önayar yalnız serbest sürüşte; drift yarışında aracın drift önayarı",
  );
  // yatay 844x390: garaj paneli kaydırmasız sığar, seç/geri butonları ekranda görünür (en uzun adlı yarış butonuyla)
  const sig = await p.evaluate(() => {
    const r = [];
    for (let i = 0; i < LT.CARS.length; i++) {
      LT.openGarage(0);
      for (let k = 0; k < i; k++) document.querySelector("#gnx").click();
      const g = document.querySelector("#gar"),
        b = document.querySelector("#gok").getBoundingClientRect(),
        a = document.querySelector("#gbk").getBoundingClientRect();
      r.push(
        g.scrollHeight <= g.clientHeight + 1 &&
          b.bottom <= innerHeight &&
          a.bottom <= innerHeight &&
          b.top > 0,
      );
      LT.closeGarage();
    }
    return r;
  });
  ok(sig.length > 0 && sig.every(Boolean), "garaj paneli kaydırmasız sığıyor, butonlar görünür");
  await p.evaluate(() => LT.openGarage(0));
  await p.waitForTimeout(500);
  // yazılar panel kenarına yapışmaz (sağ kenara en az 12 px)
  const bosluk = await p.evaluate(() => {
    const k = document.querySelector("#gar").getBoundingClientRect().right;
    return Math.min(
      ...[...document.querySelectorAll("#gar .st em, #gar .bdg")].map(
        (e) => k - e.getBoundingClientRect().right,
      ),
    );
  });
  ok(bosluk >= 12, "garaj yazıları panel kenarına yapışık değil (" + Math.round(bosluk) + " px)");
  // parmak sağa giderken aracın önü de sağa döner (doğal sürükleme: yön açısı artar)
  const ly0 = await p.evaluate(() => LT.kamera.ly);
  await p.mouse.move(120, 200);
  await p.mouse.down();
  await p.mouse.move(220, 200, { steps: 5 });
  await p.mouse.up();
  const ly1 = await p.evaluate(() => LT.kamera.ly);
  ok(ly1 > ly0, "garajda sağa sürükleme aracı parmakla aynı yöne döndürür");
  // aşağı sürükleme kamerayı yükseltir ama 90°'ye varmaz; tekerlek yakınlaştırır; kısa dokunuş dönmeyi durdurur
  await p.mouse.move(120, 100);
  await p.mouse.down();
  await p.mouse.move(120, 390, { steps: 8 });
  await p.mouse.up();
  const gp = await p.evaluate(() => LT.kamera.gp);
  ok(
    gp > 0.15 && gp < Math.PI / 2,
    "garajda aşağı sürükleme kamerayı yükseltir, 90° olmaz (" + gp.toFixed(2) + ")",
  );
  await p.mouse.move(120, 200);
  await p.mouse.wheel(0, -300);
  await p.waitForTimeout(100);
  ok((await p.evaluate(() => LT.kamera.gz)) < 1, "garajda tekerlekle yakınlaşılır");
  const oto0 = await p.evaluate(() => LT.kamera.gOto);
  await p.mouse.down();
  await p.mouse.up();
  ok(oto0 && !(await p.evaluate(() => LT.kamera.gOto)), "garajda dokununca kendiliğinden dönme durur");
  // dokununca seç/geri tuşları çıkar, tam ekran düğmesi paneli gizler, sürükledikten sonra açı eski yerine dönmez
  const gorunur = (sel) =>
    p.evaluate((q) => {
      const e = document.querySelector(q);
      return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility != "hidden";
    }, sel);
  ok(!(await gorunur("#gvok")), "tam ekran dışında seç ve geri tuşları görünmez");
  await p.click("#gvtam");
  ok(!(await gorunur("#gar")), "tam ekran: bilgi paneli gizlenir");
  await p.mouse.move(200, 200);
  await p.mouse.down();
  await p.mouse.up();
  await p.mouse.down();
  await p.mouse.up();
  ok(
    (await gorunur("#gvok")) && (await gorunur("#gvbk")),
    "tam ekranda dokunup bırakınca seç ve geri tuşları çıkar",
  );
  await p.mouse.move(100, 200);
  await p.mouse.down();
  await p.mouse.move(180, 200, { steps: 4 });
  ok(!(await gorunur("#gvok")), "tekrar sürükleyince seç ve geri tuşları kaybolur");
  await p.mouse.up();
  await p.click("#gvtam");
  ok(await gorunur("#gar"), "tam ekrandan çıkınca bilgi paneli geri gelir");
  // durmuş dönme: sürükleyip bırakınca bırakma hızıyla yeniden başlar, kendi hızına (0,3 rad/sn) söner, geri sıçramaz
  await p.evaluate(() => (LT.kamera.gOto = false));
  const surukle = (x0, x1) =>
    p.evaluate(
      async ([a, b]) => {
        const c = LT.R.domElement,
          ev = (t, x) =>
            c.dispatchEvent(new PointerEvent(t, { pointerId: 21, clientX: x, clientY: 200, bubbles: true }));
        ev("pointerdown", a);
        for (let i = 1; i <= 6; i++) {
          await new Promise((r) => setTimeout(r, 16));
          ev("pointermove", a + ((b - a) * i) / 6);
        }
        ev("pointerup", b);
      },
      [x0, x1],
    );
  await surukle(100, 250);
  ok(await p.evaluate(() => LT.kamera.gOto), "sürükleyip bırakınca dönme yeniden başlar");
  const v0 = await p.evaluate(() => LT.kamera.gV);
  ok(v0 > 0.3, "bırakma hızı kendi dönme hızından yüksek (" + v0.toFixed(2) + ")");
  let geri = false,
    onceki = await p.evaluate(() => LT.kamera.ly);
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(100);
    const l = await p.evaluate(() => LT.kamera.ly);
    if (l < onceki - 1e-6) geri = true;
    onceki = l;
  }
  const v1 = await p.evaluate(() => LT.kamera.gV);
  ok(!geri, "bırakmadan sonra geri sıçrama ya da ters yöne kayma yok");
  ok(Math.abs(v1 - 0.3) < 0.05 && v1 > 0, "bırakma hızı kendi dönme hızına oturur (" + v1.toFixed(2) + ")");
  // sola sürükleyince kendi dönme yönü de sola döner
  await surukle(250, 100);
  await p.waitForTimeout(4000);
  ok((await p.evaluate(() => LT.kamera.gV)) < -0.2, "sola bırakınca sabit dönme sola");
  // iki parmak: açınca yakınlaşır, kapatınca uzaklaşır
  const pinch = (a0, a1) =>
    p.evaluate(
      ([x0, x1]) => {
        const c = LT.R.domElement,
          ev = (t, id, x) =>
            c.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: 200, bubbles: true }));
        ev("pointerdown", 11, 300 - x0);
        ev("pointerdown", 12, 300 + x0);
        ev("pointermove", 11, 300 - x1);
        ev("pointermove", 12, 300 + x1);
        ev("pointerup", 11, 300 - x1);
        ev("pointerup", 12, 300 + x1);
      },
      [a0, a1],
    );
  const g0 = await p.evaluate(() => LT.kamera.gz);
  await pinch(40, 80);
  const g1 = await p.evaluate(() => LT.kamera.gz);
  ok(g1 < g0, "iki parmağı açınca yakınlaşır (" + g0.toFixed(2) + " → " + g1.toFixed(2) + ")");
  await pinch(80, 40);
  ok((await p.evaluate(() => LT.kamera.gz)) > g1, "iki parmağı kapatınca uzaklaşır");
  if (process.env.GARAJ_GOR) await p.screenshot({ path: process.env.GARAJ_GOR });
  await p.evaluate(() => LT.closeGarage());
}
