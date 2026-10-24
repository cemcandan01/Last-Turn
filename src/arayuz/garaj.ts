// Garaj ekranı: araçları dönen platformda incele, özellikleri karşılaştır, seç. Yarıştan ve serbest sürüşten önce de
// buradan seçilir; yarışta türe uygun araç "Önerilen" olarak gelir.
import { CARS, type YarisTuru } from "../arac/araclar";
import { STAT, estTop } from "../arac/istatistik";
import { cl } from "../cekirdek/matematik";
import { gizle, $ } from "../cekirdek/dom";
import { garG, garajIsigi, garajTemasi } from "../cizim/garaj-sahnesi";
import { ground } from "../cizim/zemin";
import { REG } from "../dunya/bolgeler";
import { dunya, WORLDS } from "../dunya/dunya";
import {
  model,
  vitrinBosalt,
  vitrinHazirla,
  vitrinHazirMi,
  vitrinIsit,
  aracIcKur,
} from "../cizim/arac-modeli";
import { carIndex, oyun, setCar } from "../oyun/durum";
import * as THREE from "three";
import { kamera, garajKameraSifirla } from "../cizim/kamera";
import {
  acilmaSeviyesi,
  aracAcikMi,
  aracFiyati,
  aracSatinAl,
  aracSatinAlinabilirMi,
  para,
  paraDinle,
  parcaFiyati,
  parcaSahipMi,
  parcaSatinAl,
  pistAcikMi,
} from "../oyun/ilerleme";
import {
  kategoriParcasi,
  modifiyeUygula,
  paketiTak,
  parcaEtkileri,
  parcaSok,
  parcaTak,
  stokaDon,
  takiliParcalar,
} from "../oyun/modifiye";
import { KATEGORILER, PAKETLER, PARCALAR, paketTak, parcaBul, type ParcaKategori } from "../arac/parcalar";
import { performansPuani, SINIFLAR, type PerformansDegerleri } from "../arac/performans";
import { ikon } from "./ikonlar";
import { EVENTS, startEvent } from "../oyun/yarislar";
import { note } from "./bildirim";
import { showMenu, startWorld, TYPES } from "./menu";

interface GarajDurumu {
  /** yarış (yoksa null) */
  ev: number | null;
  /** serbest sürüş dünyası (yoksa null) */
  w: number | null;
  /** girişteki araç, önerilen araç, gösterilen araç */
  prev: number;
  rec: number;
  i: number;
  /** mağaza kipi: yalnız sahip olunmayan araçlar gezilir, süzgeç (tür anahtarı ya da "hepsi"), geri dönüş ve son alınan araç */
  mg: boolean;
  suz: string;
  geri?: () => void;
  alinan: number | null;
  /** modifiye ekranı açık mı, seçili kategori ("paket": paketler) ve önizlenen parça / paket ("": stok, null: yok) */
  mod?: boolean;
  mk?: ParcaKategori | "paket";
  ms?: string | null;
}
let GAR: GarajDurumu | null = null;

const sayi = (n: number) => n.toLocaleString("tr-TR");
const paraYazi = (n: number) => `${ikon("para")}<b>${sayi(n)}</b>`;
/** gezilen araçlar: garajda yalnız sahip olunanlar, mağazada sahip olunmayanlar (süzgece göre) */
const liste = (G: GarajDurumu) =>
  CARS.map((_, k) => k).filter(
    (k) => (G.mg ? !aracAcikMi(k) : aracAcikMi(k)) && (G.suz == "hepsi" || CARS[k].ty == G.suz),
  );
const turBilgi = (ty: string) => TYPES.find((t) => t[0] == ty);
let PARA_BIRAK: (() => void) | null = null,
  ONAY: { arac: number; zaman: number } | null = null,
  ONAY_ZAMANLA: ReturnType<typeof setTimeout> | undefined;

/** araç açıklaması "i" düğmesiyle açılır / kapanır; seçim araçtan araca geçerken korunur */
let BILGI_ACIK = false,
  /** mağaza tür süzgeci açık mı (kapalıyken tek düğme: seçili tür) */
  SUZ_ACIK = false;

/** sol üstte, ad bloğunun altında aracın kısa açıklaması (yalnız "i" açıkken) */
function aciklamaGoster(yazi: string | null) {
  let b = document.getElementById("gdes");
  if (!yazi || !BILGI_ACIK) {
    b?.remove();
    return;
  }
  if (!b) {
    b = document.createElement("div");
    b.id = "gdes";
    document.body.appendChild(b);
  }
  b.style.display = kamera.gTam ? "none" : "";
  b.textContent = yazi;
}

/** tür süzgeci (garaj ve mağaza): sağda fiyat kutusunun üstünde açılır kapanır düğme ("Araçlar" sekmesi; ileride "Modifiye" yanına gelir).
 *  Kapalıyken seçili türün ikonu ve adı; açılınca türler sola doğru dizilir, seçince kapanır. */
