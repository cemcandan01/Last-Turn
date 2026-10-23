// Ekran uyum denetiminin kendi doğrulaması: bilerek bozulmuş sayfalarda her hata türünü yakalamalı,
// temiz sayfada yanlış alarm vermemeli (eğik ama birbirine değmeyen kartlar dahil).
import { CIHAZLAR } from "../../cihazlar.mjs";
import { cihazSayfasi, olcSecenek } from "../../yardimci/cihaz-denetim.mjs";
import { olc } from "../../yardimci/cihaz-olcum.mjs";

const ST = `<meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden;font:16px sans-serif}
button{position:absolute;font:16px sans-serif;padding:0}</style>`;
// iPhone 13: 844×390, yan pay 47, alt 21, çentik sol/sağ kenarda ortada
const SAYFALAR = [
  {
    ad: "taşan yazı (kap kesiyor)",
    beklenen: /yazı kesiliyor/,
    html: `<div style="position:absolute;left:100px;top:100px;width:80px;overflow:hidden;white-space:nowrap">Bu yazı kabın dışına taşıyor</div>`,
  },
  {
    ad: "üç nokta (ellipsis) ile kısaltılan yazı",
    beklenen: /yazı kesiliyor/,
    html: `<div style="position:absolute;left:100px;top:100px;width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Uzun bir pist adı burada</div>`,
  },
  {
    ad: "üst üste binen düğmeler",
    beklenen: /düğmeler üst üste/,
    html: `<button style="left:120px;top:100px;width:100px;height:50px">Gaz</button><button style="left:180px;top:110px;width:100px;height:50px">Fren</button>`,
  },
  {
    ad: "ekran dışına taşan düğme",
    beklenen: /ekran dışına taşıyor/,
    html: `<button style="left:760px;top:100px;width:120px;height:50px">Tamam</button>`,
  },
  {
    ad: "küçük dokunma hedefi",
    beklenen: /dokunma hedefi küçük/,
    html: `<button style="left:120px;top:100px;width:28px;height:28px">+</button>`,
  },
  {
    ad: "çentiğin altında kalan düğme",
    beklenen: /çentiğe giriyor/,
    html: `<button style="left:5px;top:170px;width:60px;height:50px">Ok</button>`,
  },
  {
    ad: "ana ekran çubuğu bölgesindeki düğme",
    beklenen: /güvenli alanı aşıyor \(alt/,
    html: `<button style="left:300px;top:340px;width:120px;height:50px">Geri</button>`,
  },
  {
    ad: "yuvarlak köşeye giren düğme",
    beklenen: /yuvarlak ekran köşesine giriyor/,
    html: `<button style="left:0;top:0;width:60px;height:50px">Menü</button>`,
  },
  {
    ad: "sayfa yatay kaydırılabiliyor",
    beklenen: /sayfa kaydırılabiliyor/,
    html: `<div style="position:absolute;left:100px;top:100px;width:1400px;height:20px;background:#444"></div>`,
  },
  {
    ad: "istenmeyen iç kaydırma",
    beklenen: /istenmeyen dikey kaydırma/,
    html: `<div style="position:absolute;left:100px;top:50px;width:200px;height:100px;overflow:auto"><div style="height:400px">uzun</div></div>`,
  },
  {
    ad: "üst üste binen yazılar",
    beklenen: /yazılar üst üste/,
    html: `<div style="position:absolute;left:120px;top:100px">Birinci satır yazısı</div><div style="position:absolute;left:150px;top:104px">İkinci satır yazısı</div>`,
  },
];
const TEMIZ = [
  {
    ad: "düzgün sayfa",
    html: `<button style="left:120px;top:100px;width:120px;height:48px">Gaz</button><button style="left:260px;top:100px;width:120px;height:48px">Fren</button><div style="position:absolute;left:120px;top:200px">Normal bir yazı</div>`,
  },
  {
    ad: "eğik ama değmeyen kartlar (kapak akışı benzeri)",
    html: `<div style="position:absolute;left:200px;top:80px;width:100px;height:200px;background:#555;transform:skewX(-12deg)"></div><div style="position:absolute;left:330px;top:80px;width:100px;height:200px;background:#555;transform:skewX(-12deg)"></div><button style="left:200px;top:300px;width:100px;height:48px">A</button><button style="left:330px;top:300px;width:100px;height:48px;transform:skewX(-12deg)">B</button>`,
  },
  {
    ad: "kaydırılabilir listede aşağıda kalan öğeler (beklenen kaydırma)",
    ayar: { dikeyKaydirma: true },
    html: `<div style="position:absolute;left:100px;top:50px;width:300px;height:100px;overflow:auto"><div style="height:60px">bir</div><div style="height:60px">iki</div><div style="height:60px">üç</div></div>`,
  },
];

export default async function ({ p, ok }) {
  const cihaz = CIHAZLAR.find((c) => c.id == "iphone-13");
  const { ctx, p: q } = await cihazSayfasi(p.context().browser(), cihaz);
  const calis = async (s) => {
    await q.goto("about:blank");
    await q.setContent(`<!doctype html>${ST}<div id="app">${s.html}</div>`);
    return q.evaluate(olc, olcSecenek(cihaz, { tuval: null, ...(s.ayar || {}) }));
  };
  for (const s of SAYFALAR) {
    const r = await calis(s);
    ok(
      r.hatalar.some((h) => s.beklenen.test(h.sorun)),
      `denetim yakaladı: ${s.ad} → ${r.hatalar.map((h) => h.sorun).join(" · ") || "(hata bulamadı)"}`,
    );
  }
  for (const s of TEMIZ) {
    const r = await calis(s);
    ok(
      !r.hatalar.length,
      `denetim yanlış alarm vermedi: ${s.ad} ${r.hatalar.map((h) => h.sorun).join(" · ")}`,
    );
  }
  await ctx.close();
}
