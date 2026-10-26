import "./mutant-theme.css";

// MUTANT arayüzü (A1): koşu başı (boss kartı, araç, başlangıç pasifi), etkinlik kartı, atölye, yarış sonucu, seviye
// seçimi, boss kartı, koşu özeti ve HUD metinleri. Haritadaki işaretler cizim/isaretler.ts + mini harita.
// Kurallar oyun/mutant-kosu.ts; HUD kuralları docs/HUD.md.
import { CARS, type YarisTuru } from "../arac/araclar";
import { KATEGORILER, PARCALAR } from "../arac/parcalar";
import { fmt, fmt3 } from "../cekirdek/bicim";
import { $ } from "../cekirdek/dom";
import { isaretleriKur, isaretlerGorunur, type Isaret } from "../cizim/isaretler";
import { Hw, WORLDS } from "../dunya/dunya";
import { SEVIYELER } from "../dunya/pist-tanimlari";
import { setActive } from "../oyun/bolge";
import { oyun } from "../oyun/durum";
import { BASLANGIC_ARACLARI } from "../oyun/ekonomi";
import { girdiSifirla } from "../oyun/girdi";
import {
  BOSS_YERI,
  mutant,
  mutantArac,
  mutantAracSec,
  mutantBossKosulu,
  mutantBossPisti,
  mutantBossaGir,
  mutantKapat,
  mutantKosuluGeriYukle,
  mutantKurulumUygula,
  mutantAracGuncelle,
  mutantPistleri,
  mutantRekoru,
  mutantDurumu,
  mutantYarisBitti,
  type MutantIsaret,
} from "../oyun/mutant";
import {
  ATOLYE,
  ETKINLIK_ODULU,
  LANETLER,
  sandikAc,
  etkinlikHedefi,
  RISKLER,
  STOK_YENILE,
  stokYenile,
  tamirBedeli,
  tamirEt,
  GOVDE,
  type Risk,
  bossHedefi,
  parcaAl,
  parcaFiyati,
  pasifBul,
  pasifSec,
  seviyeXp,
  type Boss,
  type EtkinlikSonucu,
} from "../oyun/mutant-kosu";
import { reset, sim } from "../oyun/surus";
import { EVENTS, leaveEvent, startEvent, yaris } from "../oyun/yarislar";
import { mulberry32 } from "../cekirdek/rastgele";
import { note } from "./bildirim";
import { kontrolleriKur } from "./kontroller";

const TUR: Record<YarisTuru, [string, number, string]> = {
  gp: ["Asfalt yarışı", 0xff5a3c, "#ff5a3c"],
  rx: ["Rallikros", 0xd08a48, "#d08a48"],
  rl: ["Toprak / ralli", 0x4fbf74, "#4fbf74"],
  dp: ["Drift", 0xb67cff, "#b67cff"],
  dg: ["Drag", 0xffd23c, "#ffd23c"],
};
const ATOLYE_RENK: [number, string] = [0x3cc8ff, "#3cc8ff"],
  BOSS_RENK: [number, string] = [0xff2a2a, "#ff2a2a"],
  /** sandık: normal açık sarı, lanetli eflatun */
  SANDIK_RENK: [number, string] = [0xfff0a8, "#fff0a8"],
  LANET_RENK: [number, string] = [0xff3cc8, "#ff3cc8"];

const row = (a: string, b: string | number) => `<div class="rk"><span>${a}</span><span>${b}</span></div>`;
const sure = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/** sürüşü durdur, sayfayı aç */
function sayfaAc(html: string) {
  oyun.mode = "result";
  girdiSifirla();
  $("#ctl").classList.add("hidden");
  const r = $("#res");
  r.classList.remove("hidden");
  r.innerHTML = `<div class="mutant-shell">${html}</div>`;
  return r;
}

function surusDevam() {
  $("#res").classList.add("hidden");
  oyun.mode = "drive";
  kontrolleriKur();
  $("#ctl").classList.remove("hidden");
}

const bossKarti = (b: Boss) =>
  `<div class="card mtb"><span class="mtb-kicker">HEDEF / ${TUR[b.ty][0]}</span><b>${b.ad}</b><span class="mtb-detail">${b.d}</span><div class="mtb-facts"><span><small>TEHLİKE</small>${b.yetenekler.join(" · ")}</span><span><small>ZAYIF NOKTA</small>${b.zayif}</span></div></div>`;

