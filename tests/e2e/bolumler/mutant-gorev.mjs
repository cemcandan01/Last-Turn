/* global LT */
// LT-SYS-007 yol görevleri: açık dünyada sürerken kısa süreli görev çıkar ve HUD'da görünür; tamamlanınca para ve
// nitro enerjisi verir; görev yarışta ilerlemez. Ekran görüntüsü: tests/cikti/mutant-gorev.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function ({ p, ok }) {
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  fs.mkdirSync(path.join(kok, "tests", "cikti"), { recursive: true });
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const olana = async (f, ms = 15000) => {
      const t0 = performance.now();
      while (!f() && performance.now() - t0 < ms) await bekle(100);
      return f();
    };
    const res = document.querySelector("#res");
    LT.demoStop();
    LT.showMenu(["free"]);
    document.querySelector("[data-w='0']").click();
    res.querySelector("[data-arac]").click();
    res.querySelector("[data-pasif]:not([data-pasif^='b:'])").click();
    await bekle(200);
    const k = LT.mutant.kosu,
      r = {};
    // düz asfalt yolda kuzeye sür: bir süre sonra görev çıkar
    LT.reset(210, -500, 0);
    LT.I.g = 1;
    r.faz = k.faz;
    // tarayıcı testi gerçek zamandan yavaş: ilk bekleme (sürüş süresi) dolana dek bekle
    r.cikti = await olana(() => !!LT.mutant.gorev.aktif, 60000);
    r.bekleme = LT.mutant.gorev.bekleme;
    r.mod = LT.oyun.mode;
    await bekle(300);
    r.hud = document.body.textContent.includes("GÖREV:");
    return r;
  });
  await p.screenshot({ path: path.join(kok, "tests", "cikti", "mutant-gorev.png") });
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
      // hız görevi kolay hedefle: tamamlanınca para ve enerji
      const p0 = k.para;
      k.mek = { ...k.mek, enerji: 0 };
      LT.mutant.gorev.aktif = { tur: "hiz", hedef: 30, ilerleme: 0, kalan: 25, para: 40, enerji: 20 };
      r.tamam = await olana(() => !LT.mutant.gorev.aktif && LT.mutant.gorev.tamamlanan > 0);
      r.para = k.para - p0;
      r.enerji = k.mek.enerji;
      LT.I.g = 0;
      return r;
    }),
  );
  ok(r.cikti && r.hud, "açık dünyada sürerken yol görevi çıkar ve HUD'da görünür " + JSON.stringify(r));
  ok(
    r.tamam && r.para >= 40 && r.enerji >= 15,
    "görev tamamlanınca para ve nitro enerjisi " + JSON.stringify(r),
  );
}
