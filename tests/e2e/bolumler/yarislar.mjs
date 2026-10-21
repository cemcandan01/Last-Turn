/* global LT */
// 30 yarış ve açık dünyalar kuruluyor
export default async function ({ p, ok }) {
  const ev = await p.evaluate(() => {
    LT.demoStop();
    return LT.EVENTS.map((e, i) => {
      try {
        LT.startEvent(
          i,
          LT.CARS.findIndex((c) => c.ty == e.ty),
        );
        const g = LT.REG[e.reg].g;
        return !!g && g.children.length > 0;
      } catch (x) {
        return x.message;
      }
    });
  });
  ok(
    ev.length == 30 && ev.every((x) => x === true),
    `${ev.length} yarışın hepsi kuruluyor` +
      (ev.find((x) => x !== true) ? " — " + ev.find((x) => x !== true) : ""),
  );
  const wd = await p.evaluate(() =>
    LT.WORLDS.map((_w, i) => {
      try {
        LT.startWorld(i);
        return true;
      } catch (x) {
        return x.message;
      }
    }),
  );
  ok(
    wd.every((x) => x === true),
    "açık dünyalar açılıyor",
  );
}
