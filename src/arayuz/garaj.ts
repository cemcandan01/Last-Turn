// Garaj ekranı: araçları dönen platformda incele, özellikleri karşılaştır, seç. Yarıştan önce de buradan seçilir;
// türe uygun araç "Önerilen" olarak gelir.
import { CARS } from "../arac/araclar";
import { STAT } from "../arac/istatistik";
import { cl } from "../cekirdek/matematik";
import { gizle, $ } from "../cekirdek/dom";
import { garG } from "../cizim/garaj-sahnesi";
import { ground } from "../cizim/zemin";
import { REG } from "../dunya/bolgeler";
import { dunya } from "../dunya/dunya";
import { PRESETS } from "../fizik/veriler";
import { carIndex, oyun, setCar } from "../oyun/durum";
import { kamera } from "../cizim/kamera";
import { applyPreset, kurulum } from "../oyun/kurulum";
import { EVENTS, startEvent } from "../oyun/yarislar";
import { showMenu } from "./menu";

interface GarajDurumu {
  /** yarış (yoksa null) */
  ev: number | null;
  /** girişteki araç, önerilen araç, gösterilen araç */
  prev: number;
  rec: number;
  i: number;
}
let GAR: GarajDurumu | null = null;

export function openGarage(ev: number | null) {
  const prev = carIndex(),
    rec = ev != null ? CARS.findIndex((c) => c.ty == EVENTS[ev].ty) : -1;
  GAR = { ev, prev, rec, i: rec >= 0 ? rec : prev };
  oyun.mode = "garage";
  kamera.ly = 0;
  gizle("#menu", "#hud", "#mm", "#ctl", "#set", "#res");
  if (dunya.g) dunya.g.visible = false;
  for (const q of REG) if (q.g) q.g.visible = false;
  ground.visible = false;
  garG.visible = true;
  showGar();
}

export function closeGarage() {
  garG.visible = false;
  gizle("#gar");
  GAR = null;
}

function showGar() {
  const G = GAR!,
    c = CARS[G.i];
  if (oyun.CAR !== c) setCar(G.i);
  const g = $("#gar");
  g.classList.remove("hidden");
  g.innerHTML = `<div class="gh"><button class="ga" id="gpv">◀</button><div style="flex:1;text-align:center"><h1>${c.n}</h1><span class="bdg">${c.ic} ${c.st}</span>${G.i == G.rec ? '<span class="bdg rec">Önerilen</span>' : ""}</div><button class="ga" id="gnx">▶</button></div>
<div class="gl">${CARS.map((q, k) => `<div class="gc ${k == G.i ? "sel" : ""}" data-gi="${k}"><b>${q.ic}</b>${q.n}</div>`).join("")}</div>
<p>${c.d}</p>${STAT(c)
    .map(
      ([n, f, t]) =>
        `<div class="st"><span>${n}</span><i><u style="width:${Math.round(cl(f, 0.05, 1) * 100)}%"></u></i><em>${t}</em></div>`,
    )
    .join("")}
<p style="font-size:14px;margin-top:8px">${c.hp} hp · ${c.kg} kg · ${c.awd ? "Dört çeker" : "Arkadan itiş"} · Önayar: ${PRESETS[c.pk].n}</p>
<button class="btn" id="gok">${G.ev != null ? "Bu araçla yarış: " + EVENTS[G.ev].n : "Bu aracı kullan"}</button><button class="btn alt" id="gbk">Geri</button>`;
  const go = (k: number) => {
    G.i = (k + CARS.length) % CARS.length;
    showGar();
  };
  $("#gpv").onclick = () => go(G.i - 1);
  $("#gnx").onclick = () => go(G.i + 1);
  g.querySelectorAll<HTMLElement>(".gc").forEach((e) => (e.onclick = () => go(+e.dataset.gi!)));
  $("#gbk").onclick = () => {
    setCar(G.prev);
    closeGarage();
    showMenu();
  };
  $("#gok").onclick = () => {
    const { ev, i, prev } = G;
    closeGarage();
    if (ev != null) {
      setCar(prev);
      startEvent(ev, i);
    } else {
      kurulum.pk = oyun.CAR.pk;
      applyPreset();
      showMenu();
    }
  };
}
