// Garaj ekranı: araçları dönen platformda incele, özellikleri karşılaştır, seç. Yarıştan ve serbest sürüşten önce de
// buradan seçilir; yarışta türe uygun araç "Önerilen" olarak gelir.
import { CARS } from "../arac/araclar";
import { STAT } from "../arac/istatistik";
import { cl } from "../cekirdek/matematik";
import { gizle, $ } from "../cekirdek/dom";
import { garG } from "../cizim/garaj-sahnesi";
import { ground } from "../cizim/zemin";
import { REG } from "../dunya/bolgeler";
import { dunya, WORLDS } from "../dunya/dunya";
import { carIndex, oyun, setCar } from "../oyun/durum";
import { kamera, garajKameraSifirla } from "../cizim/kamera";
import { sun } from "../cizim/sahne";
import { applyPreset, kurulum } from "../oyun/kurulum";
import { EVENTS, startEvent } from "../oyun/yarislar";
import { showMenu, startWorld } from "./menu";

interface GarajDurumu {
  /** yarış (yoksa null) */
  ev: number | null;
  /** serbest sürüş dünyası (yoksa null) */
  w: number | null;
  /** girişteki araç, önerilen araç, gösterilen araç */
  prev: number;
  rec: number;
  i: number;
}
let GAR: GarajDurumu | null = null;

/** motor dinleme: hangi aracın sesi çalıyor, ne zaman bitecek (ses tarafından "bitti" gelmezse 6 sn sonra kendiliğinden) */
let DINLE: { arac: number; zaman: number } | null = null,
  dinleBagli = false;
const DINLE_SURE = 6000;

/** ses butonunun görünümü: çalarken "Dinleniyor" ve dalga çubukları */
function sesButonu() {
  const b = document.querySelector<HTMLElement>("#gses");
  if (!b || !GAR) return;
  const on = !!DINLE && DINLE.arac == GAR.i && performance.now() < DINLE.zaman;
  b.classList.toggle("on", on);
  b.innerHTML = on ? '<i class="dalga"><u></u><u></u><u></u><u></u></i>Dinleniyor…' : "<i>🔊</i>Motoru dinle";
}

/** ses tarafının "bitti" olayını bir kez bağla (yükleme anında değil, garaj ilk açılınca) */
function dinleBagla() {
  if (dinleBagli) return;
  dinleBagli = true;
  document.addEventListener("lt:garaj-dokunus", gorunum);
  document.addEventListener("lt:motor-dinle-bitti", (e) => {
    const a = (e as CustomEvent<{ arac: number }>).detail?.arac;
    if (DINLE && (a == null || a == DINLE.arac)) DINLE = null;
    sesButonu();
  });
}

/** vitrin tuşları: tam ekran düğmesi hep; dönme dokunuşla durunca seç/geri tuşları da çıkar; tam ekranda bilgi paneli gizlenir */
function gorunum() {
  if (!GAR) return;
  const v = $("#gvit");
  v.classList.toggle("tam", kamera.gTam);
  v.classList.toggle("dur", !kamera.gOto);
  $("#gar").style.display = kamera.gTam ? "none" : "";
  const t = $("#gvtam");
  t.textContent = kamera.gTam ? "✕" : "⛶";
  t.setAttribute("aria-label", kamera.gTam ? "Tam ekrandan çık" : "Tam ekran");
}

/** garajı aç: yarıştan önce (ev), serbest sürüşten önce (w) ya da menüden (ikisi de null) */
export function openGarage(ev: number | null, w: number | null = null) {
  const prev = carIndex(),
    rec = ev != null ? CARS.findIndex((c) => c.ty == EVENTS[ev].ty) : -1;
  GAR = { ev, w, prev, rec, i: rec >= 0 ? rec : prev };
  dinleBagla();
  oyun.mode = "garage";
  garajKameraSifirla();
  gizle("#menu", "#hud", "#mm", "#ctl", "#set", "#res");
  if (dunya.g) dunya.g.visible = false;
  for (const q of REG) if (q.g) q.g.visible = false;
  ground.visible = false;
  garG.visible = true;
  sun.visible = false;
  showGar();
}

