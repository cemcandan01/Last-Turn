// Garaj ekranı: araçları dönen platformda incele, özellikleri karşılaştır, seç. Yarıştan ve serbest sürüşten önce de
// buradan seçilir; yarışta türe uygun araç "Önerilen" olarak gelir.
import { CARS } from "../arac/araclar";
import { STAT, estTop } from "../arac/istatistik";
import { cl } from "../cekirdek/matematik";
import { gizle, $ } from "../cekirdek/dom";
import { garG, garajIsigi } from "../cizim/garaj-sahnesi";
import { ground } from "../cizim/zemin";
import { REG } from "../dunya/bolgeler";
import { dunya, WORLDS } from "../dunya/dunya";
import { vitrinBosalt, vitrinHazirla, vitrinHazirMi, aracIcKur } from "../cizim/arac-modeli";
import { carIndex, oyun, setCar } from "../oyun/durum";
import { kamera, garajKameraSifirla } from "../cizim/kamera";
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

/** vitrin tuşları: tam ekran düğmesi hep; tam ekranda dokunup bırakınca seç/geri tuşları çıkar, sürükleyince kaybolur; tam ekranda bilgi paneli gizlenir */
function gorunum() {
  if (!GAR) return;
  const v = $("#gvit");
  v.classList.toggle("tam", kamera.gTam);
  v.classList.toggle("dur", kamera.gBtn);
  $("#gar").style.display = kamera.gTam ? "none" : "";
  const t = $("#gvtam");
  t.style.display = kamera.gTam ? "none" : "";
}

/** diğer araçların modellerini kareler arasına yayarak önceden kur (araç değişince kurma takılması olmasın) */
let ONHAZIR: ReturnType<typeof setTimeout> | undefined;
function onHazirla() {
  clearTimeout(ONHAZIR);
  const sira = CARS.filter((c) => !vitrinHazirMi(c));
  const adim = () => {
    const c = sira.shift();
    if (!c || !GAR) return;
    vitrinHazirla(c);
    ONHAZIR = setTimeout(adim, 150);
  };
  ONHAZIR = setTimeout(adim, 300);
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
  garajIsigi(true);
  showGar();
  onHazirla();
}

export function closeGarage() {
  DINLE = null;
  garG.visible = false;
  garajIsigi(false);
  vitrinBosalt();
  clearTimeout(ONHAZIR);
  aracIcKur();
  gizle("#gar", "#gvit");
  $("#gar").style.display = "";
  GAR = null;
}

function showGar() {
  const G = GAR!,
    c = CARS[G.i];
  if (oyun.CAR !== c) setCar(G.i, true);
  const g = $("#gar");
  g.classList.remove("hidden");
  // ana menüden açılan garajda araç seçilmez (yalnız bakılır)
  const sec = G.ev != null ? "Yarış: " + EVENTS[G.ev].n : G.w != null ? "Sür: " + WORLDS[G.w].n : "";
  const sv = Object.fromEntries(STAT(c).map(([n, f]) => [n, f])),
    pct = (f: number) => Math.round(cl(f, 0.05, 1) * 100),
    gucAgirlik = (c.hp / c.kg) * 1000,
    kartlar: [string, string, string, string, number][] = [
      ["⚡", "Azami hız", String(Math.round(estTop(c))), "km/sa", sv["Azami hız"]],
      ["🚀", "0-100 km/sa", c.a100.toFixed(1), "sn", sv["Hızlanma"]],
      ["🛞", "Yol tutuşu", String(pct(sv["Yol tutuşu"])), "%", sv["Yol tutuşu"]],
      ["⛰️", "Arazi", String(pct(sv["Arazi"])), "%", sv["Arazi"]],
      ["🛑", "Fren 100-0", String(c.b100), "m", sv["Fren"]],
      ["🔋", "Güç / ağırlık", String(Math.round(gucAgirlik)), "hp/ton", gucAgirlik / 600],
    ];
  g.innerHTML = `<div class="gh"><button class="ga" id="gpv">◀</button><div style="flex:1;text-align:center"><h1>${c.n}</h1></div><button class="ga" id="gnx">▶</button></div>
<div class="grozet${G.i == G.rec ? " sik" : ""}"><span class="bdg">${c.ic} ${c.st}</span>${G.i == G.rec ? '<span class="bdg rec">Önerilen</span>' : ""}<button class="gses" id="gses"></button></div>
<div class="gkart">${kartlar
    .map(
      ([ic, n, d, b, f]) =>
        `<div class="gk"><span class="gkb"><i>${ic}</i>${n}</span><b>${d}<small>${b}</small></b><u><s style="width:${Math.round(cl(f, 0.05, 1) * 100)}%"></s></u></div>`,
    )
    .join("")}</div>
<div class="gcip"><span>⚙️ ${c.hp} hp</span><span>⚖️ ${c.kg} kg</span><span>🔩 ${c.awd ? "Dört çeker" : "Arkadan itiş"}</span></div>
<div class="gbt"><button class="btn alt" id="gbk">Geri</button>${sec ? `<button class="btn" id="gok">${sec}</button>` : ""}</div>`;
  const v = $("#gvit");
  v.classList.remove("hidden");
  v.innerHTML = `<button class="gvar" id="gvpv">◀</button><button class="gvar sag" id="gvnx">▶</button>${sec ? `<button class="btn" id="gvok">${sec}</button>` : ""}<button class="btn alt" id="gvbk">Geri</button><button class="gvtam" id="gvtam">⛶</button>`;
  if (sec) $("#gvok").onclick = () => $("#gok").click();
  // tam ekranda Geri: tam ekrandan çıkıp bilgi paneline döner
  $("#gvbk").onclick = () => {
    kamera.gTam = false;
    kamera.gBtn = false;
    gorunum();
  };
  $("#gvpv").onclick = () => go(G.i - 1);
  $("#gvnx").onclick = () => go(G.i + 1);
  $("#gvtam").onclick = () => {
    kamera.gTam = !kamera.gTam;
    kamera.gBtn = false;
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
  $("#gbk").onclick = () => {
    setCar(G.prev);
    closeGarage();
    showMenu(G.w != null ? ["free"] : undefined);
  };
  if (sec)
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
