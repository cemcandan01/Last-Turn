/* global LT */
// Açılış: menü ekranları, yarış türü görselleri, ana ekran kartları, sürüm numarası
export default async function ({ p, ok }) {
  const v = await p.evaluate(() => {
    const r = [];
    for (const m of [
      ["race"],
      ["race", "t:gp"],
      ["race", "t:gp", "e:0"],
      ["free"],
      ["profile"],
      ["settings"],
      ["home"],
    ]) {
      LT.showMenu(m);
      r.push(document.querySelector("#menu").innerHTML.length > 200);
    }
    return r;
  });
  ok(v.every(Boolean), "menü ekranları (yarış, tür, pist, serbest, profil, ayarlar) açılıyor");
  const imgs = await p.evaluate(async () => {
    LT.showMenu(["race"]);
    await new Promise((r) => setTimeout(r, 800));
    return [...document.querySelectorAll(".tile img")].map((i) => i.naturalWidth > 0);
  });
  ok(imgs.length == 5 && imgs.every(Boolean), "5 yarış türü görseli yükleniyor");
  const ana = await p.evaluate(async () => {
    LT.showMenu(["home"]);
    await new Promise((r) => setTimeout(r, 800));
    const k = [...document.querySelectorAll("#menu .mcards .mk")],
      m = document.querySelector("#menu").getBoundingClientRect(),
      // kartlar altta, soldan sağa tek sırada ve ekranın içinde (giriş animasyonundan bağımsız: yerleşim konumu)
      r = k.map((e) => ({
        left: e.offsetLeft,
        right: e.offsetLeft + e.offsetWidth,
        top: e.offsetTop,
        bottom: e.offsetTop + e.offsetHeight,
      })),
      sira = r.every((b, i) => !i || (b.left >= r[i - 1].right - 1 && Math.abs(b.top - r[0].top) < 2)),
      icinde = r.every(
        (b) => b.left >= 0 && b.right <= m.width + 1 && b.bottom <= m.height + 1 && b.top > m.height * 0.4,
      ),
      // her panelde ikon (çizimi olan svg) ve başlık
      gorsel = k.every((e) => e.querySelector("svg.ik path") && e.querySelector("b").textContent.trim()),
      adlar = k.map((e) => e.textContent.trim());
    k[0].click();
    const yarisAcildi = !!document.querySelector("#menu .tile[data-ty]");
    document.querySelector("#mbk").click();
    return {
      n: k.length,
      sira,
      icinde,
      gorsel,
      adlar,
      yarisAcildi,
      eve: !!document.querySelector("#menu .mk"),
    };
  });
  ok(
    ana.n == 5 && ana.sira && ana.icinde && ana.gorsel && ana.yarisAcildi && ana.eve,
    "ana ekran: altta soldan sağa 5 ikonlu panel, Yarış kartı açılıyor, geri ana ekrana döner " +
      JSON.stringify(ana),
  );
  const surum = await p.evaluate(() => [
    LT.surum,
    document.documentElement.outerHTML.match(/APP_VERSION='([^']+)'/)?.[1],
  ]);
  ok(
    surum[0] == surum[1],
    `sürüm ${surum[0]} (index.html'deki sürümle aynı: eski uygulamalar güncellemeyi görür)`,
  );
}
