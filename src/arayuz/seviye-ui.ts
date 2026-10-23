// XP ve seviye görselleri: seviye rozeti + XP çubuğu (ana menü, profil, yarış sonu), kilit notu ve seviye atlama kutlaması.
// Mantık oyun/ilerleme.ts'te; burada yalnız gösterim.
import { CARS } from "../arac/araclar";
import { SEVIYELER, pistSev } from "../dunya/pist-tanimlari";
import {
  acilmaSeviyesi,
  aracFiyati,
  ilerlemeDinle,
  para,
  seviye,
  type AcilanOge,
  type SeviyeOlayi,
} from "../oyun/ilerleme";
import { ikon } from "./ikonlar";

const TUR_AD: Record<string, string> = {
  gp: "Asfalt",
  rx: "Rallycross",
  rl: "Ralli",
  dp: "Drift",
  dg: "Drag",
};

/** küçük seviye rozeti (yıldız biçimli altıgen yerine yuvarlak): ana menü profil alanı ve profil ekranı */
export const seviyeRozetiHtml = (lv: number, sinif = "") => `<span class="lvr ${sinif}"><i>${lv}</i></span>`;

/** XP çubuğu: oran 0-1; yazı "xp / sonraki" */
export const xpCubuguHtml = (sinif = "") => {
  const s = seviye();
  return `<span class="xpc ${sinif}"><span class="xpb"><i style="width:${Math.round(s.oran * 100)}%"></i></span><em>${s.xp} / ${s.sonrakiXp} XP</em></span>`;
};

/** bakiye: madeni para ikonu + sayı (ana menü, profil) */
export const bakiyeHtml = (sinif = "") => `<span class="bky ${sinif}">${ikon("para")}<b>${para()}</b></span>`;

/** açılan öğenin adı: "Asfalt · Usta pisti" ya da "Beyaz Kurt (araç)" */
export const ogeAdi = (o: AcilanOge) =>
  o.tur == "pist"
    ? `${TUR_AD[o.ty]} · ${SEVIYELER[pistSev(o.ty, o.lv) - 1].n} pisti`
    : `${CARS[o.no].n} (araç)`;

/** kilitli pist kartına dokununca kısa açıklama */
export function kilitNotu(ty: string, lv: number) {
  let n = document.getElementById("kilitnot");
  if (!n) {
    n = document.createElement("div");
    n.id = "kilitnot";
    document.body.appendChild(n);
  }
  n.innerHTML = `${ikon("kilit")} <b>${TUR_AD[ty]} · ${SEVIYELER[pistSev(ty as never, lv) - 1].n}</b> pisti Seviye ${acilmaSeviyesi({ ty: ty as never, lv })}'de açılır. Yarış kazandıkça XP toplayıp seviye atlarsın.`;
  n.classList.remove("goster");
  void n.offsetWidth;
  n.classList.add("goster");
  clearTimeout((n as unknown as { _t: number })._t);
  (n as unknown as { _t: number })._t = window.setTimeout(() => n!.classList.remove("goster"), 2600);
}

// --- seviye atlama kutlaması: yarış sonu ekranından sonra (yarış sırasında değil) ---
const bekleyen: SeviyeOlayi[] = [];

/** olayları dinler; kutlama yarış sonu ekranı ya da menü açılınca gösterilir */
export function seviyeKutlamaKur() {
  ilerlemeDinle((o) => bekleyen.push(o));
}