function magazaSeridi(G: GarajDurumu | null) {
  // tür süzülünce garajın vurgu rengi (yazılar, çerçeveler, zemindeki halka) o türün rengine döner
  const tema = G && G.suz != "hepsi" ? (turBilgi(G.suz)?.[4] ?? null) : null;
  if (tema) document.body.style.setProperty("--gt", tema);
  else document.body.style.removeProperty("--gt");
  garajTemasi(tema);
  document.getElementById("gmf")?.remove();
  const alt = document.querySelector("#gar .galt");
  if (!G || !alt) return;
  const b = document.createElement("div");
  b.id = "gmf";
  b.classList.toggle("acik", SUZ_ACIK);
  alt.prepend(b);
  const say = (suz: string) =>
    CARS.filter((c, k) => aracAcikMi(k) != G.mg && (suz == "hepsi" || c.ty == suz)).length;
  const secenek = [
      ["hepsi", "Tümü", "izgara", ""] as const,
      ...TYPES.map((t) => [t[0], t[1], t[3], t[4]] as const),
    ],
    secili = secenek.find((x) => x[0] == G.suz) ?? secenek[0];
  b.innerHTML =
    (SUZ_ACIK
      ? secenek
          .map(
            ([k, ad, ik, renk]) =>
              `<button data-suz="${k}" class="${G.suz == k ? "on" : ""}" style="--c:${renk || "#ff7a1a"}" title="${ad}" aria-label="${ad}"${say(k) ? "" : ' data-bos="1"'}>${ikon(ik)}</button>`,
          )
          .join("")
      : "") +
    `<button class="gsac${SUZ_ACIK ? " on" : ""}" id="gsac" aria-label="Tür süzgeci" aria-expanded="${SUZ_ACIK}" style="--c:${secili[3] || "#ff7a1a"}">${ikon(SUZ_ACIK ? "kapat" : secili[2])}<span>${SUZ_ACIK ? "Tür" : secili[1]}</span></button>`;
  $("#gsac").onclick = () => {
    SUZ_ACIK = !SUZ_ACIK;
    magazaSeridi(G);
  };
  b.querySelectorAll<HTMLElement>("[data-suz]").forEach((e) => {
    e.onclick = () => {
      // garajda boş tür seçilmez (mağazada "bu türde araç kalmadı" yazar)
      if (!G.mg && e.dataset.bos) return;
      G.suz = e.dataset.suz!;
      G.alinan = null;
      SUZ_ACIK = false;
      const l = liste(G);
      if (l.length && !l.includes(G.i)) G.i = l[0];
      showGar();
    };
  });
}

// ---- modifiye ----

/** puan önbelleği (performansPuani ~2-5 ms): araç | tür | parçalar */
const PUAN = new Map<string, PerformansDegerleri>();
function puan(aracNo: number, parcalar: readonly string[], tur?: YarisTuru) {
  const k = aracNo + "|" + (tur ?? "") + "|" + [...parcalar].sort().join(",");
  let v = PUAN.get(k);
  if (!v) {
    v = performansPuani(aracNo, parcalar, tur);
    PUAN.set(k, v);
  }
  return v;
}
/** puanın türü: yarış öncesi garajda o yarışın türü, yoksa genel puan */
const puanTuru = (G: GarajDurumu): YarisTuru | undefined => (G.ev != null ? EVENTS[G.ev].ty : undefined);
const sinifRengi = (h: string) => SINIFLAR.find((x) => x.h == h)?.renk ?? "#fff";
/** sınıf harfi ve puan rozeti (SINIFLAR rengiyle) */
function sinifRozeti(aracNo: number, parcalar: readonly string[], tur?: YarisTuru) {
  const p = puan(aracNo, parcalar, tur);
  return `<span class="bdg gsnf" id="gsnf" style="--c:${sinifRengi(p.sinif)}" title="Performans sınıfı ve puanı"><b>${p.sinif}</b>${p.puan}</span>`;
}

/** parça satın alma onayı (iki dokunuş, 3 sn) */
let PONAY: { anahtar: string; zaman: number } | null = null,
  PONAY_ZAMANLA: ReturnType<typeof setTimeout> | undefined;

/** seviye çizgileri (0 zayıf … 3 yarış) */
const pip = (sv: number) => `<i class="gpip" data-sv="${sv}"><u></u><u></u><u></u></i>`;
const kisaAd = (ad: string) => ad.split(" /")[0];
const fark = (d: number) =>
  `<span class="gmd ${d > 0 ? "art" : d < 0 ? "eks" : ""}">${d > 0 ? "+" : ""}${d}</span>`;

/**
 * modifiye ekranı: solda kategoriler (Paketler + 12 kategori), sağda seçili kategorinin parçaları (seviye, ad, puan farkı,
 * fiyat / takılı), altında seçili parçanın etkisi ve eylem (Satın al → Emin misin? → takılır; Tak; Sök). Araç ortada serbest
 */
