/* global LT */
// Ekran düzeni: yatay (844x390) ve dikey (390x844) açılışta #app ekranı tam kaplar (boşluk yok);
// dikey → yatay geçişte düzen bozulmaz. Dikey açılışta içerik 90° döndürülmüş yatay düzen olarak durur.
export default async function ({ p, ok }) {
  const url = p.url();
  const ol = (pg) =>
    pg.evaluate(() => {
      const a = document.getElementById("app").getBoundingClientRect();
      return {
        l: Math.round(a.left),
        t: Math.round(a.top),
        w: Math.round(a.width),
        h: Math.round(a.height),
        vw: innerWidth,
        vh: innerHeight,
        yatay: LT.ekran.aw > LT.ekran.ah,
      };
    });
  const kapliyor = (o) => o.l == 0 && o.t == 0 && o.w == o.vw && o.h == o.vh;
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
  await p.setViewportSize({ width: 844, height: 390 });
  await p.goto(url);
  await p.waitForFunction(() => window.LT);
}
