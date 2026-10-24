/* global LT */
// XP görselleri (temiz profil, iPhone 13 yatay): pist listesinde kilitler, türde açık pist sayısı, profil seviye çubuğu,
// yarış sonu XP çubuğu ve seviye atlama kutlaması. Ekran görüntüleri tests/cikti/xp-*.png.
import fs from "node:fs";
import path from "node:path";
export default async function ({ p, ok }) {
  const url = p.url().split("?")[0] + "?" + Date.now(),
    kx = await p
      .context()
      .browser()
      .newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }),
    q = await kx.newPage();
  await q.goto(url);
  await q.waitForFunction(() => window.LT, null, { timeout: 15000 });
  const cikti = path.join(process.cwd(), "tests", "cikti");
  fs.mkdirSync(cikti, { recursive: true });
  const foto = (ad) => q.screenshot({ path: path.join(cikti, "xp-" + ad + ".png") });
  const bekle = (ms) => q.waitForTimeout(ms);
  await q.evaluate(() => LT.showMenu(["home"]));
  const ana = await q.evaluate(() => ({
    rozet: !!document.querySelector(".mpro .lvr"),
    cubuk: !!document.querySelector(".mpro .xpb i"),
  }));
  ok(
    await q.evaluate(
      () =>
        !!document.querySelector(".mpro .bky .ik") &&
        document.querySelector(".mpro .bky b").textContent == String(LT.para()),
    ),
    "ana menüde bakiye (para ikonu + sayı)",
  );
  ok(ana.rozet && ana.cubuk, "ana menü profil alanında seviye rozeti ve XP çubuğu " + JSON.stringify(ana));
  await foto("ana");
  await q.evaluate(() => LT.showMenu(["race"]));
  const kapak = await q.evaluate(() => document.querySelector(".tk em").textContent);
  ok(/1\/8 pist açık/.test(kapak), "tür kartında açık pist sayısı: " + kapak);
  await q.evaluate(() => LT.showMenu(["race", "t:gp"]));
  const liste = await q.evaluate(() => {
    const k = [...document.querySelectorAll("#menu .rc")];
    k[1].click();
    return {
      toplam: k.length,
      kilitli: k.filter((c) => c.classList.contains("kilitli")).length,
      metin: k[1].querySelector(".kilit")?.textContent,
      acikAyrintiyaGitmedi: !document.querySelector("#mgo"),
      not: document.getElementById("kilitnot")?.classList.contains("goster"),
    };
  });
  ok(liste.kilitli == 7 && liste.toplam == 8, "temiz profilde 7 pist kilitli: " + JSON.stringify(liste));
  ok(/Seviye 2'de açılır/.test(liste.metin), "kilit yazısı: " + liste.metin);
  ok(liste.acikAyrintiyaGitmedi && liste.not, "kilitli pist açılmaz, kısa açıklama çıkar");
  await bekle(400);
  await foto("pistler");
  await q.evaluate(() => LT.showMenu(["profile"]));
  ok(
    await q.evaluate(
      () => !!document.querySelector(".pseviye .lvr.b") && !!document.querySelector(".pseviye .xpb"),
    ),
    "profil ekranında seviye rozeti ve XP çubuğu",
  );
  ok(await q.evaluate(() => !!document.querySelector(".pseviye .bky.b")), "profil ekranında bakiye");
  await foto("profil");
  await q.evaluate(() => LT.showMenu(["race", "t:gp", "e:0"]));
  ok(
    await q.evaluate(() => /İlk kez/.test(document.querySelector(".pod")?.textContent || "")),
    "pist ayrıntısında para ödülü",
  );
  // yarış sonu: seviye 2'ye 5 XP kala başla, yarışı hedef içinde bitir
  const son = await q.evaluate(() => {
    LT.xpEkle(30, "test");
    LT.showMenu(["home"]);
    const i = LT.EVENTS.findIndex((e) => e.ty == "gp" && e.lv == 1);
    // temiz profilde açık araç: asfalt başlangıç aracı (Kızıl Ok satın alınır)
    LT.startEvent(
      i,
      LT.CARS.findIndex((c, k) => c.ty == "gp" && LT.aracAcikMi(k)),
    );
    const E = LT.yaris.EV;
    E.t = E.ys[2] - 1;
    LT.endEvent();
    return { xp: E.xp, lvSonra: LT.seviye().lv, blok: !!document.querySelector("#res .xps") };
  });
  ok(await q.evaluate(() => !!document.querySelector("#res .prs .ik")), "yarış sonunda para bloğu");
  ok(son.blok && son.xp > 0, "yarış sonunda XP bloğu: " + JSON.stringify(son));
  await bekle(1800);
  await bekle(2400);
  const kut = await q.evaluate(() => ({
    acik: document.getElementById("lvup")?.classList.contains("acik"),
    metin: document.getElementById("lvup")?.textContent,
  }));
  ok(son.lvSonra >= 2 && kut.acik && /Seviye \d+!/.test(kut.metin), "seviye atlama kutlaması: " + kut.metin);
  await foto("kutlama");
  ok(
    await q.evaluate(() => document.querySelector("#res .prk")?.textContent == String(LT.yaris.EV.para)),
    "para sayacı kazanıma ulaştı",
  );
  await q.evaluate(() => document.getElementById("lvup").click());
  ok(
    await q.evaluate(() => !document.getElementById("lvup").classList.contains("acik")),
    "dokununca kutlama kapanır",
  );
  await bekle(300);
  await foto("sonuc");
  await kx.close();
}
