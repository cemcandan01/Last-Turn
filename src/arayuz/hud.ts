// HUD: hız ve vites, yarış/tur bilgisi (sol üst), drift ve kombo göstergesi (üst orta), uyarılar.
// Her gösterge ayrı seçilir (#app[data-hiz|sayac|tus|harita]; düzenleyici hud-duzenleyici.ts); yerleşim
// stil.css'te. Kurallar: docs/HUD.md.
// Yazılar yalnız değişince DOM'a metinlır.
import { PIST_DISI_BEKLEME, PIST_DISI_SAYIM } from "../oyun/piste-donus";
import { fmt } from "../cekirdek/bicim";
import { cl } from "../cekirdek/matematik";
import { $, yazi } from "../cekirdek/dom";
import { WXS, COND } from "../cizim/ortam";
import { dunya } from "../dunya/dunya";
import { ipucu } from "../dunya/pist";
import { VMAX } from "../fizik/veriler";
import { CT, gorunum } from "../oyun/ayarlar";
import { oyun } from "../oyun/durum";
import { I, tilt } from "../oyun/girdi";
import { ikon } from "./ikonlar";
import { LAP, sim } from "../oyun/surus";
import { yaris } from "../oyun/yarislar";
import { mutantBaslik, mutantPaneli, mutantTusuGuncelle } from "./mutant-ui";
import { mutantHudGuncelle } from "./mutant-hud";

/** sahte vitesli devir göstergesi: hızdan vites ve devir (x1000) */
const GEARS = [0, 60, 100, 145, 190, 240, 400];
export const motor = { RPM: 1, GEAR: 1 };

export function engine(kmh: number, dt: number) {
  let g = 1;
  while (g < GEARS.length - 1 && kmh > GEARS[g]) g++;
  const lo = GEARS[g - 1],
    hi = GEARS[g],
    tg = kmh < 3 ? 0.9 + 1.4 * sim.S.gas : 1.6 + 5.8 * cl((kmh - lo) / (hi - lo), 0, 1);
  motor.GEAR = kmh < 1 && I.b && !I.g ? 0 : g;
  motor.RPM += (tg - motor.RPM) * Math.min(1, dt * (tg < motor.RPM ? 3.2 : 9));
}

let E: Record<string, HTMLElement>;
let kadranF = -1;
const durum = { dr: "", ters: false, gsy: 0 };
/** drift bonus bildirimleri: okunan olay sayısı, hangi yarışa ait olduğu, son nabız puanı */
const bonus = { ev: null as unknown, n: 0, nabiz: 0, carpan: 0 };
/** pist dalının drift çarpanı alanları (yoksa hiçbiri gösterilmez) */
type X6Alan = { driftOran?: number; driftCarpan?: number; x6?: boolean };
const BONUS_SATIR = 2;
let x6Zt = 0;

export function hudKur() {
  E = {};
  for (const k of [
    "spd",
    "gear",
    "hName",
    "sf",
    "dr",
    "ters",
    "bon",
    "gsy",
    "drA",
    "drP",
    "drX",
    "drB",
    "drO",
    "drOt",
    "x6a",
    "x6f",
    "lap",
    "ev",
    "kdV",
  ])
    E[k] = $("#" + k);
  E.hSP = $(".hSP");
  hudDuzeniUygula();
}

/** seçili göstergeleri uygula (ayar değişince de çağrılır): #app[data-hiz|sayac|tus|harita] */
export function hudDuzeniUygula() {
  Object.assign($("#app").dataset, gorunum);
  kadranF = -1;
}

/** kadran yayı: hız ölçeğe oranla (0-1) */
function kadranYay(f: number) {
  const y = Math.round(cl(f, 0, 1) * 200) / 2;
  if (y == kadranF) return;
  kadranF = y;
  E.kdV.style.strokeDasharray = y + " 100";
  // sıfırda yuvarlak uç nokta gibi görünmesin
  E.kdV.style.visibility = y > 0 ? "" : "hidden";
}

