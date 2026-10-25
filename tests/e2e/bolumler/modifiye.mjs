/* global LT */
// Modifiye: garaj vitrininde sınıf + puan rozeti ve Modifiye düğmesi; modifiye ekranı (NFS Carbon düzeni: altta kategori
// şeridi, seçili kategoriye ikinci dokunuşla parça kartları; sağda puan ve çubuklar; araç ortada serbest, öğeler birbirine
// ve araca binmez), kategoriye gelince kamera o parçaya yaklaşır, parçaya dokununca puan farkı önizlemesi, iki dokunuşla
// satın alma, takınca puan/sınıf anında güncellenir, paket tek dokunuşla, kayıt kalıcı, sürüşte parçalı araç kullanılır.
// Ekran görüntüleri: tests/cikti/modifiye-*.png (iPhone 13 yatay ve iPhone SE).
import fs from "node:fs";
export default async function ({ p, ok }) {
  const url = p.url().split("?")[0] + "?" + Date.now();
  fs.mkdirSync("tests/cikti", { recursive: true });
  const kx = await p
    .context()
    .browser()
    .newContext({ viewport: { width: 844, height: 390 } });
  const q = await kx.newPage();
  const hatalar = [];
  q.on("pageerror", (e) => hatalar.push(e.message));
  await q.goto(url);
  await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
  const foto = async (ad) => {
    await q.waitForTimeout(400);
    await q.screenshot({ path: `tests/cikti/modifiye-${ad}.png` });
  };
  // düzen denetimi: öğeler ekran içinde, birbirine ve aracın durduğu orta bölgeye binmez
  const duzen = () =>
    q.evaluate(() => {
      const R = (e) => document.querySelector(e)?.getBoundingClientRect(),
        kes = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top),
        ORTA = {
          left: innerWidth * 0.4,
          right: innerWidth * 0.6,
          top: innerHeight * 0.3,
          bottom: innerHeight * 0.75,
        },
        ust = R("#gar .gust"),
        kat = R("#gmsag"),
        par = R("#gmp"),
        para = R("#gmb"),
        ay = R("#gmay") ?? { left: 0, right: 0, top: 0, bottom: 0 },
        hepsi = [ust, kat, par, para];
      return {
        var: hepsi.every(Boolean),
        icerde: hepsi.every(
          (x) => x && x.left >= 0 && x.top >= 0 && x.right <= innerWidth && x.bottom <= innerHeight,
        ),
        bina:
          kes(ust, kat) ||
          kes(ust, par) ||
          kes(kat, par) ||
          kes(para, kat) ||
          kes(para, ust) ||
          kes(ay, par) ||
          kes(ay, ust) ||
          [...hepsi, ay].some((x) => kes(x, ORTA)),
        // şeritteki düğmeler (kategori ikonu ya da parça kartı) dokunulabilir (≥ 40 px), eylem düğmesi yazısı kesilmiyor
        kategori:
          [...document.querySelectorAll("#gmk button, #gml button")].every(
            (b) => b.getBoundingClientRect().height >= 40 && b.getBoundingClientRect().width >= 40,
          ) &&
          [...document.querySelectorAll("#gmp .gbt .btn")].every((b) => b.scrollWidth <= b.clientWidth + 1),
        tasma:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      };
    });
  const ac = await q.evaluate(() => {
    LT.demoStop();
    LT.ilerlemeyiSifirla();
    LT.modifiyeSifirla();
    localStorage.removeItem("lt_parca");
    LT.modifiyeSifirla();
    LT.openGarage(null);
    const no = LT.CARS.indexOf(LT.oyun.CAR),
      rz = document.querySelector("#gsnf"),
      pp = LT.performansPuani(no, []);
    return {
      no,
      rozet: rz?.textContent.trim(),
      beklenen: pp.sinif + pp.puan,
      renk: rz ? getComputedStyle(rz).getPropertyValue("--c").trim() : "",
      sinifRenk: LT.SINIFLAR.find((s) => s.h == pp.sinif).renk,
      dugme: !!document.querySelector("#gar .galt #gmod"),
    };
  });
  ok(
    ac.rozet == ac.beklenen && ac.renk == ac.sinifRenk,
    "vitrinde sınıf + puan rozeti, sınıf rengiyle: " + JSON.stringify(ac),
  );
  ok(ac.dugme, "sahip olunan araçta Modifiye düğmesi var");
  await foto("vitrin");
  // mağazada (sahip olunmayan araç) Modifiye yok
  const mg = await q.evaluate(() => {
    LT.openStore();
    const v = !!document.querySelector("#gmod");
    document.querySelector("#gbk").click();
    LT.openGarage(null);
    return v;
  });
  ok(!mg, "mağazada Modifiye düğmesi yok");
  // modifiye ekranı
  const ek = await q.evaluate(() => {
    document.querySelector("#gmod").click();
    const kategori = document.querySelectorAll("#gmk [data-k]").length,
      secili = document.querySelector("#gmk .on")?.dataset.k;
    // seçili kategoriye "Seç": parça kartları
    document.querySelector("#gmok").click();
    return {
      sinif: document.querySelector("#gar").classList.contains("modifiye"),
      kategori,
      secili,
      paketler: [...document.querySelectorAll("#gml [data-p]")].map((e) => e.dataset.p),
      vitrinGizli: document.querySelector("#gvit").classList.contains("hidden"),
    };
  });
  ok(
    ek.sinif &&
      ek.kategori == 13 &&
      ek.secili == "paket" &&
      ek.paketler.join() == ",asfalt,rallikros,ralli,drift,drag" &&
      ek.vitrinGizli,
    "modifiye ekranı: Paketler + 12 kategori, stok + 5 paket: " + JSON.stringify(ek),
  );
  const d1 = await duzen();
  ok(
    d1.var && d1.icerde && !d1.bina && d1.kategori && !d1.tasma,
    "modifiye düzeni araca ve birbirine binmiyor: " + JSON.stringify(d1),
  );
  // kategori şeridine dön; kategoriye gelince kamera o parçaya yaklaşır (Carbon): motor kaputa, süspansiyon tekere
  const genel = await q.evaluate(() => {
    document.querySelector("#gmgeri").click();
    return { serit: !!document.querySelector("#gmk"), odak: LT.kamera.gOdak };
  });
  ok(
    genel.serit && genel.odak == null,
    "Paketlerde genel görünüm, geri ile kategori şeridi: " + JSON.stringify(genel),
  );
  const odak = [];
  for (const k of ["motor", "suspansiyon", "aero"]) {
    await q.evaluate((k) => document.querySelector(`#gmk [data-k='${k}']`).click(), k);
    // kameranın yerleşmesini simülasyon saatiyle bekle (başsız tarayıcı yavaş)
    const t0 = await q.evaluate(() => LT.sim.d.zaman);
    await q
      .waitForFunction((t0) => LT.sim.d.zaman - t0 > 2.5 && LT.kamera.gOk > 0.97, t0, { timeout: 20000 })
      .catch(() => {});
    odak.push(
      await q.evaluate((k) => {
        const O = LT.kamera.gOdak,
          c = LT.cam.position,
          h = { x: LT.kamera.gOx, y: LT.kamera.gOy, z: LT.kamera.gOz };
        // bakılan noktanın araca göre yeri (aracın ileri ekseninde; garaj platformu x 0, z -9000)
        const a = LT.kamera.ly,
          dx = h.x - 0,
          dz = h.z + 9000,
          ileri = dx * Math.sin(a) + dz * Math.cos(a);
        return {
          k,
          ad: O?.ad,
          uzak: Math.hypot(c.x - h.x, c.y - h.y, c.z - h.z),
          ileri,
          yuk: h.y,
          secili: document.querySelector("#gmk .on")?.dataset.k,
          baslik: document.querySelector(".gmyol b")?.textContent,
        };
      }, k),
    );
  }
  const [mo, su, ae] = odak;
  ok(
    odak.every((o) => o.ad == o.k && o.secili == o.k && o.uzak < 5) &&
      mo.ileri > 0.5 &&
      ae.ileri < -0.5 &&
      su.yuk < mo.yuk &&
      /Motor/i.test(mo.baslik),
    "kategoriye gelince kamera yaklaşır: motor önde/üstte, aero arkada, süspansiyon teker hizasında: " +
      JSON.stringify(odak),
  );
  await foto("odak-aero");
  // parçaya dokun: önizleme (puan farkı, etkiler), para yokken düğme kapalı
  const on = await q.evaluate(() => {
    // seçili olmayan kategoriye ilk dokunuş seçer, ikincisi parçalara girer
    document.querySelector("#gmk [data-k='motor']").click();
    document.querySelector("#gmk [data-k='motor']").click();
    document.querySelector("#gml [data-p='motor-yaris']").click();
    const no = LT.CARS.indexOf(LT.oyun.CAR),
      b = document.querySelector("#gmok");
    return {
      fark: document.querySelector("#gml [data-p='motor-yaris'] .gmd")?.textContent.trim(),
      beklenen: LT.performansPuani(no, ["motor-yaris"]).puan - LT.performansPuani(no, []).puan,
      onizleme: document.querySelector("#gsnf2")?.textContent.trim(),
      etki: document.querySelector("#gmo").textContent,
      aciklama: /Motor/i.test(document.querySelector("#gmay")?.textContent ?? ""),
      yazi: b?.textContent.trim(),
      kapali: b?.disabled,
    };
  });
  ok(
    +on.fark == on.beklenen && on.beklenen > 0 && on.onizleme && /GÜÇ \+/.test(on.etki) && on.aciklama,
    "parçaya dokununca puan farkı, önizleme rozeti, etki ve açıklama: " + JSON.stringify(on),
  );
  ok(on.kapali && /daha gerekli/.test(on.yazi), "para yokken satın alma kapalı: " + on.yazi);
  await foto("onizleme");
  // para ver, iki dokunuşla satın al ve tak
  const al = await q.evaluate(() => {
    LT.paraEkle(20000, "test");
    const no = LT.CARS.indexOf(LT.oyun.CAR),
      p0 = LT.para();
    document.querySelector("#gml [data-p='motor-yaris']").click();
    document.querySelector("#gmok").click();
    const ilk = {
      yazi: document.querySelector("#gmok").textContent.trim(),
      para: LT.para(),
      takili: LT.takiliParcalar(no),
    };
    document.querySelector("#gmok").click();
    const pp = LT.performansPuani(no, ["motor-yaris"]),
      satir = document.querySelector("#gml [data-p='motor-yaris']").classList.contains("takili");
    // kategori şeridinde motor takılı görünür
    document.querySelector("#gmgeri").click();
    return {
      ilk,
      p0,
      para: LT.para(),
      fiyat: LT.parcaFiyati("motor-yaris"),
      takili: LT.takiliParcalar(no),
      rozet: document.querySelector("#gsnf").textContent.trim(),
      beklenen: pp.sinif + pp.puan,
      satir,
      kutla: !!document.querySelector(".gkutla"),
      kat: document.querySelector("#gmk [data-k='motor']").classList.contains("takili"),
    };
  });
  ok(
    /Emin misin/.test(al.ilk.yazi) && al.ilk.para == al.p0 && !al.ilk.takili.length,
    "ilk dokunuş onay ister, para harcanmaz: " + JSON.stringify(al.ilk),
  );
  ok(
    al.p0 - al.para == al.fiyat &&
      al.takili.join() == "motor-yaris" &&
      al.rozet == al.beklenen &&
      al.satir &&
      al.kat &&
      al.kutla,
    "ikinci dokunuş satın alır ve takar; puan ve sınıf anında güncellenir: " + JSON.stringify(al),
  );
  await foto("takili");
  // paket tek dokunuşla (satın al + onay), sonra stoka dön ve yeniden tak (ücretsiz)
  const pk = await q.evaluate(() => {
    const no = LT.CARS.indexOf(LT.oyun.CAR);
    document.querySelector("#gmk [data-k='paket']").click();
    document.querySelector("#gmk [data-k='paket']").click();
    document.querySelector("#gml [data-p='asfalt']").click();
    document.querySelector("#gmok").click();
    document.querySelector("#gmok").click();
    const paketli = LT.takiliParcalar(no);
    document.querySelector("#gml [data-p='']").click();
    document.querySelector("#gmok").click();
    const stok = LT.takiliParcalar(no);
    const p1 = LT.para();
    document.querySelector("#gml [data-p='asfalt']").click();
    const yazi = document.querySelector("#gmok").textContent.trim();
    document.querySelector("#gmok").click();
    return { paketli, stok, yazi, ucretsiz: LT.para() == p1, son: LT.takiliParcalar(no) };
  });
  ok(
    ["lastik-yaris", "suspansiyon-yaris", "aero-yaris", "motor-yaris"].every((x) => pk.paketli.includes(x)) &&
      !pk.stok.length &&
      pk.yazi == "Tak" &&
      pk.ucretsiz &&
      pk.son.length == 3,
    "paket tek dokunuşla takılır, stoka dönülür, alınmış parçalar yeniden ücretsiz takılır: " +
      JSON.stringify(pk),
  );
  // vitrin tam ekran dokunuşu modifiyede hata vermez; Garaj ile vitrine dönülür, rozet güncel
  const dn = await q.evaluate(() => {
    document.dispatchEvent(new Event("lt:garaj-dokunus"));
    // parçalardan kategorilere, kategorilerden vitrine
    document.querySelector("#gmgeri").click();
    document.querySelector("#gmgeri").click();
    const no = LT.CARS.indexOf(LT.oyun.CAR),
      pp = LT.performansPuani(no, LT.takiliParcalar(no));
    return {
      vitrin:
        !document.querySelector("#gar").classList.contains("modifiye") &&
        !!document.querySelector("#gar .gbar"),
      rozet: document.querySelector("#gsnf").textContent.trim(),
      beklenen: pp.sinif + pp.puan,
    };
  });
  ok(dn.vitrin && dn.rozet == dn.beklenen, "Garaj ile vitrine dönülür, rozet güncel: " + JSON.stringify(dn));
  // kayıt kalıcı ve sürüşte parçalı araç kullanılır; stok araçta CARS nesnesinin kendisi
  const sr = await q.evaluate(() => {
    const no = LT.CARS.indexOf(LT.oyun.CAR);
    LT.closeGarage();
    LT.parcaTak(no, "motor-yaris");
    LT.modifiyeSifirla();
    const kayit = LT.takiliParcalar(no);
    window.__e = LT.EVENTS.findIndex((x) => x.ty == "gp");
    LT.startEvent(window.__e, no);
    return {
      no,
      kayit,
      hp: LT.kurulum.mod?.car.hp,
      beklenen: LT.aracKur(no, kayit).car.hp,
      stokHp: LT.CARS[no].hp,
    };
  });
  // fizik adımı kurulumu her adımda tazeler (geri sayımda fizik durur; başsız tarayıcı yavaş): parçalı araç fiziğe gider
  sr.fizik = await q
    .waitForFunction(() => LT.kurulum.mod && LT.yerel.cx.kurulum.car === LT.kurulum.mod.car, null, {
      timeout: 30000,
    })
    .then(() => true)
    .catch(() => false);
  ok(
    sr.kayit.length == 4 && Math.abs(sr.hp - sr.beklenen) < 1e-6 && sr.hp > sr.stokHp && sr.fizik,
    "takılı parçalar kalıcı, yarışta fizik parçalı aracı kullanır (güç " +
      sr.stokHp +
      " → " +
      Math.round(sr.hp) +
      "): " +
      JSON.stringify(sr),
  );
  // parçasız araç: kurulum.mod yok, fizik CARS nesnesinin kendisi (stok fizik değişmez)
  const diger = await q.evaluate((no) => {
    const d = LT.CARS.findIndex((_, k) => k != no && LT.aracAcikMi(k));
    LT.startEvent(window.__e, d);
    return { d, mod: LT.kurulum.mod };
  }, sr.no);
  const stokAyni = await q
    .waitForFunction((d) => LT.yerel.cx.kurulum.car === LT.CARS[d], diger.d, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  ok(diger.mod == null && stokAyni, "parçasız araçta kurulum.mod yok, fizik stok araç nesnesi");
  // başlık: her kategoride yol başlığı ("Modifiye › Süspansiyon") ve 7 haneli bakiye kesilmiyor, birbirine binmiyor (iPhone 13)
  const ust = await q.evaluate(() => {
    LT.paraEkle(1000000, "test");
    LT.openGarage(null);
    document.querySelector("#gmod").click();
    const R = (e) => e.getBoundingClientRect(),
      kes = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top),
      r = [];
    for (const k of [...document.querySelectorAll("#gmk [data-k]")].map((e) => e.dataset.k)) {
      // seçili kategoriye ikinci dokunuş parçalara girer: yalnız seçili değilse dokun
      const t = document.querySelector(`#gmk [data-k='${k}']`);
      if (!t.classList.contains("on")) t.click();
      const b = document.querySelector(".gmyol"),
        s = document.querySelector("#gmb");
      if (kes(R(b), R(s)) || b.scrollWidth > b.clientWidth + 1 || R(s).right > innerWidth)
        r.push(k + ": " + b.textContent + " / " + s.textContent);
    }
    return { r, bakiye: document.querySelector("#gmb").textContent.replace(/\D/g, "").length };
  });
  ok(
    ust.bakiye >= 7 && !ust.r.length,
    "yol başlığı ve 7 haneli bakiye ayrık, kesilmiyor: " + JSON.stringify(ust),
  );
  // küçük ekran (iPhone SE yatay): düzen yine binmiyor
  await q.setViewportSize({ width: 667, height: 375 });
  await q.evaluate(() => {
    LT.openGarage(null);
    document.querySelector("#gmod").click();
    document.querySelector("#gmk [data-k='lastik']").click();
    document.querySelector("#gmok").click();
    document.querySelector("#gml [data-p='lastik-toprak']").click();
  });
  await q.waitForTimeout(300);
  const d2 = await duzen();
  ok(
    d2.var && d2.icerde && !d2.bina && d2.kategori && !d2.tasma,
    "küçük ekranda da düzen binmiyor: " + JSON.stringify(d2),
  );
  await foto("kucuk-ekran");
  ok(!hatalar.length, "sayfa hatası yok: " + hatalar.join(" | "));
  await q.evaluate(() => LT.closeGarage());
  await kx.close();
}