export function closeGarage() {
  DINLE = null;
  garG.visible = false;
  sun.visible = true;
  gizle("#gar", "#gvit");
  $("#gar").style.display = "";
  GAR = null;
}

function showGar() {
  const G = GAR!,
    c = CARS[G.i];
  if (oyun.CAR !== c) setCar(G.i);
  const g = $("#gar");
  g.classList.remove("hidden");
  const stat = STAT(c).filter(([n]) => ["Azami hız", "Hızlanma", "Yol tutuşu", "Arazi"].includes(n));
  g.innerHTML = `<div class="gh"><button class="ga" id="gpv">◀</button><div style="flex:1;text-align:center"><h1>${c.n}</h1><span class="bdg">${c.ic} ${c.st}</span>${G.i == G.rec ? '<span class="bdg rec">Önerilen</span>' : ""}<button class="gses" id="gses"></button></div><button class="ga" id="gnx">▶</button></div>
<div class="gl">${CARS.map((q, k) => `<div class="gc ${k == G.i ? "sel" : ""}" data-gi="${k}"><b>${q.ic}</b>${q.n}</div>`).join("")}</div>
${stat
  .map(
    ([n, f, t]) =>
      `<div class="st"><span>${n}</span><i><u style="width:${Math.round(cl(f, 0.05, 1) * 100)}%"></u></i><em>${t}</em></div>`,
  )
  .join("")}
<p class="gozet">${c.hp} hp · ${c.kg} kg · ${c.awd ? "Dört çeker" : "Arkadan itiş"}</p>
<div class="gbt"><button class="btn alt" id="gbk">Geri</button><button class="btn" id="gok">${G.ev != null ? "Yarış: " + EVENTS[G.ev].n : G.w != null ? "Sür: " + WORLDS[G.w].n : "Bu aracı kullan"}</button></div>`;
  const v = $("#gvit");
  v.classList.remove("hidden");
  v.innerHTML = `<button class="btn" id="gvok">${$("#gok").textContent}</button><button class="btn alt" id="gvbk">Geri</button><button class="gvtam" id="gvtam"></button>`;
  $("#gvok").onclick = () => $("#gok").click();
  $("#gvbk").onclick = () => $("#gbk").click();
  $("#gvtam").onclick = () => {
    kamera.gTam = !kamera.gTam;
    gorunum();
  };
  gorunum();
  const go = (k: number) => {
    G.i = (k + CARS.length) % CARS.length;
    showGar();
  };
  sesButonu();
  // motoru dinle: sesi ses modülü çalar (olay sözleşmesi: lt:motor-dinle → lt:motor-dinle-bitti); tekrar basınca baştan
  $("#gses").onclick = () => {
    const arac = G.i;
    DINLE = { arac, zaman: performance.now() + DINLE_SURE };
    document.dispatchEvent(new CustomEvent("lt:motor-dinle", { detail: { arac } }));
    sesButonu();
    setTimeout(() => {
      if (DINLE && DINLE.arac == arac && performance.now() >= DINLE.zaman) DINLE = null;
      sesButonu();
    }, DINLE_SURE + 50);
  };
  $("#gpv").onclick = () => go(G.i - 1);
  $("#gnx").onclick = () => go(G.i + 1);
  g.querySelectorAll<HTMLElement>(".gc").forEach((e) => (e.onclick = () => go(+e.dataset.gi!)));
  $("#gbk").onclick = () => {
    setCar(G.prev);
    closeGarage();
    showMenu(G.w != null ? ["free"] : undefined);
  };
  $("#gok").onclick = () => {
    const { ev, w, i, prev } = G;
    closeGarage();
    if (ev != null) {
      setCar(prev);
      startEvent(ev, i);
      return;
    }
    // serbest sürüş: aracın önayarıyla başlar (önayar sonra duraklatma menüsünden değiştirilebilir)
    kurulum.pk = oyun.CAR.pk;
    applyPreset();
    if (w != null) startWorld(w);
    else showMenu();
  };
}