function modifiyeGoster(G: GarajDurumu) {
  const g = $("#gar"),
    no = G.i,
    c = CARS[no],
    tur = puanTuru(G),
    takili = takiliParcalar(no),
    taban = puan(no, takili, tur),
    mk = G.mk ?? "paket",
    tb = turBilgi(c.ty);
  g.classList.add("modifiye");
  $("#gvit").classList.add("hidden");
  // satırlar: [anahtar, ad, açıklama, seviye, yeni parça listesi, alınacaklar, takılı mı]
  type Satir = {
    k: string;
    ad: string;
    d: string;
    sv: number | null;
    yeni: string[];
    al: string[];
    tk: boolean;
  };
  const satirlar: Satir[] = [];
  if (mk == "paket") {
    satirlar.push({
      k: "",
      ad: "Stok araç",
      d: "Bütün parçalar sökülür",
      sv: null,
      yeni: [],
      al: [],
      tk: !takili.length,
    });
    for (const p of PAKETLER) {
      const yeni = paketTak(takili, p.id);
      satirlar.push({
        k: p.id,
        ad: p.n,
        d: p.d + (p.oneri.length ? " · Öneri: " + p.oneri.map((id) => parcaBul(id)!.n).join(", ") : ""),
        sv: null,
        yeni,
        al: p.parcalar.filter((id) => !parcaSahipMi(no, id)),
        tk: p.parcalar.every((id) => takili.includes(id)),
      });
    }
  } else {
    const simdi = kategoriParcasi(no, mk);
    satirlar.push({
      k: "",
      ad: "Stok",
      d: "Aracın kendi parçası",
      sv: null,
      yeni: takili.filter((id) => parcaBul(id)!.kat != mk),
      al: [],
      tk: !simdi,
    });
    for (const p of PARCALAR.filter((x) => x.kat == mk))
      satirlar.push({
        k: p.id,
        ad: p.n,
        d: p.d,
        sv: p.sv,
        yeni: [...takili.filter((id) => parcaBul(id)!.kat != mk), p.id],
        al: parcaSahipMi(no, p.id) ? [] : [p.id],
        tk: simdi == p.id,
      });
  }
  const sec = G.ms != null ? satirlar.find((x) => x.k == G.ms) : undefined,
    onizleme = sec ? puan(no, sec.yeni, tur) : null,
    bedel = (x: Satir) => x.al.reduce((a, id) => a + parcaFiyati(id), 0),
    bakiye = para();
  // eylem düğmesi
  let eylem = "",
    kapali = false,
    al = false;
  if (sec) {
    const b = bedel(sec),
      anahtar = no + ":" + sec.k;
    if (sec.tk) {
      eylem = sec.k && mk != "paket" ? "Sök" : "Takılı";
      kapali = eylem == "Takılı";
    } else if (b > 0) {
      al = true;
      if (b > bakiye) {
        eylem = `${ikon("para")} ${sayi(b - bakiye)} daha gerekli`;
        kapali = true;
      } else
        eylem =
          PONAY?.anahtar == anahtar && PONAY.zaman > performance.now()
            ? `Emin misin? ${ikon("para")} ${sayi(b)}`
            : `Satın al ${ikon("para")} ${sayi(b)}`;
    } else eylem = sec.k ? "Tak" : "Stoka dön";
  }
  const kat = (k: ParcaKategori | "paket", ad: string) => {
    const tp = k == "paket" ? null : kategoriParcasi(no, k);
    return `<button data-k="${k}" class="${mk == k ? "on" : ""}${tp ? " takili" : ""}"><b>${ad}</b>${
      k == "paket" ? "" : tp ? pip(parcaBul(tp)!.sv) : "<small>Stok</small>"
    }</button>`;
  };
  // başlık kısa ad (bakiye aynı satırda: "Turbo / kompresör" sığmıyordu)
  const ust = mk == "paket" ? "Paketler" : kisaAd(KATEGORILER.find((x) => x[0] == mk)?.[1] ?? "");
  // seçili parçanın etkisi (şimdiki yapıya göre): tur süresi, fiziksel değerler, nokta kütle değerleri; yeşil iyi, kırmızı kötü
  const etkiler = sec
    ? parcaEtkileri(no, takili, sec.yeni, tur)
        .map(
          (e) =>
            `<span>${e.ad} <b class="${e.iyi == null ? "" : e.iyi ? "art" : "eks"}">${e.deger}</b></span>`,
        )
        .join("") || "<span>Değişiklik yok</span>"
    : "<span>Parçaya dokun: puana ve sürüşe etkisi</span>";
  g.innerHTML = `<div class="gust"><div class="gbas"><div class="gad">${tb ? `<div class="gtur" style="--c:${tb[4]}">${ikon(tb[3])}${tb[1]}</div>` : ""}<h1>${c.n}</h1></div></div>
<div class="grozet">${sinifRozeti(no, takili, tur)}${
    onizleme && onizleme.puan != taban.puan
      ? `<span class="bdg gsnf on" id="gsnf2" style="--c:${sinifRengi(onizleme.sinif)}">${ikon("sag")}<b>${onizleme.sinif}</b>${onizleme.puan}</span>`
      : ""
  }<span class="bdg gmbas">Modifiye${tur ? " · " + (turBilgi(tur)?.[1] ?? "") : ""}</span></div></div>
<div class="gmk" id="gmk">${kat("paket", "Paketler")}${KATEGORILER.map(([k, ad]) => kat(k, kisaAd(ad))).join("")}</div>
<div class="gmp" id="gmp"><div class="gmb" id="gmb"><b>${ust}</b><span>${paraYazi(bakiye)}</span></div>
<div class="gml" id="gml">${satirlar
    .map((x) => {
      const d = puan(no, x.yeni, tur).puan - taban.puan,
        b = bedel(x);
      return `<button class="gmr${x.tk ? " takili" : ""}${G.ms == x.k ? " on" : ""}" data-p="${x.k}"><span class="gmn">${x.sv != null ? pip(x.sv) : ""}${x.ad}</span>${x.tk ? "" : fark(d)}<span class="gmfy">${
        x.tk
          ? ikon("tamam") + "Takılı"
          : b > 0
            ? ikon("para") + sayi(b)
            : !x.k
              ? ""
              : x.sv === 0 || (x.sv != null && parcaFiyati(x.k) <= 0)
                ? "Ücretsiz"
                : "Sende"
      }</span>${G.ms == x.k ? `<small>${x.d}</small>` : ""}</button>`;
    })
    .join("")}</div>
<div class="gmo" id="gmo">${etkiler}</div>
<div class="gbt"><button class="btn alt" id="gmgeri">Garaj</button>${
    sec ? `<button class="btn${al ? " al" : ""}" id="gmok"${kapali ? " disabled" : ""}>${eylem}</button>` : ""
  }</div></div>`;
  g.querySelectorAll<HTMLElement>("#gmk [data-k]").forEach((e) => {
    e.onclick = () => {
      G.mk = e.dataset.k as ParcaKategori | "paket";
      G.ms = null;
      PONAY = null;
      showGar();
    };
  });
  g.querySelectorAll<HTMLElement>("#gml [data-p]").forEach((e) => {
    e.onclick = () => {
      G.ms = G.ms == e.dataset.p ? null : e.dataset.p!;
      PONAY = null;
      showGar();
    };
  });
  $("#gmgeri").onclick = () => {
    G.mod = false;
    G.ms = null;
    PONAY = null;
    showGar();
  };
  const ok = document.getElementById("gmok");
  if (ok && sec)
    ok.onclick = () => {
      const b = bedel(sec),
        anahtar = no + ":" + sec.k;
      if (!sec.tk && b > 0) {
        // satın alma: ilk dokunuş onay ister (3 sn), ikincisi satın alır ve takar
        if (!(PONAY?.anahtar == anahtar && PONAY.zaman > performance.now())) {
          PONAY = { anahtar, zaman: performance.now() + 3000 };
          clearTimeout(PONAY_ZAMANLA);
          PONAY_ZAMANLA = setTimeout(() => {
            PONAY = null;
            if (GAR && GAR.mod) showGar();
          }, 3050);
          showGar();
          return;
        }
        PONAY = null;
        clearTimeout(PONAY_ZAMANLA);
        if (!parcaSatinAl(no, sec.al)) return;
        kutla(sec.ad);
      }
      if (mk == "paket") {
        if (!sec.k) stokaDon(no);
        else paketiTak(no, sec.k);
      } else if (sec.tk || !sec.k) parcaSok(no, mk);
      else parcaTak(no, sec.k);
      showGar();
    };
}

