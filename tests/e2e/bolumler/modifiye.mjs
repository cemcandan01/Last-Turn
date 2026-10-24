/* global LT */
// Modifiye: garaj vitrininde sınıf + puan rozeti ve Modifiye düğmesi; modifiye ekranı (kategoriler solda, parçalar sağda,
// araç ortada serbest, öğeler birbirine ve araca binmez), parçaya dokununca puan farkı önizlemesi, iki dokunuşla
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
        kat = R("#gmk"),
        par = R("#gmp"),
        hepsi = [ust, kat, par];
      return {
        var: hepsi.every(Boolean),
        icerde: hepsi.every(
          (x) => x && x.left >= 0 && x.top >= 0 && x.right <= innerWidth && x.bottom <= innerHeight,
        ),
        bina: kes(ust, kat) || kes(ust, par) || kes(kat, par) || hepsi.some((x) => kes(x, ORTA)),
        // kategori düğmeleri kesilmiyor (yazı taşmıyor) ve dokunulabilir (≥ 30 px)
        kategori: [...document.querySelectorAll("#gmk button")].every(
          (b) => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().height >= 30,
        ),
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
    return {
      sinif: document.querySelector("#gar").classList.contains("modifiye"),
      kategori: document.querySelectorAll("#gmk [data-k]").length,
      paketler: [...document.querySelectorAll("#gml [data-p]")].map((e) => e.dataset.p),
      vitrinGizli: document.querySelector("#gvit").classList.contains("hidden"),
    };
  });
  ok(
    ek.sinif &&
      ek.kategori == 13 &&
      ek.paketler.join() == ",asfalt,rallikros,ralli,drift,drag" &&
      ek.vitrinGizli,
    "modifiye ekranı: Paketler + 12 kategori, stok + 5 paket: " + JSON.stringify(ek),
  );
  const d1 = await duzen();
  ok(
    d1.var && d1.icerde && !d1.bina && d1.kategori && !d1.tasma,
    "modifiye düzeni araca ve birbirine binmiyor: " + JSON.stringify(d1),
  );
  // parçaya dokun: önizleme (puan farkı, etkiler), para yokken düğme kapalı
  const on = await q.evaluate(() => {
    document.querySelector("#gmk [data-k='motor']").click();
    document.querySelector("#gml [data-p='motor-yaris']").click();
    const no = LT.CARS.indexOf(LT.oyun.CAR),
      b = document.querySelector("#gmok");
    return {
      fark: document.querySelector("#gml [data-p='motor-yaris'] .gmd")?.textContent.trim(),
      beklenen: LT.performansPuani(no, ["motor-yaris"]).puan - LT.performansPuani(no, []).puan,
      onizleme: document.querySelector("#gsnf2")?.textContent.trim(),
      etki: document.querySelector("#gmo").textContent,
      aciklama: !!document.querySelector("#gml .gmr.on small"),
      yazi: b?.textContent.trim(),
      kapali: b?.disabled,
    };
  });
  ok(
    +on.fark == on.beklenen && on.beklenen > 0 && on.onizleme && /HIZ/.test(on.etki) && on.aciklama,
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
    if (!document.querySelector("#gml .gmr.on"))
      document.querySelector("#gml [data-p='motor-yaris']").click();
    document.querySelector("#gmok").click();
    const ilk = {
      yazi: document.querySelector("#gmok").textContent.trim(),
      para: LT.para(),
      takili: LT.takiliParcalar(no),
    };
    document.querySelector("#gmok").click();
    const pp = LT.performansPuani(no, ["motor-yaris"]);
    return {
      ilk,
      p0,
      para: LT.para(),
      fiyat: LT.parcaFiyati("motor-yaris"),
      takili: LT.takiliParcalar(no),
      rozet: document.querySelector("#gsnf").textContent.trim(),
      beklenen: pp.sinif + pp.puan,
      satir: document.querySelector("#gml [data-p='motor-yaris']").classList.contains("takili"),
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
  // fizik adımı kurulumu her adımda tazeler: parçalı araç fiziğe gider
  sr.fizik = await q
    .waitForFunction(() => LT.kurulum.mod && LT.yerel.cx.kurulum.car === LT.kurulum.mod.car, null, {
      timeout: 8000,
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
    .waitForFunction((d) => LT.yerel.cx.kurulum.car === LT.CARS[d], diger.d, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  ok(diger.mod == null && stokAyni, "parçasız araçta kurulum.mod yok, fizik stok araç nesnesi");
  // küçük ekran (iPhone SE yatay): düzen yine binmiyor
  await q.setViewportSize({ width: 667, height: 375 });
  await q.evaluate(() => {
    LT.openGarage(null);
    document.querySelector("#gmod").click();
    document.querySelector("#gmk [data-k='lastik']").click();
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
