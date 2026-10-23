// Menü arka planı: oyunun kendi sahnelerinden çekilmiş küçük görseller (public/img/menu/NN.webp, scripts/menu-gorsel.mjs
// üretir). Rastgele sırayla, art arda aynı görsel gelmeden, yavaş kayma (Ken Burns) ve çapraz geçişle akar. Görseller
// ekranı kaplarken menüde 3B sahne hiç çizilmez (pil, ısı). Görsel yüklenemezse menü canlı sinematik çekimlerle çalışır.
import { $ } from "../cekirdek/dom";
import { oyun } from "../oyun/durum";
import { demoStart, demoStop } from "../oyun/sinematik";

/** bir görselin ekranda kalma süresi (ms); çapraz geçiş süresi stil.css'te */
const KALMA = 6000;

export const arkaGorsel = {
  /** görseller yüklendi ve akıyor */
  hazir: false,
  /** görsel kullanılmaz: canlı sinematik */
  kapali: false,
};
let kutu: HTMLElement,
  menu: HTMLElement,
  katman: HTMLImageElement[] = [],
  torba: string[] = [],
  son = "",
  on = 0,
  zamanlayici = 0,
  gorunur = false;

const adlar: string[] = [];
const menudeMi = () => oyun.mode == "menu" && !menu.classList.contains("hidden");

/** görsel kullanılamıyor: canlı sinematiğe dön */
function vazgec() {
  arkaGorsel.kapali = true;
  arkaGorsel.hazir = false;
  clearTimeout(zamanlayici);
  kutu.classList.add("hidden");
  if (menudeMi()) demoStart();
}

/** karışık torbadan sıradaki; art arda aynı görsel gelmez */
function sonraki() {
  if (!torba.length) {
    torba = [...adlar].sort(() => Math.random() - 0.5);
    if (torba[0] == son && torba.length > 1) torba.push(torba.shift()!);
  }
  return (son = torba.shift()!);
}

/** sıradaki görseli arkadaki katmana koyup öne çıkarır, kayma animasyonunu yeniden başlatır */
function degistir() {
  const e = katman[on ^ 1],
    eski = katman[on];
  e.src = sonraki();
  // her görsel farklı yöne ve farklı oranda yavaşça kayar
  e.style.setProperty("--kx", `${(Math.random() * 2 - 1) * 3}%`);
  e.style.setProperty("--ky", `${(Math.random() * 2 - 1) * 2}%`);
  e.style.setProperty("--ks", String(1.06 + Math.random() * 0.06));
  e.classList.remove("kay", "on");
  void e.offsetWidth;
  e.classList.add("kay", "on");
  eski.classList.remove("on");
  on ^= 1;
  zamanlayici = window.setTimeout(degistir, KALMA);
}

/** görsel sayısını okur (adet.json, çekim betiği yazar), hepsini yükler; hepsi yüklenince akış başlar */
async function yukle() {
  const adet: number = await fetch("img/menu/adet.json").then((r) => r.json());
  await Promise.all(
    Array.from({ length: adet }, (_, i) => {
      const ad = `img/menu/${String(i).padStart(2, "0")}.webp`;
      return new Promise<void>((bitti) => {
        const g = new Image();
        g.onload = () => (adlar.push(ad), bitti());
        g.onerror = () => bitti();
        g.src = ad;
      });
    }),
  );
  if (!adlar.length) return vazgec();
  arkaGorsel.hazir = true;
  if (menudeMi()) demoStop();
  if (gorunur) baslat();
}

function baslat() {
  clearTimeout(zamanlayici);
  degistir();
}

export function arkaGorselKur() {
  menu = $("#menu");
  kutu = $("#arka");
  katman = [...kutu.querySelectorAll("img")] as HTMLImageElement[];
  // kayıt aracı (scripts/menu-gorsel.mjs) canlı sahneyi çeker
  if (location.search.includes("kayit")) return vazgec();
  yukle().catch(vazgec);
}

/**
 * her kare: görseller yalnız menü görünürken akar. Dönüş true ise görsel ekranı kaplıyor, 3B sahne çizilmez.
 */
export function arkaGorselTick() {
  if (!kutu || arkaGorsel.kapali) return false;
  const acik = menudeMi();
  if (acik != gorunur) {
    gorunur = acik;
    kutu.classList.toggle("hidden", !acik);
    if (acik) {
      if (arkaGorsel.hazir) baslat();
    } else clearTimeout(zamanlayici);
  }
  return acik && arkaGorsel.hazir;
}

/** menü açılırken: görsel akıyorsa canlı sinematik gerekmez */
export const gorselOynuyor = () => arkaGorsel.hazir && !arkaGorsel.kapali;
