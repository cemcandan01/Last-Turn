// Ana menü: altta soldan sağa eğik yarış panelleri, her birinde ikon ve başlık (Yarış, Serbest sürüş, Garaj,
// Profil, Ayarlar); Yarış öne çıkan turuncu ana düğme. Arkada menü videosu ya da canlı sinematik çekimler.
// Yarış türü → pist listesi (şekil, uzunluk, ortalama süre, rekor) → günün saati ve hava → garajda araç seçimi.
import { CARS } from "../arac/araclar";
import { fmt, fmt3 } from "../cekirdek/bicim";
import { gizle, goster, $ } from "../cekirdek/dom";
import { toApp } from "../cekirdek/ekran";
import { COND, condOf, TODS, WXS, type GununSaati, type Hava } from "../cizim/ortam";
import { REG, type Bolge } from "../dunya/bolgeler";
import { SEVIYELER } from "../dunya/pist-tanimlari";
import { bbox } from "../dunya/pist";
import { WORLDS } from "../dunya/dunya";
import { setActive } from "../oyun/bolge";
import { oyun } from "../oyun/durum";
import { PROF, best, saveProf } from "../oyun/profil";
import { demoStart, demoStop } from "../oyun/sinematik";
import { reset } from "../oyun/surus";
import { EVENTS, leaveEvent, TYP, type YarisTanimi } from "../oyun/yarislar";
import { gorselOynuyor } from "./arka-gorsel";
import { enIyiYildiz, yildizEsikleri } from "../oyun/yildiz";
import { ikon, yildizSerit, type IkonAdi } from "./ikonlar";
import { acilmaSeviyesi, pistAcikMi, yarisSonuPara } from "../oyun/ilerleme";
import { kilitNotu, bakiyeHtml, kutlamaGoster, seviyeRozetiHtml, xpCubuguHtml } from "./seviye-ui";
import { seviye } from "../oyun/ilerleme";
import { bindSettings, chipsOf, settingsHTML } from "./ayarlar-ekrani";
import { openGarage } from "./garaj";
import { hesapBagla, hesapHtml } from "./hesap-ui";
import { kontrolleriKur } from "./kontroller";

/** yarış türleri: anahtar, ad, açıklama, ikon, türün rengi (kapak akışı, pist listesi ve ayrıntıda tema) */
const TYPES: [string, string, string, IkonAdi, string][] = [
  ["gp", "Asfalt", "Pist yarışları, fren tabelaları, kerbler", "pist", "#ff5a3c"],
  ["rx", "Rallycross", "Asfalt ve toprak karışık pist: çamur, su, rampa", "rallycross", "#d08a48"],
  ["rl", "Ralli", "A’dan B’ye dağ, orman, kar ve çöl etapları", "dag", "#4fbf74"],
  ["dp", "Drift", "Turlar bitmeden hedef drift puanı", "donus", "#b67cff"],
  ["dg", "Drag", "Düz çizgide milisaniyeler", "isik", "#ffd23c"],
];
const turOf = (t: string) => TYPES.find((q) => q[0] == t)!;
/** kapak akışında ortadaki tür (geri dönünce aynı tür seçili kalır) */
let TUR_I = 0;
/** ana menü panelleri: anahtar, ikon, başlık */
const NAV: [string, IkonAdi, string][] = [
  ["race", "yaris", "Yarış"],
  ["free", "harita", "Serbest sürüş"],
  ["garage", "araba", "Garaj"],
  ["profile", "kask", "Profil"],
  ["settings", "disli", "Ayarlar"],
];

/** görünüm yığını: ["race", "t:gp", "e:0"] gibi */
let MV = ["home"];

const evLen = (e: YarisTanimi) =>
  ((REG[e.reg].TR!.len * (e.laps || 1)) / 1000).toFixed(2) + " km" + (e.laps ? " · " + e.laps + " tur" : "");
