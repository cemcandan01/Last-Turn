/* global LT */
// LT-SYS-005 skill'ler hissedilir ve anlaşılır: açık dünyada (serbest sürüş) üç yuva ikon/seviye/durum gösterir;
// kanca asfalt yola tutunur, halat görünür, enerji harcanır; yolsuz arazide istek reddedilir (HEDEF YOK, kırmızı yuva,
// enerji gitmez); Flying Dutchman gövdeyi hayalete çevirir ve faz bitince geri alır; Risk Taker dönüşümünde kor
// alevleri ve kalan süre görünür; enerji yetmeyince yuva "x/y". Gölgeler kapalıyken (en düşük görüntü ayarı) de
// efektler aynı. Ekran görüntüleri (iPhone 13 yatay): tests/cikti/beceri-kanca.png, -hayalet.png, -alev.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function ({ p, ok }) {
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  fs.mkdirSync(path.join(kok, "tests", "cikti"), { recursive: true });
  const goruntu = (ad) => p.screenshot({ path: path.join(kok, "tests", "cikti", ad) });
  const deger = (f) => p.evaluate(f);

  await deger(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const res = document.querySelector("#res");
    LT.demoStop();
    LT.showMenu(["free"]);
    document.querySelector("[data-w='0']").click();
    res.querySelector("[data-arac]").click();
    res.querySelector("[data-pasif]:not([data-pasif^='b:'])").click();
    await bekle(200);
    const k = LT.mutant.kosu;
    k.beceriler = [
      { id: "grappling-hook", seviye: 2, eklentiler: [], evrim: null },
      { id: "flying-dutchman", seviye: 1, eklentiler: [], evrim: null },
      { id: "risk-taker", seviye: 1, eklentiler: [], evrim: null },
    ];
    k.mek = { ...k.mek, enerji: 100 };
    LT.kontrolleriKur();
    // en düşük görüntü ayarı: gölgeler kapalı
    LT.set.shd = 0;
  });

  const r = await deger(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const k = LT.mutant.kosu,
      yuva = (id) => document.querySelector(`#ctl [data-beceri='${id}']`),
      bas = (id) =>
        yuva(id).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })),
      r = {};
    await bekle(300);
    r.yuvalar = ["grappling-hook", "flying-dutchman", "risk-taker"].every((id) => {
      const e = yuva(id);
      return (
        e &&
        e.querySelector("svg") &&
        e.querySelector("em[data-sv]") &&
        e.querySelector("u").textContent.trim()
      );
    });
    r.seviye = yuva("grappling-hook").querySelector("em").dataset.sv == "2";

    // yolsuz arazide, yola sırtı dönük: kanca reddedilir, enerji gitmez, neden yazılır
    LT.reset(640, -760, Math.PI / 2);
    await bekle(400);
    const e0 = k.mek.enerji,
      n0 = LT.mutant.red.n;
    bas("grappling-hook");
    await bekle(150);
    r.red =
      LT.mutant.red.n > n0 &&
      LT.mutant.red.engel == "hedef" &&
      yuva("grappling-hook").classList.contains("red") &&
      yuva("grappling-hook").textContent.includes("HEDEF YOK") &&
      k.mek.enerji >= e0;

    // düz asfalt yolda kuzeye hızlan, kanca yola tutunur: halat görünür, enerji gider
    LT.reset(210, -500, 0);
    LT.I.g = 1;
    await bekle(1500);
    r.e1 = k.mek.enerji;
    bas("grappling-hook");
    await bekle(120);
    return r;
  });
  // halat bağlıyken görüntü
  await goruntu("beceri-kanca.png");
  Object.assign(
    r,
    await deger(async () => {
      const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
      const k = LT.mutant.kosu;
      let halat = LT.beceriEfektBilgisi().halat,
        tutundu = !!k.bec.yerel["grappling-hook"]?.nokta;
      for (let i = 0; i < 8; i++) {
        tutundu ||= !!k.bec.yerel["grappling-hook"]?.nokta;
        halat ||= LT.beceriEfektBilgisi().halat;
        await bekle(50);
      }
      const t = document.querySelector("#ctl [data-beceri='grappling-hook']");
      return { tutundu, halat, harcadi: k.mek.enerji, kancaYazi: /\d,\d sn/.test(t.textContent) };
    }),
  );
  r.kanca = r.tutundu && r.halat && r.harcadi <= r.e1 - 20;

  const r2 = await deger(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const k = LT.mutant.kosu,
      yuva = (id) => document.querySelector(`#ctl [data-beceri='${id}']`),
      r = {};
    await bekle(1500);
    k.mek = { ...k.mek, enerji: 100 };
    yuva("flying-dutchman").dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    await bekle(300);
    r.hayalet = LT.beceriEfektBilgisi().hayalet > 5 && LT.mutantDurumu().hayalet;
    r.fazYazi =
      yuva("flying-dutchman").classList.contains("on") &&
      /\d,\d sn/.test(yuva("flying-dutchman").textContent);
    // faz sürerken kanca kapalı: neden FAZDA
    r.faz =
      yuva("grappling-hook").textContent.includes("FAZDA") ||
      yuva("grappling-hook").classList.contains("bekle");
    return r;
  });
  await goruntu("beceri-hayalet.png");

  const r3 = await deger(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const k = LT.mutant.kosu,
      yuva = (id) => document.querySelector(`#ctl [data-beceri='${id}']`),
      r = {};
    // faz bitene dek (oyun adımı başsız tarayıcıda gerçek zamandan yavaş olabilir)
    for (let i = 0; i < 80 && LT.mutantDurumu().hayalet; i++) await bekle(100);
    await bekle(200);
    r.hayaletBitti = LT.beceriEfektBilgisi().hayalet == 0 && !LT.mutantDurumu().hayalet;
    // Risk Taker dönüşümü (bar dolmuş gibi): alev izi ve kalan süre
    k.bec.yerel["risk-taker"].kalan = 5;
    await bekle(900);
    r.alev = LT.beceriEfektBilgisi().kor > 3;
    r.alevYazi =
      yuva("risk-taker").classList.contains("on") && /\d,\d sn/.test(yuva("risk-taker").textContent);
    return r;
  });
  await goruntu("beceri-alev.png");

  const r4 = await deger(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const k = LT.mutant.kosu,
      yuva = (id) => document.querySelector(`#ctl [data-beceri='${id}']`);
    LT.I.g = 0;
    // bekleme bitmiş say: yuva yalnız enerjiyi göstersin
    k.bec.yerel["flying-dutchman"].bekleme = 0;
    k.mek = { ...k.mek, enerji: 7 };
    await bekle(300);
    const t = yuva("flying-dutchman");
    const r = {
      enerji: t.classList.contains("engel") && t.textContent.includes("7/30"),
      yazi: t.textContent,
    };
    LT.set.shd = 1;
    return r;
  });

  ok(r.yuvalar && r.seviye, "üç skill yuvası ikon, seviye çentiği ve durum yazısıyla");
  ok(r.red, "yolsuz arazide kanca reddedilir: enerji gitmez, yuva kırmızı ve 'HEDEF YOK'");
  ok(
    r.kanca && r.kancaYazi,
    "açık dünyada kanca asfalt yola tutunur, halat görünür, enerji harcanır, kalan süre yazılır",
  );
  ok(
    r2.hayalet && r2.fazYazi && r2.faz,
    "Flying Dutchman: gövde hayalet, yuvada kalan süre, kanca fazda kapalı",
  );
  ok(r3.hayaletBitti, "faz bitince gövde eski hâline döner");
  ok(r3.alev && r3.alevYazi, "Risk Taker dönüşümü: kor alevleri görünür, yuvada kalan süre");
  ok(r4.enerji, "enerji yetmeyince yuva 'enerji/maliyet' gösterir" + (r4.enerji ? "" : " · " + r4.yazi));
}
