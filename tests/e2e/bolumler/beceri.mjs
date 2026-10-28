/* global LT */
// LT-SYS-004 MUTANT skill'leri: başlangıç seçiminde skill teklifi; alınan skill kontrollerde tuş olur (aktif) ya da
// bar gösterir (tetiklenen); 1/2/3 ve tuşla istek. Düelloda Grappling Hook rakibe bağlanır, enerji harcar, rakibe
// doğru çeker. Drift etkinliği kartında kapora kilitli (vazgeçip dönünce aynı); kaybedince kapora skill'i gider.
// Ekran görüntüsü (iPhone 13 yatay): tests/cikti/beceri-hud.png
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
    // başlangıç seçimi: 2 pasif + 1 skill teklifi
    const teklif = res.querySelector("[data-pasif^='b:']");
    r.teklif =
      !!teklif && res.querySelectorAll("[data-pasif]").length == 3 && res.textContent.includes("Skill (0/3)");
    const id = teklif.dataset.pasif.slice(2);
    teklif.click();
    const k = LT.mutant.kosu;
    await bekle(200);
    r.alindi =
      LT.oyun.mode == "drive" &&
      k.beceriler.length == 1 &&
      k.beceriler[0].id == id &&
      !!document.querySelector(`#ctl [data-beceri='${id}']`) &&
      LT.mutantDurumu().beceriler[0].id == id;

    // drift kaporası: kart kilitli; vazgeçip dönünce aynı
    const dp = k.etkinlikler.find((e) => e.ty == "dp");
    LT.reset(dp.x, dp.z, 0);
    r.kaporaKart = await olana(() => LT.oyun.mode == "result" && res.textContent.includes("Kapora"));
    const yazi1 = res.querySelector(".mtb")?.textContent;
    tik("#mGec");
    LT.reset(dp.x + 40, dp.z, 0);
    await bekle(300);
    LT.reset(dp.x, dp.z, 0);
    await olana(() => LT.oyun.mode == "result" && res.textContent.includes("Kapora"));
    r.kaporaKilitli =
      res.querySelector(".mtb")?.textContent === yazi1 && yazi1.includes(LT.mutantDurumu().beceriler[0].ad);
    // gir ve kaybet: skill gider
    tik("[data-risk='0']");
    const EV = LT.yaris.EV;
    EV.state = "run";
    EV.t = 1;
    EV.score = 0;
    LT.endEvent();
    r.kaporaKayip = res.textContent.includes("kaybedildi") && k.beceriler.length == 0;
    tik("#mDevam");
    while (LT.oyun.mode == "result" && res.querySelector("[data-pasif]")) {
      const p0 =
        res.querySelector("[data-pasif]:not([data-pasif^='b:'])") ?? res.querySelector("[data-pasif]");
      p0.click();
      await bekle(50);
    }
    await bekle(100);
    r.tusKalkti = !document.querySelector("#ctl [data-beceri]");

    // düello: kanca + risk taker takılı (test kurulumu), kontroller yeniden kurulur
    k.beceriler = [
      { id: "grappling-hook", seviye: 3, eklentiler: [], evrim: null },
      { id: "risk-taker", seviye: 1, eklentiler: [], evrim: null },
    ];
    k.mek = { ...k.mek, enerji: 100 };
    LT.kontrolleriKur();
    r.tuslar =
      !!document.querySelector("#ctl [data-beceri='grappling-hook']") &&
      document.querySelector("#ctl [data-beceri='risk-taker']")?.classList.contains("mbo");
    const due = k.etkinlikler.find((e) => e.rakip);
    LT.reset(due.x, due.z, 0);
    await olana(() => LT.oyun.mode == "result" && res.querySelectorAll("[data-risk]").length == 2);
    tik("[data-risk='0']");
    await olana(() => LT.yaris.EV?.state == "run", 120);
    // oyuncu gazda; rakip kalkınca öne geçer. Kanca hazır olana (rakip önde, konide, menzilde) dek bas
    LT.I.g = 1;
    let bag = false;
    for (let i = 0; i < 120 && !bag; i++) {
      document
        .querySelector("#ctl [data-beceri='grappling-hook']")
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      await bekle(100);
      bag =
        (k.bec.yerel["grappling-hook"]?.kalan ?? 0) > 0 || (k.bec.yerel["grappling-hook"]?.bekleme ?? 0) > 0;
    }
    r.kanca = bag && k.mek.telemetri["beceri:grappling-hook"]?.tetik == 1 && k.mek.enerji < 100;
    r.hudDurum = LT.mutantDurumu().beceriler.length == 2 && LT.mutantDurumu().rakipGovde === 100;
    LT.I.g = 0;
    return r;
  });
  ok(r.teklif, "başlangıç seçiminde 2 pasif + 1 skill teklifi, skill yuvası 0/3 yazılı");
  ok(r.alindi, "seçilen skill koşuya girer, kontrollerde tuşu çıkar, mutantDurumu().beceriler dolu");
  ok(r.kaporaKart && r.kaporaKilitli, "drift kartında kapora; vazgeçip dönünce aynı skill (yeniden zar yok)");
  ok(r.kaporaKayip && r.tusKalkti, "drift kaybedilince kapora skill'i kalıcı gider, tuşu kalkar");
  ok(r.tuslar, "aktif skill tuş, tetiklenen skill bar olarak kontrollerde");
  ok(
    r.kanca && r.hudDurum,
    "düelloda kanca rakibe bağlanır ve enerji harcar; HUD durumu skill'leri ve rakip gövdesini verir",
  );

  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  fs.mkdirSync(path.join(kok, "tests", "cikti"), { recursive: true });
  await p.screenshot({ path: path.join(kok, "tests", "cikti", "beceri-hud.png") });
}
