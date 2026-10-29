/* global LT */
// LT-SYS-008/009 Kule Şehri: boss yenilince koşu şehre geçer (etkinlikler sokak yarışı, işaretler şehirde); sokak
// kovalamacası şehir rotasında rakip önde kalkar; kanca kavşakta parlar ve köşede döndürür; Volt Kanat basılı
// tutunca yükselir, havada ekranı kaydırmak burnu çevirir; havada kanca sokağın üstüne asılır. Skill'ler enerjisiz.
// Ekran görüntüleri: tests/cikti/mutant-sehir*.png
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
        // pist boyunca fark (oyuncu ızgarada, başlangıç çizgisinin gerisinde)
        const TR = EV.TR,
          pi = LT.ipucu.ti,
          ri = LT.rakip.y.ti;
        let d = TR.S[ri] - TR.S[pi];
        if (d < 0) d += TR.len;
        r.onde = d > 38 && d < 60;
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
      // LT-SYS-009 kanca köşede: kavşağa yaklaşırken tuş ve köşe parlar; atınca köşede döner
      k.beceriler = [
        { id: "grappling-hook", seviye: 3, eklentiler: [], evrim: null },
        { id: "volt-kanat", seviye: 2, eklentiler: [], evrim: null },
      ];
      k.mek = { ...k.mek, enerji: 0 };
      LT.kontrolleriKur();
      const yuva = (id) => document.querySelector(`#ctl [data-beceri='${id}']`),
        bas = (id) =>
          yuva(id).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      LT.reset(9000 - 540 + 2, -468 - 110, 0);
      LT.I.g = 0.8;
      // blok ortasında (geride kalan kavşaktan 10 m sonra, öndeki kavşağa 45 m'den uzak) hiç parlamaz
      r.parlamaYok = true;
      r.blokOrtasi = await olana(() => {
        const z = LT.sim.S.z;
        if (z > -536 && z < -514 && yuva("grappling-hook").classList.contains("parla")) r.parlamaYok = false;
        return z >= -514;
      }, 20000);
      r.parla = await olana(() => yuva("grappling-hook").classList.contains("parla"), 8000);
      r.hedefNokta = !!LT.mutantDurumu().beceriler.find((b) => b.id == "grappling-hook").hedefNokta;
      bas("grappling-hook");
      r.kose = await olana(() => k.bec.yerel["grappling-hook"]?.hedef == "#kose", 2000);
      const h0 = LT.sim.S.h;
      r.dondu = await olana(() => Math.abs(LT.sim.S.h - h0) > 1, 6000);
      r.enerjisiz = k.mek.enerji < 40;
      LT.I.g = 0;
      return r;
    }),
  );
  await foto("mutant-sehir-kose.png");
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
        r = {},
        yuva = (id) => document.querySelector(`#ctl [data-beceri='${id}']`),
        bas = (id) =>
          yuva(id).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })),
        birak = (id) =>
          yuva(id).dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      // Volt Kanat: basılı tuttukça yükselir (enerji yokken de)
      k.bec.yerel["volt-kanat"] = { ...(k.bec.yerel["volt-kanat"] ?? {}), kalan: 0, bekleme: 0 };
      LT.reset(9000 - 540, -700, 0);
      LT.I.g = 1;
      await bekle(1500);
      bas("volt-kanat");
      r.ucus = await olana(() => (LT.sim.yeni?.py ?? 0) > 15);
      r.ucusY = LT.sim.yeni?.py;
      // havada ekranı aşağı kaydırmak burnu kaldırır (kamera yerine)
      const cvs = document.querySelector("canvas"),
        b = cvs.getBoundingClientRect(),
        x = b.left + b.width * 0.5,
        y = b.top + b.height * 0.3,
        burun = () => {
          const Y = LT.sim.yeni;
          return 2 * (Y.qy * Y.qz - Y.qw * Y.qx);
        };
      const n0 = burun();
      cvs.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, clientX: x, clientY: y }),
      );
      for (let i = 1; i <= 6; i++) {
        cvs.dispatchEvent(
          new PointerEvent("pointermove", { bubbles: true, pointerId: 7, clientX: x, clientY: y + i * 15 }),
        );
        await bekle(40);
      }
      await bekle(300);
      r.burunKalkti = burun() - n0 > 0.3;
      r.burun = [n0, burun()];
      cvs.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId: 7, clientX: x, clientY: y + 90 }),
      );
      birak("volt-kanat");
      return r;
    }),
  );
  await foto("mutant-sehir-ucus.png");
  Object.assign(
    r,
    await p.evaluate(async () => {
      const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
      const k = LT.mutant.kosu,
        r = {};
      // Volt bitince havadayken kanca: sokağın üstüne asılır (bina sarkacı)
      const kancaAt = () =>
        document
          .querySelector("#ctl [data-beceri='grappling-hook']")
          .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      r.sarkac = false;
      for (let i = 0; i < 40 && !r.sarkac && (LT.sim.yeni?.py ?? 0) > 4; i++) {
        if ((k.bec.yerel["grappling-hook"]?.kalan ?? 0) <= 0 && LT.mutantDurumu().beceriler[0].hazir)
          kancaAt();
        await bekle(100);
        r.sarkac = k.bec.yerel["grappling-hook"]?.hedef == "#bina";
      }
      r.havada = (LT.sim.yeni?.py ?? 0) > 2.5;
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
  ok(
    r.rota && r.rakip && r.onde && r.hud,
    "sokak yarışı şehir rotasında, rakip (kovalamacada önde), HUD " +
      JSON.stringify({ rota: r.rota, rakip: r.rakip, onde: r.onde, hud: r.hud }),
  );
  ok(
    r.blokOrtasi && r.parlamaYok && r.parla && r.hedefNokta && r.kose && r.dondu && r.enerjisiz,
    "kanca blok ortasında parlamaz, kavşağa yaklaşınca parlar; köşeye takılıp aracı döndürür (enerjisiz) " +
      JSON.stringify({ parlamaYok: r.parlamaYok, parla: r.parla, kose: r.kose, dondu: r.dondu }),
  );
  ok(r.ucus, "Volt Kanat basılı tutunca aracı 15 m'nin üstüne kaldırır (enerji yokken de)");
  ok(r.burunKalkti, "havada ekranı aşağı kaydırmak burnu kaldırır " + JSON.stringify(r.burun));
  ok(r.sarkac && r.havada, "havada kanca sokağın üstüne asılır (bina sarkacı)");
}
