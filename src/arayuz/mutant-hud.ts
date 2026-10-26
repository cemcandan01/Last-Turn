// MUTANT sürüş göstergesi: mevcut HUD'un üst kenarında gövde bütünlüğü.
// Saf, okunur durum sözleşmesi; oyuna veya fiziğe veri yazmaz.
import { mutantDurumu } from "../oyun/mutant";
import { oyun } from "../oyun/durum";
import "./mutant-hud.css";

let gosterge: HTMLDivElement | null = null;

export function mutantHudGuncelle() {
  const d = mutantDurumu();
  const panel = document.querySelector<HTMLElement>(".hTL");
  if (!panel) return;
  const etkin = !!d && oyun.mode == "drive";
  panel.classList.toggle("mt-hud-active", etkin);
  if (!etkin || !d) {
    if (gosterge) gosterge.hidden = true;
    panel.classList.remove("mt-hud-critical");
    return;
  }
  if (!gosterge) {
    gosterge = document.createElement("div");
    gosterge.className = "mt-hud-health";
    gosterge.setAttribute("role", "progressbar");
    gosterge.setAttribute("aria-valuemin", "0");
    gosterge.setAttribute("aria-valuemax", "100");
    gosterge.setAttribute("aria-label", "Mutant gövde bütünlüğü");
    panel.append(gosterge);
  }
  gosterge.hidden = false;
  const saglik = String(Math.round(d.govde));
  if (gosterge.getAttribute("aria-valuenow") != saglik) gosterge.setAttribute("aria-valuenow", saglik);
  const genislik = d.govde + "%";
  if (gosterge.style.width != genislik) gosterge.style.width = genislik;
  panel.classList.toggle("mt-hud-critical", d.govde <= 25);
}