/** satın alma kutlaması: parıltı ve "Satın alındı" */
function kutla(ad: string) {
  const k = document.createElement("div");
  k.className = "gkutla";
  k.innerHTML = `<div class="gkr"></div><b>Satın alındı</b><small>${ad}</small>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<i style="--a:${i * 45}deg"></i>`).join("")}`;
  document.body.appendChild(k);
  setTimeout(() => k.remove(), 1700);
}

/** motor dinleme: hangi aracın sesi çalıyor, ne zaman bitecek (ses tarafından "bitti" gelmezse 6 sn sonra kendiliğinden) */
let DINLE: { arac: number; zaman: number } | null = null,
  dinleBagli = false;
const DINLE_SURE = 6000;

/** ses butonunun görünümü: çalarken "Dinleniyor" ve dalga çubukları */
function sesButonu() {
  const b = document.querySelector<HTMLElement>("#gses");
  if (!b || !GAR) return;
  const on = !!DINLE && DINLE.arac == GAR.i && performance.now() < DINLE.zaman;
  b.classList.toggle("on", on);
  b.innerHTML = on
    ? '<i class="dalga"><u></u><u></u><u></u><u></u></i>Dinleniyor…'
    : ikon("ses") + "Motoru dinle";
}

/** ses tarafının "bitti" olayını bir kez bağla (yükleme anında değil, garaj ilk açılınca) */
function dinleBagla() {
  if (dinleBagli) return;
  dinleBagli = true;
  document.addEventListener("lt:garaj-dokunus", gorunum);
  document.addEventListener("lt:motor-dinle-bitti", (e) => {
    const a = (e as CustomEvent<{ arac: number }>).detail?.arac;
    if (DINLE && (a == null || a == DINLE.arac)) DINLE = null;
    sesButonu();
  });
}

/** vitrin tuşları: tam ekran düğmesi hep; tam ekranda dokunup bırakınca seç/geri tuşları çıkar, sürükleyince kaybolur; tam ekranda bilgi paneli gizlenir */
function gorunum() {
  if (!GAR) return;
  const v = $("#gvit");
  v.classList.toggle("tam", kamera.gTam);
  v.classList.toggle("dur", kamera.gBtn);
  $("#gar").style.display = kamera.gTam ? "none" : "";
  const t = document.getElementById("gvtam");
  if (t) t.style.display = kamera.gTam ? "none" : "";
  magazaSeridi(GAR);
  for (const id of ["gmal", "gdes"]) {
    const e = document.getElementById(id);
    if (e) e.style.display = kamera.gTam ? "none" : "";
  }
}

/** diğer araçların modellerini kareler arasına yayarak önceden kur ve GPU'ya yükle (araç değişince takılma olmasın) */
let ONHAZIR: ReturnType<typeof setTimeout> | undefined;
function onHazirla() {
  clearTimeout(ONHAZIR);
  const sira = CARS.filter((c) => !vitrinHazirMi(c));
  const adim = () => {
    const c = sira.shift();
    if (!c || !GAR) return;
    vitrinHazirla(c);
    vitrinIsit(c);
    ONHAZIR = setTimeout(adim, 150);
  };
  ONHAZIR = setTimeout(adim, 300);
}

/** türe en uygun açık araç: türün kendi aracı açıksa o, değilse türün ağırlıklı özelliklerinde (STAT) en yüksek açık araç */
const TUR_AGIRLIK: Record<string, Record<string, number>> = {
  gp: { "Azami hız": 1, "Yol tutuşu": 1, Hızlanma: 0.5, Fren: 0.5 },
  rx: { Arazi: 1, "Yol tutuşu": 1, Hızlanma: 0.7 },
  rl: { Arazi: 1.2, "Yol tutuşu": 1, Fren: 0.5 },
  dp: { Hızlanma: 1, "Yol tutuşu": 0.6, "Azami hız": 0.4 },
  dg: { Hızlanma: 1.2, "Azami hız": 0.8 },
};
export function onerilenArac(ty: string) {
  const own = CARS.findIndex((c) => c.ty == ty);
  if (own >= 0 && aracAcikMi(own)) return own;
  const w = TUR_AGIRLIK[ty] ?? {};
  let best = -1,
    bs = -1;
  CARS.forEach((c, k) => {
    if (!aracAcikMi(k)) return;
    const sc = STAT(c).reduce((a, [n, f]) => a + (w[n] ?? 0) * f, 0);
    if (sc > bs) {
      bs = sc;
      best = k;
    }
  });
  return best;
}

/** kilitli aracı vitrinde karart (siluet); açık araçta özgün malzemeler geri gelir. Malzemeler kopyalanır: ortak malzeme bozulmaz */
function kilitGorunumu(kilitli: boolean) {
  const cm = model.carM;
  if (!cm) return;
  const isle = (o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const u = m.userData as {
      orj?: THREE.Material | THREE.Material[];
      kar?: THREE.Material | THREE.Material[];
    };
    if (kilitli) {
      u.orj ??= m.material;
      u.kar ??= (Array.isArray(u.orj) ? u.orj : [u.orj]).map((x) => {
        const k = x.clone() as THREE.MeshStandardMaterial;
        k.color?.multiplyScalar(0.1);
        if (k.emissive) k.emissive.setHex(0);
        k.map = null;
        k.envMapIntensity = 0.2;
        return k;
      });
      m.material = Array.isArray(u.orj) ? (u.kar as THREE.Material[]) : (u.kar as THREE.Material[])[0];
    } else if (u.orj) m.material = u.orj;
  };
  cm.g.traverse(isle);
  for (const w of cm.ws) w.w.traverse(isle);
}

/** garajı aç: yarıştan önce (ev), serbest sürüşten önce (w) ya da menüden (ikisi de null) */
export function openGarage(ev: number | null, w: number | null = null) {
  // kilitli pistin garajı açılmaz (kilit görselleri menu dalında)
  if (ev != null && !pistAcikMi(EVENTS[ev].ty, EVENTS[ev].lv)) {
    note("Kilitli: seviye " + acilmaSeviyesi(EVENTS[ev]), 40);
    return;
  }
  const prev = carIndex(),
    rec = ev != null ? onerilenArac(EVENTS[ev].ty) : -1,
    acik = (k: number) => k >= 0 && aracAcikMi(k);
  ac({
    ev,
    w,
    prev,
    rec,
    i: acik(rec)
      ? rec
      : acik(prev) || (ev == null && w == null)
        ? prev
        : CARS.findIndex((_, k) => aracAcikMi(k)),
    mg: false,
    suz: "hepsi",
    alinan: null,
  });
}

/** mağazayı aç: sahip olunmayan araçlar (satın alınabilir, para ya da seviye yetmeyen); geri verilirse Geri onu çağırır, yoksa ana menü */
export function magazaAc(geriDonus?: () => void) {
  const prev = carIndex(),
    l = liste({ mg: true, suz: "hepsi" } as GarajDurumu);
  ac({
    ev: null,
    w: null,
    prev,
    rec: -1,
    i: l[0] ?? prev,
    mg: true,
    suz: "hepsi",
    geri: geriDonus,
    alinan: null,
  });
}

function ac(durum: GarajDurumu) {
  GAR = durum;
  dinleBagla();
  PARA_BIRAK?.();
  PARA_BIRAK = paraDinle(() => {
    if (GAR) showGar();
  });
  ONAY = null;
  oyun.mode = "garage";
  garajKameraSifirla();
  gizle("#menu", "#hud", "#mm", "#ctl", "#set", "#res");
  if (dunya.g) dunya.g.visible = false;
  for (const q of REG) if (q.g) q.g.visible = false;
  ground.visible = false;
  garG.visible = true;
  garajIsigi(true);
  showGar();
  onHazirla();
}

export function closeGarage() {
  DINLE = null;
  PARA_BIRAK?.();
  PARA_BIRAK = null;
  ONAY = null;
  SUZ_ACIK = false;
  magazaSeridi(null);
  aciklamaGoster(null);
  document.getElementById("gmal")?.remove();
  garG.visible = false;
  garajIsigi(false);
  vitrinBosalt();
  clearTimeout(ONHAZIR);
  aracIcKur();
  gizle("#gar", "#gvit");
  $("#gar").style.display = "";
  GAR = null;
}

/** Geri: garajda ana menü (serbest sürüştense o liste), mağazada çağıranın verdiği yer ya da ana menü */
function geriDon() {
  const G = GAR!;
  setCar(G.prev);
  closeGarage();
  if (G.mg && G.geri) G.geri();
  else showMenu(G.w != null ? ["free"] : undefined);
}

/** mağazadan yeni alınan araçla garajı aç */
function garajaGit() {
  const a = GAR!.alinan;
  closeGarage();
  if (a != null) setCar(a);
  openGarage(null);
}

function showGar() {
  const G = GAR!,
    c = CARS[G.i];
  if (oyun.CAR !== c) setCar(G.i, true);
  // ana menüden açılan garajda araç seçilmez (yalnız bakılır)
  const sec = G.ev != null ? "Yarış: " + EVENTS[G.ev].n : G.w != null ? "Sür: " + WORLDS[G.w].n : "";
  const g = $("#gar"),
    L = liste(G),
    acik = aracAcikMi(G.i),
    sa = aracSatinAlinabilirMi(G.i),
    // seviyesi gelmeyen araç karartılır; seviyesi yeten ama alınmamış araç (satilik) açık renkte kalır
    kilitli = !acik && sa.neden == "seviye",
    satilik = !acik && !kilitli,
    fiyat = aracFiyati(G.i),
    eksik = fiyat.para - para(),
    onayda = satilik && ONAY?.arac == G.i && ONAY.zaman > performance.now(),
    kilitYazi = "Seviye " + fiyat.seviye + "'de açılır",
    // seç düğmesinin yerine geçen yazı: kilit, satın al, onay ya da eksik para
    okYazi = kilitli
      ? ikon("kilit") + " " + kilitYazi
      : satilik
        ? eksik > 0
          ? `${ikon("para")} ${sayi(eksik)} daha gerekli`
          : onayda
            ? `Emin misin? ${ikon("para")} ${sayi(fiyat.para)}`
            : `Satın al ${ikon("para")} ${sayi(fiyat.para)}`
        : sec;
  // düğme: garajda yarış/sürüş varsa Seç; mağazada alınmamış araçta satın al ya da kilit
  const dugme = G.mg ? !acik : !!sec,
    tur = turBilgi(c.ty),
    // yarış öncesi garajda türün aracı alınmamışsa mağazaya yönlendiren ipucu
    magazadaVar = !G.mg && G.ev != null && CARS.some((x, k) => x.ty == EVENTS[G.ev!].ty && !aracAcikMi(k));
  kilitGorunumu(kilitli);
  g.classList.toggle("magaza", G.mg);
  g.classList.remove("hidden");
  g.classList.toggle("kilitli", kilitli);
  g.classList.toggle("satilik", satilik);
  document.getElementById("gmal")?.remove();
  if (G.mod && !G.mg && acik) {
    aciklamaGoster(null);
    modifiyeGoster(G);
    return;
  }
  g.classList.remove("modifiye");
  aciklamaGoster(L.length ? c.d : null);
  if (G.mg && !L.length) {
    // süzgeçte (ya da hiç) satılık araç kalmadı
    const hepsi = CARS.every((_, k) => aracAcikMi(k));
    g.innerHTML = `<div class="gust"><div class="gbas"><div class="gad"><h1>Mağaza</h1></div></div></div>
