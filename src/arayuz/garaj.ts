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
import {
  model,
  vitrinBosalt,
  vitrinHazirla,
  vitrinHazirMi,
  vitrinIsit,
  aracIcKur,
} from "../cizim/arac-modeli";
import { carIndex, oyun, setCar } from "../oyun/durum";
import * as THREE from "three";
import { kamera, garajKameraSifirla } from "../cizim/kamera";
import { applyPreset, kurulum } from "../oyun/kurulum";
import {
  acilmaSeviyesi,
  aracAcikMi,
  aracFiyati,
  aracSatinAl,
  aracSatinAlinabilirMi,
  para,
  paraDinle,
  pistAcikMi,
} from "../oyun/ilerleme";
import { ikon } from "./ikonlar";
import { EVENTS, startEvent } from "../oyun/yarislar";
import { note } from "./bildirim";
import { showMenu, startWorld, TYPES } from "./menu";

interface GarajDurumu {
  /** yarış (yoksa null) */
  ev: number | null;
  /** serbest sürüş dünyası (yoksa null) */
  w: number | null;
  /** girişteki araç, önerilen araç, gösterilen araç */
  prev: number;
  rec: number;
  i: number;
  /** mağaza kipi: yalnız sahip olunmayan araçlar gezilir, süzgeç (tür anahtarı ya da "hepsi"), geri dönüş ve son alınan araç */
  mg: boolean;
  suz: string;
  geri?: () => void;
  alinan: number | null;
}
let GAR: GarajDurumu | null = null;

const sayi = (n: number) => n.toLocaleString("tr-TR");
const paraYazi = (n: number) => `${ikon("para")}<b>${sayi(n)}</b>`;
/** gezilen araçlar: garajda yalnız sahip olunanlar, mağazada sahip olunmayanlar (süzgece göre) */
const liste = (G: GarajDurumu) =>
  CARS.map((_, k) => k).filter((k) =>
    G.mg ? !aracAcikMi(k) && (G.suz == "hepsi" || CARS[k].ty == G.suz) : aracAcikMi(k),
  );
const turBilgi = (ty: string) => TYPES.find((t) => t[0] == ty);
let PARA_BIRAK: (() => void) | null = null,
  ONAY: { arac: number; zaman: number } | null = null,
  ONAY_ZAMANLA: ReturnType<typeof setTimeout> | undefined;

/** köşedeki bakiye (garaj açıkken); yoksa kurar */
function bakiyeGoster(goster: boolean) {
  let b = document.getElementById("gpara");
  if (!b) {
    b = document.createElement("div");
    b.id = "gpara";
    document.body.appendChild(b);
  }
  b.style.display = goster ? "" : "none";
  if (goster) b.innerHTML = paraYazi(para());
}

/** mağazada vitrinin altında aracın kısa açıklaması (panel kaydırmasız kalsın diye panelde değil) */
function aciklamaGoster(yazi: string | null) {
  let b = document.getElementById("gdes");
  if (!yazi) {
    b?.remove();
    return;
  }
  if (!b) {
    b = document.createElement("div");
    b.id = "gdes";
    document.body.appendChild(b);
  }
  b.style.display = kamera.gTam ? "none" : "";
  b.textContent = yazi;
}

/** vitrinin sol üstündeki mağaza şeridi: sekme ("Araçlar"; ileride "Modifiye" buraya gelir) ve tür süzgeci */
function magazaSeridi(G: GarajDurumu | null) {
  let b = document.getElementById("gmf");
  if (!b) {
    b = document.createElement("div");
    b.id = "gmf";
    document.body.appendChild(b);
  }
  b.style.display = G?.mg && !kamera.gTam ? "" : "none";
  if (!G?.mg) return;
  const say = (suz: string) =>
    CARS.filter((c, k) => !aracAcikMi(k) && (suz == "hepsi" || c.ty == suz)).length;
  b.innerHTML =
    `<span class="gsek">Araçlar</span>` +
    [["hepsi", "Tümü", "", ""] as const, ...TYPES.map((t) => [t[0], t[1], t[3], t[4]] as const)]
      .map(
        ([k, ad, ik, renk]) =>
          `<button data-suz="${k}" class="${G.suz == k ? "on" : ""}" style="--c:${renk || "#ff7a1a"}"${say(k) ? "" : ' data-bos="1"'}>${ik ? ikon(ik) : ""}${ad}</button>`,
      )
      .join("");
  b.querySelectorAll<HTMLElement>("button").forEach((e) => {
    e.onclick = () => {
      G.suz = e.dataset.suz!;
      G.alinan = null;
      const l = liste(G);
      if (l.length && !l.includes(G.i)) G.i = l[0];
      showGar();
    };
  });
}

