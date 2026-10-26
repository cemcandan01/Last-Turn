// MUTANT sürüş telemetrisi: sadece görsel, fizik ve ekonomi durumunu değiştirmez.
import { mutant } from "../oyun/mutant";
import { oyun } from "../oyun/durum";

let root: HTMLDivElement | null = null;
const time = (n: number) => Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0");

export function mutantHudGuncelle() {
  const k = mutant.kosu;
  if (!k || oyun.mode != "drive") {
    if (root) root.hidden = true;
    return;
  }
  if (!root) {
    root = document.createElement("div");
    root.className = "mutant-drive-hud";
    root.setAttribute("aria-label", "Mutant araç ve boss durumu");
    root.innerHTML =
      '<div class="mdh-top"><span class="mdh-kicker">MUTANT / BÖLGE</span><strong class="mdh-zone"></strong><span class="mdh-time"></span></div>' +
      '<div class="mdh-health"><div class="mdh-label"><span>GÖVDE</span><strong class="mdh-percent"></strong></div><div class="mdh-track"><div class="mdh-fill"></div></div></div>' +
      '<div class="mdh-footer"><span class="mdh-threat"></span><span class="mdh-risk"></span></div>';
    document.querySelector("#app")?.append(root);
  }
  root.hidden = false;
  root.classList.toggle("mdh-critical", k.govde <= 25);
  const put = (selector: string, value: string) => {
    const el = root?.querySelector<HTMLElement>(selector);
    if (el && el.textContent !== value) el.textContent = value;
  };
  put(".mdh-zone", String(k.bolge));
  put(".mdh-time", time(k.kalan));
  put(".mdh-percent", Math.round(k.govde) + "%");
  put(".mdh-threat", mutant.etkinlik == "boss" ? "BOSS MÜCADELESİ" : k.boss.ad);
  put(".mdh-risk", mutant.etkinlik !== null && mutant.etkinlik != "boss" ? "RİSK " + "★".repeat(mutant.risk + 1) : "");
  const bar = root.querySelector<HTMLElement>(".mdh-fill");
  if (bar) bar.style.width = Math.max(0, Math.min(100, k.govde)) + "%";
}
