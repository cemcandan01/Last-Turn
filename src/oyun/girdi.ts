// Girişler: dokunmatik tuşlar, ekran direksiyonu, analog pedal, telefon eğimi ve klavye.
// Ham girişler I'da tutulur; fiziğe giden girdi fizikGirdisi() ile hesaplanır.
import { ad, cl } from "../cekirdek/matematik";
import { devO, ekran } from "../cekirdek/ekran";
import type { FizikGirdisi } from "../fizik/tipler";
import { note } from "../arayuz/bildirim";
import { CT, set } from "./ayarlar";

/** ham girişler: sol, sağ, gaz, fren (0-1), ekran direksiyonu (-1..1), el freni (0/1) */
export const I = { l: 0, r: 0, g: 0, b: 0, sa: 0, el: 0 };

/** telefon eğimi: son okuma ve sıfır noktası */
export const tilt = { b: 0, g: 0, zero: 0, t: -1e9 };

export function girdiSifirla() {
  I.l = I.r = I.g = I.b = I.el = 0;
  I.sa = 0;
}

/** iOS'ta yön sensörü izni (dokunuşla istenmeli) */
export function askTilt() {
  try {
    const D_ = window.DeviceOrientationEvent as unknown as
      { requestPermission?: () => Promise<string> } | undefined;
    if (D_ && D_.requestPermission)
      D_.requestPermission()
        .then((r) => note(r == "granted" ? "Sensör izni verildi" : "Sensör izni reddedildi", 26))
        .catch(() => note("Bu görünümde sensör izni alınamıyor", 24));
    else if (!D_) note("Cihaz yön sensörü bulunamadı", 24);
  } catch {
    note("Sensör izni alınamadı", 24);
  }
}

/** telefonun ekran düzleminde yana yatma açısı (derece). sağ kenar aşağı = pozitif */
export function tiltRoll() {
  const b = (tilt.b * Math.PI) / 180,
    g = (tilt.g * Math.PI) / 180,
    gx = Math.sin(g) * Math.cos(b),
    gy = -Math.sin(b);
  const o = (((devO() + ekran.rot) % 360) + 360) % 360;
  const sx = o == 90 ? -gy : o == 270 ? gy : o == 180 ? -gx : gx;
  return Math.asin(cl(sx, -1, 1)) * 57.3;
}

function tiltSteer() {
  let a = ad((tiltRoll() - tilt.zero) / 57.3) * 57.3;
  const dz = 2.5;
  a = Math.abs(a) < dz ? 0 : a - Math.sign(a) * dz;
  const x = cl(a / (set.tlt - dz), -1, 1);
  return -Math.sign(x) * Math.pow(Math.abs(x), 1.35);
}

/** fiziğe giden girdi: kontrol moduna göre direksiyon hedefi, gaz, fren */
export function fizikGirdisi(): FizikGirdisi {
  const tg = (CT.steer == "btn" ? I.l - I.r : CT.steer == "tilt" ? tiltSteer() : I.sa) * (set.inv ? -1 : 1);
  return {
    tg,
    g: I.g,
    b: I.b,
    analogDireksiyon: CT.steer != "btn",
    analogGaz: CT.gas == "analog",
    el: I.el > 0,
  };
}

/** klavye (bilgisayarda deneme) ve yön sensörü dinleyicileri */
export function girdiKur() {
  // boşluk: el freni
  const KM: Record<string, "l" | "r" | "g" | "b" | "el"> = {
    ArrowLeft: "l",
    ArrowRight: "r",
    ArrowUp: "g",
    ArrowDown: "b",
    " ": "el",
  };
  addEventListener("keydown", (e) => {
    if (KM[e.key]) I[KM[e.key]] = 1;
  });
  addEventListener("keyup", (e) => {
    if (KM[e.key]) I[KM[e.key]] = 0;
  });
  addEventListener("deviceorientation", (e) => {
    if (e.beta == null || e.gamma == null) return;
    tilt.t = performance.now();
    tilt.b = e.beta;
    tilt.g = e.gamma;
  });
}
