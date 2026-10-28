// MUTANT arayüzü (A1): koşu başı (boss kartı, araç, başlangıç pasifi), etkinlik kartı, atölye, yarış sonucu, seviye
// seçimi, boss kartı, koşu özeti ve HUD metinleri. Haritadaki işaretler cizim/isaretler.ts + mini harita.
// Kurallar oyun/mutant-kosu.ts; HUD kuralları docs/HUD.md.
import { CARS, type YarisTuru } from "../arac/araclar";
import { KATEGORILER, PARCALAR } from "../arac/parcalar";
import { fmt, fmt3 } from "../cekirdek/bicim";
import { $ } from "../cekirdek/dom";
import { ikon, type IkonAdi } from "./ikonlar";
import {
  BECERILER,
  BECERI_EKLENTILERI,
  SKILL_YUVASI,
  beceriBul,
  beceriEklentisiBul,
  eklentiUyar,
  type BeceriOrnegi,
} from "../cekirdek/beceri";
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
  DUELLO,
  ETKINLIK_ODULU,
  LANETLER,
  sandikAc,
  sandikTeklifi,
  sandikOduluBul,
  sandikReddet,
  testKurulumu,
  testBeceriAyarla,
  testKurulumunuSifirla,
  BOSS_SURESI,
  testBolgeyeGec,
  beceriTeklifleri,
  PASIFLER,
  SATILMAZ,
  etkinlikHedefi,
  RISKLER,
  STOK_YENILE,
  stokYenile,
  tamirBedeli,
  tamirEt,
  GOVDE,
  KAPORA,
  kaporaBelirle,
  secenekTuru,
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
import { KISILIKLER } from "../yz/kisilik";
import { rakip } from "../oyun/rakip";
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

/** Uzmanlığı olan kartlar türün rengini ve oyundaki yerleşik yarış ikonunu taşır; genel etkiler nötrdür. */
const TUR_IKON: Record<YarisTuru, IkonAdi> = {
  gp: "pist",
  rx: "rallycross",
  rl: "dag",
  dp: "donus",
  dg: "isik",
};
function kartTuru(id: string): YarisTuru | null {
  const oz = id.split(":");
  const ana = oz[0] == "b" || oz[0] == "y" || oz[0] == "v" ? oz[1] : id;
  const m: Record<string, YarisTuru> = {
    asfalt: "gp",
    fren: "gp",
    toprak: "rl",
    aci: "dp",
    "lastik-drift": "dp",
    "suspansiyon-drift": "dp",
    "diferansiyel-kilitli": "dp",
    "diferansiyel-kaynakli": "dp",
    "aci-kiti": "dp",
    "lastik-toprak": "rl",
    "suspansiyon-ralli": "rl",
    "diferansiyel-ralli": "rl",
    "lastik-karisik": "rx",
    "suspansiyon-rallikros": "rx",
    "lastik-drag": "dg",
    "suspansiyon-drag": "dg",
    "sanziman-kisa": "dg",
    "lastik-yaris": "gp",
    "suspansiyon-yaris": "gp",
    "aero-yaris": "gp",
    "slipstream-engine": "gp",
    "risk-taker": "dp",
  };
  return m[ana] ?? null;
}
function kartStili(id: string) {
  const ty = kartTuru(id);
  return ty
    ? {
        stil: ` style="border:2px solid ${TUR[ty][2]};box-shadow:inset 0 0 0 1px ${TUR[ty][2]}40"`,
        tur: `<span style="color:${TUR[ty][2]};display:inline-flex;align-items:center;gap:6px">${ikon(TUR_IKON[ty])} ${TUR[ty][0]}</span>`,
      }
    : { stil: "", tur: "" };
}

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
        ...k.sandiklar
          .filter((q) => !q.acildi)
          .map((q) => ({ x: q.x, z: q.z, renk: (q.lanetli ? LANET_RENK : SANDIK_RENK)[0], sandik: true })),
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

