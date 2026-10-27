/* global LT */
// A3 düello (issue #22): MUTANT bölge 1'in asfalt etkinliği düellodur. Kartta iki kademe (Çaylak/Deneyimli rakip);
// yarışta YZ rakip uzak araç olarak çizilir ve aynı fizikle ilerler (konumu kare kare hızla tutarlı, sıçrama yok),
// HUD hedef süre yerine sıra/fark gösterir, mutantDurumu().rakip dolu. Yeniden başlatınca rakip ızgaraya döner.
// Oyuncu önce bitirirse "Rakibi yendin" (ödül), rakip önce bitirirse "Rakip önde bitirdi" (ceza); haritaya dönünce
// rakip kalkar. İşlemci 4 kat yavaşken (iPhone'a yakın) rakipli/rakipsiz fizik ve kare süresi ölçülür;
// ekran görüntüsü tests/cikti/rakip.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const olana = async (f, n = 80) => {
      for (let i = 0; i < n && !f(); i++) await bekle(100);
      return f();
    };
    const simBekle = async (sn) => {
      const t0 = LT.sim.d.zaman;
      await olana(() => LT.sim.d.zaman - t0 >= sn, 200);
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
    tik("[data-pasif]");
    const k = LT.mutant.kosu;
    await bekle(200);
    const d = k.etkinlikler.filter((e) => e.rakip);
    r.tekDuello = d.length == 1 && d[0].ty == "gp" && LT.EVENTS[d[0].i].n == "Yeşil Vadi";
    const e = d[0];
    LT.reset(e.x, e.z, 0);
    r.kart = await olana(
      () =>
        LT.oyun.mode == "result" &&
        res.querySelectorAll("[data-risk]").length == 2 &&
        res.textContent.includes("Düello") &&
        res.textContent.includes("Çaylak") &&
        res.textContent.includes("Deneyimli"),
    );
    tik("[data-risk='1']");
    const EV = LT.yaris.EV,
      R = LT.rakip;
    const u = () => LT.uzak.araclar.find((a) => a.id == "rakip");
    r.kurulum =
      !!EV &&
      EV.mutant &&
      EV.laps == 2 &&
      !!R.y &&
      R.ayar.kisilik == "deneyimli" &&
      R.ayar.arac == LT.mutantArac &&
      !!u() &&
      R.y.ornek.cx.kurulum.car.hp == LT.CARS[R.ayar.arac].hp;
    // geri sayım bitince ikisi de kalkar; oyuncu tam gaz
    await olana(() => EV.state == "run", 60);
    LT.I.g = 1;
    const S = R.y.ornek.sim.S,
      x0 = S.x,
      z0 = S.z;
    let sicrama = 0,
      px = S.x,
      pz = S.z,
      pt = R.y.t;
    const t0 = LT.sim.d.zaman;
    while (LT.sim.d.zaman - t0 < 4) {
      await new Promise((ok) => requestAnimationFrame(ok));
      const dt = R.y.t - pt,
        v = Math.hypot(S.vx, S.vz);
      sicrama = Math.max(sicrama, Math.hypot(S.x - px, S.z - pz) - (v + 2) * dt - 0.05);
      px = S.x;
      pz = S.z;
      pt = R.y.t;
    }
    r.yol = Math.hypot(S.x - x0, S.z - z0);
    r.ilerledi = r.yol > 15 && sicrama < 0.05;
    r.sicrama = sicrama;
    r.cizim = !!u() && u().hazir && Math.hypot(u().goster.x - S.x, u().goster.z - S.z) < 3;
    const lap = document.querySelector("#lap").textContent;
    const md = LT.mutantDurumu();
    r.hud =
      /· [12]\. · \d+ m/.test(lap) && !lap.includes("Hedef") && !!md.rakip && md.rakip.kisilik == "Deneyimli";
    r.lap = lap;
    // yeniden başlat: rakip ızgaraya, aynı tohumla
    const eski = R.y;
    LT.yarisiYenidenBaslat();
    const R2 = LT.rakip.y;
    r.yeniden = R2 !== eski && R2.t == 0 && Math.hypot(R2.ornek.sim.S.x - x0, R2.ornek.sim.S.z - z0) < 0.5;
    await olana(() => LT.yaris.EV.state == "run", 60);
    await simBekle(1.5);
    return r;
  });
  ok(r.tekDuello && r.kart, "bölge 1'de tek düello (Yeşil Vadi); kartta Çaylak ve Deneyimli rakip kademesi");
  ok(r.kurulum, "düello 2 tur; rakip oyuncunun başlangıç aracının stok hâliyle, uzak araç olarak eklendi");
  ok(
    r.ilerledi,
    `rakip aynı fizikle kalktı ve ilerledi (4 sn'de ${r.yol.toFixed(0)} m), kare kare sıçrama yok (${r.sicrama.toFixed(3)} m)`,
  );
  ok(r.cizim, "rakip modeli fizik konumunda çiziliyor");
  ok(r.hud, "HUD hedef süre yerine sıra ve fark gösteriyor: " + r.lap);
  ok(r.yeniden, "yarışı yeniden başlatınca rakip ızgaraya döner");

  // ekran görüntüsü: kalkıştan hemen sonra rakip yanda/önde görünür
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  fs.mkdirSync(path.join(kok, "tests", "cikti"), { recursive: true });
  await p.screenshot({ path: path.join(kok, "tests", "cikti", "rakip.png") });

  // işlemci 4x yavaş: rakipli düello ve rakipsiz etkinlikte fizik/kare süresi
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const olc = () =>
    p.evaluate(async () => {
      const t0 = LT.sim.d.zaman;
      while (LT.sim.d.zaman - t0 < 1) await new Promise((ok) => setTimeout(ok, 50));
      const f = [],
        k = [],
        a = [];
      const t1 = LT.sim.d.zaman;
      while (LT.sim.d.zaman - t1 < 3) {
        await new Promise((ok) => setTimeout(ok, 100));
        f.push(LT.perf.fizik);
        k.push(LT.perf.kare);
        a.push(LT.perf.adim);
      }
      const ort = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      // kare başına adım sayısı kare süresine bağlı: karşılaştırma adım başına
      return { fizik: ort(f), kare: ort(k), adimBasina: ort(f) / Math.max(ort(a), 0.5) };
    });
  const rakipli = await olc();
  await p.evaluate(() => {
    // aynı pistte rakipsiz: rakibi kaldır (yalnız ölçüm için)
    LT.rakipDurdur();
  });
  const rakipsiz = await olc();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.detach();
  const oran = rakipli.adimBasina / rakipsiz.adimBasina;
  console.log(
    `  (4x yavaş: sabit adım başına fizik rakipli ${rakipli.adimBasina.toFixed(2)} ms, rakipsiz ${rakipsiz.adimBasina.toFixed(2)} ms; kare ${rakipli.kare.toFixed(1)} / ${rakipsiz.kare.toFixed(1)} ms)`,
  );
  // rakip ikinci bir tam fizik aracıdır: adım maliyeti en çok ~2 kat + pilot payı
  ok(
    oran < 2.6,
    `rakipli sabit adım maliyeti rakipsizin ${oran.toFixed(2)} katı (sınır 2,6; ikinci araç + YZ)`,
  );

  // sonuçlar: oyuncu önce bitirir → kazanır; ikinci düelloda rakip önce bitirir → kaybeder (ceza)
  const s = await p.evaluate(async () => {
    const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
    const olana = async (f) => {
      for (let i = 0; i < 80 && !f(); i++) await bekle(100);
      return f();
    };
    const res = document.querySelector("#res"),
      k = LT.mutant.kosu,
      e = k.etkinlikler.find((q) => q.rakip),
      r = {};
    // ölçüm için kaldırılan rakip yeniden başlatmada geri gelir
    LT.yarisiYenidenBaslat();
    const EV = LT.yaris.EV,
      p0 = k.para;
    EV.state = "run";
    EV.t = 30;
    LT.endEvent();
    r.kazandi =
      res.textContent.includes("Rakibi yendin") &&
      res.textContent.includes("Rakip (Deneyimli)") &&
      k.para > p0;
    res.querySelector("#mDevam").click();
    while (LT.oyun.mode == "result" && res.querySelector("[data-pasif]"))
      res.querySelector("[data-pasif]").click();
    await bekle(100);
    r.kalkti = !LT.rakip.y && !LT.uzak.araclar.some((a) => a.id == "rakip") && LT.oyun.mode == "drive";
    // kaybetme yolu: aynı etkinliği yeniden aç (yalnız test)
    e.yapildi = false;
    LT.reset(e.x + 30, e.z, 0);
    await bekle(300);
    LT.reset(e.x, e.z, 0);
    await olana(() => LT.oyun.mode == "result" && res.querySelectorAll("[data-risk]").length == 2);
    res.querySelector("[data-risk='1']").click();
    const E2 = LT.yaris.EV,
      kalan0 = k.kalan;
    E2.state = "run";
    LT.rakip.y.bitis = 50;
    E2.t = 60;
    LT.endEvent();
    r.kaybetti = res.textContent.includes("Rakip önde bitirdi") && k.kalan < kalan0 - 40;
    res.querySelector("#mDevam").click();
    while (LT.oyun.mode == "result" && res.querySelector("[data-pasif]"))
      res.querySelector("[data-pasif]").click();
    LT.I.g = 0;
    LT.showMenu(["home"]);
    return r;
  });
  ok(s.kazandi, "rakipten önce bitirince 'Rakibi yendin', ödül ve rakibin satırı");
  ok(s.kalkti, "haritaya dönünce rakip kalkar");
  ok(s.kaybetti, "rakip önce bitirince 'Rakip önde bitirdi' ve Riskli cezası");
}