const hedefYazi = (ty: YarisTuru, limit: number) =>
  ty == "dp" ? Math.round(limit) + " puan" : ty == "dg" ? fmt3(limit) : fmt(limit);

/** haritadaki işaretler (3B sütun + mini harita) */
export function mutantIsaretleri(): { x: number; z: number; renk: string }[] {
  const k = mutant.kosu;
  if (!k) return [];
  return [
    ...k.etkinlikler.filter((e) => !e.yapildi).map((e) => ({ x: e.x, z: e.z, renk: TUR[e.ty][2] })),
    ...k.sandiklar
      .filter((q) => !q.acildi)
      .map((q) => ({ x: q.x, z: q.z, renk: (q.lanetli ? LANET_RENK : SANDIK_RENK)[1] })),
    { x: ATOLYE[0], z: ATOLYE[1], renk: ATOLYE_RENK[1] },
    { x: BOSS_YERI[0], z: BOSS_YERI[1], renk: BOSS_RENK[1] },
  ];
}

function isaretleriGuncelle() {
  const k = mutant.kosu;
  const l: Isaret[] = k
    ? [
        ...k.etkinlikler.filter((e) => !e.yapildi).map((e) => ({ x: e.x, z: e.z, renk: TUR[e.ty][1] })),
        ...k.sandiklar
          .filter((q) => !q.acildi)
          .map((q) => ({ x: q.x, z: q.z, renk: (q.lanetli ? LANET_RENK : SANDIK_RENK)[0], boy: 24 })),
        { x: ATOLYE[0], z: ATOLYE[1], renk: ATOLYE_RENK[0], boy: 40 },
        { x: BOSS_YERI[0], z: BOSS_YERI[1], renk: BOSS_RENK[0], boy: 140 },
      ]
    : [];
  isaretleriKur(l, Hw);
}

/** koşu başı: boss kartı, 3 kötü araçtan biri, sonra 3 başlangıç pasifinden biri */
function basla() {
  const k = mutant.kosu!,
    r = mulberry32(k.tohum ^ 0x5bd1e995),
    aday = [...BASLANGIC_ARACLARI],
    araclar: number[] = [];
  while (araclar.length < 3 && aday.length) araclar.push(aday.splice(Math.floor(r() * aday.length), 1)[0]);
  const s = sayfaAc(
    `<div class="mt-heading"><span class="mt-eyebrow">YENİ KOŞU / ${sure(k.kalan)} HAZIRLIK</span><h1>MUTANT</h1><p>Aracını seç. Gücünü yolda kazanacaksın.</p></div>${bossKarti(k.boss)}<div class="mtp">${araclar
      .map(
        (i) =>
          `<div class="card go mt-choice mt-car" data-arac="${i}"><small class="mt-card-tag">BAŞLANGIÇ ARACI</small><b>${CARS[i].n}</b><span>${CARS[i].hp} HP · ${Math.round(CARS[i].kg)} kg</span><span>${CARS[i].awd > 0.5 ? "4×4" : "Arkadan itiş"}</span><strong class="mt-action">SEÇ</strong></div>`,
      )
      .join("")}</div>`,
  );
  s.querySelectorAll<HTMLElement>("[data-arac]").forEach(
    (e) =>
      (e.onclick = () => {
        mutantAracSec(+e.dataset.arac!);
        pasifSayfasi("Başlangıç yeteneği seç.");
      }),
  );
}

function pasifSayfasi(baslik: string) {
  const k = mutant.kosu!;
  const s = sayfaAc(
    `<div class="mt-heading"><span class="mt-eyebrow">YENİ MUTASYON</span><h1>GÜCÜNÜ SEÇ</h1><p>${baslik}</p></div>${
      k.pasifler.length
        ? `<p class="note">Takılı: ${k.pasifler.map((id) => pasifBul(id)!.ad).join(", ")}</p>`
        : ""
    }<div class="mtp">${k.secenekler
      .map((id) => {
        const p = pasifBul(id)!;
        return `<div class="card go mt-choice mt-skill" data-pasif="${id}"><small class="mt-card-tag">MUTASYON</small><b>${p.ad}</b><span>${p.d}</span><strong class="mt-action">KUŞAN</strong></div>`;
      })
      .join("")}</div>`,
  );
  s.querySelectorAll<HTMLElement>("[data-pasif]").forEach(
    (e) =>
      (e.onclick = () => {
        const ilk = k.faz == "basla";
        if (!pasifSec(k, e.dataset.pasif!)) return;
        mutantKurulumUygula();
        if (k.faz == "secim") return pasifSayfasi("Seviye atladın: bir yetenek daha seç.");
        if (ilk) {
          isaretleriGuncelle();
          surusDevam();
          note("Renkli ışıklar etkinlik, sarı sandık, eflatun lanetli sandık, mavi atölye, kırmızı boss", 30);
          return;
        }
        devam();
      }),
  );
}

