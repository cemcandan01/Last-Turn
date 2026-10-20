// HUD: hız ve vites, yarış/tur bilgisi (sol üst), drift ve kombo göstergesi (üst orta), uyarılar.
// Düzen (Köşe, Kadran, Bant, Sade) #app[data-hud] ile seçilir; yerleşim stil.css'te. Kurallar: docs/HUD.md.
// Yazılar yalnız değişince DOM'a yazılır.
import { fmt } from "../cekirdek/bicim";
import { cl } from "../cekirdek/matematik";
import { $, yazi } from "../cekirdek/dom";
import { WXS, COND } from "../cizim/ortam";
import { dunya } from "../dunya/dunya";
import { ipucu } from "../dunya/pist";
import { VMAX } from "../fizik/veriler";
import { CT, gorunum } from "../oyun/ayarlar";
import { oyun } from "../oyun/durum";
import { I, tilt } from "../oyun/girdi";
import { LAP, sim } from "../oyun/surus";
import { yaris } from "../oyun/yarislar";

/** sahte vitesli devir göstergesi: hızdan vites ve devir (x1000) */
const GEARS = [0, 60, 100, 145, 190, 240, 400];
export const motor = { RPM: 1, GEAR: 1 };

export function engine(kmh: number, dt: number) {
  let g = 1;
  while (g < GEARS.length - 1 && kmh > GEARS[g]) g++;
  const lo = GEARS[g - 1],
    hi = GEARS[g],
    tg = kmh < 3 ? 0.9 + 1.4 * sim.S.gas : 1.6 + 5.8 * cl((kmh - lo) / (hi - lo), 0, 1);
  motor.GEAR = kmh < 1 && I.b && !I.g ? 0 : g;
  motor.RPM += (tg - motor.RPM) * Math.min(1, dt * (tg < motor.RPM ? 3.2 : 9));
}

let E: Record<string, HTMLElement>;
let kadranF = -1;
const durum = { dr: "" };

export function hudKur() {
  E = {};
  for (const k of ["spd", "gear", "hName", "sf", "dr", "drA", "drP", "drX", "drB", "lap", "ev", "kdV"])
    E[k] = $("#" + k);
  E.hSP = $(".hSP");
  hudDuzeniUygula();
}

/** seçili HUD düzenini uygula (ayar değişince de çağrılır) */
export function hudDuzeniUygula() {
  $("#app").dataset.hud = gorunum.hud;
}

/** sol üst panel: büyük satır ve alt satır */
function olayPaneli(): [string, string] {
  const EV = yaris.EV,
    TR = dunya.TR;
  if (EV) {
    if (EV.ty == "dp") return [EV.score + " puan", "⏱ " + Math.max(0, EV.time).toFixed(1) + " sn kaldı"];
    const asim = EV.t > EV.limit ? " · SÜRE AŞILDI" : "";
    if (EV.ty == "dg")
      return [
        "⏱ " + EV.t.toFixed(2),
        "Hedef " + EV.limit.toFixed(1) + " sn · %" + Math.round((100 * ipucu.ti) / (EV.TR.N - 1)) + asim,
      ];
    return [
      "⏱ " + fmt(EV.t),
      (EV.laps
        ? "Tur " + Math.min(EV.lap + 1, EV.laps) + "/" + EV.laps
        : "%" + Math.round((100 * ipucu.ti) / EV.TR.N)) +
        " · Hedef " +
        fmt(EV.limit) +
        asim,
    ];
  }
  if (TR && !TR.open)
    return LAP.run
      ? ["⏱ " + fmt(LAP.t), "Son " + fmt(LAP.last) + " · En iyi " + fmt(LAP.best)]
      : ["", "Çizgiden geç, tur başlasın"];
  return ["", ""];
}

/** üst orta: drift yarışında kombo (puan, çarpan, sonraki çarpana kalan); serbestte drift açısı ya da durum */
function driftGostergesi() {
  const S = sim.S,
    D = sim.d.D,
    EV = yaris.EV,
    aci = Math.round(Math.abs(D.beta) * 57.3) + "°";
  let k = "";
  if (EV && EV.ty == "dp" && EV.combo > 0) {
    k = "kombo";
    yazi(E.drA, D.t > 0 ? "DRIFT " + aci : "KOMBO");
    yazi(E.drP, String(Math.round(EV.combo)));
    yazi(E.drX, "x" + EV.mult);
    E.drB.style.width = (EV.mult >= 5 ? 100 : Math.round(((EV.ct % 2.5) / 2.5) * 100)) + "%";
  } else if (D.t > 0) {
    k = "aci";
    yazi(E.drA, "DRIFT");
    yazi(E.drP, aci);
    yazi(E.drX, "");
  } else if (S.spin || S.air) {
    k = "durum";
    yazi(E.drA, S.spin ? "PATİNAJ" : "HAVADA");
    yazi(E.drP, "");
    yazi(E.drX, "");
  }
  if (k != durum.dr) {
    durum.dr = k;
    E.dr.className = k || "hidden";
  }
}

export function hudGuncelle(v: number) {
  const S = sim.S,
    EV = yaris.EV,
    kmh = v * 3.6;
  yazi(E.spd, String(Math.round(kmh)));
  const gizli = oyun.camMode == 3 ? "none" : "";
  if (E.hSP.style.display != gizli) E.hSP.style.display = gizli;
  yazi(E.gear, motor.GEAR < 0 ? "R" : String(motor.GEAR || "N"));
  if (gorunum.hud == "kadran") {
    const f = Math.round(cl(kmh / (VMAX * 3.6), 0, 1) * 200) / 2;
    if (f != kadranF) {
      kadranF = f;
      E.kdV.style.strokeDasharray = f + " 100";
    }
  }
  yazi(E.hName, EV ? EV.n : oyun.CURW.n);
  const [ana, alt] = olayPaneli();
  yazi(E.ev, ana);
  yazi(E.lap, alt);
  // yalnız sürüşü etkileyen uyarılar (araç, zemin ve lastik zaten görünür)
  yazi(
    E.sf,
    [
      S.mud > 0.05 ? "Çamur %" + Math.round(S.mud * 100) : "",
      S.wet > 0.05 ? "Islak" : "",
      COND.wx != "sun" ? WXS[COND.wx] : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );
  driftGostergesi();
  if (CT.steer == "tilt") {
    const c = document.getElementById("cal");
    if (c) yazi(c, performance.now() - tilt.t < 1500 ? "Ortala" : "Sensör izni");
  }
}