/** skill'in kısa adı (tuş) ve seviyeli tam adı */
const BECERI_KISA: Record<string, string> = {
  "grappling-hook": "KANCA",
  "flying-dutchman": "HAYALET",
  "risk-taker": "RİSK",
  "slipstream-engine": "AKIM",
};
const beceriAdi = (o: BeceriOrnegi) => {
  const t = beceriBul(o.id)!,
    v = o.evrim && t.evrimler.find((q) => q.id == o.evrim);
  return t.ad + " Sv" + o.seviye + (v ? " · " + v.ad : "");
};
const beceriListesi = (l: BeceriOrnegi[]) =>
  l.length
    ? l
        .map(
          (o) =>
            beceriAdi(o) +
            (o.eklentiler.length
              ? " (" + o.eklentiler.map((e) => beceriEklentisiBul(e)!.ad).join(", ") + ")"
              : ""),
        )
        .join(" · ")
    : "yok";

/** seçim kartı: pasif ya da skill teklifi (yeni skill, seviye, evrim, skill eklentisi) */
function secenekKarti(id: string): [string, string, string] {
  const tur = secenekTuru(id);
  if (tur == "pasif") {
    const p = pasifBul(id)!;
    return ["Pasif", p.ad, p.d];
  }
  const [, a, b] = id.split(":");
  if (tur == "beceri") {
    const t = beceriBul(a)!;
    return ["Skill · " + (t.tur == "aktif" ? "tuşla" : "kendiliğinden"), t.ad, t.d];
  }
  if (tur == "seviye") {
    const t = beceriBul(a)!,
      o = mutant.kosu!.beceriler.find((q) => q.id == a)!,
      p0 = t.seviyeler[o.seviye - 1],
      p1 = t.seviyeler[o.seviye];
    const fark = Object.keys(p1)
      .filter((x) => p1[x] != p0[x])
      .map((x) => x + " " + p0[x] + " → " + p1[x])
      .join(", ");
    return ["Skill seviyesi", t.ad + " Sv" + (o.seviye + 1), fark];
  }
  if (tur == "evrim") {
    const t = beceriBul(a)!,
      v = t.evrimler.find((q) => q.id == b)!;
    return ["Evrim · " + t.ad, v.ad, v.d];
  }
  const e = beceriEklentisiBul(a)!;
  return ["Skill eklentisi → " + beceriBul(b)!.ad, e.ad, e.d];
}

function pasifSayfasi(baslik: string) {
  const k = mutant.kosu!;
  const s = sayfaAc(
    `<h1>MUTANT</h1><p>${baslik}</p>${
      k.pasifler.length
        ? `<p class="note">Takılı: ${k.pasifler.map((id) => pasifBul(id)!.ad).join(", ")}</p>`
        : ""
    }<p class="note">Skill (${k.beceriler.length}/${SKILL_YUVASI}): ${beceriListesi(k.beceriler)}</p><div class="mtp">${k.secenekler
      .map((id) => {
        const [tur, ad, d] = secenekKarti(id),
          k = kartStili(id);
        return `<div class="card go" data-pasif="${id}"${k.stil}><b>${ad}</b>${k.tur}<span>${tur}</span><span>${d}</span></div>`;
      })
      .join("")}</div>`,
  );
  s.querySelectorAll<HTMLElement>("[data-pasif]").forEach(
    (e) =>
      (e.onclick = () => {
        const id = e.dataset.pasif!;
        // yuvalar dolu: yeni skill ancak biri bırakılınca alınır
        if (secenekTuru(id) == "beceri" && k.beceriler.length >= SKILL_YUVASI)
          return birakSayfasi(id, () => pasifSayfasi(baslik));
        secimYap(id);
      }),
  );
}

/** seçimi uygula; bekleyen seçim varsa sonraki sayfa, yoksa sürüşe */
function secimYap(id: string, birak?: string) {
  const k = mutant.kosu!,
    ilk = k.faz == "basla";
  if (!pasifSec(k, id, birak)) return;
  mutantKurulumUygula();
  if (k.faz == "secim") return pasifSayfasi("Seviye atladın: bir yetenek daha seç.");
  if (ilk) {
    isaretleriGuncelle();
    if (k.test) return testLaboratuvari();
    surusDevam();
    note("Renkli ışıklar etkinlik, gizli 3B sandıklar, mavi atölye, kırmızı boss", 30);
    return;
  }
  devam();
}