/** satın alma kutlaması: parıltı ve "Satın alındı" */
function kutla(ad: string) {
  const k = document.createElement("div");
  k.className = "gkutla";
  k.innerHTML = `<div class="gkr"></div><b>Satın alındı</b><small>${ad}</small>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<i style="--a:${i * 45}deg"></i>`).join("")}`;
  document.body.appendChild(k);
  setTimeout(() => k.remove(), 1700);
}

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
  // yazı tipi daha geniş olan cihazda rozet satırı sığmazsa yazı ve yan boşluklar küçülür (--rz; düğme yüksekliği
  // aynı kalır, sığdığında görünüm değişmez)
  const rz = b.parentElement!,
    tasar = () => b.getBoundingClientRect().right > rz.getBoundingClientRect().right + 1;
  rz.style.removeProperty("--rz");
  for (let k = 0.95; k > 0.65 && tasar(); k -= 0.05) rz.style.setProperty("--rz", k.toFixed(2));
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
  magazaSeridi(GAR);
  for (const id of ["gmal", "gdes"]) {
    const e = document.getElementById(id);
    if (e) e.style.display = kamera.gTam ? "none" : "";
  }
}

/** diğer araçların modellerini kareler arasına yayarak önceden kur ve GPU'ya yükle (araç değişince takılma olmasın) */
let ONHAZIR: ReturnType<typeof setTimeout> | undefined;
function onHazirla() {
  clearTimeout(ONHAZIR);
  const sira = CARS.filter((c) => !vitrinHazirMi(c));
  const adim = () => {
    const c = sira.shift();
    if (!c || !GAR) return;
    vitrinHazirla(c);
    vitrinIsit(c);
    ONHAZIR = setTimeout(adim, 150);
  };
  ONHAZIR = setTimeout(adim, 300);
}

/** türe en uygun açık araç: türün kendi aracı açıksa o, değilse türün ağırlıklı özelliklerinde (STAT) en yüksek açık araç */
const TUR_AGIRLIK: Record<string, Record<string, number>> = {
  gp: { "Azami hız": 1, "Yol tutuşu": 1, Hızlanma: 0.5, Fren: 0.5 },
  rx: { Arazi: 1, "Yol tutuşu": 1, Hızlanma: 0.7 },
  rl: { Arazi: 1.2, "Yol tutuşu": 1, Fren: 0.5 },
  dp: { Hızlanma: 1, "Yol tutuşu": 0.6, "Azami hız": 0.4 },
  dg: { Hızlanma: 1.2, "Azami hız": 0.8 },
};
export function onerilenArac(ty: string) {
  const own = CARS.findIndex((c) => c.ty == ty);
  if (own >= 0 && aracAcikMi(own)) return own;
  const w = TUR_AGIRLIK[ty] ?? {};
  let best = -1,
    bs = -1;
  CARS.forEach((c, k) => {
    if (!aracAcikMi(k)) return;
    const sc = STAT(c).reduce((a, [n, f]) => a + (w[n] ?? 0) * f, 0);
    if (sc > bs) {
      bs = sc;
      best = k;
    }
  });
  return best;
}

/** kilitli aracı vitrinde karart (siluet); açık araçta özgün malzemeler geri gelir. Malzemeler kopyalanır: ortak malzeme bozulmaz */
function kilitGorunumu(kilitli: boolean) {
  const cm = model.carM;
  if (!cm) return;
  const isle = (o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const u = m.userData as {
      orj?: THREE.Material | THREE.Material[];
      kar?: THREE.Material | THREE.Material[];
    };
    if (kilitli) {
      u.orj ??= m.material;
      u.kar ??= (Array.isArray(u.orj) ? u.orj : [u.orj]).map((x) => {
        const k = x.clone() as THREE.MeshStandardMaterial;
        k.color?.multiplyScalar(0.1);
        if (k.emissive) k.emissive.setHex(0);
        k.map = null;
        k.envMapIntensity = 0.2;
        return k;
      });
      m.material = Array.isArray(u.orj) ? (u.kar as THREE.Material[]) : (u.kar as THREE.Material[])[0];
    } else if (u.orj) m.material = u.orj;
  };
  cm.g.traverse(isle);
  for (const w of cm.ws) w.w.traverse(isle);
}

/** garajı aç: yarıştan önce (ev), serbest sürüşten önce (w) ya da menüden (ikisi de null) */
export function openGarage(ev: number | null, w: number | null = null) {
  // kilitli pistin garajı açılmaz (kilit görselleri menu dalında)
  if (ev != null && !pistAcikMi(EVENTS[ev].ty, EVENTS[ev].lv)) {
    note("Kilitli: seviye " + acilmaSeviyesi(EVENTS[ev]), 40);
    return;
  }
  const prev = carIndex(),
    rec = ev != null ? onerilenArac(EVENTS[ev].ty) : -1,
    acik = (k: number) => k >= 0 && aracAcikMi(k);
  ac({
    ev,
    w,
    prev,
    rec,
    i: acik(rec)
      ? rec
      : acik(prev) || (ev == null && w == null)
        ? prev
        : CARS.findIndex((_, k) => aracAcikMi(k)),
    mg: false,
    suz: "hepsi",
    alinan: null,
  });
}

/** mağazayı aç: sahip olunmayan araçlar (satın alınabilir, para ya da seviye yetmeyen); geri verilirse Geri onu çağırır, yoksa ana menü */
export function magazaAc(geriDonus?: () => void) {
  const prev = carIndex(),
    l = liste({ mg: true, suz: "hepsi" } as GarajDurumu);
  ac({
    ev: null,
    w: null,
    prev,
    rec: -1,
    i: l[0] ?? prev,
    mg: true,
    suz: "hepsi",
    geri: geriDonus,
    alinan: null,
  });
}

function ac(durum: GarajDurumu) {
  GAR = durum;
  dinleBagla();
  PARA_BIRAK?.();
  PARA_BIRAK = paraDinle(() => {
    if (GAR) showGar();
  });
  ONAY = null;
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
  PARA_BIRAK?.();
  PARA_BIRAK = null;
  ONAY = null;
  bakiyeGoster(false);
  magazaSeridi(null);
  aciklamaGoster(null);
  document.getElementById("gmal")?.remove();
  garG.visible = false;
  garajIsigi(false);
  vitrinBosalt();
  clearTimeout(ONHAZIR);
  aracIcKur();
  gizle("#gar", "#gvit");
  $("#gar").style.display = "";
  GAR = null;
}

/** Geri: garajda ana menü (serbest sürüştense o liste), mağazada çağıranın verdiği yer ya da ana menü */
function geriDon() {
  const G = GAR!;
  setCar(G.prev);
  closeGarage();
  if (G.mg && G.geri) G.geri();
  else showMenu(G.w != null ? ["free"] : undefined);
}

/** mağazadan yeni alınan araçla garajı aç */
function garajaGit() {
  const a = GAR!.alinan;
  closeGarage();
  if (a != null) setCar(a);
  openGarage(null);
}

function showGar() {
  const G = GAR!,
    c = CARS[G.i];
  if (oyun.CAR !== c) setCar(G.i, true);
  // ana menüden açılan garajda araç seçilmez (yalnız bakılır)
  const sec = G.ev != null ? "Yarış: " + EVENTS[G.ev].n : G.w != null ? "Sür: " + WORLDS[G.w].n : "";
  const g = $("#gar"),
    L = liste(G),
    acik = aracAcikMi(G.i),
    sa = aracSatinAlinabilirMi(G.i),
    // seviyesi gelmeyen araç karartılır; seviyesi yeten ama alınmamış araç (satilik) açık renkte kalır
    kilitli = !acik && sa.neden == "seviye",
    satilik = !acik && !kilitli,
    fiyat = aracFiyati(G.i),
    eksik = fiyat.para - para(),
    onayda = satilik && ONAY?.arac == G.i && ONAY.zaman > performance.now(),
    kilitYazi = "Seviye " + fiyat.seviye + "'de açılır",
    // seç düğmesinin yerine geçen yazı: kilit, satın al, onay ya da eksik para
    okYazi = kilitli
      ? "🔒 " + kilitYazi
      : satilik
        ? eksik > 0
          ? `${ikon("para")} ${sayi(eksik)} daha gerekli`
          : onayda
            ? `Emin misin? ${ikon("para")} ${sayi(fiyat.para)}`
            : `Satın al ${ikon("para")} ${sayi(fiyat.para)}`
        : sec;
  // düğme: garajda yarış/sürüş varsa Seç; mağazada alınmamış araçta satın al ya da kilit
  const dugme = G.mg ? !acik : !!sec,
    tur = turBilgi(c.ty),
    // yarış öncesi garajda türün aracı alınmamışsa mağazaya yönlendiren ipucu
    magazadaVar = !G.mg && G.ev != null && CARS.some((x, k) => x.ty == EVENTS[G.ev!].ty && !aracAcikMi(k));
  kilitGorunumu(kilitli);
  g.classList.toggle("magaza", G.mg);
  g.classList.remove("hidden");
  g.classList.toggle("kilitli", kilitli);
  g.classList.toggle("satilik", satilik);
  bakiyeGoster(true);
  magazaSeridi(G);
  document.getElementById("gmal")?.remove();
  aciklamaGoster(G.mg && L.length ? c.d : null);
  if (G.mg && !L.length) {
    // süzgeçte (ya da hiç) satılık araç kalmadı
    const hepsi = CARS.every((_, k) => aracAcikMi(k));
    g.innerHTML = `<div class="gh"><div style="flex:1;text-align:center"><h1>Mağaza</h1></div></div>
