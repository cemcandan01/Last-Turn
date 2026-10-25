/* global LT */
// Aynı sayısal ölçek: garaj ve mağazadaki tüm stok araçların altı puanı görünür ve toplamla eşittir.
export default async function ({ p, ok }) {
  // Ana koşucu tüm araçları açar; mağazayı da sınamak için gerçek temiz profil kullan.
  const cx = await p.context().browser().newContext({ viewport: p.viewportSize() });
  const q = await cx.newPage();
  await q.goto(p.url());
  await q.waitForFunction(() => window.LT);
  const r = await q.evaluate(() => {
    LT.demoStop();
    const gorulen = new Set(),
      hata = [];
    for (const mod of ["garaj", "magaza"]) {
      if (mod == "garaj") LT.openGarage(0);
      else LT.openStore();
      const tur = new Set();
      for (let i = 0; i < LT.CARS.length; i++) {
        const k = LT.oyun.CAR.k;
        if (tur.has(k)) break;
        tur.add(k);
        gorulen.add(k);
        const oz = [...document.querySelectorAll("[data-ozellik-puani]")].map((e) =>
            Number(e.dataset.ozellikPuani),
          ),
          toplam = Number(document.querySelector("#gsnf")?.textContent.match(/\d+/)?.[0]);
        if (oz.length != 6 || oz.reduce((a, b) => a + b, 0) != toplam)
          hata.push(k + ": altı puan/toplam farklı");
        const t = document.querySelector("#goztop");
        if (!t?.textContent.includes(String(toplam))) hata.push(k + ": toplam görünmüyor");
        const kutu = document.querySelector(".gbar").getBoundingClientRect();
        if (kutu.right > innerWidth + 1 || kutu.top < 0 || kutu.bottom > innerHeight)
          hata.push(k + ": puan kutusu taşmış");
        const sonra = document.querySelector("#gnx");
        if (!sonra) break;
        sonra.click();
      }
      LT.closeGarage();
    }
    return { gorulen: gorulen.size, beklenen: LT.CARS.length, hata };
  });
  await cx.close();
  ok(r.gorulen == r.beklenen, "garaj ve mağazada bütün araçlar denetlendi: " + r.gorulen);
  ok(
    r.hata.length == 0,
    "altı görünür puan = sınıf puanı; kutu ekrana sığıyor: " + (r.hata.join("; ") || "uygun"),
  );
}