/** seçim/sonuç sonrası: bekleyen boss varsa onu, yoksa sürüşe */
function devam() {
  if (mutant.bossBekliyor) return sureDoldu();
  surusDevam();
}

function isaret(i: MutantIsaret) {
  const k = mutant.kosu!;
  if (i.tur == "atolye") return atolye();
  if (i.tur == "boss") return bossSayfasi(false);
  if (i.tur == "sandik") return sandikSayfasi(i.id);
  const e = k.etkinlikler.find((q) => q.id == i.id)!,
    E = EVENTS[e.i],
    o = ETKINLIK_ODULU(e.sev);
  // risk kademesi: hedef 1★/2★/3★ (tek tur); ödül çarpanı ve kaçırmanın bedeli kartta açık
  const kademe = ([0, 1, 2] as Risk[])
    .map((r) => {
      const R = RISKLER[r],
        h = etkinlikHedefi(E, r);
      return `<div class="card go mt-choice mt-risk-${r}" data-risk="${r}"><small class="mt-card-tag">${"★".repeat(r + 1)} / ${R.ad}</small><b>${hedefYazi(E.ty, h.limit)}</b><span class="mt-reward">+${Math.round(o.xp * R.odul)} XP · +${Math.round(o.para * R.odul)} PARA</span><span class="mt-cost">${R.ceza ? "BAŞARISIZLIK: −" + R.ceza + " sn" : "BAŞARISIZLIK: " + Math.round(o.para * R.kacirma) + " para"}</span><strong class="mt-action">RİSKİ AL</strong></div>`;
    })
    .join("");
  const s = sayfaAc(
    `<div class="mt-heading"><span class="mt-eyebrow">ETKİNLİK / ${SEVIYELER[e.sev - 1].n}</span><h1>${TUR[e.ty][0]}</h1><p>${E.n}${E.laps ? " · 1 tur" : ""} · ${sure(k.kalan)} kaldı</p></div><div class="mtp">${kademe}</div>` +
      '<p class="note mt-notice">Zor hedef, yüksek ödül. Süren her koşulda azalır.</p><button class="btn alt" id="mGec">Vazgeç</button>',
  );
  s.querySelectorAll<HTMLElement>("[data-risk]").forEach(
    (c) =>
      (c.onclick = () => {
        mutant.risk = +c.dataset.risk! as Risk;
        etkinlikBaslat(e.id, e.i);
      }),
  );
  s.querySelector<HTMLElement>("#mGec")!.onclick = surusDevam;
}

function etkinlikBaslat(id: number | "boss", i: number) {
  const S = sim.S;
  mutant.donus = [S.x, S.z, S.h];
  if (id == "boss") {
    mutantBossaGir();
    mutantBossKosulu();
  } else {
    mutant.etkinlik = id;
    // Risk Kondansatörü gibi perkler etkinlik başında tetiklenir
    if (mutant.kosu) mutant.kosu.bekleyenRisk = mutant.risk;
  }
  isaretlerGorunur(false);
  $("#res").classList.add("hidden");
  startEvent(i, mutantArac, true);
}