const evAvg = (e: YarisTanimi) =>
  e.ty == "dp" ? e.limit + " puan" : e.ty == "dg" ? fmt3(e.limit) : fmt(e.limit);
/** seviye rozeti: renk seviyeye göre (Çaylak yeşil … Efsane mor) */
const seviyeRozeti = (e: YarisTanimi) =>
  `<span class="lv lv${e.sev}"><i>${e.sev}</i>${SEVIYELER[e.sev - 1].n}</span>`;
/** ayrıntı ekranındaki sayılar; drift yarışında hedef puan. Kartta yalnız hedef ve rekor (uzunluk kartın altında) */
const evSayilar = (e: YarisTanimi, kart = false) =>
  `<div class="rcs">${kart ? "" : `<span>Uzunluk<b>${evLen(e)}</b></span>`}${
    e.ty == "dp"
      ? `<span>Hedef<b>${e.limit} puan</b></span>${kart ? "" : `<span>Tur<b>${e.laps}</b></span>`}`
      : `<span>${e.ty == "dg" ? "Hedef" : "Hedef süre"}<b>${evAvg(e)}</b></span>`
  }<span>PR<b>${prOf(e)}</b></span></div>`;
/** pist ayrıntısında para ödülü: ilk kez (1★-3★) ve tekrar */
const paraOdulu = (e: YarisTanimi) =>
  `<div class="pod">${ikon("para")}<span>İlk kez <b>${yarisSonuPara(e.ty, e.sev, 1, 0)}–${yarisSonuPara(e.ty, e.sev, 3, 0)}</b></span><span>Tekrar <b>~${yarisSonuPara(e.ty, e.sev, 0, 0)}</b></span></div>`;
/** yarış ayrıntısında 1★/2★/3★ eşikleri (alınanlar dolu) */
const yildizEsikSatiri = (e: YarisTanimi) => {
  const es = yildizEsikleri(e.ty, e.lv),
    al = enIyiYildiz(e.ty, e.lv);
  if (!es.length) return "";
  return `<div class="yes">${es
    .map(
      (v, i) =>
        `<span class="${i < al ? "dolu" : ""}">${yildizSerit(i + 1, "mini")}<b>${e.ty == "dp" ? v + " puan" : e.ty == "dg" ? fmt3(v) : fmt(v)}</b></span>`,
    )
    .join("")}</div>`;
};
const prOf = (e: YarisTanimi) => {
  const b = best(e.k);
  return b ? (e.ty == "dp" ? b + " puan" : e.ty == "dg" ? fmt3(+b) : fmt(+b)) : "—";
};
const condChips = () =>
  '<div class="lbl">Günün saati</div>' +
  chipsOf(Object.fromEntries(Object.entries(TODS).map(([k, n]) => [k, { n: n!, d: "" }])), COND.tod, "tod") +
  '<div class="lbl">Hava</div>' +
  chipsOf(
    Object.fromEntries(
      Object.entries(WXS).map(([k, n]) => [k, { n, d: k == "sun" ? "" : "Zemin daha kaygan" }]),
    ),
    COND.wx,
    "wx",
  );

/** pist küçük resmi (bir kez çizilir) */
function trackThumb(r: Bolge) {
  if (r._th) return r._th;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const x = c.getContext("2d")!,
    TR = r.TR!,
    b = bbox(TR, 0),
    s = 136 / Math.max(b[1] - b[0], b[3] - b[2]),
    ox = 80 - ((b[0] + b[1]) / 2) * s,
    oz = 80 - ((b[2] + b[3]) / 2) * s;
  x.lineJoin = x.lineCap = "round";
  for (const [w, col] of [
    [10, "#0a0f12"],
    [5, r.col],
  ] as [number, string][]) {
    x.strokeStyle = col;
    x.lineWidth = w;
    x.beginPath();
    TR.P.forEach((p, i) => {
      const X = p[0] * s + ox,
        Z = p[1] * s + oz;
      if (i) x.lineTo(X, Z);
      else x.moveTo(X, Z);
    });
    if (!TR.open) x.closePath();
    x.stroke();
  }
  const p0 = TR.P[0];
  x.fillStyle = "#ff7a3c";
  x.beginPath();
  x.arc(p0[0] * s + ox, p0[1] * s + oz, 6, 0, 7);
  x.fill();
  return (r._th = c.toDataURL());
}

