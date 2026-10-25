/* global LT */
// İlerleme kilitleri (oyun/ilerleme.ts): temiz kayıtlı yeni oyuncu yalnız Çaylak pistlerini ve açık araçları başlatabilir;
// eski rekoru olan oyuncu o pisti açık bulur. Diğer bölümler her şey açık başlar (yardimci/ilerleme-acik.mjs).
export default async function ({ p, ok }) {
  const url = p.url().split("?")[0] + "?" + Date.now(),
    ac = async (init) => {
      const kx = await p
        .context()
        .browser()
        .newContext({ viewport: { width: 844, height: 390 } });
      if (init) await kx.addInitScript(init);
      const q = await kx.newPage();
      await q.goto(url);
      await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
      return { kx, q };
    };
  const yeni = await ac();
  const r = await yeni.q.evaluate(() => {
    LT.demoStop();
    const ev = (ty, lv) => LT.EVENTS.findIndex((e) => e.ty == ty && e.lv == lv),
      s = {};
    s.lv = LT.seviye().lv;
    s.kilitliPist = LT.startEvent(ev("gp", 2), 0) === false && !LT.yaris.EV;
    LT.openGarage(ev("rl", 3));
    s.kilitliGarajAcilmaz = LT.oyun.mode != "garage";
    s.kilitliArac = LT.startEvent(ev("dg", 1), 4) === false && !LT.yaris.EV;
    s.caylak = ["gp", "rx", "dp", "rl", "dg"].every((t) => {
      const bas = LT.CARS.findIndex((c, i) => c.ty == t && LT.aracAcikMi(i)),
        b = bas >= 0 && LT.startEvent(ev(t, 1), bas) !== false && !!LT.yaris.EV;
      LT.yaris.EV = null;
      return b;
    });
    s.acikArac = LT.CARS.map((_, i) => i).filter((i) => LT.aracAcikMi(i)).length;
    s.kizilOkYok = !LT.aracAcikMi(0);
    // seviye + para: seviyesi gelmiş ama alınmamış araçla yarış başlamaz; parası yetmezse alınamaz; alınca başlar
    const panda = LT.CARS.findIndex((c) => c.n == "Panda"),
      f = LT.aracFiyati(panda);
    LT.xpEkle(99999, "test");
    s.paraYok = LT.aracSatinAlinabilirMi(panda).neden == "para" && !LT.aracSatinAl(panda);
    s.alinmamis = LT.startEvent(ev("dp", 1), panda) === false && !LT.yaris.EV;
    LT.paraEkle(f.para, "test");
    s.alindi = LT.aracSatinAl(panda) && LT.para() == 0;
    s.alinanla = LT.startEvent(ev("dp", 1), panda) !== false && !!LT.yaris.EV;
    LT.yaris.EV = null;
    return s;
  });
  ok(r.lv == 1, "yeni oyuncu seviye 1");
  ok(r.kilitliPist, "kilitli pist başlamaz");
  ok(r.kilitliGarajAcilmaz, "kilitli pistin garajı açılmaz");
  ok(r.kilitliArac, "kilitli araçla yarış başlamaz");
  ok(r.caylak, "her türün Çaylak pisti o türün başlangıç aracıyla başlar");
  ok(r.acikArac == 5, "başta 5 başlangıç aracı açık: " + r.acikArac);
  ok(r.kizilOkYok, "Kızıl Ok yeni oyuncuda satın alınır (açık değil)");
  ok(r.paraYok, "parası yetmeyen araç alınamaz");
  ok(r.alinmamis, "seviyesi gelmiş ama satın alınmamış araçla yarış başlamaz");
  ok(r.alindi && r.alinanla, "satın alınan araçla yarış başlar");
  await yeni.kx.close();
  const eski = await ac(
    `localStorage.setItem("sv_asphalt_5", "100"); localStorage.setItem("lt_prof", '{"use":{"3":2}}')`,
  );
  const e = await eski.q.evaluate(() => ({
    xp: LT.seviye().toplamXp,
    gp5: LT.pistAcikMi("gp", 5),
    arac3: LT.aracAcikMi(3),
    // o sürümde ücretsiz olan Kızıl Ok eski oyuncuda sahip kalır
    arac0: LT.aracAcikMi(0),
    kayit: !!localStorage.getItem("lt_ilerleme"),
  }));
  ok(
    e.xp > 0 && e.gp5 && e.arac3 && e.arac0 && e.kayit,
    "eski kayıt: rekordan XP, oynanmış pist ve araç açık " + JSON.stringify(e),
  );
  await eski.kx.close();
}
