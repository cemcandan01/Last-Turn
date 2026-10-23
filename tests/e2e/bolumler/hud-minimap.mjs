/* global LT */
// Mini harita: araç yukarı bakar. Virajda haritadaki yol, ön camdan görünen yolla aynı yöne kıvrılır (sağ viraj:
// ileriki yol imlecin sağ üstünde); her yarış türünde, dış kamerada ve kokpitte; çizim maliyeti < 0,5 ms
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    LT.demoStop();
    const sorun = [],
      ozet = [],
      turler = [...new Set(LT.EVENTS.map((e) => e.ty))];
    let maliyet = 0;
    for (const ty of turler) {
      const i = LT.EVENTS.findIndex((e) => e.ty == ty);
      for (const cm of [0, 3]) {
        LT.startEvent(i, 2);
        LT.yaris.EV.cd = 1e9;
        LT.oyun.camMode = cm;
        const TR = LT.dunya.cur.TR,
          S = LT.sim.S;
        // 90 m ilerideki noktanın araç çerçevesindeki yanal sapması: en sağ ve en sol viraj
        const ileri = (k, m) => {
          let j = k;
          while (j < TR.N - 1 && TR.S[j] - TR.S[k] < m) j++;
          return j;
        };
        let sag = null,
          sol = null;
        for (let k = 0; k < TR.N - 1; k += 3) {
          const j = ileri(k, 90);
          if (TR.S[j] - TR.S[k] < 80) continue;
          const [tx, tz] = TR.T[k],
            dx = TR.P[j][0] - TR.P[k][0],
            dz = TR.P[j][1] - TR.P[k][1],
            yanal = -dx * tz + dz * tx;
          if (!sag || yanal > sag.yanal) sag = { k, j, yanal };
          if (!sol || yanal < sol.yanal) sol = { k, j, yanal };
        }
        for (const [ad, b] of [
          ["sağ", sag],
          ["sol", sol],
        ]) {
          if (!b || Math.abs(b.yanal) < 20) continue;
          const [tx, tz] = TR.T[b.k];
          S.x = LT.sim.onceki.x = TR.P[b.k][0];
          S.z = LT.sim.onceki.z = TR.P[b.k][1];
          S.h = LT.sim.onceki.h = Math.atan2(tx, tz);
          S.vx = S.vz = 0;
          await bekle(450);
          const q = LT.mmDonustur(TR.P[b.j][0], TR.P[b.j][1]),
            v = new LT.cam.position.constructor(TR.P[b.j][0], S.y, TR.P[b.j][1]).project(LT.cam),
            beklenen = Math.sign(b.yanal),
            ad2 = `${ty}/${cm ? "kokpit" : "dış"}/${ad}`;
          // dönüşüm: ileri nokta üst yarıda, doğru yanda; ön camdaki yolla aynı yanda
          if (!(q[1] < 160 - 20)) sorun.push(ad2 + ": ileri nokta haritada imlecin üstünde değil " + q[1]);
          if (Math.sign(q[0] - 120) != beklenen) sorun.push(ad2 + ": harita yönü ters " + q[0]);
          if (v.z < 1 && Math.sign(v.x) != beklenen)
            sorun.push(ad2 + ": ön cam yönü haritayla aynı değil " + v.x);
          // çizilen piksel: üst yarıdaki yol pikselleri doğru yana kayık
          const c = document.querySelector("#mm"),
            d = c.getContext("2d").getImageData(0, 0, 240, 140).data;
          let sx = 0,
            n = 0;
          for (let y = 0; y < 140; y++)
            for (let x = 0; x < 240; x++) {
              const o = (y * 240 + x) * 4;
              if (d[o + 3] > 100 && !(d[o] > 235 && d[o + 1] > 235 && d[o + 2] > 235)) {
                sx += x - 120;
                n++;
              }
            }
          if (!n)
            sorun.push(
              ad2 +
                ": haritanın üst yarısında yol çizilmedi " +
                JSON.stringify({ q, k: b.k, j: b.j, x: S.x, z: S.z, h: S.h, N: TR.N }),
            );
          else if (Math.sign(sx / n) != beklenen)
            sorun.push(ad2 + ": çizilen yol ters yana kayık " + (sx / n).toFixed(1));
          ozet.push(ad2 + " " + b.yanal.toFixed(0) + "m");
        }
      }
      // her harita biçiminde görünür ve doğru boyutta
      for (const harita of ["kare", "yuvarlak", "kucuk", "kapali"]) {
        Object.assign(LT.gorunum, { harita });
        LT.hudDuzeniUygula();
        await bekle(30);
        const bk = document.querySelector("#mm").getBoundingClientRect();
        if ((harita == "kapali") != (bk.width == 0))
          sorun.push(ty + "/" + harita + ": harita görünürlüğü yanlış");
      }
      Object.assign(LT.gorunum, LT.HUDLAR.kose.p);
      LT.hudDuzeniUygula();
      // çizim maliyeti
      const S = LT.sim.S,
        t0 = performance.now();
      for (let k = 0; k < 300; k++)
        LT.miniHaritaCiz(S.x, S.z, Math.sin(k / 30), Math.cos(k / 30), 20 + (k % 40));
      maliyet = Math.max(maliyet, (performance.now() - t0) / 300);
    }
    const c = document.querySelector("#mm");
    if (c.width != 240 || c.height != 240) sorun.push("tuval yeniden boyutlanmış");
    LT.oyun.camMode = 0;
    return { sorun, ozet, maliyet };
  });
  ok(
    !r.sorun.length && r.ozet.length >= 6 && r.maliyet < 0.5,
    `Mini harita araç-yukarı: viraj yönü harita/ön cam/çizim uyumlu, tuval sabit, kare maliyeti ${r.maliyet.toFixed(3)} ms ` +
      JSON.stringify(r),
  );
}
