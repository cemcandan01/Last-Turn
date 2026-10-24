// Profil ekranındaki hesap bloğu: hesap durumu satırı, "Google ile bağlan" / "E-posta ile" / "Çıkış" düğmeleri ve
// "Yeni oyuncu olarak başla". Firebase yapılandırması yoksa hiçbir şey çizmez (bulut/hesap.ts → etkin).
// E-posta formu kendi tam ekran katmanında açılır (epostaFormuAc): iPhone yatayda klavye ekranın çoğunu kapladığı için
// form görünür alana (visualViewport) sığdırılır ve alanlar tek tek sorulur (E-posta → Şifre → Şifre tekrar);
// klavyenin İleri tuşu sonraki alana, son alanda gönderir.
import { CARS } from "../arac/araclar";
import { adminKipi, seviye } from "../oyun/ilerleme";
import { TDEF } from "../dunya/pist-tanimlari";
import { yildizAnahtari } from "../oyun/yildiz";
import {
  adminHerSeyAcik,
  adminKilitAyarla,
  adminParaEkle,
  adminSeviye,
  adminSifirla,
  adminXpEkle,
  cikis,
  epostaGiris,
  epostaOlustur,
  googleBagla,
  hesapDinle,
  hesapDurumu,
  hesapOzeti,
  sifreSifirla,
  yeniOyuncu,
} from "../bulut/hesap";

let sifirSor = false,
  adminSifirSor = false,
  birak: (() => void) | null = null;

const kacis = (t: string) => t.replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");

function ic() {
  const d = hesapDurumu(),
    k = d.kullanici,
    dis = d.mesgul || !k ? " disabled" : "";
  const dugmeler = !k
    ? ""
    : k.anonim
      ? `<button class="hdg" id="hgoogle"${dis}>Google ile bağlan</button><button class="hdg" id="heposta"${dis}>E-posta ile</button>`
      : `<button class="hdg" id="hcikis"${dis}>Çıkış</button>`;
  // yeni oyuncu: iki dokunuşla (önce ne olacağı yazılır)
  const sifir = !k
    ? ""
    : sifirSor
      ? `<p class="hhata">${k.anonim ? "Bu misafir hesabın ilerlemesi silinir." : "Bu cihazdan çıkılır; ilerlemen bağlı hesabında kalır."} Bu cihazda her şey sıfırdan başlar (ayarlar kalır).</p><div class="hdugmeler"><button class="hdg" id="hsifirevet"${dis}>Evet, sıfırdan başla</button><button class="hdg" id="hsifirhayir">Vazgeç</button></div>`
      : `<div class="hdugmeler"><button class="hdg" id="hsifir"${dis}>Yeni oyuncu olarak başla</button></div>`;
  // hesap kimliği (uid): admin yapmak için konsola yazılır; kopyalanabilir
  const kimlik =
    k && !k.anonim
      ? `<div class="hkimlik"><small>Hesap kimliği</small><input id="huid" class="inp" readonly value="${kacis(k.uid)}"><button class="hdg kucuk" id="hkopya">Kopyala</button></div>`
      : "";
  return `<div class="lbl">Hesap</div><p class="hsat">${kacis(hesapOzeti(d))}${d.admin ? " · <b>Admin</b>" : ""}</p>${d.bilgi ? `<p class="hbilgi">${kacis(d.bilgi)}</p>` : ""}${d.hata && !formAcik() ? `<p class="hhata">${kacis(d.hata)}</p>` : ""}<div class="hdugmeler">${dugmeler}</div>${kimlik}${d.admin ? adminHtml() : ""}${sifir}`;
}

