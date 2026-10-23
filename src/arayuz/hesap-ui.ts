// Profil ekranındaki hesap bloğu: hesap durumu satırı, "Google ile bağlan" / "E-posta ile" / "Çıkış" düğmeleri,
// e-posta formu (Hesap oluştur ya da Giriş yap, Şifremi unuttum) ve "Yeni oyuncu olarak başla".
// Firebase yapılandırması yoksa hiçbir şey çizmez (bulut/hesap.ts → etkin).
import {
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

/** e-posta formu: kapalı, yeni hesap (varsayılan) ya da var olan hesaba giriş */
let eposta: "" | "olustur" | "giris" = "",
  sifirSor = false,
  /** formdaki yerel uyarı (şifreler aynı değil gibi; sunucuya gitmeden) */
  uyari = "",
  birak: (() => void) | null = null;

const kacis = (t: string) => t.replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");

function formHtml(dis: string) {
  if (!eposta) return "";
  const yeni = eposta == "olustur";
  return `<div class="hform"><b class="hbas">${yeni ? "Yeni hesap oluştur" : "Hesabına giriş yap"}</b>
<input id="hep" class="inp" type="email" autocomplete="email" placeholder="E-posta">
<input id="hsf" class="inp" type="password" autocomplete="${yeni ? "new-password" : "current-password"}" placeholder="Şifre${yeni ? " (en az 6 karakter)" : ""}">
${yeni ? `<input id="hsf2" class="inp" type="password" autocomplete="new-password" placeholder="Şifre tekrar">` : ""}
<button class="hdg ana" id="hgir"${dis}>${yeni ? "Hesap oluştur" : "Giriş yap"}</button></div>
${uyari ? `<p class="hhata">${kacis(uyari)}</p>` : ""}
<div class="hdugmeler">${
    yeni
      ? `<button class="hdg kucuk" id="hkip">Zaten hesabım var → Giriş yap</button>`
      : `<button class="hdg kucuk" id="hkip">Hesabım yok → Yeni hesap</button><button class="hdg kucuk" id="hunut"${dis}>Şifremi unuttum</button>`
  }</div><small class="note">${
    yeni
      ? "Bu cihazdaki ilerlemen yeni hesaba geçer; başka cihazda aynı e-posta ve şifreyle giriş yapınca gelir."
      : "Bu cihazdaki ilerlemen hesabındakiyle birleşir (hiçbir şey kaybolmaz)."
  }</small>`;
}

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
  return `<div class="lbl">Hesap</div><p class="hsat">${kacis(hesapOzeti(d))}</p>${d.bilgi ? `<p class="hbilgi">${kacis(d.bilgi)}</p>` : ""}${d.hata ? `<p class="hhata">${kacis(d.hata)}</p>` : ""}<div class="hdugmeler">${dugmeler}</div>${k?.anonim ? formHtml(dis) : ""}${sifir}`;
}

/** profil ekranı için hesap bloğu (yapılandırma yoksa boş) */
export const hesapHtml = () => (hesapDurumu().etkin ? `<div id="hesap" class="hesap">${ic()}</div>` : "");

/** profil ekranı çizilince düğmeleri bağlar; durum değişince yalnız blok yenilenir */
export function hesapBagla(m: HTMLElement) {
  birak?.();
  birak = null;
  sifirSor = false;
  uyari = "";
  const kutu = m.querySelector<HTMLElement>("#hesap");
  if (!kutu) return;
  const deger = (id: string) => kutu.querySelector<HTMLInputElement>("#" + id)?.value ?? "";
  const bagla = () => {
    const tik = (id: string, f: () => void) => {
      const e = kutu.querySelector<HTMLElement>("#" + id);
      if (e) e.onclick = f;
    };
    tik("hgoogle", () => void googleBagla());
    tik("heposta", () => {
      eposta = eposta ? "" : "olustur";
      uyari = "";
      yenile();
    });
    tik("hkip", () => {
      eposta = eposta == "olustur" ? "giris" : "olustur";
      uyari = "";
      yenile();
    });
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
    tik("hunut", () => {
      const ep = deger("hep").trim();
      uyari = ep ? "" : "Önce e-postanı yaz";
      if (ep) void sifreSifirla(ep);
      else yenile();
    });
    tik("hgir", () => {
      const ep = deger("hep").trim(),
        sf = deger("hsf");
      uyari = !ep
        ? "E-postanı yaz"
        : sf.length < 6
          ? "Şifre en az 6 karakter olmalı"
          : eposta == "olustur" && sf != deger("hsf2")
            ? "Şifreler aynı değil"
            : "";
      if (uyari) return yenile();
      void (eposta == "olustur" ? epostaOlustur(ep, sf) : epostaGiris(ep, sf)).then((ok) => {
        if (ok) eposta = "";
        // e-posta kullanımdaysa giriş kipine geç (e-posta kutuda kalır)
        else if (/zaten hesap var/.test(hesapDurumu().hata || "")) eposta = "giris";
        yenile();
      });
    });
  };
  const yenile = () => {
    if (!kutu.isConnected) {
      birak?.();
      birak = null;
      return;
    }
    // yeniden çizerken yazılmış e-posta ve şifre korunur
    const yazili = ["hep", "hsf", "hsf2"].map(deger);
    kutu.innerHTML = ic();
    ["hep", "hsf", "hsf2"].forEach((id, i) => {
      const e = kutu.querySelector<HTMLInputElement>("#" + id);
      if (e && yazili[i]) e.value = yazili[i];
    });
    bagla();
  };
  bagla();
  birak = hesapDinle(yenile);
}