<div class="gbos">${hepsi ? "Bütün araçlar sende." : "Bu türde satılık araç kalmadı."}${G.alinan != null ? `<button class="btn al" id="gga">Garaja git</button>` : ""}</div>
<div class="gbt"><button class="btn alt" id="gbk">Geri</button></div>`;
    $("#gvit").classList.add("hidden");
    $("#gbk").onclick = geriDon;
    if (G.alinan != null) $("#gga").onclick = garajaGit;
    return;
  }
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
  g.innerHTML = `<div class="gh"><button class="ga" id="gpv">◀</button><div style="flex:1;text-align:center"><h1>${kilitli ? "🔒 " : ""}${c.n}</h1></div><button class="ga" id="gnx">▶</button></div>
<div class="grozet${G.i == G.rec || kilitli || satilik ? " sik" : ""}">${G.mg && tur ? `<span class="bdg tur" style="--c:${tur[4]}">${ikon(tur[3])}${tur[1]}</span>` : ""}<span class="bdg">${c.ic} ${c.st}</span>${G.i == G.rec ? '<span class="bdg rec">Önerilen</span>' : ""}${kilitli ? `<span class="bdg kilit" title="${kilitYazi}">🔒 Seviye ${fiyat.seviye} · <span class="fy">${ikon("para")}${sayi(fiyat.para)}</span></span>` : ""}${satilik ? `<span class="bdg fiyat">${ikon("para")}<b>${sayi(fiyat.para)}</b></span>` : ""}<button class="gses" id="gses"></button></div>
<div class="gkart">${kartlar
    .map(
      ([ic, n, d, b, f]) =>
        `<div class="gk"><span class="gkb"><i>${ic}</i>${n}</span><b>${d}<small>${b}</small></b><u><s style="width:${Math.round(cl(f, 0.05, 1) * 100)}%"></s></u></div>`,
    )
    .join("")}</div>