/** süre satırının başındaki kronometre ikonu (yaziHtml HTML olarak yazar) */
const KRONO = ikon("kronometre");

/** yazi gibi, ama HTML (ikonlu satırlar için); yalnız değişince yazar */
function yaziHtml(e: HTMLElement, h: string) {
  if (e.dataset.h !== h) {
    e.dataset.h = h;
    e.innerHTML = h;
  }
}

/** sol üst panel: büyük satır ve alt satır */
function olayPaneli(): [string, string] {
  const EV = yaris.EV,
    TR = dunya.TR;
  if (EV) {
    if (EV.ty == "dp")
      return [
        EV.score + " puan",
        "Tur " + Math.min(EV.lap + 1, EV.laps || 1) + "/" + EV.laps + " · Hedef " + EV.limit,
      ];
    const asim = EV.t > EV.limit ? " · SÜRE AŞILDI" : "";
    if (EV.ty == "dg")
      return [
        KRONO + EV.t.toFixed(2),
        "Hedef " + EV.limit.toFixed(1) + " sn · %" + Math.round((100 * ipucu.ti) / (EV.TR.N - 1)) + asim,
      ];
    return [
      KRONO + fmt(EV.t),
      (EV.laps
        ? "Tur " + Math.min(EV.lap + 1, EV.laps) + "/" + EV.laps
        : "%" + Math.round((100 * ipucu.ti) / EV.TR.N)) +
        " · Hedef " +
        fmt(EV.limit) +
        asim,
    ];
  }
  const mp = mutantPaneli();
  if (mp) return mp;
  if (TR && !TR.open)
    return LAP.run
      ? [KRONO + fmt(LAP.t), "Son " + fmt(LAP.last) + " · En iyi " + fmt(LAP.best)]
      : ["", "Çizgiden geç, tur başlasın"];
  return ["", ""];
}

/** üst orta: drift yarışında kombo (puan, çarpan, sonraki çarpana kalan); patinaj ve havada durumu.
 *  Patinaj/havada yalnız serbest sürüşte (yarışta EV var). Drift açısı gösterilmez (kullanıcı kararı); ileride driftte kazanılan anlık XP buraya gelir. */
function driftGostergesi() {
  const S = sim.S,
    D = sim.d.D,
    EV = yaris.EV;
  let k = "";
  if (EV && EV.ty == "dp" && EV.combo > 0) {
    k = "kombo";
    // biriken bonus kombo bankaya geçince toplam puana eklenir; o ana dek burada görünür
    yazi(E.drA, (D.t > 0 ? "DRIFT" : "KOMBO") + (EV.bonus > 0 ? " +" + EV.bonus + " BONUS" : ""));
    yazi(E.drP, String(Math.round(EV.combo)));
    const car = (EV as X6Alan).driftCarpan ?? EV.mult;
    yazi(E.drX, "x" + car);
    if (car != bonus.carpan) {
      if (bonus.carpan) {
        E.drX.classList.remove("nb");
        void E.drX.offsetWidth;
        E.drX.classList.add("nb");
      }
      bonus.carpan = car;
    }
    E.drB.style.width = (EV.mult >= 5 ? 100 : Math.round(((EV.ct % 2.5) / 2.5) * 100)) + "%";
  } else if (!EV && (S.spin || S.air)) {
    k = "durum";
    yazi(E.drA, S.spin ? "PATİNAJ" : "HAVADA");
    yazi(E.drP, "");
    yazi(E.drX, "");
  }
  // x6: 1. turda drift oranı çubuğu, 2. turda rozet (kombo yoksa panel yalnız bunu gösterir)
  const oran = EV && EV.ty == "dp" ? oranGostergesi(EV as typeof EV & X6Alan) : false;
  if (oran) {
    if (!k) k = "oran";
    k += " oranli";
  }
  if (k != durum.dr) {
    durum.dr = k;
    E.dr.className = k || "hidden";
  }
  bonusAdimi();
  // ana sayı +30 puanda bir hafif nabız atar
  if (k == "kombo" && EV) {
    if (EV.combo < bonus.nabiz) bonus.nabiz = EV.combo;
    else if (EV.combo - bonus.nabiz >= 30) {
      bonus.nabiz = EV.combo;
      E.drP.classList.remove("nb");
      void E.drP.offsetWidth;
      E.drP.classList.add("nb");
    }
  }
  // pist dalı EV.ters'i ekler; yoksa (undefined) gösterilmez
  const ters = !!EV && (EV as { ters?: boolean }).ters === true;
  if (ters != durum.ters) {
    durum.ters = ters;
    E.ters.className = ters ? "" : "hidden";
  }
}

