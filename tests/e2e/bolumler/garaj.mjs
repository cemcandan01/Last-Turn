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
  ok((await gorunur("#gvok")) && (await gorunur("#gvbk")), "dokununca vitrinde seç ve geri tuşları çıkar");
  await p.click("#gvtam");
  ok(!(await gorunur("#gar")), "tam ekran: bilgi paneli gizlenir");
  await p.click("#gvtam");
  ok(await gorunur("#gar"), "tam ekrandan çıkınca bilgi paneli geri gelir");
  await p.mouse.move(100, 200);
  await p.mouse.down();
  await p.mouse.move(250, 200, { steps: 5 });
  await p.mouse.up();
  const ly2 = await p.evaluate(() => LT.kamera.ly);
  await p.waitForTimeout(2500);
  const ly3 = await p.evaluate(() => LT.kamera.ly);
  ok(
    Math.abs(ly3 - ly2) < 0.01,
    "sürükledikten sonra açı eski yerine dönmez (" + ly2.toFixed(2) + " → " + ly3.toFixed(2) + ")",
  );
  if (process.env.GARAJ_GOR) await p.screenshot({ path: process.env.GARAJ_GOR });
  await p.evaluate(() => LT.closeGarage());
}
