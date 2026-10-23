/* global LT */
// Hesap e-posta formu (arayuz/hesap-ui.ts): iPhone yatayda klavye açıkken görünür alan ~170 px kalır; form tam ekran
// katmanda o şeride sığmalı (alan ve gönder düğmesi görünür), alanlar tek tek sorulur (İleri ile sonraki alana geçer,
// odak yeni alanda), eksik değerde uyarı şeritte görünür, kapatınca katman kalkar. Klavye visualViewport ile benzetilir.
export default async function ({ p, ok }) {
  const ol = (h, js) =>
    p.evaluate(
      ([h, js]) => {
        const vv = new EventTarget();
        Object.assign(vv, { height: h, offsetTop: 0, width: innerWidth });
        Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
        LT.epostaFormuAc("olustur");
        new Function(js)();
        const r = (s) => document.querySelector(s).getBoundingClientRect(),
          gorunen = [...document.querySelectorAll(".horta .inp")].filter(
            (e) => !e.classList.contains("gizli"),
          );
        return {
          seritAlt: Math.round(r(".hserit").bottom),
          alanAlt: Math.round(gorunen[0].getBoundingClientRect().bottom),
          dugmeAlt: Math.round(r("#hileri").bottom),
          gorunenAlan: gorunen.length,
          odak: document.activeElement?.id,
          adim: document.querySelector("#hadim").textContent,
          mesaj: document.querySelector("#hmsg").textContent,
          oto: [...document.querySelectorAll(".horta .inp")].map((e) => e.autocomplete).join(","),
        };
      },
      [h, js],
    );
  const a = await ol(170, "");
  ok(
    a.seritAlt <= 170 && a.gorunenAlan == 1 && a.odak == "hep" && a.oto == "email,new-password,new-password",
    "e-posta formu klavye açıkken 170 px şeride sığıyor, tek alan, odak e-postada " + JSON.stringify(a),
  );
  const b = await ol(
    170,
    `document.querySelector("#hep").value="x"; document.querySelector("#hileri").click();`,
  );
  ok(
    b.odak == "hep" && /e-posta/.test(b.mesaj),
    "geçersiz e-postada uyarı şeritte, adım ilerlemiyor " + JSON.stringify(b),
  );
  const c = await ol(
    170,
    `document.querySelector("#hep").value="ali@ornek.com"; document.querySelector("#hileri").click();`,
  );
  ok(
    c.odak == "hsf" && c.adim.startsWith("2/3") && c.seritAlt <= 170,
    "İleri ile şifre alanına geçiyor " + JSON.stringify(c),
  );
  const d = await ol(390, "");
  ok(d.seritAlt < 390 && d.alanAlt < 390, "klavye kapalıyken normal düzen " + JSON.stringify(d));
  const kalkti = await p.evaluate(() => {
    LT.epostaFormuKapat();
    return !document.getElementById("hkat");
  });
  ok(kalkti, "Kapat ile katman kalkıyor");
}