/** admin paneli: para/XP ekle, seviye ayarla, kilit aç-kapa, her şey açık kipi, ilerlemeyi sıfırla */
function adminHtml() {
  const ogeler = [
    ...CARS.map((c, i) => [`arac_${i}`, "Araç: " + c.n]),
    ...TDEF.map((t) => [yildizAnahtari(t.t, t.lv), "Pist: " + t.n]),
  ];
  return `<div class="hadmin"><div class="lbl">Admin</div>
<div class="hdugmeler"><button class="hdg kucuk" id="hakip">Her şey açık: ${adminKipi() ? "Açık" : "Kapalı"}</button>
<button class="hdg kucuk" data-para="1000">+1000 para</button><button class="hdg kucuk" data-para="10000">+10000 para</button>
<button class="hdg kucuk" data-xp="100">+100 XP</button><button class="hdg kucuk" data-xp="1000">+1000 XP</button></div>
<div class="hdugmeler"><input id="hasv" class="inp" type="number" min="1" max="99" value="${seviye().lv}" inputmode="numeric"><button class="hdg kucuk" id="hasvb">Seviyeyi ayarla</button></div>
<div class="hdugmeler"><select id="haoge" class="inp">${ogeler.map(([k, a]) => `<option value="${k}">${kacis(a)}</option>`).join("")}</select><button class="hdg kucuk" id="haac">Aç</button><button class="hdg kucuk" id="hakapa">Kilitle</button></div>
<div class="hdugmeler">${
    adminSifirSor
      ? `<button class="hdg kucuk" id="hasifevet">Evet, ilerlemeyi sıfırla</button><button class="hdg kucuk" id="hasifhayir">Vazgeç</button>`
      : `<button class="hdg kucuk" id="hasif">İlerlemeyi sıfırla</button>`
  }</div></div>`;
}

/** profil ekranı için hesap bloğu (yapılandırma yoksa boş) */
export const hesapHtml = () => (hesapDurumu().etkin ? `<div id="hesap" class="hesap">${ic()}</div>` : "");

/**
 * profil ekranı çizilince düğmeleri bağlar; durum değişince yalnız blok yenilenir. yenidenCiz: admin işleminden sonra
 * bütün profil (XP, para, seviye) yeniden çizilsin
 */
export function hesapBagla(m: HTMLElement, yenidenCiz?: () => void) {
  birak?.();
  birak = null;
  sifirSor = false;
  adminSifirSor = false;
  const kutu = m.querySelector<HTMLElement>("#hesap");
  if (!kutu) return;
  const bagla = () => {
    const tik = (id: string, f: () => void) => {
      const e = kutu.querySelector<HTMLElement>("#" + id);
      if (e) e.onclick = f;
    };
    tik("hgoogle", () => void googleBagla());
    tik("heposta", () => epostaFormuAc("olustur"));
    tik("hcikis", () => void cikis());
    tik("hsifir", () => {
      sifirSor = true;
      yenile();
    });
    tik("hsifirhayir", () => {
      sifirSor = false;
      yenile();
    });
    tik("hsifirevet", () => void yeniOyuncu());
    tik("hkopya", () => {
      const u = kutu.querySelector<HTMLInputElement>("#huid")!;
      u.select();
      void navigator.clipboard?.writeText(u.value).catch(() => {});
      const b = kutu.querySelector<HTMLElement>("#hkopya")!;
      b.textContent = "Kopyalandı";
    });
    // admin: işlemden sonra profil (XP, para, seviye) yeniden çizilir
    const sonra = () => yenidenCiz?.();
    tik("hakip", () => adminHerSeyAcik(!adminKipi()) && sonra());
    kutu
      .querySelectorAll<HTMLElement>("[data-para]")
      .forEach((e) => (e.onclick = () => adminParaEkle(+e.dataset.para!) && sonra()));
    kutu
      .querySelectorAll<HTMLElement>("[data-xp]")
      .forEach((e) => (e.onclick = () => adminXpEkle(+e.dataset.xp!) && sonra()));
    tik("hasvb", () => {
      const lv = +kutu.querySelector<HTMLInputElement>("#hasv")!.value;
      if (lv >= 1 && adminSeviye(lv)) sonra();
    });
    const oge = () => kutu.querySelector<HTMLSelectElement>("#haoge")!.value;
    tik("haac", () => adminKilitAyarla(oge(), true));
    tik("hakapa", () => adminKilitAyarla(oge(), false));
    tik("hasif", () => {
      adminSifirSor = true;
      yenile();
    });
    tik("hasifhayir", () => {
      adminSifirSor = false;
      yenile();
    });
    tik("hasifevet", () => {
      adminSifirSor = false;
      if (adminSifirla()) sonra();
    });
  };
  const yenile = () => {
    if (!kutu.isConnected) {
      birak?.();
      birak = null;
      return;
    }
    kutu.innerHTML = ic();
    bagla();
  };
  bagla();
  birak = hesapDinle(yenile);
}