export function showMenu(v?: string[]) {
  oyun.mode = "menu";
  leaveEvent();
  gizle("#hud", "#mm", "#ctl", "#set", "#res", "#gar");
  $("#big").textContent = "";
  if (v) MV = v;
  document.getElementById("kilitnot")?.classList.remove("goster");
  const cur = MV[MV.length - 1];
  // arka plan görseli akıyorsa canlı sinematik gerekmez (ayarlarda da görsel sürer)
  if (gorselOynuyor() || cur == "settings") demoStop();
  else demoStart();
  const m = $("#menu");
  m.classList.remove("hidden");
  m.classList.toggle("sub", cur != "home");
  m.classList.remove("tema");
  const logo = `<div class="logo">LAST<b>TURN</b></div>`;
  if (cur == "home")
    m.innerHTML = `<div class="mtop">${logo}<div class="mpro">${seviyeRozetiHtml(seviye().lv)}<div><b>${PROF.name}</b>${xpCubuguHtml("m")}${bakiyeHtml("m")}<small>Sürüm ${__APP_VERSION__}${import.meta.env.MODE == "gelistirme" ? " · deneme" : ""}</small></div></div></div>
<div class="mcards">${NAV.map(([k, g, n], i) => `<button class="mk" data-nav="${k}" style="--i:${i}"><span>${ikon(g)}<b>${n.replace(" ", "<br>")}</b></span></button>`).join("")}</div>`;
  else {
    const [bas, ust, ic] = view(cur),
      // pist listesi ve yarış ayrıntısı türün rengiyle (--c) ve ikonuyla
      ty = cur.startsWith("t:") ? cur.slice(2) : cur.startsWith("e:") ? EVENTS[+cur.slice(2)].ty : "",
      tr = ty ? turOf(ty) : null;
    m.classList.toggle("tema", !!tr);
    if (tr) {
      m.style.setProperty("--c", tr[4]);
      TUR_I = TYPES.indexOf(tr);
    }
    m.innerHTML = `<div class="mbar"><button class="mbk" id="mbk" aria-label="Geri"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>${tr ? `<span class="mti">${ikon(tr[3])}</span>` : ""}<div class="mbt">${ust ? `<small>${ust}</small>` : ""}<h2>${bas}</h2></div>${logo}</div><div class="mbody v-${cur.split(":")[0]}">${ic}</div>`;
  }
  const tikla = (sel: string, f: (e: HTMLElement) => void) =>
    m.querySelectorAll<HTMLElement>(sel).forEach((e) => (e.onclick = () => f(e)));
  tikla(".mk", (e) => {
    const k = e.dataset.nav!;
    if (k == "garage") {
      demoStop();
      openGarage(null);
      return;
    }
    showMenu([k]);
  });
  const bk = m.querySelector<HTMLElement>("#mbk");
  if (bk)
    bk.onclick = () => {
      MV.pop();
      showMenu(MV.length ? MV : ["home"]);
    };
  tikla("[data-ty]", (e) => showMenu([...MV, "t:" + e.dataset.ty]));
  if (cur == "race") kapakAkisi(m);
  tikla("[data-ev]", (e) => {
    const ev = EVENTS[+e.dataset.ev!];
    if (!pistAcikMi(ev.ty, ev.lv)) return kilitNotu(ev.ty, ev.lv);
    Object.assign(COND, condOf(REG[EVENTS[+e.dataset.ev!].reg].th));
    showMenu([...MV, "e:" + e.dataset.ev]);
  });
  tikla(".chip[data-tod]", (e) => {
    COND.tod = e.dataset.tod as GununSaati;
    showMenu();
  });
  tikla(".chip[data-wx]", (e) => {
    COND.wx = e.dataset.wx as Hava;
    showMenu();
  });
  const go = m.querySelector<HTMLElement>("#mgo");
  if (go)
    go.onclick = () => {
      const ev = +go.dataset.go!,
        c = { ...COND };
      demoStop();
      Object.assign(COND, c);
      openGarage(ev);
    };
  // serbest sürüş: önce garajda araç seçilir
  tikla("[data-w]", (e) => {
    const c = { ...COND };
    demoStop();
    Object.assign(COND, c);
    openGarage(null, +e.dataset.w!);
  });
  const nm = m.querySelector<HTMLInputElement>("#pname");
  if (nm)
    nm.onchange = () => {
      PROF.name = nm.value.trim().slice(0, 20) || "Sürücü";
      saveProf();
      showMenu();
    };
  if (cur == "profile") hesapBagla(m, () => showMenu());
  if (cur == "settings") bindSettings(m.querySelector<HTMLElement>(".mbody")!, () => showMenu());
  kutlamaGoster();
}