/** bekleyen seviye atlamaları tek katmanda göster (dokununca kapanır); olan varsa true */
export function kutlamaGoster() {
  if (!bekleyen.length) return false;
  const yeni = bekleyen[bekleyen.length - 1].yeni,
    acilan = bekleyen.flatMap((o) => o.acilanlar);
  bekleyen.length = 0;
  let k = document.getElementById("lvup");
  if (!k) {
    k = document.createElement("div");
    k.id = "lvup";
    document.body.appendChild(k);
  }
  k.innerHTML = `<div class="lvk"><small>SEVİYE ATLADIN</small><h2>Seviye ${yeni}!</h2>${
    acilan.length
      ? `<div class="lva"><small>${acilan.some((o) => o.tur == "pist" || aracFiyati(o.no).para <= 0) ? "Açıldı" : "Yeni"}</small>${acilan.map((o) => `<span>${ikon(o.tur == "arac" ? "araba" : "yaris")}${ogeAdi(o)}${o.tur == "arac" && aracFiyati(o.no).para > 0 ? `<em class="fy">Satın alınabilir · ${ikon("para")}${aracFiyati(o.no).para}</em>` : ""}</span>`).join("")}</div>`
      : ""
  }<p>Devam etmek için dokun</p></div>`;
  k.classList.add("acik");
  k.onclick = () => k!.classList.remove("acik");
  return true;
}

/** yarış sonu XP bloğu: çubuk eski orandan yeniye dolar (seviye atlandıysa dolup sıfırlanıp devam eder) */
export function xpSonucHtml(kazanilan: number, eskiLv: number, eskiOran: number) {
  const s = seviye();
  return `<div class="xps" data-eski="${eskiLv}" data-eskioran="${eskiOran}"><div class="xpt"><span>${seviyeRozetiHtml(eskiLv, "k")}<b>XP <u>+${kazanilan}</u></b></span><em>Seviye <span class="xpl">${eskiLv}</span></em></div><span class="xpb"><i style="width:${Math.round(eskiOran * 100)}%"></i></span><small class="xpy">${s.xp} / ${s.sonrakiXp} XP</small></div>`;
}

/** xpSonucHtml'nin çubuğunu canlandır */
export function xpSonucAnimasyonu(kok: HTMLElement) {
  const blok = kok.querySelector<HTMLElement>(".xps");
  if (!blok) return;
  const cubuk = blok.querySelector<HTMLElement>(".xpb i")!,
    eskiLv = +blok.dataset.eski!,
    s = seviye(),
    lvYaz = blok.querySelector<HTMLElement>(".xpl")!,
    rozet = blok.querySelector<HTMLElement>(".lvr i")!,
    git = (w: number, ms: number) => {
      cubuk.style.transition = `width ${ms}ms cubic-bezier(.2,.7,.2,1)`;
      cubuk.style.width = Math.round(w * 100) + "%";
    };
  if (s.lv > eskiLv) {
    setTimeout(() => git(1, 700), 250);
    setTimeout(() => {
      cubuk.style.transition = "none";
      cubuk.style.width = "0%";
      lvYaz.textContent = rozet.textContent = String(s.lv);
      blok.classList.add("atladi");
      setTimeout(() => git(s.oran, 800), 60);
    }, 1000);
  } else setTimeout(() => git(s.oran, 800), 250);
}

/** yarış sonu para bloğu: kazanım sayarak artar, bakiye yanında */
export function paraSonucHtml(kazanilan: number) {
  return `<div class="prs" data-kazanc="${kazanilan}" data-bakiye="${para()}"><span class="prt">${ikon("para")}<b>Para <u>+<span class="prk">0</span></u></b></span><em>Bakiye <span class="prb">${para() - kazanilan}</span></em></div>`;
}

/** paraSonucHtml sayaçlarını 0'dan kazanıma doğru say (XP çubuğuyla birlikte başlar) */
export function paraSonucAnimasyonu(kok: HTMLElement) {
  const blok = kok.querySelector<HTMLElement>(".prs");
  if (!blok) return;
  const kaz = +blok.dataset.kazanc!,
    son = +blok.dataset.bakiye!,
    k = blok.querySelector<HTMLElement>(".prk")!,
    b = blok.querySelector<HTMLElement>(".prb")!,
    t0 = performance.now() + 250,
    sure = 900;
  const adim = (t: number) => {
    if (!blok.isConnected) return;
    const o = Math.min(1, Math.max(0, (t - t0) / sure)),
      e = 1 - Math.pow(1 - o, 3);
    k.textContent = String(Math.round(kaz * e));
    b.textContent = String(son - kaz + Math.round(kaz * e));
    if (o < 1) requestAnimationFrame(adim);
  };
  requestAnimationFrame(adim);
}
