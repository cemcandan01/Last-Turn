// Profil ekranındaki hesap bloğu: hesap durumu satırı, "Google ile bağlan" / "E-posta ile" / "Çıkış" düğmeleri.
// Firebase yapılandırması yoksa hiçbir şey çizmez (bulut/hesap.ts → etkin).
import { cikis, epostaBagla, googleBagla, hesapDinle, hesapDurumu, hesapOzeti } from "../bulut/hesap";

let epostaAcik = false,
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
  const form =
    epostaAcik && k
      ? `<div class="hform"><input id="hep" class="inp" type="email" autocomplete="email" placeholder="E-posta"><input id="hsf" class="inp" type="password" autocomplete="current-password" placeholder="Şifre (en az 6)"><button class="hdg" id="hgir"${dis}>Bağlan</button></div><small class="note">Yeni e-postada hesap açılır; daha önce bağladığın e-postada o hesaba girilir ve ilerlemeler birleşir.</small>`
      : "";
  return `<div class="lbl">Hesap</div><p class="hsat">${kacis(hesapOzeti(d))}</p>${d.hata ? `<p class="hhata">${kacis(d.hata)}</p>` : ""}<div class="hdugmeler">${dugmeler}</div>${form}`;
}

/** profil ekranı için hesap bloğu (yapılandırma yoksa boş) */
export const hesapHtml = () => (hesapDurumu().etkin ? `<div id="hesap" class="hesap">${ic()}</div>` : "");

/** profil ekranı çizilince düğmeleri bağlar; durum değişince yalnız blok yenilenir */
export function hesapBagla(m: HTMLElement) {
  birak?.();
  birak = null;
  const kutu = m.querySelector<HTMLElement>("#hesap");
  if (!kutu) return;
  const bagla = () => {
    const tik = (id: string, f: () => void) => {
      const e = kutu.querySelector<HTMLElement>("#" + id);
      if (e) e.onclick = f;
    };
    tik("hgoogle", () => void googleBagla());
    tik("heposta", () => {
      epostaAcik = !epostaAcik;
      yenile();
    });
    tik("hcikis", () => void cikis());
    tik("hgir", () => {
      const ep = kutu.querySelector<HTMLInputElement>("#hep")!.value,
        sf = kutu.querySelector<HTMLInputElement>("#hsf")!.value;
      void epostaBagla(ep, sf).then(() => {
        if (!hesapDurumu().kullanici?.anonim) epostaAcik = false;
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
    const ep = kutu.querySelector<HTMLInputElement>("#hep")?.value,
      sf = kutu.querySelector<HTMLInputElement>("#hsf")?.value;
    kutu.innerHTML = ic();
    const e = kutu.querySelector<HTMLInputElement>("#hep"),
      s = kutu.querySelector<HTMLInputElement>("#hsf");
    if (e && ep) e.value = ep;
    if (s && sf) s.value = sf;
    bagla();
  };
  bagla();
  birak = hesapDinle(yenile);
}