// --- e-posta formu (tam ekran katman) ---

type Kip = "olustur" | "giris";
const ALANLAR = {
  olustur: [
    { id: "hep", ad: "E-posta", tur: "email", oto: "email", ipucu: "ornek@eposta.com" },
    { id: "hsf", ad: "Şifre", tur: "password", oto: "new-password", ipucu: "En az 6 karakter" },
    { id: "hsf2", ad: "Şifre tekrar", tur: "password", oto: "new-password", ipucu: "Şifreyi yeniden yaz" },
  ],
  giris: [
    { id: "hep", ad: "E-posta", tur: "email", oto: "email", ipucu: "ornek@eposta.com" },
    { id: "hsf", ad: "Şifre", tur: "password", oto: "current-password", ipucu: "Şifren" },
  ],
};

let kat: HTMLElement | null = null;
const formAcik = () => !!kat?.isConnected;

/** e-posta formunu tam ekran katmanda aç (kip: yeni hesap ya da giriş) */
export function epostaFormuAc(kip: Kip, degerler: Record<string, string> = {}) {
  epostaFormuKapat();
  const alanlar = ALANLAR[kip],
    vv = window.visualViewport;
  let adim = 0,
    uyari = "";
  const k = document.createElement("div");
  k.id = "hkat";
  k.className = "hkat";
  k.innerHTML = `<form class="hserit" novalidate>
<div class="hsol"><b>${kip == "olustur" ? "Hesap oluştur" : "Giriş yap"}</b><small id="hadim"></small></div>
<div class="horta">${alanlar
    .map(
      (a, i) =>
        `<input id="${a.id}" name="${a.id == "hep" ? "email" : a.id}" class="inp" type="${a.tur}" autocomplete="${a.oto}" placeholder="${a.ipucu}" enterkeyhint="${i == alanlar.length - 1 ? "go" : "next"}" autocapitalize="off" autocorrect="off" spellcheck="false">`,
    )
    .join("")}</div>
<div class="hsag"><button type="submit" class="hdg ana" id="hileri"></button></div>
<p class="hmsg" id="hmsg"></p>
<div class="halt"><button type="button" class="hdg kucuk" id="hgeri">‹ Geri</button><button type="button" class="hdg kucuk" id="hkip">${kip == "olustur" ? "Zaten hesabım var → Giriş yap" : "Hesabım yok → Yeni hesap"}</button>${kip == "giris" ? `<button type="button" class="hdg kucuk" id="hunut">Şifremi unuttum</button>` : ""}<button type="button" class="hdg kucuk" id="hkapat">Kapat</button></div>
</form>`;
  document.body.appendChild(k);
  kat = k;
  const $ = <T extends HTMLElement>(id: string) => k.querySelector<T>("#" + id)!,
    girdi = (i: number) => $<HTMLInputElement>(alanlar[i].id);
  for (const [id, v] of Object.entries(degerler)) {
    const e = k.querySelector<HTMLInputElement>("#" + id);
    if (e) e.value = v;
  }

  // görünür alana yerleş: klavye açıkken visualViewport küçülür, katman o şeride sığar
  const yerlestir = () => {
    const h = vv ? vv.height : innerHeight,
      t = vv ? vv.offsetTop : 0;
    k.style.top = t + "px";
    k.style.height = h + "px";
    k.classList.toggle("dar", h < 260);
  };
  yerlestir();
  vv?.addEventListener("resize", yerlestir);
  vv?.addEventListener("scroll", yerlestir);
  // arkadaki sayfa kaymasın (iOS odaklanınca kaydırır)
  const kaymaYok = (e: TouchEvent) => {
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
  };
  k.addEventListener("touchmove", kaymaYok, { passive: false });

  const mesaj = () => {
    const d = hesapDurumu(),
      m = $("hmsg"),
      hata = uyari || (d.mesgul ? "" : d.hata || "");
    m.textContent = hata || (d.mesgul ? "Bağlanıyor…" : d.bilgi || "");
    m.className = "hmsg" + (hata ? " hata" : d.bilgi && !d.mesgul ? " bilgi" : "");
    $<HTMLButtonElement>("hileri").disabled = d.mesgul;
  };
  const goster = (odak = true) => {
    alanlar.forEach((a, i) => girdi(i).classList.toggle("gizli", i != adim));
    $("hadim").textContent = `${adim + 1}/${alanlar.length} · ${alanlar[adim].ad}`;
    $("hileri").textContent =
      adim < alanlar.length - 1 ? "İleri ›" : kip == "olustur" ? "Hesap oluştur" : "Giriş yap";
    $("hgeri").style.visibility = adim ? "" : "hidden";
    mesaj();
    if (odak) girdi(adim).focus();
  };
  /** bu adımın değeri uygun mu; değilse uyarı */
  const denetle = (i: number) => {
    const v = girdi(i).value,
      id = alanlar[i].id;
    if (id == "hep") return /^\S+@\S+\.\S+$/.test(v.trim()) ? "" : "Geçerli bir e-posta yaz";
    if (id == "hsf") return v.length >= 6 ? "" : "Şifre en az 6 karakter olmalı";
    return v == girdi(1).value ? "" : "Şifreler aynı değil";
  };

  k.querySelector("form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    uyari = denetle(adim);
    if (uyari) return goster();
    if (adim < alanlar.length - 1) {
      adim++;
      return goster();
    }
    const ep = girdi(0).value.trim(),
      sf = girdi(1).value;
    void (kip == "olustur" ? epostaOlustur(ep, sf) : epostaGiris(ep, sf)).then((ok) => {
      if (!formAcik()) return;
      if (ok) return epostaFormuKapat();
      // e-posta kullanımdaysa giriş kipine geç (e-posta kalır, şifre sorulur)
      if (kip == "olustur" && /zaten hesap var/.test(hesapDurumu().hata || "")) {
        epostaFormuAc("giris", { hep: ep });
        const y = kat?.querySelector<HTMLInputElement>("#hsf");
        y?.focus();
      }
    });
  });
  $("hgeri").onclick = () => {
    uyari = "";
    adim = Math.max(0, adim - 1);
    goster();
  };
  $("hkip").onclick = () => epostaFormuAc(kip == "olustur" ? "giris" : "olustur", { hep: girdi(0).value });
  $("hkapat").onclick = () => epostaFormuKapat();
  const unut = k.querySelector<HTMLElement>("#hunut");
  if (unut)
    unut.onclick = () => {
      const ep = girdi(0).value.trim();
      uyari = ep ? "" : "Önce e-postanı yaz";
      if (ep) void sifreSifirla(ep);
      else {
        adim = 0;
        goster();
      }
    };
  const birakDinle = hesapDinle(() => formAcik() && mesaj());
  kapatici = () => {
    birakDinle();
    vv?.removeEventListener("resize", yerlestir);
    vv?.removeEventListener("scroll", yerlestir);
  };
  // e-posta önceden yazılıysa (kip değişimi) şifreden başla
  if (degerler.hep && denetle(0) == "") adim = 1;
  goster();
}

let kapatici: (() => void) | null = null;

export function epostaFormuKapat() {
  kapatici?.();
  kapatici = null;
  kat?.remove();
  kat = null;
  // iOS odaklanınca sayfayı kaydırmış olabilir: geri al
  window.scrollTo(0, 0);
}
