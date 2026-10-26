/* global LT */
// Ekran uyum denetiminin ekranları. Her ekranın sahibi bir dal vardır: hata satırı o dalın adıyla çıkar.
//   id, dal (sahip), ad, ac(p): ekranı açar (page.evaluate'ler), bekle: ekran hazır olunca görünen seçici,
//   dikeyKaydirma: ekranda iç kaptan dikey kaydırma serbest mi (uzun listeler), haric: bilerek taşan/üst üste öğeler
const gec = (ms) => new Promise((ok) => setTimeout(ok, ms));
const temizle = (p) =>
  p.evaluate(() => {
    if (LT.duzenleyici.acik) LT.hudDuzenleyiciKapat();
    LT.closeGarage();
    LT.showMenu(["home"]);
  });
const menu = (yol) => (p) => p.evaluate((y) => LT.showMenu(y), yol);
const yarisAc = (tur, ek) => (p) =>
  p.evaluate(
    ([tur, ek]) => {
      LT.demoStop();
      LT.oyun.camMode = 0;
      const i = LT.EVENTS.findIndex((e) => e.ty == tur);
      // temiz profilde açık araç: türün başlangıç aracı (diğerleri satın alınır)
      LT.startEvent(
        i,
        LT.CARS.findIndex((c, k) => c.ty == tur && LT.aracAcikMi(k)),
      );
      const EV = LT.yaris.EV;
      EV.state = "run";
      EV.cd = 0;
      if (ek) Object.assign(EV, ek);
      LT.sim.S.vx = 24;
    },
    [tur, ek],
  );

export const EKRANLAR = [
  { id: "menu-ana", dal: "menu", ad: "Ana menü", ac: menu(["home"]), bekle: ".mk" },
  {
    id: "yaris-turu",
    dal: "menu",
    ad: "Yarış türü (kapak akışı)",
    ac: menu(["race"]),
    bekle: ".tk.on",
    // yan kartlar bilerek eğik, üst üste ve kenardan kırpık (kapak akışı); denetlenen ortadaki karttır
    haric: [".tk:not(.on)"],
  },
  { id: "pist-listesi", dal: "menu", ad: "Pist listesi", ac: menu(["race", "t:dp"]), bekle: "[data-ev]" },
  {
    id: "pist-ayrinti",
    dal: "menu",
    ad: "Pist ayrıntısı",
    ac: menu(["race", "t:gp", "e:0"]),
    bekle: "[data-go]",
  },
  { id: "serbest-surus", dal: "menu", ad: "MUTANT", ac: menu(["free"]), bekle: "[data-w]" },
  { id: "profil", dal: "menu", ad: "Profil", ac: menu(["profile"]), bekle: "#pname", dikeyKaydirma: true },
  {
    id: "ayarlar",
    dal: "menu",
    ad: "Ayarlar",
    ac: menu(["settings"]),
    bekle: "[data-hdac]",
    dikeyKaydirma: true,
  },
  {
    id: "garaj-panel",
    dal: "garaj",
    ad: "Garaj (bilgi paneli)",
    ac: (p) =>
      p.evaluate(() => {
        LT.demoStop();
        LT.openGarage(null);
      }),
    bekle: "#gar:not(.hidden) #gpv",
  },
  {
    id: "garaj-yaris",
    dal: "garaj",
    ad: "Garaj (yarış öncesi, Önerilen araç)",
    ac: (p) =>
      p.evaluate(() => {
        LT.demoStop();
        LT.openGarage(0);
      }),
    bekle: "#gar:not(.hidden) #gok",
  },
  {
    id: "magaza",
    dal: "garaj",
    ad: "Mağaza (satılık araç, süzgeç çipleri)",
    ac: (p) =>
      p.evaluate(() => {
        LT.demoStop();
        // cihaz profili her aracı açık tutar: mağaza satılık araç görsün diye ilerleme sıfırlanır
        LT.ilerlemeyiSifirla();
        LT.xpEkle(400, "test");
        LT.paraEkle(4000, "test");
        LT.openStore();
      }),
    bekle: "#gar.magaza:not(.hidden) #gpv",
  },
  {
    id: "garaj-vitrin",
    dal: "garaj",
    ad: "Garaj (tam ekran vitrin)",
    ac: (p) =>
      p.evaluate(() => {
        LT.demoStop();
        LT.openGarage(0);
        document.querySelector("#gvtam").click();
      }),
    bekle: "#gvit.tam .gvtam, #gvit.tam .gvar",
  },
  {
    id: "garaj-vitrin-tuslar",
    dal: "garaj",
    ad: "Garaj (tam ekran vitrin, dokununca çıkan tuşlar)",
    ac: (p) =>
      p.evaluate(() => {
        LT.demoStop();
        LT.openGarage(0);
        document.querySelector("#gvtam").click();
        LT.kamera.gBtn = true;
        document.dispatchEvent(new Event("lt:garaj-dokunus"));
      }),
    bekle: "#gvit.tam.dur #gvok",
  },
  {
    id: "hud-duzenleyici",
    dal: "hud",
    ad: "HUD düzenleyici",
    ac: (p) =>
      p.evaluate(() => {
        LT.showMenu(["settings"]);
        LT.hudDuzenleyiciAc();
      }),
    bekle: "#hdP:not(.hidden)",
  },
  {
    id: "yaris-asfalt",
    dal: "hud",
    ad: "Yarış HUD'u (asfalt)",
    ac: yarisAc("gp"),
    bekle: "#hud:not(.hidden) #gs",
  },
  {
    id: "yaris-drift",
    dal: "hud",
    ad: "Yarış HUD'u (drift, kombo)",
    ac: yarisAc("dp", { score: 2844, combo: 1240, mult: 3, ct: 6.1 }),
    bekle: "#hud:not(.hidden) #gs",
  },
  {
    id: "yaris-drag",
    dal: "hud",
    ad: "Yarış HUD'u (drag)",
    ac: yarisAc("dg"),
    bekle: "#hud:not(.hidden) #gs",
  },
  {
    id: "duraklatma",
    dal: "menu",
    ad: "Duraklatma menüsü",
    ac: async (p) => {
      await yarisAc("gp")(p);
      await gec(400);
      await p.evaluate(() => document.querySelector("#gs").click());
    },
    bekle: "#set:not(.hidden) #cl",
    dikeyKaydirma: true,
  },
  {
    id: "yaris-sonu",
    dal: "menu",
    ad: "Yarış sonu",
    ac: async (p) => {
      await yarisAc("gp")(p);
      await p.evaluate(() => {
        LT.yaris.EV.t = 61.234;
        LT.yaris.EV.lap = 3;
        LT.yaris.EV.bestLap = 20.1;
        LT.endEvent();
      });
    },
    bekle: "#res:not(.hidden)",
    dikeyKaydirma: true,
  },
];

export const ekranBul = (id) => EKRANLAR.find((e) => e.id == id);
export { temizle, gec };