<div class="gbos">${hepsi ? "Bütün araçlar sende." : "Bu türde satılık araç kalmadı."}${G.alinan != null ? `<button class="btn al" id="gga">Garaja git</button>` : ""}</div>
<div class="galt"><div class="gbt"><button class="btn alt" id="gbk">Geri</button></div></div>`;
    $("#gvit").classList.add("hidden");
    $("#gbk").onclick = geriDon;
    if (G.alinan != null) $("#gga").onclick = garajaGit;
    return;
  }
  const sv = Object.fromEntries(STAT(c).map(([n, f]) => [n, f])),
    pct = (f: number) => Math.round(cl(f, 0.05, 1) * 100),
    // sağ üst çubuklar: ad, değer, birim, doluluk (0-1)
    cubuk: [string, string, string, number][] = [
      ["HIZ", String(Math.round(estTop(c))), "km/sa", sv["Azami hız"]],
      ["İVME", c.a100.toFixed(1), "sn", sv["Hızlanma"]],
      ["TUTUŞ", String(pct(sv["Yol tutuşu"])), "%", sv["Yol tutuşu"]],
      ["FREN", String(c.b100), "m", sv["Fren"]],
      ["ARAZİ", String(pct(sv["Arazi"])), "%", sv["Arazi"]],
    ],
    sira = Math.max(0, L.indexOf(G.i)) + 1,
    satir = (ad: string, deger: string, sinif = "") =>
      `<div class="${sinif}"><span>${ad}</span><b>${deger}</b></div>`,
    // sağ alttaki bilgi kutusu: mağazada fiyat / bakiye (+ seviye kilidi), garajda sahiplik ve seçim
    bilgi = G.mg
      ? satir("Fiyat", paraYazi(fiyat.para), "fy") +
        satir("Bakiye", paraYazi(para()), eksik > 0 ? "az" : "") +
        (kilitli ? satir("Kilit", ikon("kilit") + " Seviye " + fiyat.seviye, "kl") : "")
      : satir("Durum", "Sahip") +
        satir(sec ? "Seçim" : "Çekiş", sec || (c.awd ? "Dört çeker" : "Arkadan itiş"));
  g.innerHTML = `<div class="gust"><div class="gbas"><div class="gad">${tur ? `<div class="gtur" style="--c:${tur[4]}">${ikon(tur[3])}${tur[1]}</div>` : ""}<h1>${kilitli ? ikon("kilit") : ""}${c.n}</h1></div></div>