/**
 * yarış türü kapak akışı: ortada seçili tür büyük, yanlarda eğilip uzaklaşan kartlar. Kartlar parmağı izler; bırakınca
 * fırlatma hızına göre bir ya da birkaç tür ilerleyip ortaya yumuşakça oturur. Oklar ve yandaki karta dokunmak da
 * döndürür; ortadaki karta dokununca o türün pistleri açılır.
 */
function kapakAkisi(m: HTMLElement) {
  const kartlar = [...m.querySelectorAll<HTMLElement>(".tk")],
    nok = [...m.querySelectorAll<HTMLElement>(".kfn i")],
    kf = m.querySelector<HTMLElement>(".kf")!,
    n = kartlar.length,
    ARA = 200; // parmak bu kadar (px) gidince bir tür döner (ortadan komşu kartın yerine uzaklık)
  let konum = TUR_I;
  /** kartları kesirli konuma göre diz; sure > 0 ise o sürede yumuşakça geç */
  const yerles = (k: number, sure = 0) => {
    kartlar.forEach((e, i) => {
      const o = i - k,
        a = Math.abs(o);
      e.style.transition = sure ? `transform ${sure}s cubic-bezier(.22,1,.36,1), opacity ${sure}s` : "none";
      // her kart kendi perspektifiyle eğilir (ortak 3B uzay yok): kartlar birbirinin içinden geçmez. Üstte olma sırası
      // ortaya uzaklıkla sürekli değişir; yan kartlar ortadakinin arkasında, küçülerek dizilir
      const sx = Math.sign(o) * (a < 1 ? a * 200 : 200 + (a - 1) * 110);
      e.style.transform = `translateX(${sx}px) perspective(900px) rotateY(${-Math.max(-1, Math.min(1, o)) * 38}deg) scale(${1 - Math.min(a, 2) * 0.16})`;
      e.style.opacity = String(a > 2.6 ? 0 : 1 - a * 0.3);
      e.style.zIndex = String(Math.round(100 - a * 30));
      e.style.pointerEvents = a > 2.5 ? "none" : "";
      e.classList.toggle("on", a < 0.5);
    });
    const s = Math.round(k);
    nok.forEach((e, i) => e.classList.toggle("on", i == s));
  };
  /** ortaya oturma: süre gidilen yolla uzar, ortaya gelen kart kısa bir nabız atar */
  const otur = (hedef: number) => {
    hedef = Math.max(0, Math.min(n - 1, hedef));
    const yol = Math.abs(hedef - konum);
    if (hedef != TUR_I) {
      const k = kartlar[hedef];
      k.classList.remove("geldi");
      void k.offsetWidth;
      k.classList.add("geldi");
    }
    TUR_I = hedef;
    konum = hedef;
    yerles(hedef, Math.min(0.8, 0.38 + yol * 0.14));
  };
  // parmakla sürükleme: kartlar parmağı izler; kenarlarda lastik gibi direnir
  let x0: number | null = null,
    k0 = 0,
    izler: [number, number][] = [],
    kaydi = -1e9;
  const bas = (x: number) => {
    x0 = x;
    k0 = konum;
    izler = [[x, performance.now()]];
  };
  const kay = (x: number) => {
    if (x0 == null) return;
    let k = k0 - (x - x0) / ARA;
    if (k < 0) k *= 0.35;
    if (k > n - 1) k = n - 1 + (k - n + 1) * 0.35;
    konum = k;
    izler.push([x, performance.now()]);
    if (izler.length > 6) izler.shift();
    if (Math.abs(x - x0) > 8) kaydi = performance.now();
    yerles(k);
  };
  const birak = (x: number) => {
    if (x0 == null) return;
    kay(x);
    x0 = null;
    // fırlatma hızı (kart/sn): son birkaç hareketten
    const [ax, at] = izler[0],
      dt = Math.max(16, performance.now() - at),
      hiz = -((x - ax) / ARA) / (dt / 1000);
    otur(Math.round(konum + Math.max(-2.5, Math.min(2.5, hiz * 0.22))));
  };
  const nx = (t: Touch) => toApp(t.clientX, t.clientY)[0];
  kf.addEventListener("touchstart", (e) => bas(nx(e.touches[0])), { passive: true });
  kf.addEventListener("touchmove", (e) => kay(nx(e.touches[0])), { passive: true });
  kf.addEventListener("touchend", (e) => birak(nx(e.changedTouches[0])));
  kf.addEventListener("touchcancel", (e) => birak(nx(e.changedTouches[0])));
  kf.addEventListener("pointerdown", (e) => e.pointerType == "mouse" && bas(e.clientX));
  kf.addEventListener("pointermove", (e) => e.pointerType == "mouse" && kay(e.clientX));
  kf.addEventListener("pointerup", (e) => e.pointerType == "mouse" && birak(e.clientX));
  kartlar.forEach(
    (k, i) =>
      (k.onclick = () => {
        // sürüklemenin sonundaki tıklama sayılmaz
        if (performance.now() - kaydi < 400) return;
        if (i == TUR_I) showMenu([...MV, "t:" + TYPES[i][0]]);
        else otur(i);
      }),
  );
  m.querySelector<HTMLElement>("#kfs")!.onclick = () => otur(TUR_I - 1);
  m.querySelector<HTMLElement>("#kfg")!.onclick = () => otur(TUR_I + 1);
  yerles(konum);
}

