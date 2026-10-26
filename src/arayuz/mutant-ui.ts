// MUTANT arayüzü: perk seçim ekranı, koşu özeti, Tutuş Darbesi tuşu (enerji dolgusu tuşun içinde) ve sol üst
// görev paneli metni. Kurallar oyun/mutant-kurallari.ts'te; HUD kuralları docs/HUD.md.
import { $ } from "../cekirdek/dom";
import { TUTUS_DARBESI, parametreler } from "../cekirdek/mekanikler";
import { oyun } from "../oyun/durum";
import { girdiSifirla } from "../oyun/girdi";
import { mutant, mutantKapat, mutantRekoru } from "../oyun/mutant";
import { GOREVLER, kosuOzeti, perkBul, perkSec, takiliMekanikler } from "../oyun/mutant-kurallari";
import { note } from "./bildirim";
import { kontrolleriKur } from "./kontroller";

const ondalik = (v: number, n = 1) => v.toFixed(n).replace(".", ",");
const row = (a: string, b: string | number) => `<div class="rk"><span>${a}</span><span>${b}</span></div>`;

/** sürüşü durdur, sonuç sayfasını aç */
function sayfaAc(html: string) {
  oyun.mode = "result";
  girdiSifirla();
  $("#ctl").classList.add("hidden");
  const r = $("#res");
  r.classList.remove("hidden");
  r.innerHTML = html;
  return r;
}

function surusDevam() {
  $("#res").classList.add("hidden");
  oyun.mode = "drive";
  kontrolleriKur();
  $("#ctl").classList.remove("hidden");
}

/** görev adı: "Drift 5,5 sn" */
function gorevAdi() {
  const g = mutant.kosu?.gorev;
  if (!g) return "";
  const G = GOREVLER[g.tur];
  return (
    G.ad + " " + (Number.isInteger(g.hedef) ? g.hedef : ondalik(g.hedef)) + (G.birim ? " " + G.birim : "")
  );
}

/** perk seçimi: koşu başında ve her başarılı görevden sonra */
export function mutantSecimGoster() {
  const k = mutant.kosu;
  if (!k || k.faz != "secim") return;
  const baslik = k.tamamlanan ? "Görev tamam · " + k.tamamlanan : "Koşu başlıyor";
  const sahip = k.perkler.length
    ? `<p class="note">Takılı: ${k.perkler.map((id) => perkBul(id)!.ad).join(", ")}</p>`
    : '<p class="note">Her koşuda Tutuş Darbesi takılı: enerjiyle kısa süre tutuş verir. Enerjiyi perklerle topla.</p>';
  const r = sayfaAc(
    `<h1>MUTANT</h1><p>${baslik}: bir perk seç.</p>${sahip}<div class="mtp">${k.secenekler
      .map((id) => {
        const p = perkBul(id)!;
        return `<div class="card go" data-perk="${id}"><b>${p.ad}</b><span>${p.d}</span></div>`;
      })
      .join("")}</div>`,
  );
  r.querySelectorAll<HTMLElement>("[data-perk]").forEach(
    (e) =>
      (e.onclick = () => {
        if (!perkSec(k, e.dataset.perk!)) return;
        surusDevam();
        note(gorevAdi(), 50);
      }),
  );
}

/** koşu bitti: özet, yeni koşu ya da ana menü */
export function mutantOzetGoster(yeniKosu: () => void, anaMenu: () => void) {
  const k = mutant.kosu;
  if (!k) return;
  const o = kosuOzeti(k);
  const r = sayfaAc(
    // düğmeler üstte, kayarken de görünür (duraklatma sayfası gibi); satırlar iki sütun: yatay ekrana sığar
    '<div class="bar"><button class="btn" id="mYeni">Yeni koşu</button><button class="btn alt" id="mMenu">Ana menü</button></div>' +
      `<h1>Koşu bitti</h1><p>Süre doldu: ${gorevAdi()}.</p><div class="mtz">` +
      row("Tamamlanan görev", o.tamamlanan + (mutant.yeniRekor ? " · YENİ REKOR" : "")) +
      row("En iyi", mutantRekoru()) +
      row("Koşu süresi", Math.round(o.sure) + " sn") +
      o.perkler.map((p) => row(p.ad, Math.round(p.kazanc) + " enerji")).join("") +
      row("Tutuş Darbesi", o.darbe + " kez · sürenin %" + Math.round(o.darbePayi * 100)) +
      (o.yanan > 0 ? row("Spinde yanan", Math.round(o.yanan) + " enerji") : "") +
      '</div><p class="note">MUTANT koşuları kariyer ödülü, para, XP ya da tur rekoru vermez.</p>',
  );
  r.querySelector<HTMLElement>("#mYeni")!.onclick = () => {
    r.classList.add("hidden");
    yeniKosu();
  };
  r.querySelector<HTMLElement>("#mMenu")!.onclick = () => {
    r.classList.add("hidden");
    mutantKapat();
    anaMenu();
  };
}

/** Tutuş Darbesi tuşu (sol tuş grubunun üstünde); koşu yoksa boş */
export const mutantTusuHtml = () =>
  mutant.kosu ? '<div class="k" id="mdb"><i></i><b>DARBE</b><s></s></div>' : "";

export function mutantTusuBagla() {
  const e = document.getElementById("mdb");
  if (!e) return;
  e.addEventListener("pointerdown", (v) => {
    v.preventDefault();
    mutant.darbe = true;
  });
}

/** her karede: tuşun enerji dolgusu, maliyet çizgisi, açık/hazır durumu */
export function mutantTusuGuncelle() {
  const e = document.getElementById("mdb"),
    k = mutant.kosu;
  if (!e || !k) return;
  const m = k.mek,
    maliyet = TUTUS_DARBESI.maliyet * parametreler(takiliMekanikler(k)).maliyet,
    dolu = Math.round((100 * m.enerji) / m.kapasite) + "%",
    cizgi = Math.round((100 * maliyet) / m.kapasite) + "%",
    sinif = m.etkiKalan > 0 ? "k on" : m.etkiBekleme <= 0 && m.enerji >= maliyet ? "k hazir" : "k";
  if (e.style.getPropertyValue("--e") != dolu) e.style.setProperty("--e", dolu);
  if (e.style.getPropertyValue("--m") != cizgi) e.style.setProperty("--m", cizgi);
  if (e.className != sinif) e.className = sinif;
}

/** sol üst panel (görev): büyük satır ilerleme, alt satır görev no + ad + kalan süre */
export function mutantPaneli(): [string, string] | null {
  const k = mutant.kosu,
    g = k?.gorev;
  if (!k || !g) return null;
  const G = GOREVLER[g.tur],
    ilerleme = g.tur == "drift" ? ondalik(g.ilerleme) : String(Math.floor(g.ilerleme));
  return [
    ilerleme +
      " / " +
      (Number.isInteger(g.hedef) ? g.hedef : ondalik(g.hedef)) +
      (G.birim ? " " + G.birim : ""),
    "Görev " + (k.tamamlanan + 1) + " · " + G.ad + " · " + Math.max(0, Math.ceil(g.kalan)) + " sn",
  ];
}
