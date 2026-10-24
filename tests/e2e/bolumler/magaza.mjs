/* global LT */
// Mağaza: sahip olunmayan araçlar gezilir; seviye yok / para yok / satın alınabilir kartları, iki dokunuşla onay, kutlama,
// araç mağazadan düşer, Garaja git; tür süzgeci; Geri çağıranın verdiği yere döner.
// Ekran görüntüleri: tests/cikti/magaza-*.png (iPhone 13 yatay).
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
        ses: !!document.querySelector("#gses"),
        satilik: document.querySelector("#gar").classList.contains("satilik"),
        bakiye: document.querySelector("#gpara")?.textContent.trim(),
        tur: document.querySelector(".gtur")?.textContent.trim(),
        aciklama: document.querySelector("#gdes")?.textContent.trim(),
        tasma:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      };
    }, no);
  const foto = async (ad) => {
    await q.waitForTimeout(500);
    await q.screenshot({ path: `tests/cikti/magaza-${ad}.png` });
  };
  const ac = await q.evaluate(() => {
    LT.demoStop();
    window.__geri = 0;
    LT.openStore(() => window.__geri++);
    return {
      mod: LT.oyun.mode,
      ziyaret: (() => {
        const z = [];
        for (let k = 0; k < LT.CARS.length; k++) {
          z.push(LT.CARS.indexOf(LT.oyun.CAR));
          document.querySelector("#gnx").click();
        }
        return z;
      })(),
      sahip: LT.CARS.map((_, i) => i).filter((i) => LT.aracAcikMi(i)),
      serit: document.querySelectorAll("#gmf button").length,
    };
  });
  ok(ac.mod == "garage", "mağaza açıldı");
  ok(
    ac.ziyaret.every((i) => !ac.sahip.includes(i)) && new Set(ac.ziyaret).size == 10 - ac.sahip.length,
    "mağazada yalnız sahip olunmayan araçlar: " + JSON.stringify(ac.ziyaret),
  );
  ok(ac.serit == 6, "süzgeç çipleri: Tümü + 5 tür");
  // seviye yok: Beyaz Kurt (4 / 3000)
  const sv = await git(2);
  ok(
    sv.kilitli &&
      !sv.ses &&
      sv.disabled &&
      /Seviye 4/.test(sv.yazi) &&
      !sv.satilik &&
      sv.tur == "Drift" &&
      sv.aciklama,
    "seviye yok: kilitli, düğme kapalı, tür ve açıklama: " + JSON.stringify(sv),
  );
  ok(!sv.tasma, "mağaza ekranı taşmıyor");
  await foto("seviye-yok");
  // seviye yetti, para yok
  await q.evaluate(() => LT.xpEkle(300, "test"));
  await git(1);
  const py = await git(2);
  ok(
    py.satilik && !py.kilitli && py.ses && py.disabled && /daha gerekli/.test(py.yazi),
    "para yok: açık renk, düğme kapalı, eksik yazar: " + JSON.stringify(py),
  );
  const eksik = await q.evaluate(() => LT.aracFiyati(2).para - LT.para());
  ok(py.yazi.replace(/\D/g, "") == String(eksik), "eksik tutar doğru: " + py.yazi + " / " + eksik);
  await foto("para-yok");
  ok(!(await q.evaluate(() => LT.aracSatinAl(2))), "parasız satın alma reddedildi");
  // para yeterli
  await q.evaluate(() => LT.paraEkle(3000, "test"));
  const sa = await git(2);
  ok(
    sa.satilik && sa.al && !sa.disabled && /Satın al/.test(sa.yazi),
    "satın alınabilir: belirgin Satın al düğmesi: " + JSON.stringify(sa),
  );
  await foto("satin-alinabilir");
  // tür süzgeci: Drift; şerit sol üstte, ad bloğuyla çakışmaz; garajın vurgu rengi drift moru olur
  const yerlesim = () => {
    const s = document.querySelector("#gmf").getBoundingClientRect(),
      u = document.querySelector(".gust").getBoundingClientRect();
    return { ust: s.top, alt: s.bottom, sag: s.right, gustUst: u.top };
  };
  const sz = await q.evaluate((yerlesim) => {
    const yer = new Function("return (" + yerlesim + ")()");
    const once = yer();
    document.querySelector("#gmf [data-suz='dp']").click();
    const z = [];
    for (let k = 0; k < 4; k++) {
      z.push(LT.oyun.CAR.ty);
      document.querySelector("#gnx").click();
    }
    return { z, once, sonra: yer(), tema: getComputedStyle(document.body).getPropertyValue("--gt").trim() };
  }, yerlesim.toString());
  await foto("suzgec-drift");
  const sz2 = await q.evaluate(() => {
    document.querySelector("#gmf [data-suz='hepsi']").click();
    return getComputedStyle(document.body).getPropertyValue("--gt").trim();
  });
  ok(
    sz.z.every((t) => t == "dp"),
    "tür süzgeci yalnız o türün araçlarını gösterir: " + sz.z,
  );
  ok(
    sz.once.ust > 190 && sz.once.alt <= 324 && sz.sonra.alt <= 324 && sz.once.sag < 330,
    "süzgeç şeridi sol altta, okların üstünde, küçük: " + JSON.stringify(sz),
  );
  ok(
    sz.tema == "#b67cff" && sz2 == "",
    "drift süzgecinde tema mor, Tümü'de varsayılan: " + sz.tema + " / " + sz2,
  );
  await git(2);
  // ilk dokunuş onay ister
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
      garajaGit: !!document.querySelector("#gmal #gga"),
    };
  });
  await q.waitForTimeout(250);
  await q.screenshot({ path: "tests/cikti/magaza-kutlama.png" });
  son.magazada = await q.evaluate(() => {
    const kalan = [];
    for (let k = 0; k < 10; k++) {
      kalan.push(LT.CARS.indexOf(LT.oyun.CAR));
      document.querySelector("#gnx").click();
    }
    return kalan.includes(2);
  });
  ok(
    son.acik && son.kutla && son.garajaGit,
    "ikinci dokunuş satın aldı, kutlama ve Garaja git çıktı: " + JSON.stringify(son),
  );
  ok(!son.magazada, "satın alınan araç mağazadan düştü");
  ok((await q.evaluate(() => LT.para())) == para0 - 3000, "bedel düştü");
  await q.waitForTimeout(1600);
  ok(!(await q.evaluate(() => !!document.querySelector(".gkutla"))), "kutlama kendiliğinden kalktı");
  // garajda artık var
  const gar = await q.evaluate(() => {
    LT.closeGarage();
    LT.openGarage(null);
    const z = [];
    for (let k = 0; k < 6; k++) {
      z.push(LT.CARS.indexOf(LT.oyun.CAR));
      document.querySelector("#gnx").click();
    }
    LT.closeGarage();
    return z;
  });
  ok(gar.includes(2), "satın alınan araç garajda: " + gar);
  await foto("garaj-sahip");
  // Garaja git: satın alınca çubuktan garaja geçilir, alınan araç seçili
  const gg = await q.evaluate(() => {
    LT.openStore();
    const no = LT.CARS.indexOf(LT.oyun.CAR);
    LT.xpEkle(99999, "test");
    LT.paraEkle(LT.aracFiyati(no).para, "test");
    return no;
  });
  await q.evaluate(() => {
    document.querySelector("#gok").click();
    document.querySelector("#gok").click();
  });
  const gg2 = await q.evaluate(() => {
    document.querySelector("#gga").click();
    return {
      gar: LT.oyun.mode == "garage" && !document.querySelector("#gar").classList.contains("magaza"),
      secili: LT.CARS.indexOf(LT.oyun.CAR),
    };
  });
  ok(
    gg2.gar && gg2.secili == gg,
    "Garaja git: garaj açıldı, alınan araç seçili: " + gg + " " + JSON.stringify(gg2),
  );
  // Geri: çağıranın verdiği fonksiyon
  const geri = await q.evaluate(() => {
    LT.closeGarage();
    window.__geri = 0;
    LT.openStore(() => window.__geri++);
    document.querySelector("#gbk").click();
    return { n: window.__geri, gizli: document.querySelector("#gar").classList.contains("hidden") };
  });
  ok(geri.n == 1 && geri.gizli, "Geri çağıranın dönüşünü çalıştırdı: " + JSON.stringify(geri));
  await kx.close();
}
