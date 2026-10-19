// Ana menü (PES tarzı): solda Yarış, Serbest sürüş, Garaj, Profil, Ayarlar; arkada sinematik çekimler.
// Yarış türü → pist listesi (şekil, uzunluk, ortalama süre, rekor) → günün saati ve hava → garajda araç seçimi.
import { CARS } from "../arac/araclar";
import { fmt, fmt3 } from "../cekirdek/bicim";
import { gizle, goster, $ } from "../cekirdek/dom";
import { COND, condOf, TODS, WXS, type GununSaati, type Hava } from "../cizim/ortam";
import { REG, type Bolge } from "../dunya/bolgeler";
import { bbox } from "../dunya/pist";
import { WORLDS } from "../dunya/dunya";
import { setActive } from "../oyun/bolge";
import { oyun } from "../oyun/durum";
import { PROF, best, saveProf } from "../oyun/profil";
import { demoStart, demoStop } from "../oyun/sinematik";
import { reset } from "../oyun/surus";
import { EVENTS, leaveEvent, TYP, type YarisTanimi } from "../oyun/yarislar";
import { bindSettings, chipsOf, settingsHTML } from "./ayarlar-ekrani";
import { openGarage } from "./garaj";
import { kontrolleriKur } from "./kontroller";

const TYPES: [string, string, string][] = [
  ["gp", "Asfalt", "Pist yarışları, fren tabelaları, kerbler"],
  ["rx", "Toprak", "Rallikros: çamur, rampa, karışık zemin"],
  ["rl", "Ralli", "A’dan B’ye orman, kar ve çöl etapları"],
  ["dp", "Drift", "90 saniyede en yüksek drift puanı"],
  ["dg", "Drag", "Düz çizgide milisaniyeler"],
];
const NAV: [string, string, string, string][] = [
  ["race", "🏁", "Yarış", "Pist türünü seç, yarışını seç"],
  ["free", "🗺️", "Serbest sürüş", "Açık dünyada kuralsız sür"],
  ["garage", "🔧", "Garaj", "Araçları incele ve seç"],
  ["profile", "👤", "Profil", "İstatistikler ve rekorlar"],
  ["settings", "⚙️", "Ayarlar", "Kontroller, kamera, sürüş yardımı"],
];

/** görünüm yığını: ["race", "t:gp", "e:0"] gibi */
let MV = ["home"];

const evLen = (e: YarisTanimi) =>
  ((REG[e.reg].TR!.len * (e.laps || 1)) / 1000).toFixed(2) + " km" + (e.laps ? " · " + e.laps + " tur" : "");
