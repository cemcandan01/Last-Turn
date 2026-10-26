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
  mutantPistleri,
  mutantRekoru,
  mutantYarisBitti,
  type MutantIsaret,
} from "../oyun/mutant";
import {
  ATOLYE,
  ETKINLIK_ODULU,
  etkinlikHedefi,
  RISKLER,
  STOK_YENILE,
  stokYenile,
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
  BOSS_RENK: [number, string] = [0xff2a2a, "#ff2a2a"];

const row = (a: string, b: string | number) => `<div class="rk"><span>${a}</span><span>${b}</span></div>`;
const sure = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/** sürüşü durdur, sayfayı aç */
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

const bossKarti = (b: Boss) =>
  `<div class="card mtb"><b>BOSS · ${b.ad}</b><span>${TUR[b.ty][0]} · ${b.d}</span><span>Yetenekleri: ${b.yetenekler.join(", ")}</span><span>İpucu: ${b.zayif}</span></div>`;

const hedefYazi = (ty: YarisTuru, limit: number) =>
  ty == "dp" ? Math.round(limit) + " puan" : ty == "dg" ? fmt3(limit) : fmt(limit);

/** haritadaki işaretler (3B sütun + mini harita) */
export function mutantIsaretleri(): { x: number; z: number; renk: string }[] {
  const k = mutant.kosu;
  if (!k) return [];
  return [
    ...k.etkinlikler.filter((e) => !e.yapildi).map((e) => ({ x: e.x, z: e.z, renk: TUR[e.ty][2] })),
    { x: ATOLYE[0], z: ATOLYE[1], renk: ATOLYE_RENK[1] },
    { x: BOSS_YERI[0], z: BOSS_YERI[1], renk: BOSS_RENK[1] },
  ];
}

function isaretleriGuncelle() {
  const k = mutant.kosu;
  const l: Isaret[] = k
    ? [
        ...k.etkinlikler.filter((e) => !e.yapildi).map((e) => ({ x: e.x, z: e.z, renk: TUR[e.ty][1] })),
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
    `<h1>MUTANT</h1><p>Boss'a ${sure(k.kalan)} var. Önce aracını seç: hepsi zayıf, koşuda güçlenecek.</p>${bossKarti(k.boss)}<div class="mtp">${araclar
      .map(
        (i) =>
          `<div class="card go" data-arac="${i}"><b>${CARS[i].n}</b><span>${CARS[i].hp} HP · ${Math.round(CARS[i].kg)} kg · ${CARS[i].awd > 0.5 ? "4×4" : "arkadan itiş"}</span></div>`,
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
    `<h1>MUTANT</h1><p>${baslik}</p>${
      k.pasifler.length
        ? `<p class="note">Takılı: ${k.pasifler.map((id) => pasifBul(id)!.ad).join(", ")}</p>`
        : ""
    }<div class="mtp">${k.secenekler
      .map((id) => {
        const p = pasifBul(id)!;
        return `<div class="card go" data-pasif="${id}"><b>${p.ad}</b><span>${p.d}</span></div>`;
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
          note("Renkli ışıklar etkinlik, mavi atölye, kırmızı boss", 26);
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
  const e = k.etkinlikler.find((q) => q.id == i.id)!,
    E = EVENTS[e.i],
    o = ETKINLIK_ODULU(e.sev);
  // risk kademesi: hedef 1★/2★/3★ (tek tur); ödül çarpanı ve kaçırmanın bedeli kartta açık
  const kademe = ([0, 1, 2] as Risk[])
    .map((r) => {
      const R = RISKLER[r],
        h = etkinlikHedefi(E, r);
      return `<div class="card go" data-risk="${r}"><b>${R.ad} · ${"★".repeat(r + 1)}</b><span>Hedef ${hedefYazi(E.ty, h.limit)}</span><span>Ödül ${Math.round(o.xp * R.odul)} XP · ${Math.round(o.para * R.odul)} para</span><span>Kaçırırsan ${R.ceza ? "ödül yok, boss'a −" + R.ceza + " sn" : Math.round(o.para * R.kacirma) + " para teselli"}</span></div>`;
    })
    .join("");
  const s = sayfaAc(
    `<h1>${TUR[e.ty][0]}</h1><p>${E.n} · ${SEVIYELER[e.sev - 1].n}${E.laps ? " · 1 tur" : ""} · Boss'a ${sure(k.kalan)}</p><div class="mtp">${kademe}</div>` +
      '<p class="note">Riski sen seç: zor hedef çok kazandırır, kaçırmak süre götürür. Etkinlik süresi de boss geri sayımından düşer.</p><button class="btn alt" id="mGec">Vazgeç</button>',
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
  } else mutant.etkinlik = id;
  isaretlerGorunur(false);
  $("#res").classList.add("hidden");
  startEvent(i, mutantArac, true);
}

/** atölye: bölgenin stoğundan koşu parasıyla parça (aynı kategoride son alınan geçer); stok parayla yenilenir */
function atolye() {
  const k = mutant.kosu!,
    kat = (id: string) => KATEGORILER.find((q) => q[0] == PARCALAR.find((p) => p.id == id)!.kat)![1];
  const s = sayfaAc(
    `<div class="bar"><button class="btn" id="mKapat">Haritaya dön</button><button class="btn alt" id="mYenile" ${k.para < STOK_YENILE ? "disabled" : ""}>Stoğu yenile · ${STOK_YENILE}</button></div><h1>Atölye</h1><p>Para: <b>${k.para}</b>. Bu bölgede satılan ${k.stok.length} parça. Takılan aynı kategorideki parçanın yerine geçer.</p><div class="mtz">` +
      k.stok
        .map((id) => {
          const p = PARCALAR.find((q) => q.id == id)!,
            f = parcaFiyati(k, p.sv, p.id);
          return `<div class="rk"><span>${p.n}<small> · ${kat(id)} · ${p.d}</small></span><span><button class="btn mal" data-parca="${p.id}" ${k.para < f ? "disabled" : ""}>${f}</button></span></div>`;
        })
        .join("") +
      `</div>${k.parcalar.length ? `<div class="lbl">Takılı</div><p>${k.parcalar.map((id) => PARCALAR.find((p) => p.id == id)!.n).join(", ")}</p>` : ""}`,
  );
  s.querySelector<HTMLElement>("#mKapat")!.onclick = surusDevam;
  s.querySelector<HTMLElement>("#mYenile")!.onclick = () => {
    if (stokYenile(k)) atolye();
  };
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

function bossSayfasi(zorunlu: boolean) {
  const k = mutant.kosu!,
    i = mutantBossPisti(),
    E = EVENTS[i];
  const s = sayfaAc(
    `<h1>${zorunlu ? "Süre doldu!" : "Boss yarışı"}</h1><p>Bölge ${k.bolge} · ${E.n}</p>${bossKarti(k.boss)}` +
      row(
        "Boss hedefi (bölge " + k.bolge + " · " + "★".repeat(Math.min(3, k.bolge)) + ")",
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
    `<h1>${baslik}</h1>` +
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
      `<h1>Koşu bitti</h1><p>${mutant.yeniRekor ? "Yeni rekor! " : ""}Ulaşılan bölge ${k.bolge}, yenilen boss ${k.yenilenBoss}.</p><div class="mtz">` +
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
  mutant.ui = {
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
  return ["BOSS " + sure(k.kalan), k.boss.ad + " · Sv " + k.seviye + " · " + k.para + " para"];
}