/** pist dışında ekran ortasında piste dönüşe kalan saniye (pist dalı EV.pistDisi; ilk saniye görünmez) */
function pisteDonusSayaci() {
  const EV = yaris.EV as { state?: string; pistDisi?: { sure: number } } | null;
  const sure = EV?.state == "run" ? (EV.pistDisi?.sure ?? 0) : 0;
  // ilk saniye sayım yok (kısa taşma), sonra 5…1
  const n = sure > PIST_DISI_BEKLEME ? Math.max(1, Math.ceil(PIST_DISI_BEKLEME + PIST_DISI_SAYIM - sure)) : 0;
  if (n == durum.gsy) return;
  durum.gsy = n;
  E.gsy.className = n ? "" : "hidden";
  if (n) {
    (E.gsy.firstElementChild as HTMLElement).textContent = String(n);
    E.gsy.classList.remove("pop");
    void E.gsy.offsetWidth;
    E.gsy.classList.add("pop");
  }
}

/** panelin altındaki x6 satırı: 1. turda %oran + %90 işareti (hazır/kaçtı), x6 kazanıldıysa rozet; gösterilecek bir şey yoksa false */
function oranGostergesi(EV: NonNullable<typeof yaris.EV> & X6Alan): boolean {
  let sinif = "hidden",
    metin = "";
  if (EV.x6) {
    sinif = "rozet";
    metin = "x6 ÇARPAN";
  } else if (typeof EV.driftOran == "number" && EV.lap == 0 && (EV.laps || 0) > 1) {
    const o = cl(EV.driftOran, 0, 1),
      kalan = 1 - cl(ipucu.ti / EV.TR.N, 0, 1);
    sinif = o >= 0.9 ? "hazir" : o + kalan < 0.9 ? "kacti" : "";
    metin = o >= 0.9 ? "x6 HAZIR" : sinif == "kacti" ? "x6 KAÇTI" : "%" + Math.round(o * 100);
    E.drO.style.setProperty("--oran", Math.round(o * 100) + "%");
  }
  if (E.drO.dataset.s != sinif) {
    E.drO.dataset.s = sinif;
    E.drO.className = sinif;
  }
  yazi(E.drOt, metin);
  return sinif != "hidden";
}

/** x6 kazanıldığında (EV.driftOlay'da "ÇARPAN x6"): büyük "x6", halka dalgası ve kenar parlaması; sonra rozete iner */
function x6Animasyon() {
  for (const e of [E.x6a, E.x6f]) {
    e.classList.remove("ac");
    void e.offsetWidth;
    e.classList.add("ac");
  }
  clearTimeout(x6Zt);
  x6Zt = window.setTimeout(() => {
    E.x6a.classList.remove("ac");
    E.x6f.classList.remove("ac");
  }, 1900);
}
/** bonusu tek satırda yan yana göster (yolu kapatmasın); aynı bonus görünürse puanı toplayıp yeniden "pop"lar, en fazla 2 (direksiyon tuşlarına taşmaz) */
export function bonusGoster(ad: string, puan: number) {
  const kap = E.bon;
  let sat = ([...kap.children] as HTMLElement[]).find(
    (s) => s.dataset.ad == ad && !s.classList.contains("son"),
  );
  if (sat) {
    const top = Number(sat.dataset.puan) + puan;
    sat.dataset.puan = String(top);
    (sat.lastElementChild as HTMLElement).textContent = "+" + top;
    sat.classList.remove("pop");
    void sat.offsetWidth;
    sat.classList.add("pop");
    clearTimeout(Number(sat.dataset.zt));
  } else {
    sat = document.createElement("div");
    sat.dataset.ad = ad;
    sat.dataset.puan = String(puan);
    sat.className = "pop";
    const a = document.createElement("span"),
      p = document.createElement("b");
    a.textContent = ad;
    p.textContent = "+" + puan;
    sat.append(a, p);
    kap.append(sat);
    while (kap.children.length > BONUS_SATIR) kap.firstElementChild!.remove();
  }
  const el = sat;
  el.dataset.zt = String(
    window.setTimeout(() => {
      el.classList.add("son");
      window.setTimeout(() => el.remove(), 450);
    }, 1500),
  );
}

