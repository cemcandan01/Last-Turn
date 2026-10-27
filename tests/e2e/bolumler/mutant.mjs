/* global LT */
// MUTANT A1/A2: menüde Serbest sürüş yerine MUTANT; koşu başı boss kartı + 3 kötü araç + 3 pasif; açık dünyada etkinlik
// işaretine girince kart, etkinlik koşu aracıyla ve kariyer ödülü/rekor olmadan; sonuçta koşu parası; atölyede parça;
// NİTRO tuşu gücü süreli artırır; eklenti sandığı (normal/lanetli); süre dolunca zorunlu boss; boss kaybedilince özet ve koşu kapanır; sonra normal yarış etkilenmez.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    // CI yavaş olabilir: koşul sağlanana dek (en çok 8 sn) bekle
    const olana = async (f, n = 80) => {
      for (let i = 0; i < n && !f(); i++) await bekle(100);
      return f();
    };
    const res = document.querySelector("#res"),
      r = {};
    // eksik düğme hangi adımda: hata iletisinde seçici görünür
    const tik = (sec) => {
      const e = res.querySelector(sec);
      if (!e)
        throw new Error(
          "düğme yok: " +
            sec +
            " · " +
            JSON.stringify({
              mod: LT.oyun.mode,
              x: LT.sim.S.x,
              z: LT.sim.S.z,
              faz: LT.mutant.kosu?.faz,
              kalan: LT.mutant.kosu?.kalan,
              icinde: LT.mutant.icinde,
              kapali: LT.mutant.kapali,
            }) +
            res.textContent.slice(0, 60),
        );
      e.click();
    };
    LT.demoStop();
    LT.showMenu(["home"]);
    const menu = document.querySelector("#menu").textContent;
    r.menu = menu.includes("MUTANT") && !menu.includes("Serbest sürüş");
    LT.showMenu(["free"]);
    document.querySelector("[data-w='0']").click();
    r.basla =
      LT.oyun.mode == "result" &&
      !!res.querySelector(".mtb") &&
      res.querySelectorAll("[data-arac]").length == 3 &&
      document.querySelector("#gar").classList.contains("hidden");
    tik("[data-arac]");
    r.pasif = res.querySelectorAll("[data-pasif]").length == 3;
    tik("[data-pasif]");
    const k = LT.mutant.kosu;
    await bekle(700);
    // Merkez ve atölye aynı noktada: oyuncu hareket etmeden atölye otomatik açılmamalı.
    r.baslangicAtolye = LT.oyun.mode == "drive" && LT.mutant.kapali == "a";
    const isaretAdlari = new Set();
    LT.scene.traverse((o) => {
      if (o.name.startsWith("mutant-etiket-")) isaretAdlari.add(o.name.slice(14));
    });
    const yarisTurleri = ["ASFALT", "RALLİKROS", "RALLİ", "DRİFT", "DRAG"];
    r.isaretYazilari = yarisTurleri.every((ad) => isaretAdlari.has(ad));
    r.isaretYazilari &&= isaretAdlari.has("ATÖLYE") && isaretAdlari.has("BOSS");
    r.surus =
      LT.oyun.mode == "drive" &&
      k.faz == "surus" &&
      k.etkinlikler.length == 8 &&
      document.querySelector("#hName").textContent.startsWith("MUTANT") &&
      document.querySelector("#ev").textContent.includes("BOSS");
    // etkinlik işaretine dur: kart (düello ayrı bölümde: tests/e2e/bolumler/rakip.mjs)
    const e = k.etkinlikler.find((q) => !q.rakip),
      ilerleme = localStorage.getItem("lt_ilerleme"),
      p0 = k.para;
    LT.reset(e.x, e.z, 0);
    r.kart = await olana(() => LT.oyun.mode == "result" && res.querySelectorAll("[data-risk]").length == 3);
    // ölümcül kademe: ödül ×3,5
    tik("[data-risk='2']");
    const EV = LT.yaris.EV;
    r.etkinlik =
      LT.mutant.risk == 2 &&
      !!EV &&
      EV.mutant === true &&
      EV.kariyer === false &&
      EV.k.startsWith("mutant_") &&
      EV.i == e.i;
    // hedefi geçerek bitir
    EV.state = "run";
    EV.t = 1;
    EV.score = EV.limit + 1;
    LT.endEvent();
    r.sonuc =
      res.textContent.includes("Hedef geçildi") &&
      k.para > p0 &&
      e.yapildi &&
      localStorage.getItem("lt_ilerleme") === ilerleme;
    tik("#mDevam");
    while (LT.oyun.mode == "result" && res.querySelector("[data-pasif]")) tik("[data-pasif]");
    await bekle(100);
    r.donus = LT.oyun.mode == "drive" && !LT.yaris.EV && Math.hypot(LT.sim.S.x - e.x, LT.sim.S.z - e.z) < 15;
    // sert çarpma: gövde düşer, HUD'da görünür
    const g0 = k.govde;
    LT.sim.S.hit = LT.sim.d.zaman + 1;
    r.hasar = await olana(() => k.govde < g0 && k.carpma == 1);
    await bekle(150);
    r.hasarHud = document.querySelector("#lap").textContent.includes("Gövde " + Math.round(k.govde));
    // NİTRO: başlangıç enerjisiyle tuş hazır; basınca güç artar, durum arayüzü açık gösterir, süre bitince söner
    const tus = document.querySelector("#mnt"),
      hp0 = LT.kurulum.mod.car.hp;
    r.nitroTus =
      !!tus && (await olana(() => tus.classList.contains("hazir"))) && LT.mutantDurumu().nitroHazir;
    const e0 = LT.mutantDurumu().enerji;
    tus.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    // yavaş CI'da simülasyon gerçek zamandan yavaş akar: nitro (2,5 sn sim) için 30 sn'ye dek beklenir. Söndükten
    // sonra güç, açıkken ölçülen gücün nitro çarpanı kadar altına iner (arada gövde hasarı gücü değiştirebilir)
    let hpAcik = 0;
    r.nitro =
      (await olana(() => LT.mutantDurumu().nitroAcik && LT.kurulum.mod.car.hp > hp0 * 1.5, 300)) &&
      LT.mutantDurumu().enerji < e0;
    hpAcik = LT.kurulum.mod.car.hp;
    r.nitroBitti = await olana(
      () => !LT.mutantDurumu().nitroAcik && LT.kurulum.mod.car.hp < hpAcik / 1.5 + 1e-6,
      300,
    );
    r.nitroAyrinti = { hp0, hpAcik, hp: LT.kurulum.mod.car.hp, d: LT.mutantDurumu() };
    // eklenti sandığı: iki seçenek, seçilen koşuya eklenir
    const s0 = k.sandiklar[0];
    LT.reset(s0.x, s0.z, 0);
    r.sandik = await olana(() => res.querySelectorAll("[data-eklenti]").length == 2);
    const ek = res.querySelector("[data-eklenti]")?.dataset.eklenti;
    res.querySelector("[data-eklenti]")?.click();
    r.sandik = r.sandik && s0.acildi && k.pasifler.includes(ek) && LT.oyun.mode == "drive";
    // lanetli sandık: bedel yazılı, bırakılınca kapalı kalır
    const s2 = k.sandiklar[2];
    LT.reset(s2.x, s2.z, 0);
    r.lanetli = await olana(() => res.textContent.includes("Lanetli") && res.textContent.includes("Bedel"));
    res.querySelector("#mGec")?.click();
    r.lanetli = r.lanetli && !s2.acildi && LT.oyun.mode == "drive";
    // atölye
    k.para = 2000;
    LT.reset(0, -90, 0);
    r.atolye = await olana(() => res.textContent.includes("Atölye") && !!res.querySelector("[data-parca]"));
    r.tamir = !!res.querySelector("#mTamir");
    tik("#mTamir");
    r.tamir = r.tamir && k.govde == 100;
    tik("[data-parca]");
    r.parca = k.parcalar.length == 1 && !!LT.kurulum.mod && LT.kurulum.mod.parcalar.includes(k.parcalar[0]);
    tik("#mKapat");
    LT.reset(140, 300, 0);
    // süre dolar: zorunlu boss
    // başlangıç pasifi rastgele "Son nefes" olabilir (+90 sn): bu adımda kullanılmış say
    k.sonNefes = true;
    k.kalan = 0.02;
    await olana(() => !!res.querySelector("#mBoss"));
    r.boss =
      res.textContent.includes("Süre doldu") && !!res.querySelector("#mBoss") && !res.querySelector("#mGec");
    tik("#mBoss");
    const B = LT.yaris.EV;
    r.bossYaris = !!B && B.mutant && B.ty == k.boss.ty && LT.mutant.etkinlik == "boss";
    B.state = "run";
    B.t = 99999;
    B.score = 0;
    LT.endEvent();
    r.kaybetti = res.textContent.includes("Boss kazandı") && k.faz == "bitti";
    tik("#mDevam");
    r.ozet = res.textContent.includes("Koşu bitti") && !!res.querySelector("#mYeni");
    tik("#mMenu");
    r.kapandi = LT.oyun.mode == "menu" && LT.mutant.kosu === null;
    // normal yarış etkilenmez
    LT.startEvent(0, 0);
    r.normal = LT.yaris.EV.mutant === false && !LT.yaris.EV.k.startsWith("mutant_");
    LT.showMenu(["home"]);
    return r;
  });
  ok(r.menu, "ana menüde Serbest sürüş yerine MUTANT");
  ok(r.basla && r.pasif, "koşu başı: garaj yok, boss kartı, 3 kötü araç, 3 başlangıç pasifi");
  ok(r.surus, "açık dünyada 8 etkinlik, HUD'da MUTANT ve boss geri sayımı");
  ok(r.baslangicAtolye, "başlangıç noktasında atölye kendi kendine açılmaz");
  ok(r.isaretYazilari, "dünyadaki yarış işaretlerinin türü uzaktan yazıyla anlaşılır");
  ok(r.kart && r.etkinlik, "etkinlik işaretinde durunca kart; etkinlik koşu aracıyla, kariyer dışı");
  ok(
    r.sonuc && r.donus,
    "hedef geçilince koşu parası, kariyer ilerlemesi değişmez, haritada aynı yere dönüş",
  );
  ok(r.hasar && r.hasarHud, "sert çarpma gövdeyi düşürür, HUD'da gövde görünür");
  ok(
    r.nitroTus && r.nitro && r.nitroBitti,
    "NİTRO tuşu hazır; basınca güç artar, enerji harcanır, süre bitince söner " +
      (r.nitroTus && r.nitro && r.nitroBitti ? "" : JSON.stringify(r.nitroAyrinti)),
  );
  ok(
    r.sandik && r.lanetli,
    "eklenti sandığı seçilen eklentiyi koşuya ekler; lanetli sandık bedeli gösterir, bırakılabilir",
  );
  ok(r.atolye && r.parca && r.tamir, "atölyede tamir ve stoktan parça alınır, araca takılır");
  ok(r.boss && r.bossYaris, "süre dolunca zorunlu boss yarışı, boss türünde pist");
  ok(r.kaybetti && r.ozet && r.kapandi, "boss kaybedilince koşu biter, özet, ana menüde koşu kapanır");
  ok(r.normal, "sonraki normal yarış MUTANT bayrağı taşımaz");
}
