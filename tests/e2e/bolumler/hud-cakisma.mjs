/* global LT */
// HUD düzenleri (docs/HUD.md): göstergeler çakışmıyor, taşmıyor; tek drift sayacı, açı yok
export default async function ({ p, ok }) {
  // her düzen ve kontrol türünde göstergeler birbirine ve tuşlara değmemeli, ekrandan taşmamalı;
  // drift yarışında drift sayacı tek (üst orta), sol üstte toplam puan
  const hudSonuc = await p.evaluate(async () => {
    const sorun = [];
    const ctl = [
      { steer: "btn", gas: "btn" },
      { steer: "wheel", gas: "analog" },
      { steer: "tilt", gas: "auto" },
    ];
    // iPhone 13 yatay güvenli alanı
    const a = document.querySelector("#app").style;
    for (const [k, v] of [
      ["--sal", "47px"],
      ["--sar", "47px"],
      ["--sab", "21px"],
      ["--sat", "0px"],
    ])
      a.setProperty(k, v);
    LT.demoStop();
    const dp = LT.EVENTS.findIndex((e) => e.ty == "dp"),
      P = LT.HUD_PARCALARI;
    // üç bonustan son ikisi en az bir düzende yan yana (tek satırda) görülmeli
    let ucBonus = 0;
    for (const c of ctl) {
      Object.assign(LT.CT, c);
      LT.startEvent(dp, 2);
      const EV = LT.yaris.EV;
      EV.score = 2844;
      EV.combo = 1240;
      EV.mult = 3;
      // bankaya geçmemiş bonus kombo panelinde görünür
      EV.bonus = 1450;
      // pist dalının ters yön bayrağı: GERİ DÖN diğer göstergelerle çakışmamalı
      EV.ters = true;
      // drift bonus bildirimleri (pist dalının sözleşmesi): üç farklı bonus
      EV.driftOlay = [
        { ad: "UZUN DRIFT", puan: 100, t: 0 },
        { ad: "DİREKSİYONSUZ", puan: 100, t: 0 },
        { ad: "TEK YÖN", puan: 250, t: 0 },
      ];
      // x6 sözleşmesi: 1. turda drift oranı (çubuk + %), anlık çarpan
      EV.driftOran = 0.87;
      EV.driftCarpan = 3;
      EV.x6 = false;
      // geri sayımda kalsın: kombo bankaya geçmesin
      EV.cd = 1e9;
      LT.sim.S.vx = 30;
      for (const hiz of Object.keys(P.hiz.s))
        for (const harita of Object.keys(P.harita.s))
          for (const [sayac, tus] of [
            ["panel", "panel"],
            ["yazi", "simge"],
          ]) {
            Object.assign(LT.gorunum, { hiz, harita, sayac, tus });
            LT.hudDuzeniUygula();
            await new Promise((r) => setTimeout(r, 40));
            const W = innerWidth,
              H = innerHeight,
              ad = [hiz, harita, sayac, c.steer + "+" + c.gas].join("/");
            const kutular = [".hTL", ".hBt", "#dr", ".hSP", "#mm", "#ters", "#bon", "#ctl > *"]
              .flatMap((q) => [...document.querySelectorAll(q)].map((e) => [q, e.getBoundingClientRect()]))
              .filter(([, r]) => r.width > 0 && r.height > 0);
            // bonuslar alt alta birikip yolu kapatmaz: üçü tek satırda
            const bon = document.querySelector("#bon");
            if (bon.children.length && bon.getBoundingClientRect().height > 30)
              sorun.push(ad + ": drift bonusları tek satırda değil");
            if (bon.children.length === 2) ucBonus++;
            for (const [q, r] of kutular)
              if (r.left < 0 || r.top < 0 || r.right > W || r.bottom > H)
                sorun.push(ad + ": " + q + " ekrandan taşıyor");
            for (let i = 0; i < kutular.length; i++)
              for (let j = i + 1; j < kutular.length; j++) {
                const [qa, ra] = kutular[i],
                  [qb, rb] = kutular[j];
                if (ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom)
                  sorun.push(ad + ": " + qa + " ile " + qb + " çakışıyor");
              }
            // kadran yayı kendi dairesinin içinde (Safari'de taşıyordu)
            if (hiz == "kadran") {
              const k = document.querySelector(".kd").getBoundingClientRect(),
                d = document.querySelector(".hSP").getBoundingClientRect();
              if (k.left < d.left || k.top < d.top || k.right > d.right + 0.5 || k.bottom > d.bottom + 0.5)
                sorun.push(ad + ": kadran yayı daireden taşıyor");
            }
            const ev = document.querySelector("#ev").textContent,
              dr = document.querySelector("#dr");
            if (!ev.includes("2844") || /kombo/i.test(ev))
              sorun.push(ad + ": sol üstte toplam puan yok ya da kombo var: " + ev);
            if (
              dr.classList.contains("hidden") ||
              !document.querySelector("#drP").textContent.includes("1240")
            )
              sorun.push(ad + ": üst ortada kombo görünmüyor");
            if (!document.querySelector("#drA").textContent.includes("+1450"))
              sorun.push(ad + ": biriken bonus kombo panelinde görünmüyor");
          }
    }
    if (!ucBonus) sorun.push("iki drift bonusu hiç yan yana görünmedi");
    // x6 kazanıldı: animasyon tetiklenir, bonus satırı çıkmaz, 2. turda rozet; sonra animasyon biter
    for (const hiz of ["kose", "bant"]) {
      Object.assign(LT.CT, { steer: "btn", gas: "btn" });
      LT.startEvent(dp, 2);
      const EV = LT.yaris.EV;
      Object.assign(LT.gorunum, {
        hiz,
        harita: "kapali" in P.harita.s ? "kapali" : Object.keys(P.harita.s)[0],
      });
      LT.hudDuzeniUygula();
      EV.cd = 1e9;
      EV.combo = 1240;
      EV.mult = 3;
      EV.ters = true;
      EV.driftOran = 0.95;
      await new Promise((r) => setTimeout(r, 120));
      const drO = document.querySelector("#drO");
      if (!drO.className.includes("hazir")) sorun.push(hiz + ": oran %95 iken x6 HAZIR yok");
      EV.lap = 1;
      EV.x6 = true;
      EV.driftCarpan = 6;
      EV.driftOlay = [{ ad: "ÇARPAN x6", puan: 0, t: 0 }];
      await new Promise((r) => setTimeout(r, 300));
      if (!document.querySelector("#x6a").classList.contains("ac"))
        sorun.push(hiz + ": x6 animasyonu başlamadı");
      if (document.querySelector("#bon").textContent.includes("ÇARPAN"))
        sorun.push(hiz + ": x6 olayı bonus satırı olarak çıktı");
      if (!drO.className.includes("rozet") || !drO.textContent.includes("x6"))
        sorun.push(hiz + ": 2. turda x6 rozeti yok");
      const kut = ["#dr", "#bon", "#ters", ".hTL", ".hBt", "#mm"]
        .flatMap((q) => [...document.querySelectorAll(q)].map((e) => [q, e.getBoundingClientRect()]))
        .filter(([, r]) => r.width > 0 && r.height > 0);
      for (let i = 0; i < kut.length; i++)
        for (let j = i + 1; j < kut.length; j++) {
          const [qa, ra] = kut[i],
            [qb, rb] = kut[j];
          if (ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom)
            sorun.push(hiz + ": x6 rozetiyle " + qa + "/" + qb + " çakışıyor");
        }
      await new Promise((r) => setTimeout(r, 2000));
      if (document.querySelector("#x6a").classList.contains("ac"))
        sorun.push(hiz + ": x6 animasyonu kapanmadı");
    }
    // yarışta patinaj/havada uyarısı yok, GERİ DÖN yalnız EV.ters iken; serbest sürüşte patinaj var
    const asf = LT.EVENTS.findIndex((e) => e.ty != "dp" && e.ty != "dg");
    LT.startEvent(asf, 2);
    LT.yaris.EV.cd = 1e9;
    LT.sim.S.spin = true;
    LT.sim.S.air = true;
    LT.yaris.EV.ters = false;
    await new Promise((r) => setTimeout(r, 300));
    const dr0 = document.querySelector("#dr"),
      ters0 = document.querySelector("#ters");
    if (!dr0.classList.contains("hidden")) sorun.push("yarışta patinaj/havada uyarısı çıkıyor");
    if (!ters0.classList.contains("hidden")) sorun.push("EV.ters false iken GERİ DÖN görünüyor");
    LT.yaris.EV.ters = true;
    await new Promise((r) => setTimeout(r, 300));
    if (ters0.classList.contains("hidden") || !ters0.textContent.includes("GERİ DÖN"))
      sorun.push("EV.ters true iken GERİ DÖN görünmüyor");
    LT.sim.S.spin = false;
    LT.sim.S.air = false;
    // serbest sürüşte drift açısı gösterilmez
    LT.startWorld(1);
    LT.oyun.mode = "pause";
    LT.sim.d.D.t = 1;
    LT.sim.d.D.beta = 0.6;
    await new Promise((r) => setTimeout(r, 300));
    if (
      !document.querySelector("#dr").classList.contains("hidden") ||
      /°/.test(document.querySelector("#hud").textContent)
    )
      sorun.push("serbest sürüşte drift açısı görünüyor");
    LT.sim.S.spin = true;
    await new Promise((r) => setTimeout(r, 300));
    if (document.querySelector("#dr").classList.contains("hidden"))
      sorun.push("serbest sürüşte patinaj uyarısı çıkmıyor");
    LT.sim.S.spin = false;
    Object.assign(LT.CT, { steer: "btn", gas: "btn" });
    Object.assign(LT.gorunum, LT.HUDLAR.kose.p);
    LT.hudDuzeniUygula();
    for (const k of ["--sal", "--sar", "--sab", "--sat"]) a.removeProperty(k);
    LT.showMenu(["home"]);
    return sorun;
  });
  ok(
    !hudSonuc.length,
    "HUD seçenekleri (hız × harita × sayaç/tuş) × 3 kontrol türü: çakışma ve taşma yok, tek drift sayacı, açı yok" +
      (hudSonuc.length ? " — " + hudSonuc.slice(0, 4).join("; ") : ""),
  );
}
