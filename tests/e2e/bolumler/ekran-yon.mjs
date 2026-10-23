/* global LT */
// Ekran düzeni: yatay (844x390) ve dikey (390x844) açılışta #app ekranı tam kaplar (boşluk yok);
// dikey → yatay geçişte düzen bozulmaz. Dikey açılışta içerik 90° döndürülmüş yatay düzen olarak durur.
// iOS ana ekran uygulamasındaki hata benzetilir: dönmeden sonra innerWidth/Height ve visualViewport eski
// (açılıştaki) değerde kalır; #app, oyun tuvali ve WebGL çizim boyutu yine de ekranı boşluksuz kaplamalı.
export default async function ({ p, ok }) {
  const url = p.url();
  const ol = (pg) =>
    pg.evaluate(() => {
      const a = document.getElementById("app").getBoundingClientRect(),
        c = LT.R.domElement,
        k = c.getBoundingClientRect(),
        pr = LT.R.getPixelRatio();
      return {
        l: Math.round(a.left),
        t: Math.round(a.top),
        w: Math.round(a.width),
        h: Math.round(a.height),
        // tuvalin ekrandaki kutusu (dönmüşse ekran eksenlerinde)
        cl: Math.round(k.left),
        ct: Math.round(k.top),
        cw: Math.round(k.width),
        ch: Math.round(k.height),
        // WebGL çizim boyutu içeriğin boyutuna eşit mi
        gl: c.width == Math.floor(LT.ekran.aw * pr) && c.height == Math.floor(LT.ekran.ah * pr),
        vw: document.documentElement.clientWidth,
        vh: document.documentElement.clientHeight,
        yatay: LT.ekran.aw > LT.ekran.ah,
      };
    });
  const kapliyor = (o) =>
    o.l == 0 &&
    o.t == 0 &&
    o.w == o.vw &&
    o.h == o.vh &&
    o.cl == 0 &&
    o.ct == 0 &&
    o.cw == o.vw &&
    o.ch == o.vh &&
    o.gl;
  // iOS benzetimi: pencere ölçüleri o anki (eski) değerde donar
  const dondur = (pg) =>
    pg.evaluate(() => {
      const w = innerWidth,
        h = innerHeight,
        sabit = (o, k, v) => Object.defineProperty(o, k, { configurable: true, get: () => v });
      sabit(window, "innerWidth", w);
      sabit(window, "innerHeight", h);
      if (window.visualViewport) {
        sabit(window.visualViewport, "width", w);
        sabit(window.visualViewport, "height", h);
      }
    });
  const ac = async (w, h) => {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(url);
    await p.waitForFunction(() => window.LT, null, { timeout: 15000 });
    await p.waitForTimeout(500);
    return p;
  };
  const y = await ac(844, 390);
  const oy = await ol(y);
  ok(kapliyor(oy) && oy.yatay, "yatay açılışta #app ekranı tam kaplıyor " + JSON.stringify(oy));

  const d = await ac(390, 844);
  const od = await ol(d);
  ok(kapliyor(od) && od.yatay, "dikey açılışta #app ekranı tam kaplıyor, düzen yatay " + JSON.stringify(od));
  await d.setViewportSize({ width: 844, height: 390 });
  await d.waitForTimeout(1800);
  const og = await ol(d);
  ok(kapliyor(og) && og.yatay, "dikey → yatay geçişte düzen bozulmuyor " + JSON.stringify(og));
  await d.setViewportSize({ width: 390, height: 844 });
  await d.waitForTimeout(1800);
  const ob = await ol(d);
  ok(kapliyor(ob) && ob.yatay, "yatay → dikey geçişte de tam kaplıyor " + JSON.stringify(ob));

  // iOS: dikey açılış, pencere ölçüleri dikeyde donmuş hâlde yataya çevirme (boşluk 0 px olmalı)
  await ac(390, 844);
  await dondur(p);
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(1800);
  const oi = await ol(p);
  ok(
    kapliyor(oi) && oi.yatay,
    "iOS: dikey açılış → yatay, eski pencere ölçüsüyle de boşluk yok " + JSON.stringify(oi),
  );
  if (process.argv.includes("--goruntu"))
    await p.screenshot({
      path: new URL("../../cikti/ekran-yon-dikeyden-yataya.png", import.meta.url).pathname,
    });
  // ters yön: yatay açılış, ölçüler yatayda donmuş hâlde dikeye çevirme
  await ac(844, 390);
  await dondur(p);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1800);
  const ot = await ol(p);
  ok(
    kapliyor(ot) && ot.yatay,
    "iOS: yatay açılış → dikey, eski pencere ölçüsüyle de boşluk yok " + JSON.stringify(ot),
  );
  await p.setViewportSize({ width: 844, height: 390 });
  await p.goto(url);
  await p.waitForFunction(() => window.LT);
}
