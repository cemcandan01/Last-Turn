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
  // garajda yağış/kar noktaları çizilmez (havada beyaz kare noktalar görünmesin)
  const yagis = await p.evaluate(async () => {
    const pts = [];
    LT.scene.traverse((o) => o.isPoints && o.userData.hava !== undefined && pts.push(o));
    if (!pts.length) return "yok";
    pts[0].userData.hava = true;
    const bekle = () => new Promise((r) => setTimeout(r, 300));
    await bekle();
    return pts[0].visible ? "görünür" : "gizli";
  });
  ok(yagis == "gizli", "garajda yağış/kar noktaları gizli (" + yagis + ")");
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
  ok(oto0 && (await p.evaluate(() => LT.kamera.gOto)), "vitrin küçükken dokunmak dönmeyi durdurmaz");
  ok(!(await p.evaluate(() => !!document.querySelector(".gc, .gl"))), "bilgi panelinde araç şeridi yok");
  // dokununca seç/geri tuşları çıkar, tam ekran düğmesi paneli gizler, sürükledikten sonra açı eski yerine dönmez
  const gorunur = (sel) =>
    p.evaluate((q) => {
      const e = document.querySelector(q);
      return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility != "hidden";
    }, sel);
  ok(!(await gorunur("#gvok")), "tam ekran dışında seç ve geri tuşları görünmez");
  await p.click("#gvtam");
  ok(!(await gorunur("#gar")), "tam ekran: bilgi paneli gizlenir");
  ok(!(await gorunur("#gvtam")), "tam ekranda X (çık) düğmesi yok");
  ok((await gorunur("#gvpv")) && (await gorunur("#gvnx")), "tam ekranda ◀ ▶ görünür");
  const ad0 = await p.evaluate(() => LT.oyun.CAR.n);
  await p.click("#gvnx");
  ok((await p.evaluate(() => LT.oyun.CAR.n)) != ad0, "tam ekranda ▶ aracı değiştirir");
  await p.click("#gvpv");
  await p.mouse.move(200, 200);
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
  await p.mouse.down();
  await p.mouse.up();
  await p.click("#gvbk");
  ok(await gorunur("#gar"), "tam ekranda Geri: tam ekrandan çıkıp bilgi paneline döner");
  ok(await gorunur("#gvtam"), "panel görünürken tam ekran düğmesi kalır");
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
  // ana menüden açılan garajda araç seçilmez
  await p.evaluate(() => LT.openGarage(null));
  ok(
    !(await p.evaluate(() => !!document.querySelector("#gok, #gvok"))) && (await gorunur("#gbk")),
    "menü garajında seçme yok, yalnız Geri",
  );
  await p.evaluate(() => LT.closeGarage());
  // panel: kartlar dolu, altta boşluk yok (içerik panel yüksekliğini doldurur), genişlik sabit, kaydırma yok
  const pn = await p.evaluate(() => {
    const r = [];
    for (let i = 0; i < LT.CARS.length; i++) {
      LT.openGarage(0);
      for (let k = 0; k < i; k++) document.querySelector("#gnx").click();
      const g = document.querySelector("#gar"),
        gb = g.getBoundingClientRect(),
        cip = document.querySelector("#gar .gcip").getBoundingClientRect(),
        bt = document.querySelector("#gar .gbt").getBoundingClientRect(),
        kt = document.querySelectorAll("#gar .gk");
      r.push({
        kay: g.scrollHeight <= g.clientHeight + 1,
        w: Math.round(gb.width),
        kart: kt.length,
        bosluk: Math.round(bt.top - cip.bottom),
        alt: Math.round(innerHeight - bt.bottom),
        tasma: [...kt].some((e) => e.scrollHeight > e.clientHeight + 1),
      });
      LT.closeGarage();
    }
    return r;
  });
  ok(
    pn.every((x) => x.kay && !x.tasma && x.kart >= 6 && x.bosluk <= 12 && x.alt <= 16) &&
      new Set(pn.map((x) => x.w)).size == 1,
    "bilgi paneli kaydırmasız, kartlar taşmıyor, boşluk yok, genişlik sabit " + JSON.stringify(pn[0]),
  );
  // araç geçişi takılmıyor (iPhone'a yakın: işlemci 4 kat yavaşlatılır). Modeller garaj açılırken kurulup GPU'ya
  // yüklenir (geçişte yeni shader programı ve geometri yok); motor sesi işçide hesaplanır (eskiden her geçişte
  // ~10 kare boyunca ana iş parçacığında sentezleniyordu: ortalama kare boşta karenin ~3 katı)
  await p.evaluate(async () => {
    LT.openGarage(0);
    await new Promise((r) => setTimeout(r, 2500));
    document.querySelector("#gnx").click(); // ilk dokunuş sesi uyandırır (garajla ilgisiz tek seferlik iş)
  });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const gec = await p.evaluate(async () => {
    const R = LT.R,
      kare = () => new Promise((r) => requestAnimationFrame(r)),
      bilgi = () => [R.info.programs.length, R.info.memory.geometries];
    for (let i = 0; i < 8; i++) await kare();
    const bos = [];
    let son = performance.now();
    for (let i = 0; i < 12; i++) {
      await kare();
      const t = performance.now();
      bos.push(t - son);
      son = t;
    }
    const once = bilgi(),
      kareler = [];
    let sync = 0;
    for (let k = 0; k < LT.CARS.length; k++) {
      const t0 = performance.now();
      document.querySelector("#gnx").click();
      sync = Math.max(sync, performance.now() - t0);
      son = performance.now();
      for (let i = 0; i < 10; i++) {
        await kare();
        const t = performance.now();
        kareler.push(t - son);
        son = t;
      }
    }
    const sonra = bilgi();
    LT.closeGarage();
    bos.sort((a, b) => a - b);
    return {
      taban: Math.round(bos[6]),
      ort: Math.round(kareler.reduce((a, b) => a + b) / kareler.length),
      en: Math.round(Math.max(...kareler)),
      sync: Math.round(sync),
      program: once[0] + "→" + sonra[0],
      geometri: once[1] + "→" + sonra[1],
      yeni: sonra[0] - once[0] + sonra[1] - once[1],
    };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.detach();
  ok(
    gec.yeni == 0 && gec.sync < 60 && gec.ort < gec.taban * 1.6 + 20 && gec.en < gec.taban * 3.5 + 60,
    "araç geçişi takılmıyor (4x yavaş): program " +
      gec.program +
      ", geometri " +
      gec.geometri +
      ", tıklama " +
      gec.sync +
      " ms, geçiş sonrası ort/en uzun kare " +
      gec.ort +
      "/" +
      gec.en +
      " ms (boşta " +
      gec.taban +
      ")",
  );
  // garaj ışığı: dünya saati/havası ne olursa olsun aynı; kapanınca dünya ortamı geri gelir
  const isik = await p.evaluate(() => {
    const oku = () => LT.scene.background.getHex();
    const sonuc = [];
    for (const [tod, wx] of [
      ["noon", "sun"],
      ["night", "rain"],
    ]) {
      LT.COND.tod = tod;
      LT.COND.wx = wx;
      LT.applyEnv(LT.ortam.k);
      const dunya = oku();
      LT.openGarage(0);
      sonuc.push([dunya, oku(), LT.scene.fog.near > 1e4]);
      LT.closeGarage();
      sonuc.push(oku() == dunya);
    }
    LT.COND.tod = "noon";
    LT.COND.wx = "sun";
    LT.applyEnv(LT.ortam.k);
    return sonuc;
  });
  ok(
    isik[0][1] == isik[2][1] && isik[0][2] && isik[1] && isik[3] && isik[0][0] != isik[2][0],
    "garaj ışığı dünyanın saatinden/havasından bağımsız, kapanınca ortam geri gelir",
  );
  // yeni araç modelleri (k anahtarına göre): fizik dalı araçları ekleyene kadar geçici kopyalarla denenir
  const modeller = await p.evaluate(() => {
    const k = { gt3: "gp", t16: "rx", int: "rl", ae86: "dr", supra: "dg" };
    for (const a in k) if (!LT.CARS.find((c) => c.k == a)) LT.CARS.push({ ...LT.CARS[0], k: a, ty: k[a] });
    LT.gorunumUygula(LT.CARS);
    const out = {};
    for (const a in k) {
      const i = LT.CARS.findIndex((c) => c.k == a);
      LT.setCar(i, true);
      const cm = LT.oyun.CAR;
      let mesh = 0,
        nan = 0;
      LT.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry.attributes.position) return;
        mesh++;
        for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) nan++;
      });
      out[a] = { ad: cm.k == a, mesh, nan };
    }
    return out;
  });
  for (const a in modeller)
    ok(
      modeller[a].ad && modeller[a].mesh > 20 && modeller[a].nan == 0,
      "yeni araç modeli kurulur (vitrin önbelleğiyle): " + a,
    );
}
