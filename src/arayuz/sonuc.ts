// Sonuç ekranı: süre, yıldız ve eşikleri, hedef, rekor; tekrar, açık dünya, ana menü
import { fmt, fmt3 } from "../cekirdek/bicim";
import { $ } from "../cekirdek/dom";
import { WORLDS } from "../dunya/dunya";
import { oyun } from "../oyun/durum";
import { best, saveBest } from "../oyun/profil";
import { leaveEvent, startEvent, type Yaris } from "../oyun/yarislar";
import { adimXp, seviye, seviyeTabani, xpSeviyesi } from "../oyun/ilerleme";
import { enIyiYildiz } from "../oyun/yildiz";
import { ikon, yildizSerit } from "./ikonlar";
import { showMenu, startWorld } from "./menu";
import {
  kutlamaGoster,
  paraSonucAnimasyonu,
  paraSonucHtml,
  xpSonucAnimasyonu,
  xpSonucHtml,
} from "./seviye-ui";

/** yarış öncesi seviye ve çubuk oranı, toplam XP'den geriye hesaplanır */
function xpBlok(kazanilan: number) {
  const onceki = seviye().toplamXp - kazanilan,
    lv = xpSeviyesi(onceki);
  return xpSonucHtml(kazanilan, lv, (onceki - seviyeTabani(lv)) / adimXp(lv));
}

export function sonucGoster(EV: Yaris) {
  let h: string, p: string;
  const row = (a: string, b: string | number) => `<div class="rk"><span>${a}</span><span>${b}</span></div>`,
    bicim = (v: number) => (EV.ty == "dp" ? v + " puan" : EV.ty == "dg" ? fmt3(v) : fmt(v)),
    yildiz = EV.ys.length
      ? `<div class="yres">${yildizSerit(EV.yildiz, "buyuk", true)}<small>${EV.ys
          .map(
            (v, i) =>
              `<span class="${i < EV.yildiz ? "dolu" : ""}">${i + 1}${ikon("yildiz")} ${bicim(v)}</span>`,
          )
          .join("")}</small><small class="eniyi">En iyi: ${enIyiYildiz(EV.ty, EV.lv)} / 3</small></div>` +
        xpBlok(EV.xp) +
        paraSonucHtml(EV.para)
      : "";
  if (EV.ty == "dp") {
    const b = best(EV.k),
      nb = EV.score > b;
    if (nb) saveBest(EV.k, EV.score);
    const gecti = EV.score > 0 && EV.score >= EV.limit;
    h = gecti ? "Hedef geçildi" : "Hedefe ulaşılamadı";
    p =
      row("Toplam puan", EV.score) +
      yildiz +
      row("Hedef", EV.limit + " puan · " + (gecti ? "geçti" : "kaldı")) +
      row("En iyi kombo", EV.best) +
      row("Rekor", Math.max(b, EV.score) + (nb ? " · YENİ" : ""));
  } else {
    const ok = EV.t <= EV.limit,
      b = best(EV.k),
      nb = ok && (!b || EV.t < b);
    if (nb) saveBest(EV.k, EV.t.toFixed(EV.ty == "dg" ? 3 : 2));
    h = ok
      ? EV.laps
        ? "Yarış tamamlandı"
        : EV.ty == "dg"
          ? "Hedef geçildi"
          : "Etap tamamlandı"
      : "Süre aşıldı";
    p =
      EV.ty == "dg"
        ? row("Süren", fmt3(EV.t)) +
          yildiz +
          row("Hedef", fmt3(EV.limit)) +
          row("Bitiş hızı", Math.round(EV.trap || 0) + " km/sa") +
          row("Rekor", nb ? fmt3(EV.t) + " · YENİ" : b ? fmt3(+b) : "—")
        : row("Süren", fmt(EV.t)) +
          yildiz +
          row("Hedef", fmt(EV.limit)) +
          (EV.laps ? row("En iyi tur", fmt(EV.bestLap)) : "") +
          row("Rekor", nb ? fmt(EV.t) + " · YENİ" : b ? fmt(b) : "—");
  }
  const r = $("#res"),
    k = EV.i;
  r.classList.remove("hidden");
  r.innerHTML = `<h1>${h}</h1>${p}<button class="btn" id="again">Tekrar</button><button class="btn alt" id="free">Açık dünyaya dön</button><button class="btn alt" id="rm">Ana menü</button>`;
  xpSonucAnimasyonu(r);
  paraSonucAnimasyonu(r);
  // seviye atladıysa kutlama, çubuk dolduktan sonra sonuç ekranının üstünde
  if (seviye().toplamXp) setTimeout(kutlamaGoster, 2300);
  $("#again").onclick = () => startEvent(k);
  $("#free").onclick = () => {
    r.classList.add("hidden");
    startWorld(WORLDS.indexOf(oyun.CURW));
  };
  $("#rm").onclick = () => {
    r.classList.add("hidden");
    leaveEvent();
    showMenu(["home"]);
  };
}