/** Yarışın ortasında bile açılabilen test paneli: oyun durur, aynı yarışa dönülebilir. */
function testLaboratuvari(secili = "") {
  const k = mutant.kosu!;
  if (!k.test || (yaris.EV && !yaris.EV.mutant)) return;
  const yarista = !!yaris.EV;
  k.faz = "surus";
  k.bekleyenSecim = 0;
  k.secenekler = [];
  const sec = (id: string, l: { id: string; ad: string }[], deger = "") =>
    '<select id="' +
    id +
    '" style="max-width:90vw;width:100%;padding:9px;background:#172331;color:white">' +
    l
      .map(
        (o) => '<option value="' + o.id + '"' + (o.id == deger ? " selected" : "") + ">" + o.ad + "</option>",
      )
      .join("") +
    "</select>";
  const seciliId = BECERILER.some((o) => o.id == secili) ? secili : BECERILER[0].id;
  const tanim = beceriBul(seciliId)!;
  const takili = k.beceriler.find((o) => o.id == seciliId);
  const ekler = BECERI_EKLENTILERI.filter((o) => eklentiUyar(tanim, o));
  const secimEvo = [{ id: "", ad: "Evrim yok" }, ...tanim.evrimler.map((o) => ({ id: o.id, ad: o.ad }))];
  const secimEk = [{ id: "", ad: "Eklenti yok" }, ...ekler.map((o) => ({ id: o.id, ad: o.ad }))];
  const s = sayfaAc(
    "<h1>⚙ MUTANT · DEV PANEL</h1><p>Test modu · " +
      (yarista ? "Yarış duraklatıldı" : "Açık dünya duraklatıldı") +
      " · Sayaç: " +
      sure(k.kalan) +
      " (90 sn'de yenilenir)</p>" +
      '<p class="note">Değişiklikler anında araca işlenir. Sadece /dev/ testinde çalışır; kariyer ve normal MUTANT etkilenmez.</p>' +
      '<div class="mtp"><div class="card"><b>Pasif yetenekler</b>' +
      sec(
        "labPasif",
        PASIFLER.map((o) => ({ id: o.id, ad: o.ad })),
      ) +
      '<button class="btn" id="labPasifAl">Pasif ekle</button></div>' +
      '<div class="card"><b>Skill · seviye · evrim · eklenti</b>' +
      sec(
        "labSkill",
        BECERILER.map((o) => ({ id: o.id, ad: o.ad })),
        seciliId,
      ) +
      sec(
        "labSeviye",
        [1, 2, 3].map((o) => ({ id: String(o), ad: "Seviye " + o })),
        String(takili?.seviye ?? 1),
      ) +
      sec("labEvrim", secimEvo, takili?.evrim ?? "") +
      sec("labEk1", secimEk, takili?.eklentiler[0] ?? "") +
      sec("labEk2", secimEk, takili?.eklentiler[1] ?? "") +
      '<button class="btn" id="labSkillAl">Skill kurulumunu uygula</button>' +
      '<button class="btn alt" id="labSkillSil">Seçili skill\'i kaldır</button></div>' +
      '<div class="card"><b>Modifiye parçaları (kilitsiz)</b>' +
      sec(
        "labParca",
        PARCALAR.map((o) => ({ id: o.id, ad: o.n })),
      ) +
      '<button class="btn" id="labParcaAl">Parça tak</button></div></div>' +
      '<p class="note">Takılı: ' +
      k.parcalar.length +
      " parça · " +
      k.pasifler.length +
      " pasif · " +
      (k.beceriler.map((o) => beceriAdi(o)).join(", ") || "skill yok") +
      "</p>" +
      '<button class="btn" id="labDrift">DRİFT YARIŞINA GİR / YENİDEN BAŞLAT</button>' +
      (yarista ? '<button class="btn alt" id="labTekrar">BU YARIŞI YENİDEN BAŞLAT</button>' : "") +
      '<button class="btn alt" id="labReset">Tüm kurulumu sıfırla</button>' +
      '<button class="btn alt" id="labSure">90 saniyeyi yenile</button>' +
      '<button class="btn alt" id="labBolge">Sonraki bölge (test)</button>' +
      '<button class="btn alt" id="labSurus">' +
      (yarista ? "YARIŞA DÖN" : "AÇIK DÜNYAYA DÖN") +
      "</button>",
  );
  const ekle = (tur: "pasif" | "parca", id: string) => {
    const secilen = s.querySelector<HTMLSelectElement>(id)?.value;
    if (!secilen || !testKurulumu(k, tur, secilen)) return note("Eklenemedi: sınır veya geçersiz seçim", 30);
    mutantKurulumUygula();
    testLaboratuvari(seciliId);
  };
  s.querySelector<HTMLSelectElement>("#labSkill")!.onchange = (v) =>
    testLaboratuvari((v.target as HTMLSelectElement).value);
  s.querySelector<HTMLElement>("#labPasifAl")!.onclick = () => ekle("pasif", "#labPasif");
  s.querySelector<HTMLElement>("#labParcaAl")!.onclick = () => ekle("parca", "#labParca");
  s.querySelector<HTMLElement>("#labSkillAl")!.onclick = () => {
    const sv = +s.querySelector<HTMLSelectElement>("#labSeviye")!.value;
    const evo = s.querySelector<HTMLSelectElement>("#labEvrim")!.value || null;
    const ext = ["#labEk1", "#labEk2"]
      .map((id) => s.querySelector<HTMLSelectElement>(id)!.value)
      .filter((id) => id.length > 0);
    if (!testBeceriAyarla(k, seciliId, sv, evo, ext))
      return note("Uyumsuz eklenti veya evrim: kurulumu kontrol et", 30);
    mutantKurulumUygula();
    testLaboratuvari(seciliId);
  };
  s.querySelector<HTMLElement>("#labSkillSil")!.onclick = () => {
    if (!testBeceriAyarla(k, seciliId, 0)) return note("Bu skill zaten takılı değil", 30);
    mutantKurulumUygula();
    testLaboratuvari(seciliId);
  };
  s.querySelector<HTMLElement>("#labReset")!.onclick = () => {
    if (!testKurulumunuSifirla(k)) return;
    mutantKurulumUygula();
    testLaboratuvari(seciliId);
  };
  s.querySelector<HTMLElement>("#labSure")!.onclick = () => {
    k.kalan = BOSS_SURESI(k.bolge, true);
    mutant.bossBekliyor = false;
    testLaboratuvari(seciliId);
  };
  s.querySelector<HTMLElement>("#labDrift")!.onclick = () => {
    if (yarista) haritayaDon();
    const e = k.etkinlikler.find((q) => q.ty == "dp");
    if (!e) return note("Bu bölgede drift etkinliği yok", 30);
    e.yapildi = false;
    e.kapora = undefined;
    k.kalan = BOSS_SURESI(k.bolge, true);
    mutant.bossBekliyor = false;
    mutant.risk = 0;
    etkinlikBaslat(e.id, e.i);
  };
  s.querySelector<HTMLElement>("#labTekrar")?.addEventListener("click", () => {
    const e = yaris.EV;
    if (!e || !e.mutant) return;
    k.kalan = BOSS_SURESI(k.bolge, true);
    mutant.bossBekliyor = false;
    startEvent(e.i, mutantArac, true);
  });
  s.querySelector<HTMLElement>("#labBolge")!.onclick = () => {
    if (yarista) haritayaDon();
    if (!testBolgeyeGec(k, Math.min(3, k.bolge + 1), mutantPistleri())) return;
    isaretleriGuncelle();
    testLaboratuvari(seciliId);
  };
  s.querySelector<HTMLElement>("#labSurus")!.onclick = surusDevam;
}

