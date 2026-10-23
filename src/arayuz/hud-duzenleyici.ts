// HUD düzenleyici (Ayarlar → Göstergeler): örnek bir oyun görüntüsünün üstünde gerçek HUD öğeleri ve tuşlar.
// Hız, sayaç, tuşlar ve harita ayrı ayrı seçilir; seçim anında uygulanır. Kurallar: docs/HUD.md.
import { $, gizle, goster } from "../cekirdek/dom";
import { REG } from "../dunya/bolgeler";
import {
  ayarlariKaydet,
  gorunum,
  HUD_PARCALARI,
  HUDLAR,
  hudDuzeni,
  type HudDuzeni,
  type HudParcasi,
} from "../oyun/ayarlar";
import { oyun } from "../oyun/durum";
import { kurulum } from "../oyun/kurulum";
import { showSet } from "./ayarlar-ekrani";
import { hudDuzeniUygula, hudOrnekDoldur } from "./hud";
import { kontrolleriKur } from "./kontroller";
import { showMenu } from "./menu";
import { miniHaritaCiz, mmDraw, mmGeriAl } from "./mini-harita";

/** açıkken oyun döngüsü HUD'a ve haritaya yazmaz */
export const duzenleyici = { acik: false, donus: "menu" as "menu" | "pause" };

/** örnek harita: Drift Parkı, araç pistin üçte birinde */
function ornekHarita() {
  const r = REG.find((q) => q.t == "dp" && q.TR);
  if (!r || !r.TR) return;
  mmDraw(r, true);
  const TR = r.TR,
    k = Math.floor(TR.N / 3);
  miniHaritaCiz(TR.P[k][0], TR.P[k][1], TR.T[k][0], TR.T[k][1], 30);
}

const cip = (sec: boolean, veri: string, ad: string) =>
  `<div class="chip${sec ? " sel" : ""}" ${veri}>${ad}</div>`;

function panelCiz() {
  const p = $("#hdP"),
    hz = hudDuzeni();
  p.innerHTML =
    '<div class="hdT"><b>Göstergeler</b><button class="btn" id="hdOk">Bitti</button></div>' +
    '<div class="hdR"><span>Hazır</span><div class="hdC">' +
    (Object.keys(HUDLAR) as HudDuzeni[]).map((k) => cip(hz == k, `data-hz="${k}"`, HUDLAR[k].n)).join("") +
    "</div></div>" +
    (Object.keys(HUD_PARCALARI) as HudParcasi[])
      .map(
        (pr) =>
          `<div class="hdR"><span>${HUD_PARCALARI[pr].n}</span><div class="hdC">` +
          Object.entries(HUD_PARCALARI[pr].s)
            .map(([k, n]) => cip(gorunum[pr] == k, `data-pr="${pr}" data-v="${k}"`, n))
            .join("") +
          "</div></div>",
      )
      .join("");
  const uygula = () => {
    hudDuzeniUygula();
    hudOrnekDoldur();
    ayarlariKaydet(oyun.camMode, kurulum.lk);
    panelCiz();
  };
  p.querySelectorAll<HTMLElement>("[data-hz]").forEach(
    (e) =>
      (e.onclick = () => {
        Object.assign(gorunum, HUDLAR[e.dataset.hz as HudDuzeni].p);
        uygula();
      }),
  );
  p.querySelectorAll<HTMLElement>("[data-pr]").forEach(
    (e) =>
      (e.onclick = () => {
        (gorunum as Record<string, string>)[e.dataset.pr!] = e.dataset.v!;
        uygula();
      }),
  );
  $("#hdOk").onclick = hudDuzenleyiciKapat;
}

export function hudDuzenleyiciAc() {
  duzenleyici.acik = true;
  duzenleyici.donus = oyun.mode == "pause" ? "pause" : "menu";
  gizle("#menu", "#set", "#res", "#gar");
  kontrolleriKur();
  $("#app").classList.add("onizleme");
  $("#hdA").style.backgroundImage = "url(img/hud_onizleme.jpg)";
  goster("#hud", "#mm", "#ctl", "#hdA", "#hdP");
  $("#big").textContent = "";
  hudDuzeniUygula();
  hudOrnekDoldur();
  ornekHarita();
  panelCiz();
}

export function hudDuzenleyiciKapat() {
  duzenleyici.acik = false;
  $("#app").classList.remove("onizleme");
  gizle("#hdA", "#hdP", "#ctl");
  mmGeriAl();
  ayarlariKaydet(oyun.camMode, kurulum.lk);
  if (duzenleyici.donus == "pause") showSet();
  else showMenu(["settings"]);
}