/** atölye: bölgenin stoğundan koşu parasıyla parça (aynı kategoride son alınan geçer); stok parayla yenilenir */
function atolye() {
  const k = mutant.kosu!,
    kat = (id: string) => KATEGORILER.find((q) => q[0] == PARCALAR.find((p) => p.id == id)!.kat)![1];
  const s = sayfaAc(
    `<div class="bar"><button class="btn" id="mKapat">Haritaya dön</button><button class="btn alt" id="mYenile" ${k.para < STOK_YENILE ? "disabled" : ""}>Stoğu yenile · ${STOK_YENILE}</button>${k.govde < GOVDE.tam ? `<button class="btn alt" id="mTamir" ${k.para < GOVDE.tamirFiyati ? "disabled" : ""}>Tamir · ${tamirBedeli(k)}</button>` : ""}</div><div class="mt-heading"><span class="mt-eyebrow">GARAJ / BÖLGE ${k.bolge}</span><h1>ATÖLYE</h1><div class="mt-wallet"><span><small>PARA</small><strong>${k.para}</strong></span><span><small>GÖVDE</small><strong>${Math.round(k.govde)}%</strong></span><span><small>GÜÇ KAYBI</small><strong>−${Math.round(GOVDE.gucKaybi * (100 - k.govde))}%</strong></span></div></div><div class="mtz">` +
      k.stok
        .map((id) => {
          const p = PARCALAR.find((q) => q.id == id)!,
            f = parcaFiyati(k, p.sv, p.id);
          return `<div class="rk mt-shop-row"><span><b>${p.n}</b><small>${kat(id)} · ${p.d}</small></span><span><button class="btn mal" data-parca="${p.id}" ${k.para < f ? "disabled" : ""}>${f} PARA</button></span></div>`;
        })
        .join("") +
      `</div>${k.parcalar.length ? `<div class="lbl">Takılı</div><p>${k.parcalar.map((id) => PARCALAR.find((p) => p.id == id)!.n).join(", ")}</p>` : ""}`,
  );
  s.querySelector<HTMLElement>("#mKapat")!.onclick = surusDevam;
  s.querySelector<HTMLElement>("#mYenile")!.onclick = () => {
    if (stokYenile(k)) atolye();
  };
  s.querySelector<HTMLElement>("#mTamir")?.addEventListener("click", () => {
    if (!tamirEt(k)) return;
    mutantAracGuncelle();
    note("Tamir: gövde " + Math.round(k.govde), 30);
    atolye();
  });
  s.querySelectorAll<HTMLButtonElement>("[data-parca]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = PARCALAR.find((q) => q.id == b.dataset.parca)!;
        if (!parcaAl(k, p.id, p.sv)) return;
        mutantKurulumUygula();
        note(p.n + " takıldı", 40);
        atolye();
      }),
  );
}

/** eklenti sandığı: normalde iki sıradan eklentiden biri bedava; lanetlide nadir eklenti, bedeli lanet */
function sandikSayfasi(id: number) {
  const k = mutant.kosu!,
    q = k.sandiklar.find((x) => x.id == id)!,
    L = q.lanet ? LANETLER[q.lanet] : null;
  const s = sayfaAc(
    `<div class="mt-heading ${q.lanetli ? "mt-curse" : ""}"><span class="mt-eyebrow">${q.lanetli ? "YÜKSEK RİSK / NADİR ÖDÜL" : "KEŞİF / EKLENTİ"}</span><h1>${q.lanetli ? "Lanetli sandık" : "Eklenti sandığı"}</h1><p>${q.lanetli ? "Gücünü al, bedelini öde." : "Bir eklenti seç. Koşu sonuna kadar senin."}</p></div><div class="mtp">` +
      q.secenekler
        .map((e) => {
          const p = pasifBul(e)!;
          return `<div class="card go mt-choice ${L ? "mt-risk-2" : "mt-skill"}" data-eklenti="${e}"><small class="mt-card-tag">${L ? "LANETLİ EKLENTİ" : "EKLENTİ"}</small><b>${p.ad}</b><span>${p.d}</span>${L ? `<span class="mt-cost">BEDEL · ${L.ad}: ${L.d}</span>` : ""}<strong class="mt-action">AL</strong></div>`;
        })
        .join("") +
      '</div><button class="btn alt" id="mGec">Bırak</button>',
  );
  s.querySelectorAll<HTMLElement>("[data-eklenti]").forEach(
    (c) =>
      (c.onclick = () => {
        if (!sandikAc(k, id, c.dataset.eklenti!)) return;
        mutantAracGuncelle();
        isaretleriGuncelle();
        note(pasifBul(c.dataset.eklenti!)!.ad + " takıldı" + (L ? " · " + L.d : ""), 40);
        surusDevam();
      }),
  );
  s.querySelector<HTMLElement>("#mGec")!.onclick = surusDevam;
}

