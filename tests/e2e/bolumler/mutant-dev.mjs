/* global LT */
// DEV paneli: gerçek DOM'dan mobil buton, yarışta duraklat/uygula/devam ve tekrar.
export default async function ({ p, ok }) {
  const r = await p.evaluate(async () => {
    const pause = (ms) => new Promise((done) => setTimeout(done, ms));
    const res = document.querySelector("#res");
    const tik = (sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error("DEV panel öğesi yok: " + sel + " · " + res.textContent.slice(0, 100));
      el.click();
    };

    // CI derlemesi kökte açılır; geliştirme yolu yalnız bu senaryo için etkinleştirilir.
    const oncekiAdres = location.pathname + location.search + location.hash;
    history.replaceState(null, "", "/dev/?mutantTest=1");
    LT.demoStop();
    LT.showMenu(["home"]);
    LT.showMenu(["free"]);
    tik("[data-w='0']");
    const ilk = LT.mutant.kosu;
    const menu = !!res.querySelector("#mDevSec") && ilk.test;
    tik("#mDevSec");
    const kapali = !LT.mutant.kosu.test && res.querySelectorAll("[data-arac]").length == 3;
    tik("#mDevSec");
    const acik = LT.mutant.kosu.test && res.querySelectorAll("[data-arac]").length > 3;
    tik("[data-arac]");
    tik("[data-pasif]");
    const k = LT.mutant.kosu;
    const lab = !!res.querySelector("#labSkill") && !!res.querySelector("#labDrift");
    const skill = res.querySelector("#labSkill");
    skill.value = "grappling-hook";
    skill.dispatchEvent(new Event("change", { bubbles: true }));
    res.querySelector("#labSeviye").value = "3";
    res.querySelector("#labEvrim").value = "ters-kanca";
    res.querySelector("#labEk1").value = "sok-bobini";
    tik("#labSkillAl");
    const kurulum = k.beceriler.some(
      (s) =>
        s.id == "grappling-hook" &&
        s.seviye == 3 &&
        s.evrim == "ters-kanca" &&
        s.eklentiler.includes("sok-bobini"),
    );
    tik("#labDrift");
    await pause(500);
    const dev = document.querySelector("#mutantDevPanel");
    const yarista = !!LT.yaris.EV && LT.yaris.EV.ty == "dp" && LT.oyun.mode == "drive";
    const dugme = !!dev && getComputedStyle(dev).display != "none";
    if (dev) dev.click();
    const durdu = LT.oyun.mode == "result" && !!LT.yaris.EV && !!res.querySelector("#labTekrar");
    if (durdu) {
      res.querySelector("#labSeviye").value = "1";
      tik("#labSkillAl");
    }
    const canli = k.beceriler.find((s) => s.id == "grappling-hook")?.seviye == 1;
    tik("#labSurus");
    const devam = LT.oyun.mode == "drive" && !!LT.yaris.EV;
    dev.click();
    tik("#labTekrar");
    const tekrar = !!LT.yaris.EV && LT.yaris.EV.state == "count" && LT.yaris.EV.t == 0;
    LT.showMenu(["home"]);
    history.replaceState(null, "", oncekiAdres);
    return { menu, kapali, acik, lab, kurulum, yarista, dugme, durdu, canli, devam, tekrar };
  });
  ok(r.menu && r.kapali && r.acik, "MUTANT menüsünde DEV modu açılıp kapanır; bütün araçlar görünür");
  ok(r.lab && r.kurulum, "DEV laboratuvarında skill seviye 3, evrim ve eklenti tek seferde ayarlanır");
  ok(r.yarista && r.dugme && r.durdu, "drift yarışı içinde ⚙ DEV düğmesi açılır ve yarışı duraklatır");
  ok(
    r.canli && r.devam && r.tekrar,
    "skill değişimi canlı uygulanır, aynı yarışa dönülür ve tekrar başlatılır " +
      JSON.stringify({ canli: r.canli, devam: r.devam, tekrar: r.tekrar }),
  );
}