/** yuvalar dolu: yeni skill için hangisinin bırakılacağı (seviyesi, eklentileri ve evrimiyle gider) */
function birakSayfasi(id: string, geri: () => void) {
  const k = mutant.kosu!,
    t = beceriBul(id.split(":")[1])!;
  const s = sayfaAc(
    `<h1>Yuvalar dolu</h1><p>${t.ad} için bir skill bırak. Bırakılan skill seviyesi, eklentileri ve evrimiyle gider.</p><div class="mtp">${k.beceriler
      .map((o) => `<div class="card go" data-birak="${o.id}"><b>${beceriAdi(o)}</b><span>Bırak</span></div>`)
      .join("")}</div><button class="btn alt" id="mGec">Geri</button>`,
  );
  s.querySelectorAll<HTMLElement>("[data-birak]").forEach(
    (c) => (c.onclick = () => secimYap(id, c.dataset.birak!)),
  );
  s.querySelector<HTMLElement>("#mGec")!.onclick = geri;
}

/** drift kaporası satırı (kart ilk açılınca kilitlenir; kart yeniden açılınca aynı) */
function kaporaYazi(id: number) {
  const k = mutant.kosu!,
    q = kaporaBelirle(k, id);
  if (!q) return "";
  if (!q.beceri)
    return `<div class="card mtb"><b>Kapora · ${KAPORA.govde} gövde</b><span>Skill'in yok. Kazanırsan yeni bir skill alırsın; kaybedersen ${KAPORA.govde} gövde gider.</span></div>`;
  const o = k.beceriler.find((b) => b.id == q.beceri)!,
    tavan = o.seviye >= 3;
  return `<div class="card mtb"><b>Kapora · ${beceriAdi(o)}</b><span>Kazanırsan ${tavan ? "+" + KAPORA.tavanPara + " para (skill tavanda)" : "Sv" + (o.seviye + 1)}. Kaybedersen bu skill eklentileri ve evrimiyle kalıcı olarak gider.</span><span>Kapora rastgele seçildi ve bu etkinliğe kilitli; girmezsen bir şey kaybetmezsin.</span></div>`;
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
  if (e.rakip) return duelloKarti(e.id, e.i, e.sev);
  // risk kademesi: hedef 1★/2★/3★ (tek tur); ödül çarpanı ve kaçırmanın bedeli kartta açık
  const kademe = ([0, 1, 2] as Risk[])
    .map((r) => {
      const R = RISKLER[r],
        h = etkinlikHedefi(E, r);
      return `<div class="card go" data-risk="${r}"><b>${R.ad} · ${"★".repeat(r + 1)}</b><span>Hedef ${hedefYazi(E.ty, h.limit)}</span><span>Ödül ${Math.round(o.xp * R.odul)} XP · ${Math.round(o.para * R.odul)} para</span><span>Kaçırırsan ${R.ceza ? "ödül yok, boss'a −" + R.ceza + " sn" : Math.round(o.para * R.kacirma) + " para teselli"}</span></div>`;
    })
    .join("");
  const s = sayfaAc(
    `<h1>${TUR[e.ty][0]}</h1><p>${E.n} · ${SEVIYELER[e.sev - 1].n}${E.laps ? " · 1 tur" : ""} · Boss'a ${sure(k.kalan)}</p>${e.ty == "dp" ? kaporaYazi(e.id) : ""}<div class="mtp">${kademe}</div>` +
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

/** düello kartı (A3): hedef süre yok, rakipten önce bitir. Kademe rakibin kişiliğidir */
const DUELLO_YAZI = {
  caylak: "Erken fren, geniş pay; bazı virajlarda tutarsız",
  deneyimli: "Geç fren, çizgiyi sonuna kadar kullanır, tutarlı",
};
function duelloKarti(id: number, i: number, sev: number) {
  const k = mutant.kosu!,
    E = EVENTS[i],
    o = ETKINLIK_ODULU(sev);
  const kademe = DUELLO.kisilikler
    .map((ad, r) => {
      const R = RISKLER[r];
      return `<div class="card go" data-risk="${r}"><b>${R.ad} · Rakip: ${KISILIKLER[ad].ad}</b><span>${DUELLO_YAZI[ad]}</span><span>Ödül ${Math.round(o.xp * R.odul)} XP · ${Math.round(o.para * R.odul)} para</span><span>Kaybedersen ${R.ceza ? "ödül yok, boss'a −" + R.ceza + " sn" : Math.round(o.para * R.kacirma) + " para teselli"}</span></div>`;
    })
    .join("");
  const s = sayfaAc(
    `<h1>Düello</h1><p>${E.n} · ${DUELLO.tur} tur · Rakipten önce bitir · Boss'a ${sure(k.kalan)}</p><div class="mtp">${kademe}</div>` +
      '<p class="note">Rakip senin başlangıç aracının stok hâliyle, aynı fizikle sürer: hız ya da tutuş hilesi yok. Araçlar birbirinin içinden geçer.</p><button class="btn alt" id="mGec">Vazgeç</button>',
  );
  s.querySelectorAll<HTMLElement>("[data-risk]").forEach(
    (c) =>
      (c.onclick = () => {
        mutant.risk = +c.dataset.risk! as Risk;
        etkinlikBaslat(id, i);
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
    `<div class="bar"><button class="btn" id="mKapat">Haritaya dön</button><button class="btn alt" id="mYenile" ${k.para < STOK_YENILE ? "disabled" : ""}>Stoğu yenile · ${STOK_YENILE}</button>${k.govde < GOVDE.tam ? `<button class="btn alt" id="mTamir" ${k.para < GOVDE.tamirFiyati ? "disabled" : ""}>Tamir · ${tamirBedeli(k)}</button>` : ""}</div><h1>Atölye</h1><p>Para: <b>${k.para}</b> · Gövde <b>${Math.round(k.govde)}</b> (güç −%${Math.round(GOVDE.gucKaybi * (100 - k.govde))}). Bu bölgede satılan ${k.stok.length} parça. Takılan aynı kategorideki parçanın yerine geçer.</p><div class="mtz">` +
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

/** Tek ganimet sandığı: ilk bakışta zar atılır; al ya da reddet, seçim havuzu yok. */
function sandikSayfasi(id: number) {
  const k = mutant.kosu!,
    q = k.sandiklar.find((x) => x.id == id)!,
    esya = sandikTeklifi(k, id),
    L = q.lanet ? LANETLER[q.lanet] : null;
  const p = esya ? sandikOduluBul(esya)! : null;
  const s = sayfaAc(
    `<h1>${q.lanetli ? "Lanetli sandık" : "Gizli sandık"}</h1>` +
      (p
        ? `<p>Sandıktan çıkan:</p><div class="mtp"><div class="card mtb"><b>${p.ad}</b><span>${p.d}</span>${L ? `<span>Bedel · ${L.ad}: ${L.d}</span>` : ""}</div></div><button class="btn" id="mAl">Ödülü al</button><button class="btn alt" id="mGec">Alma</button>`
        : '<p>Bu sandıkta ödül yok.</p><button class="btn alt" id="mGec">Kapat</button>'),
  );
  s.querySelector<HTMLElement>("#mAl")?.addEventListener("click", () => {
    if (!esya || !sandikAc(k, id, esya)) return;
    mutantAracGuncelle();
    isaretleriGuncelle();
    note(p!.ad + " kazanıldı" + (L ? " · " + L.d : ""), 40);
    surusDevam();
  });
  s.querySelector<HTMLElement>("#mGec")!.onclick = () => {
    if (esya) sandikReddet(k, id);
    isaretleriGuncelle();
    surusDevam();
  };
}

function bossSayfasi(zorunlu: boolean) {
  const k = mutant.kosu!,
    i = mutantBossPisti(),
    E = EVENTS[i];
  const s = sayfaAc(
    `<h1>${zorunlu ? "Süre doldu!" : "Boss yarışı"}</h1><p>Bölge ${k.bolge} · ${E.n}</p>${bossKarti(k.boss)}` +
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
  const R = rakip.y,
    baslik = boss
      ? gecti
        ? "Boss yenildi!"
        : "Boss kazandı"
      : R
        ? gecti
          ? "Rakibi yendin"
          : "Rakip önde bitirdi"
        : gecti
          ? "Hedef geçildi"
          : "Hedef kaçtı";
  const rakipSatiri = R
    ? row(
        "Rakip (" + KISILIKLER[rakip.ayar!.kisilik].ad + ")",
        R.bitis != null ? fmt(R.bitis) : "bitirmedi",
      ) + row("Sen", fmt(yaris.EV?.t ?? 0))
    : "";
  const s = sayfaAc(
    `<h1>${baslik}</h1>` +
      (boss
        ? gecti
          ? `<p>Bölge ${k.bolge} açıldı. Yeni boss: ${k.boss.ad}. +200 para, +150 XP.</p>`
          : "<p>Koşu bitti.</p>"
        : rakipSatiri +
          row("Kazanılan para", "+" + (r?.para ?? 0)) +
          row("Seviye", k.seviye + " · " + k.xp + " / " + seviyeXp(k.seviye + 1) + " XP") +
          (r?.ekSure ? row("Zaman bükücü", "+" + r.ekSure + " sn") : "") +
          (r?.kapora ? row("Kapora", kaporaSonucYazi(r.kapora)) : "") +
          (r?.ceza
            ? row(
                RISKLER[mutant.risk].ad + (R ? " düello kaybedildi" : " hedef kaçtı"),
                "Boss'a −" + r.ceza + " sn",
              )
            : "")) +
      row("Boss'a kalan", sure(k.kalan)) +
      `<button class="btn" id="mDevam">${bitti ? "Özet" : "Haritaya dön"}</button>` +
      (k.test && !boss ? '<button class="btn alt" id="mLab">Yeniden kur ve drift dene</button>' : ""),
  );
  s.querySelector<HTMLElement>("#mLab")?.addEventListener("click", () => {
    haritayaDon();
    testLaboratuvari();
  });
  s.querySelector<HTMLElement>("#mDevam")!.onclick = () => {
    if (bitti) return ozet();
    haritayaDon();
    if (k.faz == "secim") return pasifSayfasi("Seviye atladın: bir yetenek seç.");
    devam();
  };
}

function kaporaSonucYazi(q: NonNullable<EtkinlikSonucu["kapora"]>) {
  const ad = q.beceri ? beceriBul(q.beceri)!.ad : "";
  return q.sonuc == "seviye"
    ? ad + " seviye atladı"
    : q.sonuc == "kayip"
      ? ad + " kaybedildi"
      : q.sonuc == "yeni"
        ? "Yeni skill: " + ad
        : q.sonuc == "govde"
          ? "Gövde −" + KAPORA.govde
          : "+" + KAPORA.tavanPara + " para";
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
      `<h1>${k.pert ? "Araç pert oldu" : "Koşu bitti"}</h1><p>${mutant.yeniRekor ? "Yeni rekor! " : ""}${k.pert ? "Gövde sıfırlandı: " + k.carpma + " sert çarpma, " + k.spin + " spin. " : ""}Ulaşılan bölge ${k.bolge}, yenilen boss ${k.yenilenBoss}.</p><div class="mtz">` +
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
  // Yalnız test koşusunda görünen mobil geliştirici kısayolu.
  let dugme = document.querySelector<HTMLButtonElement>("#mutantDevPanel");
  if (!dugme) {
    dugme = document.createElement("button");
    dugme.id = "mutantDevPanel";
    dugme.textContent = "⚙ DEV";
    dugme.style.cssText =
      "position:fixed;top:72px;right:12px;z-index:10000;padding:11px 16px;border:2px solid #8de5ff;border-radius:12px;background:#142536;color:#fff;font-weight:bold;display:none";
    document.body.appendChild(dugme);
  }
  dugme.onclick = () => {
    if (mutant.kosu?.test && (!yaris.EV || yaris.EV.mutant) && oyun.mode == "drive") testLaboratuvari();
  };
  // klavyede nitro: N
  addEventListener("keydown", (e) => {
    if (!mutant.kosu || oyun.mode != "drive") return;
    if (e.key == "n" || e.key == "N") mutant.nitro = true;
    // skill tuşları: 1/2/3 yuva sırasıyla
    const o = mutant.kosu.beceriler[+e.key - 1];
    if (o && "123".includes(e.key)) mutant.beceriIstek.push(o.id);
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
  const devDugme = document.querySelector<HTMLButtonElement>("#mutantDevPanel");
  if (devDugme)
    devDugme.style.display =
      k?.test && (!yaris.EV || yaris.EV.mutant) && oyun.mode == "drive" ? "block" : "none";
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

/** skill yuvasının ikonu */
const BECERI_IKON: Record<string, IkonAdi> = {
  "grappling-hook": "kanca",
  "flying-dutchman": "hayalet",
  "risk-taker": "alev",
  "slipstream-engine": "ruzgar",
};

/**
 * NİTRO ve skill yuvaları (koşuda; kontroller.ts sol grubun üstüne koyar). Yuva: solda ikon ve seviye (1-3 çentik),
 * sağda kısa ad ve durum (maliyet, kalan süre, bekleme ya da kullanılamama nedeni); dolgu: etki/bekleme/enerji/bar
 */
export const mutantTusuHtml = () =>
  mutant.kosu
    ? '<div class="mbr"><div class="k" id="mnt"><i></i><b>NİTRO</b><s></s></div>' +
      mutant.kosu.beceriler
        .map(
          (o) =>
            `<div class="k mbk${beceriBul(o.id)!.tur == "tetikli" ? " mbo" : ""}" data-beceri="${o.id}"><i></i>` +
            `<span class="mbi">${ikon(BECERI_IKON[o.id] ?? "bilgi")}<em data-sv="${o.seviye}" aria-label="Seviye ${o.seviye}"><s></s><s></s><s></s></em></span>` +
            `<span class="mbt"><b>${BECERI_KISA[o.id] ?? o.id}</b><u></u></span></div>`,
        )
        .join("") +
      "</div>"
    : "";

/** kullanılamama nedeninin yuvadaki kısa yazısı */
const ENGEL_YAZISI: Record<string, string> = {
  hedef: "HEDEF YOK",
  faz: "FAZDA",
  rakip: "RAKİP YOK",
  basla: "BAŞLANGIÇ",
};
const sn = (x: number) => x.toFixed(1).replace(".", ",") + " sn";

export function mutantTusuBagla() {
  const e = document.getElementById("mnt");
  if (!e) return;
  e.addEventListener("pointerdown", (v) => {
    v.preventDefault();
    mutant.nitro = true;
  });
  document.querySelectorAll<HTMLElement>("[data-beceri]").forEach((b) =>
    b.addEventListener("pointerdown", (v) => {
      v.preventDefault();
      mutant.beceriIstek.push(b.dataset.beceri!);
    }),
  );
}

/** son reddedilen skill isteği: yuvası kısa süre kırmızı yanar (neden alt satırda) */
let redSon = { n: 0, id: "", bitis: 0 };

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
  // skill yuvaları: dolgu (etki kalan / bekleme ilerlemesi / enerji ya da bar), alt satır durum ya da neden
  const simdi = performance.now();
  if (mutant.red.n != redSon.n) redSon = { n: mutant.red.n, id: mutant.red.id, bitis: simdi + 900 };
  for (const b of d.beceriler) {
    const t = document.querySelector<HTMLElement>(`[data-beceri="${b.id}"]`);
    if (!t) continue;
    const red = redSon.id == b.id && simdi < redSon.bitis,
      engel = red && mutant.red.engel == "basla" ? "basla" : b.engel;
    let dolgu: number, yazi: string, durum: string;
    if (b.acik) {
      dolgu = b.kalan / Math.max(b.sure, b.kalan, 0.01);
      yazi = sn(b.kalan);
      durum = "on";
    } else if (engel == "bekleme" || engel == "etkin") {
      dolgu = 1 - b.bekleme / Math.max(b.beklemeTam, 0.01);
      yazi = sn(b.bekleme);
      durum = "bekle";
    } else if (b.bar != null) {
      dolgu = b.bar / 100;
      yazi = engel ? ENGEL_YAZISI[engel] : "%" + b.bar;
      durum = engel ? "engel" : b.bar >= 75 ? "hazir" : "";
    } else if (engel == "enerji") {
      dolgu = Math.min(1, d.enerji / Math.max(b.maliyet, 1));
      yazi = Math.floor(d.enerji) + "/" + Math.round(b.maliyet);
      durum = "engel";
    } else if (engel) {
      dolgu = 1;
      yazi = ENGEL_YAZISI[engel];
      durum = "engel";
    } else {
      dolgu = 1;
      yazi = String(Math.round(b.maliyet));
      durum = "hazir";
    }
    const w = Math.round(100 * Math.max(0, Math.min(1, dolgu))) + "%",
      c = "k mbk" + (b.tur == "tetikli" ? " mbo" : "") + (durum ? " " + durum : "") + (red ? " red" : ""),
      u = t.querySelector("u")!,
      html = b.bar == null && !b.acik && durum != "bekle" && !engel ? yazi + ikon("enerji") : yazi;
    if (t.style.getPropertyValue("--e") != w) t.style.setProperty("--e", w);
    if (t.className != c) t.className = c;
    if (u.dataset.h != html) {
      u.dataset.h = html;
      u.innerHTML = html;
    }
    const sv = t.querySelector("em")!;
    if (sv.dataset.sv != String(b.seviye)) sv.dataset.sv = String(b.seviye);
  }
}