/** alt ekran: [başlık, üst başlık, içerik] */
function view(cur: string): [string, string, string] {
  if (cur == "race") {
    return [
      "Yarış türü",
      "Yarış",
      `<div class="kf">${TYPES.map(([t, n, d, g, c], i) => {
        const tum = EVENTS.filter((e) => e.ty == t),
          cnt = tum.length,
          acik = tum.filter((e) => pistAcikMi(e.ty, e.lv)).length;
        return `<div class="tk" data-tk="${i}" style="--c:${c}">${ikon(g)}<b>${n}</b><small>${d}</small><em>${acik}/${cnt} pist açık · Çaylak → Efsane</em></div>`;
      }).join(
        "",
      )}</div><button class="kfo sol" id="kfs" aria-label="Önceki"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><button class="kfo sag" id="kfg" aria-label="Sonraki"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button><div class="kfn">${TYPES.map((q) => `<i style="--c:${q[4]}"></i>`).join("")}</div>`,
    ];
  }
  if (cur.startsWith("t:")) {
    const t = cur.slice(2) as keyof typeof TYP,
      y = TYP[t];
    // seviye sırasıyla (Çaylak → Efsane), yan yana; kartta kimin için ideal olduğu
    const pl = EVENTS.map((e, i) => [e, i] as const)
      .filter(([e]) => e.ty == t)
      .sort((a, b) => a[0].sev - b[0].sev || a[0].lv - b[0].lv);
    return [
      turOf(t)[1] + " yarışları",
      "Yarış",
      `<p>${y.d}</p><div class="rlist">${pl
        .map(
          ([e, i]) =>
            `<div class="rc${pistAcikMi(e.ty, e.lv) ? "" : " kilitli"}" data-ev="${i}"><div class="rcu"><img src="${trackThumb(REG[e.reg])}"><div class="rcm">${seviyeRozeti(e)}<em>${evLen(e)}</em>${pistAcikMi(e.ty, e.lv) ? yildizSerit(enIyiYildiz(e.ty, e.lv), "kucuk") : ""}</div>${pistAcikMi(e.ty, e.lv) ? "" : `<div class="kilit">${ikon("kilit")}<b>Seviye ${acilmaSeviyesi({ ty: e.ty, lv: e.lv })}'de açılır</b></div>`}</div><div class="rci"><b>${e.n}</b><small>${SEVIYELER[e.sev - 1].d}</small>${evSayilar(e, true)}</div></div>`,
        )
        .join("")}</div>`,
    ];
  }
  if (cur.startsWith("e:")) {
    const i = +cur.slice(2),
      e = EVENTS[i],
      r = REG[e.reg];
    return [
      e.n,
      turOf(e.ty)[1] + " yarışları",
      `<div><div class="evh"><img src="${trackThumb(r)}"><div>${seviyeRozeti(e)}<p class="lvd">${SEVIYELER[e.sev - 1].d}</p><p>${e.d}</p>
${evSayilar(e)}${yildizEsikSatiri(e)}${paraOdulu(e)}</div></div><button class="btn" id="mgo" data-go="${i}">Araç seç ›</button></div>
<div class="evk">${condChips()}</div>`,
    ];
  }
  if (cur == "free")
    return [
      "Serbest sürüş",
      "Dünya seç",
      `<div class="wl">${WORLDS.map((w, i) => `<div class="card go" data-w="${i}"><b>${w.n}</b><span>${w.d}</span></div>`).join("")}</div><div class="evk">${condChips()}<p class="note">Dünyayı seçince garajda aracını seçersin. Önayarı sürüşte duraklatma menüsünden değiştirebilirsin.</p></div>`,
    ];
  if (cur == "profile") {
    const fav = Object.entries(PROF.use).sort((a, b) => b[1] - a[1])[0];
    return [
      "Profil",
      "Sürücü",
      `<div class="pcol"><div class="pseviye">${seviyeRozetiHtml(seviye().lv, "b")}<div><b>Seviye ${seviye().lv}</b>${xpCubuguHtml("b")}<small>Toplam ${seviye().toplamXp} XP</small>${bakiyeHtml("b")}</div></div>${hesapHtml()}<div class="lbl">Sürücü adı</div><input id="pname" class="inp" value="${PROF.name.replace(/"/g, "")}" maxlength="20">
<div class="pst"><span>Yarış<b>${PROF.races}</b></span><span>Hedef geçildi<b>${PROF.wins}</b></span><span>Toplam yol<b>${PROF.km.toFixed(1)} km</b></span><span>En çok kullanılan<b>${fav ? CARS[+fav[0]].n : "—"}</b></span></div></div>
<div class="pcol"><div class="lbl">Kişisel rekorlar</div>${EVENTS.map((e) => `<div class="rk"><span>${e.n}</span><span>${prOf(e)}</span></div>`).join("")}</div>`,
    ];
  }
  if (cur == "settings") return ["Ayarlar", "", settingsHTML()];
  return ["", "", ""];
}

/** açık dünyada serbest sürüş */
export function startWorld(w: number) {
  leaveEvent();
  gizle("#menu", "#res", "#set");
  oyun.CURW = WORLDS[w || 0];
  setActive(oyun.CURW.reg);
  reset();
  oyun.mode = "drive";
  kontrolleriKur();
  goster("#hud", "#mm", "#ctl");
}