/** pist dalının EV.driftOlay dizisindeki yeni olayları göster (yoksa hiçbir şey) */
function bonusAdimi() {
  const EV = yaris.EV as { driftOlay?: { ad: string; puan: number }[] } | null;
  if (bonus.ev !== EV) {
    bonus.ev = EV;
    bonus.n = 0;
    bonus.nabiz = 0;
    bonus.carpan = 0;
    E.bon.textContent = "";
    E.x6a.classList.remove("ac");
    E.x6f.classList.remove("ac");
  }
  const dz = EV?.driftOlay;
  if (!dz) return;
  if (dz.length < bonus.n) bonus.n = 0;
  for (; bonus.n < dz.length; bonus.n++) {
    // x6 olayı bonus satırı değil, kendi animasyonunu tetikler
    if (/^ÇARPAN/.test(dz[bonus.n].ad)) x6Animasyon();
    else bonusGoster(dz[bonus.n].ad, dz[bonus.n].puan);
  }
}

/** HUD düzenleyicide örnek değerler (oyun döngüsü bu sırada HUD'a yazmaz) */
export function hudOrnekDoldur() {
  yazi(E.hName, "Drift Parkı");
  yazi(E.ev, "2844 puan");
  yaziHtml(E.lap, KRONO + "48.2 sn kaldı");
  yazi(E.spd, "96");
  yazi(E.gear, "3");
  yazi(E.sf, "");
  E.hSP.style.display = "";
  kadranF = -1;
  kadranYay(96 / (VMAX * 3.6));
  yazi(E.drA, "DRIFT");
  yazi(E.drP, "1240");
  yazi(E.drX, "x3");
  E.drB.style.width = "45%";
  durum.dr = "kombo";
  E.dr.className = "kombo";
}

export function hudGuncelle(v: number) {
  const S = sim.S,
    EV = yaris.EV,
    kmh = v * 3.6;
  yazi(E.spd, String(Math.round(kmh)));
  const gizli = oyun.camMode == 3 ? "none" : "";
  if (E.hSP.style.display != gizli) E.hSP.style.display = gizli;
  yazi(E.gear, motor.GEAR < 0 ? "R" : String(motor.GEAR || "N"));
  if (gorunum.hiz == "kadran") kadranYay(kmh / (VMAX * 3.6));
  yazi(E.hName, mutantBaslik(EV ? EV.n : null) ?? (EV ? EV.n : oyun.CURW.n));
  const [ana, alt] = olayPaneli();
  yaziHtml(E.ev, ana);
  yazi(E.lap, alt);
  // yalnız sürüşü etkileyen uyarılar (araç, zemin ve lastik zaten görünür)
  yazi(
    E.sf,
    [
      S.mud > 0.05 ? "Çamur %" + Math.round(S.mud * 100) : "",
      S.wet > 0.05 ? "Islak" : "",
      COND.wx != "sun" ? WXS[COND.wx] : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );
  driftGostergesi();
  pisteDonusSayaci();
  mutantTusuGuncelle();
  mutantHudGuncelle();
  if (CT.steer == "tilt") {
    const c = document.getElementById("cal");
    if (c) yazi(c, performance.now() - tilt.t < 1500 ? "Ortala" : "Sensör izni");
  }
}