function bossSayfasi(zorunlu: boolean) {
  const k = mutant.kosu!,
    i = mutantBossPisti(),
    E = EVENTS[i];
  const s = sayfaAc(
    `<div class="mt-heading mt-boss-heading"><span class="mt-eyebrow">BÖLGE ${k.bolge} / ${zorunlu ? "SON ŞANS" : "MEYDAN OKUMA"}</span><h1>${zorunlu ? "SÜRE DOLDU" : "BOSS YARIŞI"}</h1><p>${E.n}</p></div>${bossKarti(k.boss)}` +
      row(
        "Boss hedefi (" +
          ["başlangıç aracı ölçüsü", "geliştirilmiş araç", "motor + uzmanlık"][Math.min(3, k.bolge) - 1] +
          ")",
        hedefYazi(E.ty, bossHedefi(k, mutantPistleri()[i])),
      ) +
      row("Tur", E.laps || 1) +
      row("Seviye", k.seviye + " · " + k.pasifler.length + " yetenek · " + k.parcalar.length + " parça") +
      '<p class="note">Kaybedersen koşu biter. Kazanırsan sonraki bölge ve yeni bir boss.</p><button class="btn" id="mBoss">Boss yarışına gir</button>' +
      (zorunlu ? "" : '<button class="btn alt" id="mGec">Henüz değil</button>'),
  );
  s.querySelector<HTMLElement>("#mBoss")!.onclick = () => {
    mutant.bossBekliyor = false;
    etkinlikBaslat("boss", i);
  };
  s.querySelector<HTMLElement>("#mGec")?.addEventListener("click", surusDevam);
}

function sureDoldu() {
  bossSayfasi(true);
}

/** etkinlikten açık dünyaya dön (aynı noktaya) */
function haritayaDon() {
  leaveEvent();
  mutantKosuluGeriYukle();
  oyun.CURW = WORLDS[0];
  setActive(null);
  const d = mutant.donus;
  if (d) reset(d[0], d[1], d[2]);
  else reset();
  mutantKurulumUygula();
  isaretleriGuncelle();
}

function sonuc(r: EtkinlikSonucu | null, boss: boolean, gecti: boolean) {
  const k = mutant.kosu!;
  const bitti = k.faz == "bitti";
  const baslik = boss ? (gecti ? "Boss yenildi!" : "Boss kazandı") : gecti ? "Hedef geçildi" : "Hedef kaçtı";
  const s = sayfaAc(
    `<div class="mt-heading ${gecti ? "mt-success" : "mt-failed"}"><span class="mt-eyebrow">${boss ? "BOSS SONUCU" : "ETKİNLİK SONUCU"}</span><h1>${baslik}</h1></div>` +
      (boss
        ? gecti
          ? `<p>Bölge ${k.bolge} açıldı. Yeni boss: ${k.boss.ad}. +200 para, +150 XP.</p>`
          : "<p>Koşu bitti.</p>"
        : row("Kazanılan para", "+" + (r?.para ?? 0)) +
          row("Seviye", k.seviye + " · " + k.xp + " / " + seviyeXp(k.seviye + 1) + " XP") +
          (r?.ekSure ? row("Zaman bükücü", "+" + r.ekSure + " sn") : "") +
          (r?.ceza ? row(RISKLER[mutant.risk].ad + " hedef kaçtı", "Boss'a −" + r.ceza + " sn") : "")) +
      row("Boss'a kalan", sure(k.kalan)) +
      `<button class="btn" id="mDevam">${bitti ? "Özet" : "Haritaya dön"}</button>`,
  );
  s.querySelector<HTMLElement>("#mDevam")!.onclick = () => {
    if (bitti) return ozet();
    haritayaDon();
    if (k.faz == "secim") return pasifSayfasi("Seviye atladın: bir yetenek seç.");
    devam();
  };
}

let yeniKosu: () => void = () => {},
  anaMenu: () => void = () => {};

