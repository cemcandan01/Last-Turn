// Menü arka plan videosu: sinematik çekimlerin önceden kaydedilmiş, dikişsiz dönen videosu (public/video/menu.mp4,
// scripts/menu-video.mjs üretir). Video oynarken menüde 3B sahne hiç çizilmez: telefonda videoyu donanım çözer, pil ve
// ısı kazancı büyüktür. Video oynayamazsa (tarayıcı desteklemez, iOS Düşük Güç Modu kendiliğinden oynatmayı engeller,
// dosya yok) menü eskisi gibi canlı sinematik çekimlerle çalışır.
import { $ } from "../cekirdek/dom";
import { oyun } from "../oyun/durum";
import { demoStart, demoStop } from "../oyun/sinematik";

export const arkaVideo = {
  /** video bu cihazda oynayabiliyor (ilk "playing" olayından sonra) */
  hazir: false,
  /** video kullanılmaz: canlı sinematik */
  kapali: false,
};
let v: HTMLVideoElement | null = null,
  menu: HTMLElement,
  gorunur = false,
  oynuyor = false;

const menudeMi = () => oyun.mode == "menu" && !menu.classList.contains("hidden");

/** video kullanılamıyor: canlı sinematiğe dön */
function vazgec() {
  arkaVideo.kapali = true;
  arkaVideo.hazir = oynuyor = false;
  if (v) {
    v.pause();
    v.classList.add("hidden");
  }
  if (menudeMi()) demoStart();
}

export function arkaVideoKur() {
  menu = $("#menu");
  const e = $<HTMLVideoElement>("#arka");
  // kayıt aracı (scripts/menu-video.mjs) canlı sahneyi kaydeder; H.264 oynatamayan tarayıcıda (ör. test Chromium'u) canlı
  if (location.search.includes("kayit") || !e.canPlayType('video/mp4; codecs="avc1.640028"')) {
    vazgec();
    return;
  }
  v = e;
  e.muted = true;
  e.loop = true;
  e.playsInline = true;
  e.setAttribute("playsinline", "");
  e.preload = "auto";
  e.src = "video/menu.mp4";
  e.addEventListener("playing", () => {
    oynuyor = arkaVideo.hazir = true;
    e.classList.add("on");
    // video görünür olunca (geçiş bitince) canlı sinematik durur
    setTimeout(() => oynuyor && menudeMi() && demoStop(), 650);
  });
  e.addEventListener("error", vazgec);
}

function oynat() {
  if (!v) return;
  v.play().catch(vazgec);
}

/**
 * her kare: video yalnız menü görünürken oynar. Dönüş true ise video ekranı kaplıyor, 3B sahne çizilmez.
 */
export function arkaVideoTick() {
  if (!v || arkaVideo.kapali) return false;
  const acik = menudeMi();
  if (acik != gorunur) {
    gorunur = acik;
    v.classList.toggle("hidden", !acik);
    if (acik) oynat();
    else {
      v.pause();
      oynuyor = false;
      v.classList.remove("on");
    }
  }
  return acik && oynuyor && !v.paused;
}

/** menü açılırken: video oynuyorsa canlı sinematik gerekmez */
export const videoOynuyor = () => !!v && arkaVideo.hazir && !arkaVideo.kapali && oynuyor;
