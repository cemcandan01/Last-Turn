/* global LT */
// LT-SYS-008 Kule Şehri: boss yenilince koşu şehre geçer (etkinlikler sokak yarışı, işaretler şehirde); sokak
// kovalamacası şehir rotasında rakip önde kalkar; Volt Kanat aracı binaların hizasına kaldırır; kanca şehirde bina
// tepesine takılıp aracı yerden kaldırır. Ekran görüntüleri: tests/cikti/mutant-sehir*.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function ({ p, ok }) {
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  fs.mkdirSync(path.join(kok, "tests", "cikti"), { recursive: true });
  const foto = (ad) => p.screenshot({ path: path.join(kok, "tests", "cikti", ad) });
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const olana = async (f, ms = 15000) => {
      const t0 = performance.now();
      while (!f() && performance.now() - t0 < ms) await bekle(100);
      return f();
    };
    const res = document.querySelector("#res"),
      r = {};
    const tik = (sec) => {
      const e = res.querySelector(sec);
      if (!e) throw new Error("düğme yok: " + sec + " · " + res.textContent.slice(0, 80));
      e.click();
    };
    LT.demoStop();
    LT.showMenu(["free"]);
    document.querySelector("[data-w='0']").click();
    tik("[data-arac]");
    tik("[data-pasif]:not([data-pasif^='b:'])");
    const k = LT.mutant.kosu;
    await bekle(300);
    // zorunlu boss ve galibiyet (boss bitirmeden önce bitir)
    k.sonNefes = true;
    k.kalan = 0.02;
    await olana(() => !!res.querySelector("#mBoss"));
    tik("#mBoss");
    const B = LT.yaris.EV;
    if (LT.rakip.y) LT.rakip.y.bitis = null;
    B.state = "run";
    B.t = 30;
    B.score = 999999;
    LT.endEvent();
    r.gecis = res.textContent.includes("Kule Şehri");
    tik("#mDevam");
    await bekle(200);
    // seviye atladıysa yetenek seçimi
    for (let n = 0; n < 3 && res.querySelector("[data-pasif]"); n++) {
      res.querySelector("[data-pasif]").click();
      await bekle(200);
    }
    const S = LT.sim.S;
    r.sehir =
      LT.oyun.CURW.n == "Kule Şehri" &&
      Math.abs(S.x - 9000) < 800 &&
      Math.abs(S.z) < 800 &&
      k.bolge == 2 &&
      k.etkinlikler.length > 3 &&
      k.etkinlikler.every((e) => e.sokak);
    return r;
  });
  await p.evaluate(() => {
    LT.oyun.camMode = 0;
    LT.I.g = 1;
  });
  await new Promise((s) => setTimeout(s, 1500));
  await foto("mutant-sehir.png");
  Object.assign(
    r,
    await p.evaluate(async () => {
      const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
      const k = LT.mutant.kosu,
        r = {};
      LT.I.g = 0;
      // sokak kovalamacası: rakip önde, rota şehirde
      const e = k.etkinlikler.find((q) => q.sokak == "kovala") ?? k.etkinlikler[0];
      LT.mutant.etkinlik = e.id;
      LT.mutant.risk = 1;
      LT.startEvent(e.i, LT.mutantArac, true);
      const EV = LT.yaris.EV,
        sehir = LT.REG.find((q) => q.n == "Kule Şehri");
      r.rota = !!EV && EV.TR === sehir.TR && !!EV.TR && EV.reg == sehir.idx;
      r.rakip = !!LT.rakip.y;
      if (e.sokak == "kovala") {
        const ry = LT.rakip.y.ornek.sim.S,
          d = Math.hypot(ry.x - LT.sim.S.x, ry.z - LT.sim.S.z);
        r.onde = d > 30;
      } else r.onde = true;
      EV.state = "run";
      EV.cd = 0;
      LT.oyun.camMode = 0;
      LT.I.g = 1;
      await bekle(2500);
      r.hud = document.body.textContent.includes("Tur") || document.body.textContent.includes("%");
      return r;
    }),
  );
  await foto("mutant-sehir-yaris.png");
  Object.assign(
    r,
    await p.evaluate(async () => {
      const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
      const olana = async (f, ms = 15000) => {
        const t0 = performance.now();
        while (!f() && performance.now() - t0 < ms) await bekle(100);
        return f();
      };
      const k = LT.mutant.kosu,
        r = {};
      LT.I.g = 0;
      LT.leaveEvent();
      LT.mutant.etkinlik = null;
      document.querySelector("#res").classList.add("hidden");
      LT.oyun.mode = "drive";
      // Volt Kanat: yükselir
      k.beceriler = [{ id: "volt-kanat", seviye: 2, eklentiler: [], evrim: null }];
      k.mek = { ...k.mek, enerji: 100 };
      LT.kontrolleriKur();
      LT.reset(9000 - 540, -700, 0);
      LT.I.g = 1;
      await bekle(1500);
      const bas = (id) =>
        document
          .querySelector(`#ctl [data-beceri='${id}']`)
          .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      bas("volt-kanat");
      r.ucus = await olana(() => (LT.sim.yeni?.py ?? 0) > 20);
      r.ucusY = LT.sim.yeni?.py;
      return r;
    }),
  );
  await foto("mutant-sehir-ucus.png");
  Object.assign(
    r,
    await p.evaluate(async () => {
      const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
      const olana = async (f, ms = 15000) => {
        const t0 = performance.now();
        while (!f() && performance.now() - t0 < ms) await bekle(100);
        return f();
      };
      const k = LT.mutant.kosu,
        r = {};
      await olana(() => (LT.sim.yeni?.py ?? 9) < 2, 20000);
      // kanca: şehirde bina tepesine sarkaç
      k.beceriler = [{ id: "grappling-hook", seviye: 3, eklentiler: [], evrim: null }];
      k.mek = { ...k.mek, enerji: 100 };
      LT.kontrolleriKur();
      LT.reset(9000 - 540, -600, 0);
      LT.I.g = 1;
      await bekle(1800);
      document
        .querySelector("#ctl [data-beceri='grappling-hook']")
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      r.sarkac = await olana(() => k.bec.yerel["grappling-hook"]?.hedef == "#bina", 3000);
      r.havada = await olana(() => (LT.sim.yeni?.py ?? 0) > 2.5, 6000);
      return r;
    }),
  );
  await foto("mutant-sehir-sarkac.png");
  await p.evaluate(() => {
    LT.I.g = 0;
  });
  ok(
    r.gecis && r.sehir,
    "boss yenilince koşu Kule Şehri'ne geçer, etkinlikler sokak yarışı " + JSON.stringify(r),
  );
  ok(r.rota && r.rakip && r.onde && r.hud, "sokak yarışı şehir rotasında, rakip (kovalamacada önde), HUD");
  ok(r.ucus, "Volt Kanat aracı 20 m'nin üstüne kaldırır");
  ok(r.sarkac && r.havada, "kanca şehirde bina tepesine takılır, aracı yerden kaldırır");
}
