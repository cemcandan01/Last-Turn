/* global LT */
// Pist listesi ve yarış ayrıntısı: her türde 8 pist seviye sırasıyla (bir seviyede birden çok pist olabilir), her kartta seviye rozeti ve kimin için ideal
// olduğu; drift yarışında hedef puan. Kartlar yan yana tek sırada (aşağı kaydırma yok).
export default async function ({ p, ok }) {
  const r = await p.evaluate(() => {
    const r = { turler: {} };
    // Seviye dizisi türe göre: drag pistleri 250 m (sev 1) ve 1000 m (sev 5) ile ayrı dağılır
    const beklenen = { dg: "1,1,2,3,4,5,5,6" };
    for (const t of ["gp", "rx", "rl", "dp", "dg"]) {
      LT.showMenu(["race", "t:" + t]);
      const k = [...document.querySelectorAll("#menu .rlist .rc")],
        lv = k.map((e) => +e.querySelector(".lv i").textContent),
        ideal = k.every((e) => e.querySelector(".rci small").textContent.length > 10),
        tekSira = k.every((e) => Math.abs(e.offsetTop - k[0].offsetTop) < 2);
      r.turler[t] = k.length == 8 && lv.join() == (beklenen[t] || "1,2,2,3,4,4,5,6") && ideal && tekSira;
    }
    LT.showMenu(["race", "t:dp"]);
    r.driftHedef = /Hedef\s*\d+ puan/.test(document.querySelector("#menu .rlist .rc .rcs").textContent);
    document.querySelector("#menu .rlist .rc").click();
    r.ayrintiRozet =
      !!document.querySelector("#menu .evh .lv") && !!document.querySelector("#menu .evh .lvd");
    r.ayrintiHedef = /puan/.test(document.querySelector("#menu .evh .rcs").textContent);
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    Object.values(r.turler).every(Boolean) && r.driftHedef && r.ayrintiRozet && r.ayrintiHedef,
    "pist listesi: her türde 8 pist seviye sırasıyla (bir seviyede birden çok pist olabilir), seviye rozeti ve kimin için ideal; drift hedef puanı " +
      JSON.stringify(r),
  );
}
