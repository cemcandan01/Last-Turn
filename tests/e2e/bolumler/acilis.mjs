/* global LT */
// Açılış: menü ekranları, yarış türü görselleri, sürüm numarası
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
  const surum = await p.evaluate(() => [
    LT.surum,
    document.documentElement.outerHTML.match(/APP_VERSION='([^']+)'/)?.[1],
  ]);
  ok(
    surum[0] == surum[1],
    `sürüm ${surum[0]} (index.html'deki sürümle aynı: eski uygulamalar güncellemeyi görür)`,
  );
}
