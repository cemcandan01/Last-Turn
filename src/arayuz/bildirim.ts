// Ekran ortasında kısa bildirim (SPİN, +puan, tur süresi)
import { $ } from "../cekirdek/dom";

export const bildirim = { t: 0 };

export function note(t: string, sz?: number) {
  const b = $("#big");
  b.textContent = t;
  b.style.fontSize = (sz || 34) + "px";
  bildirim.t = 1.2;
}

/** bildirimi zamanla sil */
export function bildirimTick(dt: number) {
  if (bildirim.t > 0) {
    bildirim.t -= dt;
    if (bildirim.t <= 0) $("#big").textContent = "";
  }
}
