/* global LT */
// Garaj: araç değişiyor; serbest sürüşten önce garaj; önayar yalnız serbest sürüşte
export default async function ({ p, ok }) {
  const gr = await p.evaluate(() => {
    try {
      LT.openGarage(0);
      document.querySelector("#gnx").click();
      const n = LT.oyun.CAR.n;
      LT.closeGarage();
      return n;
    } catch (x) {
      return "HATA " + x.message;
    }
  });
  ok(!gr.startsWith("HATA"), "garaj açılıyor ve araç değişiyor");
  const sg = await p.evaluate(() => {
    LT.showMenu(["free"]);
    document.querySelector("[data-w='1']").click();
    const gar = !document.querySelector("#gar").classList.contains("hidden");
    document.querySelector("#gnx").click();
    document.querySelector("#gok").click();
    const r = { gar, mod: LT.oyun.mode, w: LT.oyun.CURW.n, pk: LT.kurulum.pk, aracPk: LT.oyun.CAR.pk };
    LT.showSet();
    r.serbestOnayar = !!document.querySelector("#set details[data-sec='pre']");
    LT.showMenu(["home"]);
    LT.demoStop();
    LT.startEvent(
      LT.EVENTS.findIndex((e) => e.ty == "dp"),
      2,
    );
    LT.showSet();
    r.yarisOnayar = !!document.querySelector("#set details[data-sec='pre']");
    r.yarisPk = LT.kurulum.pk;
    LT.showMenu(["home"]);
    return r;
  });
  ok(
    sg.gar && sg.mod == "drive" && sg.w == "Boş Otopark" && sg.pk == sg.aracPk,
    "serbest sürüşten önce garaj açılıyor, araç kendi önayarıyla başlıyor",
  );
  ok(
    sg.serbestOnayar && !sg.yarisOnayar && sg.yarisPk == "dr",
    "önayar yalnız serbest sürüşte; drift yarışında aracın drift önayarı",
  );
}
