// HUD: hız, vites, devir çubuğu, araç/zemin/lastik satırı, drift göstergesi, yarış ve tur bilgisi.
// Yazılar yalnız değişince DOM'a yazılır.
import { fmt } from "../cekirdek/bicim";
import { cl } from "../cekirdek/matematik";
import { $, yazi } from "../cekirdek/dom";
import { WXS, COND } from "../cizim/ortam";
import { dunya } from "../dunya/dunya";
import type { Lastik, Zemin } from "../fizik/veriler";
import { CT } from "../oyun/ayarlar";
import { oyun } from "../oyun/durum";
import { I, tilt } from "../oyun/girdi";
import { LAP, sim } from "../oyun/surus";
import { evText, yaris } from "../oyun/yarislar";

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
let rpmN = -1;

export function hudKur() {
  E = {};
  for (const k of ["spd", "gear", "hName", "sf", "dr", "lap", "ev", "rpmb"]) E[k] = $("#" + k);
  E.hSP = $(".hSP");
  E.rpmb.innerHTML = "<i></i>".repeat(16);
}

function rpmBar() {
  const n = Math.round((motor.RPM / 8) * 16);
  if (n == rpmN) return;
  rpmN = n;
  [...E.rpmb.children].forEach(
    (e, k) => (e.className = k < n ? (k >= 13 ? "on r" : k >= 10 ? "on w" : "on") : ""),
  );
}

export function hudGuncelle(v: number, Sf: Zemin, T: Lastik) {
  const S = sim.S,
    D = sim.d.D,
    EV = yaris.EV,
    TR = dunya.TR;
  yazi(E.spd, String(Math.round(v * 3.6)));
  const gizli = oyun.camMode == 3 ? "none" : "";
  if (E.hSP.style.display != gizli) E.hSP.style.display = gizli;
  yazi(E.gear, motor.GEAR < 0 ? "R" : String(motor.GEAR || "N"));
  rpmBar();
  yazi(E.hName, EV ? EV.n : oyun.CURW.n);
  yazi(
    E.sf,
    oyun.CAR.n +
      " · " +
      Sf.n +
      " · " +
      T.n +
      " lastik" +
      (S.mud > 0.05 ? " · Çamur %" + Math.round(S.mud * 100) : "") +
      (S.wet > 0.05 ? " · Islak" : "") +
      (COND.wx != "sun" ? " · " + WXS[COND.wx] : ""),
  );
  yazi(
    E.dr,
    D.t > 0
      ? "DRIFT " + Math.round(Math.abs(D.beta) * 57.3) + "°"
      : S.spin
        ? "PATİNAJ"
        : S.air
          ? "HAVADA"
          : "",
  );
  yazi(
    E.lap,
    EV || !TR || TR.open
      ? EV && EV.ty == "dp"
        ? "Drift uzadıkça çarpan artar"
        : ""
      : "Son " + fmt(LAP.last) + " · En iyi " + fmt(LAP.best),
  );
  yazi(
    E.ev,
    EV ? evText() : TR && !TR.open ? (LAP.run ? "⏱ " + fmt(LAP.t) : "Çizgiden geç, tur başlasın") : "",
  );
  if (CT.steer == "tilt") {
    const c = document.getElementById("cal");
    if (c) yazi(c, performance.now() - tilt.t < 1500 ? "Ortala" : "Sensör izni");
  }
}