const evAvg = (e: YarisTanimi) =>
  e.ty == "dp" ? e.time + " sn" : e.ty == "dg" ? fmt3(e.limit) : fmt(e.limit);
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
  const cur = MV[MV.length - 1],
    top = MV[0];
  if (cur == "settings") demoStop();
  else demoStart();
  const m = $("#menu");
  m.classList.remove("hidden");
  m.innerHTML = `<div class="mmL"><div class="logo">LAST<b>TURN</b></div>${NAV.map(([k, ic, n, d]) => `<div class="nv ${top == k ? "on" : ""}" data-nav="${k}"><i>${ic}</i><div><b>${n}</b><small>${d}</small></div></div>`).join("")}
<div class="ver">${PROF.name} · Sürüm ${__APP_VERSION__}${import.meta.env.MODE == "gelistirme" ? " · deneme" : ""}</div></div>${cur == "home" ? "" : `<div class="mmR">${view(cur)}</div>`}`;
  const tikla = (sel: string, f: (e: HTMLElement) => void) =>
    m.querySelectorAll<HTMLElement>(sel).forEach((e) => (e.onclick = () => f(e)));
  tikla(".nv", (e) => {
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
  tikla("[data-ev]", (e) => {
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
  tikla("[data-w]", (e) => {
    const c = { ...COND };
    demoStop();
    Object.assign(COND, c);
    startWorld(+e.dataset.w!);
  });
  const nm = m.querySelector<HTMLInputElement>("#pname");
  if (nm)
    nm.onchange = () => {
      PROF.name = nm.value.trim().slice(0, 20) || "Sürücü";
      saveProf();
      showMenu();
    };
  if (cur == "settings") bindSettings(m.querySelector<HTMLElement>(".mmR")!, () => showMenu());
}

function view(cur: string) {
  const back = MV.length > 1 ? '<button class="mbk" id="mbk">‹ Geri</button>' : "";
  if (cur == "race") {
    return `<h2>Yarış türü</h2><div class="tiles">${TYPES.map(([t, n, d]) => {
      const cnt = EVENTS.filter((e) => e.ty == t).length;
      return `<div class="tile" data-ty="${t}"><img src="img/tur_${t}.jpg" alt="${n}"><b>${n}</b><small>${d}</small><em>${cnt} yarış</em></div>`;
    }).join("")}</div>`;
  }
  if (cur.startsWith("t:")) {
    const t = cur.slice(2) as keyof typeof TYP,
      y = TYP[t];
    return `${back}<h2>${TYPES.find((q) => q[0] == t)![1]} yarışları</h2><p>${y.d}</p><div class="rlist">${EVENTS.map(
      (e, i) =>
        e.ty != t
          ? ""
          : `<div class="rc" data-ev="${i}"><img src="${trackThumb(REG[e.reg])}"><div class="rci"><b>${e.n}</b><small>${e.d}</small>
<div class="rcs"><span>Uzunluk<b>${evLen(e)}</b></span><span>${e.ty == "dp" ? "Süre" : "Ort. bitiş"}<b>${evAvg(e)}</b></span><span>PR<b>${prOf(e)}</b></span><span>WR<b>—</b></span></div></div></div>`,
    ).join("")}</div><p class="note">WR: çevrimiçi özellikler gelince dünya rekorları burada görünecek.</p>`;
  }
  if (cur.startsWith("e:")) {
    const i = +cur.slice(2),
      e = EVENTS[i],
      r = REG[e.reg];
    return `${back}<div class="evh"><img src="${trackThumb(r)}"><div><h2>${e.n}</h2><p>${e.d}</p>
<div class="rcs"><span>Uzunluk<b>${evLen(e)}</b></span><span>${e.ty == "dp" ? "Süre" : "Ort. bitiş"}<b>${evAvg(e)}</b></span><span>PR<b>${prOf(e)}</b></span><span>WR<b>—</b></span></div></div></div>
${condChips()}<button class="btn" id="mgo" data-go="${i}">Araç seç ›</button>`;
  }
  if (cur == "free")
    return `<h2>Serbest sürüş</h2>${WORLDS.map((w, i) => `<div class="card go" data-w="${i}"><b>${w.n}</b><span>${w.d}</span></div>`).join("")}${condChips()}<p class="note">Araç: ${oyun.CAR.ic} ${oyun.CAR.n} (Garajdan değiştirebilirsin)</p>`;
  if (cur == "profile") {
    const fav = Object.entries(PROF.use).sort((a, b) => b[1] - a[1])[0];
    return `<h2>Profil</h2><div class="lbl">Sürücü adı</div><input id="pname" class="inp" value="${PROF.name.replace(/"/g, "")}" maxlength="20">
<div class="pst"><span>Yarış<b>${PROF.races}</b></span><span>Hedef geçildi<b>${PROF.wins}</b></span><span>Toplam yol<b>${PROF.km.toFixed(1)} km</b></span><span>En çok kullanılan<b>${fav ? CARS[+fav[0]].n : "—"}</b></span></div>
<div class="lbl">Kişisel rekorlar</div>${EVENTS.map((e) => `<div class="rk"><span>${e.n}</span><span>${prOf(e)}</span></div>`).join("")}`;
  }
  if (cur == "settings") return `<h2>Ayarlar</h2>` + settingsHTML();
  return "";
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