function ozet() {
  const k = mutant.kosu!;
  leaveEvent();
  mutantKosuluGeriYukle();
  const rek = mutantRekoru();
  const s = sayfaAc(
    '<div class="bar"><button class="btn" id="mYeni">Yeni koşu</button><button class="btn alt" id="mMenu">Ana menü</button></div>' +
      `<div class="mt-heading ${k.pert ? "mt-failed" : "mt-success"}"><span class="mt-eyebrow">KOŞU RAPORU</span><h1>${k.pert ? "Araç pert oldu" : "Koşu bitti"}</h1></div><p>${mutant.yeniRekor ? "Yeni rekor! " : ""}${k.pert ? "Gövde sıfırlandı: " + k.carpma + " sert çarpma, " + k.spin + " spin. " : ""}Ulaşılan bölge ${k.bolge}, yenilen boss ${k.yenilenBoss}.</p><div class="mtz">` +
      row("Hasar", k.carpma + " çarpma · " + k.spin + " spin · gövde " + Math.round(k.govde)) +
      row("Araç", mutantArac >= 0 ? CARS[mutantArac].n : "—") +
      row("Seviye", k.seviye) +
      row("Etkinlik", k.tamamlanan) +
      row("Koşu süresi", sure(k.zaman)) +
      row("Yetenekler", k.pasifler.map((id) => pasifBul(id)!.ad).join(", ") || "—") +
      row("Parçalar", k.parcalar.length) +
      row("En iyi", "Bölge " + rek.bolge + " · " + rek.boss + " boss") +
      '</div><p class="note">MUTANT koşuları kariyer ödülü, para, XP ya da rekor vermez.</p>',
  );
  s.querySelector<HTMLElement>("#mYeni")!.onclick = () => yeniKosu();
  s.querySelector<HTMLElement>("#mMenu")!.onclick = () => {
    mutantKapat();
    anaMenu();
  };
}

/** arayüzü koşuya bağla (startWorld) */
export function mutantArayuzuKur(yeni: () => void, menu: () => void) {
  yeniKosu = yeni;
  anaMenu = menu;
  // klavyede nitro: N
  addEventListener("keydown", (e) => {
    if ((e.key == "n" || e.key == "N") && mutant.kosu && oyun.mode == "drive") mutant.nitro = true;
  });
  mutant.ui = {
    hasar: (tur, pert) => {
      const k = mutant.kosu!;
      if (!pert) return note((tur == "carpma" ? "Çarpma" : "Spin") + " · Gövde " + Math.round(k.govde), 34);
      // pert: yarış sürüyorsa bitir, özet
      const EV = yaris.EV;
      if (EV) EV.state = "done";
      ozet();
    },
    basla,
    secim: () => pasifSayfasi("Seviye atladın: bir yetenek seç."),
    isaret,
    sonuc,
    sureDoldu,
    bitti: ozet,
  };
}

/** duraklatmada MUTANT etkinliğinden vazgeç: kaçırılmış sayılır (boss'ta koşu biter) */
export function mutantVazgec() {
  $("#set").classList.add("hidden");
  const EV = yaris.EV;
  if (!EV?.mutant) return;
  EV.state = "done";
  oyun.mode = "result";
  mutantYarisBitti(false);
}

/** HUD: sol üst başlık ve panel */
export function mutantBaslik(evAdi: string | null): string | null {
  const k = mutant.kosu;
  if (!k) return null;
  if (evAdi)
    return mutant.etkinlik == "boss" ? "BOSS · " + k.boss.ad : "MUTANT " + sure(k.kalan) + " · " + evAdi;
  return "MUTANT · BÖLGE " + k.bolge;
}
export function mutantPaneli(): [string, string] | null {
  const k = mutant.kosu;
  if (!k || yaris.EV) return null;
  return [
    "BOSS " + sure(k.kalan),
    k.boss.ad + " · Sv " + k.seviye + " · " + k.para + " para · Gövde " + Math.round(k.govde),
  ];
}

/** NİTRO tuşu (koşuda; kontroller.ts sol grubun üstüne koyar) */
export const mutantTusuHtml = () =>
  mutant.kosu ? '<div class="k" id="mnt"><i></i><b>NİTRO</b><s></s></div>' : "";

export function mutantTusuBagla() {
  const e = document.getElementById("mnt");
  if (!e) return;
  e.addEventListener("pointerdown", (v) => {
    v.preventDefault();
    mutant.nitro = true;
  });
}

/** her karede: tuşun enerji dolgusu, maliyet çizgisi, açık/hazır durumu */
export function mutantTusuGuncelle() {
  const e = document.getElementById("mnt"),
    d = mutantDurumu();
  if (!e || !d) return;
  const dolu = Math.round((100 * d.enerji) / d.kapasite) + "%",
    cizgi = Math.min(100, Math.round((100 * d.nitroMaliyet) / d.kapasite)) + "%",
    sinif = d.nitroAcik ? "k on" : d.nitroHazir ? "k hazir" : "k";
  if (e.style.getPropertyValue("--e") != dolu) e.style.setProperty("--e", dolu);
  if (e.style.getPropertyValue("--m") != cizgi) e.style.setProperty("--m", cizgi);
  if (e.className != sinif) e.className = sinif;
}