<div class="gcip"><span>⚙️ ${c.hp} hp</span><span>⚖️ ${c.kg} kg</span><span>🔩 ${c.awd ? "Dört çeker" : "Arkadan itiş"}</span></div>
<div class="gbt"><button class="btn alt" id="gbk">Geri</button>${dugme ? `<button class="btn${satilik ? " al" : ""}" id="gok"${kilitli || (satilik && eksik > 0) ? " disabled" : ""}>${okYazi}</button>` : ""}</div>`;
  const v = $("#gvit");
  v.classList.remove("hidden");
  v.innerHTML = `<button class="gvar" id="gvpv">◀</button><button class="gvar sag" id="gvnx">▶</button>${dugme ? `<button class="btn${satilik ? " al" : ""}" id="gvok"${kilitli || (satilik && eksik > 0) ? " disabled" : ""}>${okYazi}</button>` : ""}<button class="btn alt" id="gvbk">Geri</button><button class="gvtam" id="gvtam">⛶</button>`;
  if (dugme) $("#gvok").onclick = () => $("#gok").click();
  // tam ekranda Geri: tam ekrandan çıkıp bilgi paneline döner
  $("#gvbk").onclick = () => {
    kamera.gTam = false;
    kamera.gBtn = false;
    gorunum();
  };
  $("#gvpv").onclick = () => go(-1);
  $("#gvnx").onclick = () => go(+1);
  $("#gvtam").onclick = () => {
    kamera.gTam = !kamera.gTam;
    kamera.gBtn = false;
    gorunum();
  };
  gorunum();
  const go = (yon: number) => {
    const n = L.length,
      k = L.indexOf(G.i);
    G.i = L[k < 0 ? 0 : (k + yon + n) % n];
    G.alinan = null;
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
  $("#gpv").onclick = () => go(-1);
  $("#gnx").onclick = () => go(+1);
  $("#gbk").onclick = geriDon;
  if (magazadaVar) {
    // yarış öncesi ipucu: panel sığsın diye vitrinin altında (mağaza kutlama çubuğuyla aynı yerde)
    const ip = document.createElement("div");
    ip.id = "gmal";
    ip.innerHTML = `<button class="btn al" id="gmg">${ikon("para")}Mağazada daha uygun araç</button>`;
    document.body.appendChild(ip);
    if (kamera.gTam) ip.style.display = "none";
    $("#gmg").onclick = () => {
      const { ev, w } = G;
      setCar(G.prev);
      closeGarage();
      magazaAc(() => openGarage(ev, w));
    };
  }
  if (G.alinan != null) {
    // satın alma sonrası: kutlamanın altında "Garaja git"
    const al = document.createElement("div");
    al.id = "gmal";
    al.innerHTML = `<span>${CARS[G.alinan].n} garajında</span><button class="btn al" id="gga">Garaja git</button>`;
    document.body.appendChild(al);
    $("#gga").onclick = garajaGit;
    if (kamera.gTam) al.style.display = "none";
  }
  if (dugme)
    $("#gok").onclick = () => {
      const { ev, w, i, prev } = G;
      if (!aracAcikMi(i)) {
        // satın alma: ilk dokunuş onay ister (3 sn), ikincisi satın alır
        if (aracSatinAlinabilirMi(i).ok) {
          if (!(ONAY && ONAY.arac == i && ONAY.zaman > performance.now())) {
            ONAY = { arac: i, zaman: performance.now() + 3000 };
            clearTimeout(ONAY_ZAMANLA);
            ONAY_ZAMANLA = setTimeout(() => {
              ONAY = null;
              if (GAR && GAR.i == i) showGar();
            }, 3050);
            showGar();
            return;
          }
          ONAY = null;
          clearTimeout(ONAY_ZAMANLA);
          if (aracSatinAl(i)) {
            if (G.mg) {
              // araç mağazadan düşer: yakın komşuya geçilir, "Garaja git" önerilir
              const k = L.indexOf(i),
                yeni = L.filter((x) => x != i);
              G.alinan = i;
              G.i = yeni.length ? yeni[Math.min(k, yeni.length - 1)] : i;
            }
            showGar();
            kutla(CARS[i].n);
          }
          return;
        }
        note("Kilitli: seviye " + acilmaSeviyesi({ arac: i }), 40);
        return;
      }
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
