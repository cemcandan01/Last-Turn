/* global LT */
// Garajda satın alma: sahip / seviye yok / para yok / satın alınabilir durumları, iki dokunuşla onay, başarıda araç açılır.
// Ekran görüntüleri: tests/cikti/garaj-satin-*.png (iPhone 13 yatay).
import fs from "node:fs";
export default async function ({ p, ok }) {
  const url = p.url().split("?")[0] + "?" + Date.now();
  const kx = await p
    .context()
    .browser()
    .newContext({ viewport: { width: 844, height: 390 } });
  const q = await kx.newPage();
  await q.goto(url);
  await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
  fs.mkdirSync("tests/cikti", { recursive: true });
  const git = (no) =>
    q.evaluate((no) => {
      for (let k = 0; k < 12 && LT.CARS.indexOf(LT.oyun.CAR) != no; k++)
        document.querySelector("#gnx").click();
      const b = document.querySelector("#gok");
      return {
        secili: LT.CARS.indexOf(LT.oyun.CAR) == no,
        yazi: b ? b.textContent.trim() : null,
        disabled: b ? b.disabled : null,
        al: b ? b.classList.contains("al") : false,
        kilitli: document.querySelector("#gar").classList.contains("kilitli"),
        satilik: document.querySelector("#gar").classList.contains("satilik"),
        bakiye: document.querySelector("#gpara")?.textContent.trim(),
        tasma:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      };
    }, no);
  const foto = async (ad) => {
    await q.waitForTimeout(500);
    await q.screenshot({ path: `tests/cikti/garaj-satin-${ad}.png` });
  };
  await q.evaluate(() => {
    LT.demoStop();
    LT.openGarage(LT.EVENTS.findIndex((e) => e.ty == "gp" && e.lv == 1));
  });
  // sahip: Kızıl Ok ücretsiz
  const sahip = await git(0);
  ok(
    sahip.secili && !sahip.satilik && !sahip.kilitli && /^\d/.test(sahip.bakiye),
    "sahip: kilit ve fiyat yok, bakiye köşede: " + JSON.stringify(sahip),
  );
  await foto("sahip");
  // seviye yok: Beyaz Kurt (4 / 3000)
  const sv = await git(2);
  ok(
    sv.kilitli && sv.disabled && /Seviye 4/.test(sv.yazi) && !sv.satilik,
    "seviye yok: kilitli, düğme kapalı: " + JSON.stringify(sv),
  );
  await foto("seviye-yok");
  // seviye yetti, para yok
  await q.evaluate(() => LT.xpEkle(300, "test"));
  await git(0);
  const py = await git(2);
  ok(
    py.satilik && !py.kilitli && py.disabled && /daha gerekli/.test(py.yazi),
    "para yok: açık renk, düğme kapalı, eksik yazar: " + JSON.stringify(py),
  );
  const eksik = await q.evaluate(() => LT.aracFiyati(2).para - LT.para());
  ok(py.yazi.replace(/\D/g, "") == String(eksik), "eksik tutar doğru: " + py.yazi + " / " + eksik);
  await foto("para-yok");
  const yanlis = await q.evaluate(() => LT.aracSatinAl(2));
  ok(!yanlis, "parasız satın alma reddedildi");
  // para yeterli: satın alınabilir
  await q.evaluate(() => LT.paraEkle(3000, "test"));
  const sa = await git(2);
  ok(
    sa.satilik && sa.al && !sa.disabled && /Satın al/.test(sa.yazi),
    "satın alınabilir: belirgin Satın al düğmesi: " + JSON.stringify(sa),
  );
  await foto("satin-alinabilir");
  // ilk dokunuş onay ister, para harcanmaz
  const para0 = await q.evaluate(() => LT.para());
  const onay = await q.evaluate(() => {
    document.querySelector("#gok").click();
    return { yazi: document.querySelector("#gok").textContent.trim(), acik: LT.aracAcikMi(2) };
  });
  ok(/Emin misin/.test(onay.yazi) && !onay.acik, "ilk dokunuş onay ister: " + JSON.stringify(onay));
  ok((await q.evaluate(() => LT.para())) == para0, "onay beklerken para harcanmadı");
  // ikinci dokunuş satın alır
  const son = await q.evaluate(() => {
    document.querySelector("#gok").click();
    return {
      acik: LT.aracAcikMi(2),
      kutla: !!document.querySelector(".gkutla"),
      satilik: document.querySelector("#gar").classList.contains("satilik"),
    };
  });
  ok(
    son.acik && son.kutla && !son.satilik,
    "ikinci dokunuş satın aldı, kutlama çıktı: " + JSON.stringify(son),
  );
  ok((await q.evaluate(() => LT.para())) == para0 - 3000, "bedel düştü");
  await q.waitForTimeout(250);
  await q.screenshot({ path: "tests/cikti/garaj-satin-kutlama.png" });
  await q.waitForTimeout(1600);
  ok(!(await q.evaluate(() => !!document.querySelector(".gkutla"))), "kutlama kendiliğinden kalktı");
  // yeniden bakınca sahip
  const sah2 = await git(2);
  ok(!sah2.satilik && !sah2.kilitli, "satın alınan araç artık sahip: " + JSON.stringify(sah2));
  // yarış öncesi: Seç etkin
  const sec = await q.evaluate(() => {
    const b = document.querySelector("#gok");
    return { yazi: b.textContent.trim(), disabled: b.disabled };
  });
  ok(!sec.disabled && /Yarış/.test(sec.yazi), "yarış öncesi Seç etkin: " + JSON.stringify(sec));
  await kx.close();
}