<div class="grozet">${sinifRozeti(G.i, takiliParcalar(G.i), puanTuru(G))}${G.i == G.rec ? '<span class="bdg rec">Önerilen</span>' : ""}${kilitli ? `<span class="bdg kilit" title="${kilitYazi}">${ikon("kilit")}Seviye ${fiyat.seviye}</span>` : ""}${L.length ? `<button class="bdg gbil${BILGI_ACIK ? " on" : ""}" id="gbil" aria-label="Araç bilgisi" aria-pressed="${BILGI_ACIK}">${ikon("bilgi")}</button>` : ""}</div></div>
<div class="gnav"><button class="ga" id="gpv" aria-label="Önceki">${ikon("sol")}</button><span class="gsay">${sira}/${L.length}</span><button class="ga" id="gnx" aria-label="Sonraki">${ikon("sag")}</button></div>
<div class="gbar">${cubuk
    .map(
      ([n, d, b, f]) =>
        `<div class="gk"><span class="gkb">${n}</span><u><s style="width:${Math.round(cl(f, 0.05, 1) * 100)}%"></s></u><b>${d}<small>${b}</small></b></div>`,
    )
    .join("")}<p>${c.hp} HP · ${c.kg} KG</p></div>
<div class="galt">${kilitli ? "" : `<div class="gsr"><button class="gses" id="gses"></button>${!G.mg && acik ? `<button class="gses gmod" id="gmod">${ikon("anahtar")}Modifiye</button>` : ""}</div>`}<div id="gpara">${bilgi}</div><div class="gbt"><button class="btn alt" id="gbk">Geri</button>${dugme ? `<button class="btn${satilik ? " al" : ""}" id="gok"${kilitli || (satilik && eksik > 0) ? " disabled" : ""}>${okYazi}</button>` : ""}<button class="btn alt gvtam" id="gvtam">Vitrin</button></div></div>`;
  magazaSeridi(G);
  const bil = document.getElementById("gbil");
  if (bil)
    bil.onclick = () => {
      BILGI_ACIK = !BILGI_ACIK;
      bil.classList.toggle("on", BILGI_ACIK);
      bil.setAttribute("aria-pressed", String(BILGI_ACIK));
      aciklamaGoster(c.d);
    };
  const v = $("#gvit");
  v.classList.remove("hidden");
  v.innerHTML = `<button class="gvar" id="gvpv" aria-label="Önceki">${ikon("sol")}</button><button class="gvar sag" id="gvnx" aria-label="Sonraki">${ikon("sag")}</button>${dugme ? `<button class="btn${satilik ? " al" : ""}" id="gvok"${kilitli || (satilik && eksik > 0) ? " disabled" : ""}>${okYazi}</button>` : ""}<button class="btn alt" id="gvbk">Geri</button>`;
  if (dugme) $("#gvok").onclick = () => $("#gok").click();
  // tam ekranda Geri: tam ekrandan çıkıp bilgi paneline döner
  $("#gvbk").onclick = () => {
    kamera.gTam = false;
    kamera.gBtn = false;
    gorunum();
  };
  $("#gvpv").onclick = () => go(-1);
  $("#gvnx").onclick = () => go(+1);
  $("#gvtam").onclick = () => {
    kamera.gTam = !kamera.gTam;
    kamera.gBtn = false;
    gorunum();
  };
  gorunum();
  const go = (yon: number) => {
    const n = L.length,
      k = L.indexOf(G.i);
    G.i = L[k < 0 ? 0 : (k + yon + n) % n];
    G.alinan = null;
    // kısa kayma ve solma: araç gidilen yönden gelir (kamera.gKay), arayüz CSS ile solar
    kamera.gKay = yon * 0.8;
    showGar();
    g.classList.remove("gecis");
    void g.offsetWidth;
    g.classList.add("gecis");
  };
  sesButonu();
  // motoru dinle: sesi ses modülü çalar (olay sözleşmesi: lt:motor-dinle → lt:motor-dinle-bitti); tekrar basınca baştan
  const ses = document.getElementById("gses");
  if (ses)
    ses.onclick = () => {
      const arac = G.i;
      DINLE = { arac, zaman: performance.now() + DINLE_SURE };
      document.dispatchEvent(new CustomEvent("lt:motor-dinle", { detail: { arac } }));
      sesButonu();
      setTimeout(() => {
        if (DINLE && DINLE.arac == arac && performance.now() >= DINLE.zaman) DINLE = null;
        sesButonu();
      }, DINLE_SURE + 50);
    };
  $("#gpv").onclick = () => go(-1);
  $("#gnx").onclick = () => go(+1);
  $("#gbk").onclick = geriDon;
  const md = document.getElementById("gmod");
  if (md)
    md.onclick = () => {
      G.mod = true;
      G.mk ??= "paket";
      G.ms = null;
      PONAY = null;
      showGar();
    };
  if (magazadaVar) {
    // yarış öncesi ipucu: panel sığsın diye vitrinin altında (mağaza kutlama çubuğuyla aynı yerde)
    const ip = document.createElement("div");
    ip.id = "gmal";
    ip.innerHTML = `<button class="btn al" id="gmg">${ikon("para")}Mağazada daha uygun araç</button>`;
    document.body.appendChild(ip);
    if (kamera.gTam) ip.style.display = "none";
    $("#gmg").onclick = () => {
      const { ev, w } = G;
      setCar(G.prev);
      closeGarage();
      magazaAc(() => openGarage(ev, w));
    };
  }
  if (G.alinan != null) {
    // satın alma sonrası: kutlamanın altında "Garaja git"
    const al = document.createElement("div");
    al.id = "gmal";
    al.innerHTML = `<span>${CARS[G.alinan].n} garajında</span><button class="btn al" id="gga">Garaja git</button>`;
    document.body.appendChild(al);
    $("#gga").onclick = garajaGit;
    if (kamera.gTam) al.style.display = "none";
  }
  if (dugme)
    $("#gok").onclick = () => {
      const { ev, w, i, prev } = G;
      if (!aracAcikMi(i)) {
        // satın alma: ilk dokunuş onay ister (3 sn), ikincisi satın alır
        if (aracSatinAlinabilirMi(i).ok) {
          if (!(ONAY && ONAY.arac == i && ONAY.zaman > performance.now())) {
            ONAY = { arac: i, zaman: performance.now() + 3000 };
            clearTimeout(ONAY_ZAMANLA);
            ONAY_ZAMANLA = setTimeout(() => {
              ONAY = null;
              if (GAR && GAR.i == i) showGar();
            }, 3050);
            showGar();
            return;
          }
          ONAY = null;
          clearTimeout(ONAY_ZAMANLA);
          if (aracSatinAl(i)) {
            if (G.mg) {
              // araç mağazadan düşer: yakın komşuya geçilir, "Garaja git" önerilir
              const k = L.indexOf(i),
                yeni = L.filter((x) => x != i);
              G.alinan = i;
              G.i = yeni.length ? yeni[Math.min(k, yeni.length - 1)] : i;
            }
            showGar();
            kutla(CARS[i].n);
          }
          return;
        }
        note("Kilitli: seviye " + acilmaSeviyesi({ arac: i }), 40);
        return;
      }
      closeGarage();
      if (ev != null) {
        setCar(prev);
        startEvent(ev, i);
        return;
      }
      // serbest sürüş: aracın önayarıyla başlar (önayar sonra duraklatma menüsünden değiştirilebilir)
      modifiyeUygula(i);
      if (w != null) startWorld(w);
      else showMenu();
    };
}
