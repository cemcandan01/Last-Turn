// LT-SYS-004: MUTANT skill yürütücüsü. Saf ve belirlenimci: DOM, oyun durumu, saat ya da rastgelelik okumaz.
// Skill'ler birbirini tanımaz; yalnız mekanikler.ts'teki ortak olay sözlüğünü (HasarVerildi, KonumEtkisi, NearMiss…)
// üretir ve dinler. Enerji ekonomisi ve pasifler aynı mekanik yürütücüsünde kalır (ikinci motor yok): etkin skill
// enerjisini AbilityActivated olayıyla oradan harcar, ürettiği olaylar bir sonraki adımda oraya girer.
// Ortak kurallar burada merkezîdir ve her skill'e kendiliğinden uygulanır:
//  - hasar yalnız hasarVer'den geçer: saldırı kapalıyken (hayalet fazı) verilmez, aynı kaynak aynı hedefe tick
//    aralığından sık vuramaz, bir hedefe adım başına HASAR_ADIM_UST'ten fazla hasar yazılmaz;
//  - durum etkileri (ateş, elektrik) yığılmaz, süresi yenilenir; yenileme olay üretmez (olay farmı yok);
//  - itme/çekme ivmesi gövde başına IVME_UST ile sınırlı, fiziğe kuvvet olarak gider (ışınlanma yok);
//  - eklenti zinciri NEDENSEL_DERINLIK ve ADIM_ISLEM_SINIRI ile kesilir, eklenti kendi çıktısına tepki vermez.
import {
  ADIM_ISLEM_SINIRI,
  NEDENSEL_DERINLIK,
  type DurumTuru,
  type GirisOlayi,
  type HasarTuru,
  type MekanikTanim,
} from "./mekanikler";

/** aynı anda taşınabilecek en çok skill (etkin + tetiklenen; pasif, eklenti ve modifiye yuva tüketmez) */
export const SKILL_YUVASI = 3;
export const SEVIYE_UST = 3;
/** bir skill'e takılabilecek en çok skill eklentisi */
export const SKILL_EKLENTI_UST = 2;
/** bir hedefe bir adımda yazılabilecek en çok hasar (gövde puanı) */
export const HASAR_ADIM_UST = 10;
/** skill'lerin bir gövdeye verebileceği en büyük yatay ivme (m/s²; oyunda yerçekimi 24) */
export const IVME_UST = 12;
/** durum etkisinin en uzun süresi (sn) */
export const DURUM_UST = 3;
/** ateş: 0,5 sn'de bir 2 hasar; elektrik: hedefin hızına karşı fren (m/s²) */
export const ATES = { hasar: 2, aralik: 30 };
export const ELEKTRIK_FREN = 3.5;
/** yakın takip: rakibin arkasında mesafe (m), koni (rad), en az hız ve en çok bağıl hız (m/s) */
export const TAKIP = { enAz: 3, enCok: 12, koni: 0.35, hiz: 15, bagil: 8, kredi: 4, dolum: 0.25 };
/** near-miss: açıklık (m) bu kadar yaklaşıp sonra uzaklaşınca, en az hız (m/s), aynı hedefe bekleme (adım) */
export const NEAR_MISS = { yakin: 1.2, uzak: 3, hiz: 18, bekleme: 180, aracYari: 2.2, carpma: 60 };

export type Etiket = "hareket" | "kontrol" | "konum" | "savunma" | "saldiri" | "hasar" | "risk";
type SirasizOlay<T> = T extends unknown ? Omit<T, "sira"> : never;
/** skill katmanının olayı: sıra numarasını mekanik yürütücüsüne verilirken koşu alır */
export type BeceriOlayi = SirasizOlay<GirisOlayi>;

export interface Govde {
  x: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
}
export interface Hedef extends Govde {
  id: string;
}
/** çarpışma nesnesi (daire; kutu dış yarıçapla) */
export interface Engel {
  id: string;
  x: number;
  z: number;
  r: number;
}

/** skill'in okuduğu dünya: oyuncu, hedefler (rakipler) ve pist bağlantı noktası */
export interface BeceriDunyasi {
  oyuncu: Govde;
  hedefler: readonly Hedef[];
  /** pistte oyuncunun önünde (yol boyunca) enAz–enCok m ilerideki bağlantı noktası; pist yoksa null */
  baglanti(enAz: number, enCok: number): [number, number] | null;
  /** yarışta mı (risk/takip yalnız yarışta birikir; serbest sürüşte farm yok) */
  yarista: boolean;
}

/** oyuncunun sahip olduğu skill: seviye, takılı skill eklentileri ve evrim. Skill kaybedilince hepsi birlikte gider */
export interface BeceriOrnegi {
  id: string;
  seviye: number;
  eklentiler: string[];
  evrim: string | null;
}

/** skill'in yürütücüdeki geçici durumu: ortak alanlar, her skill kendi anlamıyla kullanır */
export interface BeceriYerel {
  /** etki kalan süresi (sn); 0 kapalı */
  kalan: number;
  /** etki bittikten sonra kullanılamaz/dolmaz süre (sn) */
  bekleme: number;
  /** bar (Risk Taker: 0-100) */
  deger: number;
  /** bu etkide kullanılan uzatma (sn) */
  uzatma: number;
  /** genel sayaç (Slipstream: takipten çıkalı geçen sn) */
  sayac: number;
  hedef: string | null;
  nokta: [number, number] | null;
  /** iz noktaları [x, z, kalan sn] */
  iz: [number, number, number][];
  /** bu etkide bir kez işlenen hedefler */
  islenen: string[];
}

export interface HedefDurumu {
  /** 0-100; skill hasarı düşürür (oyun güç kaybına çevirir) */
  govde: number;
  durumlar: { tur: DurumTuru; kalan: number; kaynak: string }[];
}

export interface BeceriDurumu {
  adim: number;
  yerel: Record<string, BeceriYerel>;
  hedefler: Record<string, HedefDurumu>;
  /** "kaynak|hedef" → son vuruş adımı (tick sınırı) */
  sonVurus: Record<string, number>;
  /** yakınlık gözlemi: hedef başına takip kredisi (sn), yaklaşılan hedef (işaret adımı), son near-miss adımı */
  takipKredi: Record<string, number>;
  yakin: Record<string, number>;
  sonNearMiss: Record<string, number>;
  /** son sert çarpmanın adımı: çarpıştıktan sonraki uzaklaşma near-miss sayılmaz */
  sonCarpma: number;
  /** telemetri: verilen toplam hasar, kesilen olay */
  verilen: number;
  kesilen: number;
}

/** bir adımın fiziğe/oyuna giden sonucu */
export interface BeceriCiktisi {
  oyuncuIvme: { x: number; z: number };
  hedefIvme: Record<string, { x: number; z: number }>;
  /** mekanik yürütücüsüne (sonraki adım) gidecek ortak olaylar */
  olaylar: BeceriOlayi[];
  /** oyuncu aracına çarpanlar */
  tutus: number;
  guc: number;
  /** araçlar arası çarpışmada verilen hasar çarpanı */
  carpismaHasari: number;
  hayalet: boolean;
  saldiriKapali: boolean;
}

export interface Bayraklar {
  /** oyuncu hasar almaz, rakip temasından korunur (hayalet fazı) */
  hayalet: boolean;
  /** oyuncu hasar veremez, saldırı/konum skill'i başlatamaz */
  saldiriKapali: boolean;
}

/** bir skill'in davranışına verilen bağlam: ortak API dışında dünyaya yazamaz */
export interface BeceriBaglami {
  t: BeceriTanim;
  o: BeceriOrnegi;
  y: BeceriYerel;
  /** seviyenin parametreleri */
  p: Readonly<Record<string, number>>;
  dunya: BeceriDunyasi;
  dt: number;
  adim: number;
  /** bu adımda mekanik yürütücüsüne giren olaylar (önceki adımın skill olayları dahil) */
  olaylar: readonly BeceriOlayi[];
  bayrak: Bayraklar;
  cikti: BeceriCiktisi;
  hasarVer(hedef: string, miktar: number, hasar: HasarTuru, aralikAdim: number): number;
  durumUygula(hedef: string, durum: DurumTuru, sure: number): void;
  ivme(govde: "oyuncu" | string, ax: number, az: number): void;
  olay(e: BeceriOlayi): void;
}

export interface Evrim {
  id: string;
  ad: string;
  d: string;
}

export interface BeceriTanim {
  id: string;
  ad: string;
  /** oyuncunun gördüğü açık açıklama (tarif değil) */
  d: string;
  /** aktif: tuşla kullanılır, enerji harcar; tetikli: koşulu dolunca kendi başlar */
  tur: "aktif" | "tetikli";
  etiketler: readonly Etiket[];
  /** seviye başına parametreler (indeks = seviye − 1). "bekleme": etki sonrası bekleme (sn) */
  seviyeler: readonly Readonly<Record<string, number>>[];
  /** aktif: enerji maliyeti (etkin yetenek maliyet değiştiricileri uygulanır) */
  maliyet?: number;
  evrimler: readonly Evrim[];
  /** aktif: şimdi kullanılabilir mi (ör. hedef var mı). Değilse istek enerji harcamadan düşer */
  kullanilabilir?(c: BeceriBaglami): boolean;
  /** aktif: enerji harcandı, etki başlıyor */
  basla?(c: BeceriBaglami): void;
  /** tetiklenen skill'in dolum barı (0-1; HUD) */
  bar?(y: BeceriYerel, p: Readonly<Record<string, number>>): number;
  /** etki açıkken koruma/saldırı bayrakları */
  bayrak?(y: BeceriYerel): Partial<Bayraklar>;
  /** her adım */
  adim(c: BeceriBaglami): void;
}

/** skill'e bağlı eklenti: belirli etiketi taşıyan herhangi bir skill'e takılır, o skill'in ortak olayına tepki verir */
export interface BeceriEklentisi {
  id: string;
  ad: string;
  d: string;
  etiket: Etiket;
  olay: "KonumEtkisi" | "HasarVerildi";
  durum: DurumTuru;
  sure: number;
}

const yerelBaslat = (): BeceriYerel => ({
  kalan: 0,
  bekleme: 0,
  deger: 0,
  uzatma: 0,
  sayac: 0,
  hedef: null,
  nokta: null,
  iz: [],
  islenen: [],
});

export const beceriDurumuBaslat = (): BeceriDurumu => ({
  adim: 0,
  yerel: {},
  hedefler: {},
  sonVurus: {},
  takipKredi: {},
  yakin: {},
  sonNearMiss: {},
  sonCarpma: -1e9,
  verilen: 0,
  kesilen: 0,
});

const klonla = (d: BeceriDurumu): BeceriDurumu => ({
  ...d,
  yerel: Object.fromEntries(
    Object.entries(d.yerel).map(([k, y]) => [
      k,
      { ...y, iz: y.iz.map((p) => [p[0], p[1], p[2]] as [number, number, number]), islenen: [...y.islenen] },
    ]),
  ),
  hedefler: Object.fromEntries(
    Object.entries(d.hedefler).map(([k, h]) => [
      k,
      { govde: h.govde, durumlar: h.durumlar.map((q) => ({ ...q })) },
    ]),
  ),
  sonVurus: { ...d.sonVurus },
  takipKredi: { ...d.takipKredi },
  yakin: { ...d.yakin },
  sonNearMiss: { ...d.sonNearMiss },
});

const hiz = (g: Govde) => Math.hypot(g.vx, g.vz);
const aciFarki = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const yon = (g: Govde) => Math.atan2(g.vx, g.vz);

// ---------------------------------------------------------------- skill tanımları

/** önündeki (ters: arkasındaki) konide menzildeki en yakın hedef */
function koniHedefi(c: BeceriBaglami, menzil: number, koni: number, ters: boolean): string | null {
  const P = c.dunya.oyuncu;
  let en: string | null = null,
    enD = Infinity;
  for (const h of c.dunya.hedefler) {
    const dx = h.x - P.x,
      dz = h.z - P.z,
      d = Math.hypot(dx, dz);
    if (d < 8 || d > menzil) continue;
    if (aciFarki(Math.atan2(dx, dz), P.h + (ters ? Math.PI : 0)) > koni) continue;
    if (d < enD) {
      enD = d;
      en = h.id;
    }
  }
  return en;
}

/** pist noktasına kancanın çektiği en yüksek oyuncu hızı (m/s; üstünde çekiş yok) */
export const KANCA_HIZ_UST = 50;

export const GRAPPLING_HOOK: BeceriTanim = {
  id: "grappling-hook",
  ad: "Grappling Hook",
  d: "Öndeki rakibe kanca atar: sen ona doğru çekilirsin, o yavaşlar. Rakip yoksa pistte ilerideki bir noktaya tutunur.",
  tur: "aktif",
  etiketler: ["hareket", "kontrol", "konum"],
  maliyet: 25,
  seviyeler: [
    { menzil: 35, cekis: 7, fren: 3, sure: 1.2, bekleme: 6 },
    { menzil: 45, cekis: 8.5, fren: 3.5, sure: 1.4, bekleme: 5.5 },
    { menzil: 55, cekis: 10, fren: 4, sure: 1.6, bekleme: 5 },
  ],
  evrimler: [
    {
      id: "ters-kanca",
      ad: "Ters Kanca",
      d: "Kanca arkadaki rakibe atılır ve onu iki kat sert frenler; sen çekilmezsin. Pist noktasına tutunmaz.",
    },
  ],
  kullanilabilir(c) {
    const ters = c.o.evrim == "ters-kanca";
    if (koniHedefi(c, c.p.menzil, ters ? 0.6 : 0.45, ters)) return true;
    return !ters && c.dunya.yarista && !!c.dunya.baglanti(c.p.menzil * 0.6, c.p.menzil);
  },
  basla(c) {
    const ters = c.o.evrim == "ters-kanca";
    c.y.hedef = koniHedefi(c, c.p.menzil, ters ? 0.6 : 0.45, ters);
    c.y.nokta = c.y.hedef ? null : c.dunya.baglanti(c.p.menzil * 0.6, c.p.menzil);
    c.y.kalan = c.p.sure;
    if (c.y.hedef) c.olay({ tur: "KonumEtkisi", hedef: c.y.hedef, etki: "cekme", kaynak: c.t.id });
  },
  adim(c) {
    if (c.y.kalan <= 0) return;
    const P = c.dunya.oyuncu,
      ters = c.o.evrim == "ters-kanca",
      H = c.y.hedef ? c.dunya.hedefler.find((h) => h.id == c.y.hedef) : null,
      hedefNokta = H ? [H.x, H.z] : c.y.nokta;
    if (!hedefNokta) return void (c.y.kalan = 0);
    const dx = hedefNokta[0] - P.x,
      dz = hedefNokta[1] - P.z,
      d = Math.hypot(dx, dz);
    // kanca kopar: çok yaklaştı ya da menzilden çok uzaklaştı
    if (d < 7 || d > c.p.menzil * 1.3) return void (c.y.kalan = 0);
    const ux = dx / d,
      uz = dz / d,
      kapanma = (P.vx - (H?.vx ?? 0)) * ux + (P.vz - (H?.vz ?? 0)) * uz;
    if (!ters) {
      // rakipte yaklaşma hızı arttıkça çekiş azalır (içine fırlatmaz); pist noktasında hız arttıkça azalır
      const k = Math.min(
        1,
        Math.max(0, H ? (22 - kapanma) / 10 : (KANCA_HIZ_UST - Math.hypot(P.vx, P.vz)) / 15),
      );
      c.ivme("oyuncu", ux * c.p.cekis * k, uz * c.p.cekis * k);
    }
    if (H) c.ivme(H.id, -ux * c.p.fren * (ters ? 2 : 1), -uz * c.p.fren * (ters ? 2 : 1));
  },
};

export const FLYING_DUTCHMAN: BeceriTanim = {
  id: "flying-dutchman",
  ad: "Flying Dutchman",
  d: "Kısa hayalet fazı: hasar almazsın, tutuş artar, spin hasarı işlemez. Faz boyunca hasar veremez, saldırı ve kanca kullanamazsın.",
  tur: "aktif",
  etiketler: ["savunma", "hareket"],
  maliyet: 30,
  seviyeler: [
    { sure: 1.5, tutus: 1.12, bekleme: 9 },
    { sure: 2, tutus: 1.15, bekleme: 8 },
    { sure: 2.5, tutus: 1.18, bekleme: 7 },
  ],
  evrimler: [
    {
      id: "lanetli-gecis",
      ad: "Lanetli Geçiş",
      d: "Faz boyunca 4 m içinden geçtiğin her rakibe bir kez 1,5 sn elektrik bırakırsın.",
    },
  ],
  basla(c) {
    c.y.kalan = c.p.sure;
    c.y.islenen = [];
  },
  bayrak: (y) => (y.kalan > 0 ? { hayalet: true, saldiriKapali: true } : {}),
  adim(c) {
    if (c.y.kalan <= 0) return;
    c.cikti.tutus *= c.p.tutus;
    if (c.o.evrim != "lanetli-gecis") return;
    const P = c.dunya.oyuncu;
    for (const h of c.dunya.hedefler)
      if (!c.y.islenen.includes(h.id) && Math.hypot(h.x - P.x, h.z - P.z) < 4) {
        c.y.islenen.push(h.id);
        c.durumUygula(h.id, "elektrik", 1.5);
      }
  },
};

/** Risk Taker barı: ≥20° kontrollü drift (en az 11 m/s), yakın takip ve near-miss doldurur */
export const RISK_BAR = {
  driftAci: 0.35,
  driftHiz: 11,
  drift: 12,
  takip: 15,
  nearMiss: 15,
  tam: 100,
  uzatma: 0.5,
};

export const RISK_TAKER: BeceriTanim = {
  id: "risk-taker",
  ad: "Risk Taker",
  d: "Yarışta 20° üstü kontrollü drift, yakın takip ve kıl payı geçiş risk barını doldurur. Bar dolunca dönüşürsün: güç ve tutuş artar, arkanda yakan alev izi kalır; rakibe hasar vermek dönüşümü biraz uzatır.",
  tur: "tetikli",
  etiketler: ["risk", "hasar", "hareket"],
  bar: (y) => y.deger / RISK_BAR.tam,
  seviyeler: [
    { kazanc: 1, sure: 5, guc: 1.25, tutus: 1.1, alev: 4, uzatmaUst: 2, bekleme: 4 },
    { kazanc: 1.2, sure: 6, guc: 1.3, tutus: 1.12, alev: 5, uzatmaUst: 2.5, bekleme: 4 },
    { kazanc: 1.4, sure: 7, guc: 1.35, tutus: 1.15, alev: 6, uzatmaUst: 3, bekleme: 4 },
  ],
  evrimler: [
    {
      id: "kivilcim-izi",
      ad: "Kıvılcım İzi",
      d: "İz yakmak yerine elektrik bırakır: hasar vermez, değen rakibi 1 sn frenler.",
    },
  ],
  adim(c) {
    const y = c.y,
      P = c.dunya.oyuncu;
    for (const p of y.iz) p[2] -= c.dt;
    y.iz = y.iz.filter((p) => p[2] > 0);
    if (y.kalan > 0) {
      c.cikti.guc *= c.p.guc;
      c.cikti.tutus *= c.p.tutus;
      c.cikti.carpismaHasari *= 1.5;
      if (c.adim % 6 == 0) y.iz.push([P.x, P.z, 1.5]);
      for (const h of c.dunya.hedefler)
        if (y.iz.some((p) => Math.hypot(h.x - p[0], h.z - p[1]) < 2.5)) {
          if (c.o.evrim == "kivilcim-izi") c.durumUygula(h.id, "elektrik", 1);
          else c.hasarVer(h.id, c.p.alev, "ates", 30);
        }
      // rakibe (hangi kaynaktan olursa) hasar vermek dönüşümü uzatır; toplam uzatma sınırlı
      for (const e of c.olaylar)
        if (e.tur == "HasarVerildi" && y.uzatma < c.p.uzatmaUst) {
          const ek = Math.min(RISK_BAR.uzatma, c.p.uzatmaUst - y.uzatma);
          y.kalan += ek;
          y.uzatma += ek;
        }
      return;
    }
    // Kontrollü drift açık dünyada da risk üretir; yakın takip ve near-miss yalnız yarışta doğrulanır.
    if (y.bekleme > 0) return;
    let ek = 0;
    for (const e of c.olaylar) {
      if (e.tur == "DriftTickQualified" && Math.abs(e.aci) >= RISK_BAR.driftAci && e.hiz >= RISK_BAR.driftHiz)
        ek += RISK_BAR.drift * e.dt;
      // hayalet fazında yakın temas riski yok: takip/near-miss biriktirmez
      else if (e.tur == "YakinTakip" && c.dunya.yarista && !c.bayrak.hayalet) ek += RISK_BAR.takip * e.dt;
      else if (e.tur == "NearMiss" && c.dunya.yarista && !c.bayrak.hayalet) ek += RISK_BAR.nearMiss;
    }
    y.deger = Math.min(RISK_BAR.tam, y.deger + ek * c.p.kazanc);
    if (y.deger >= RISK_BAR.tam) {
      y.deger = 0;
      y.kalan = c.p.sure;
      y.uzatma = 0;
      y.iz = [];
    }
  },
};

export const SLIPSTREAM_ENGINE: BeceriTanim = {
  id: "slipstream-engine",
  ad: "Slipstream Engine",
  d: "Rakibin arkasında yakın takipte kaldıkça hız depolar; takipten çıkınca depoladığın süre kadar güç artışı alırsın.",
  tur: "tetikli",
  etiketler: ["hareket"],
  bar: (y, p) => y.deger / p.enCok,
  seviyeler: [
    { enCok: 2, guc: 1.2, bekleme: 3 },
    { enCok: 2.5, guc: 1.25, bekleme: 3 },
    { enCok: 3, guc: 1.3, bekleme: 2.5 },
  ],
  evrimler: [
    {
      id: "ruzgar-kirici",
      ad: "Rüzgâr Kırıcı",
      d: "Kıl payı geçişler de depoya 0,5 sn ekler; boşalırken tutuş da artar.",
    },
  ],
  adim(c) {
    const y = c.y,
      evrim = c.o.evrim == "ruzgar-kirici";
    if (y.kalan > 0) {
      c.cikti.guc *= c.p.guc;
      if (evrim) c.cikti.tutus *= 1.08;
      return;
    }
    if (y.bekleme > 0) return;
    let takip = false;
    for (const e of c.olaylar) {
      if (e.tur == "YakinTakip") {
        takip = true;
        y.deger += e.dt;
      } else if (evrim && e.tur == "NearMiss") y.deger += 0.5;
    }
    y.deger = Math.min(c.p.enCok, y.deger);
    if (takip) return void (y.sayac = 0);
    if (y.deger <= 0) return;
    // takipten çıktıktan 0,25 sn sonra boşalır; yarım saniyeden az depo boşa gider
    y.sayac += c.dt;
    if (y.sayac < 0.25) return;
    if (y.deger >= 0.5) y.kalan = y.deger;
    y.deger = 0;
    y.sayac = 0;
  },
};

export const BECERILER: readonly BeceriTanim[] = [
  GRAPPLING_HOOK,
  FLYING_DUTCHMAN,
  RISK_TAKER,
  SLIPSTREAM_ENGINE,
];
export const beceriBul = (id: string) => BECERILER.find((b) => b.id == id);

export const BECERI_EKLENTILERI: readonly BeceriEklentisi[] = [
  {
    id: "sok-bobini",
    ad: "Şok bobini",
    d: "Takıldığı skill bir hedefin konumunu değiştirdiğinde hedefe 1,2 sn elektrik verir",
    etiket: "konum",
    olay: "KonumEtkisi",
    durum: "elektrik",
    sure: 1.2,
  },
  {
    id: "kor-cekirdegi",
    ad: "Kor çekirdeği",
    d: "Takıldığı skill hasar verdiğinde hedef 2 sn yanar",
    etiket: "hasar",
    olay: "HasarVerildi",
    durum: "ates",
    sure: 2,
  },
];
export const beceriEklentisiBul = (id: string) => BECERI_EKLENTILERI.find((e) => e.id == id);
/** eklenti bu skill'e takılabilir mi (etiket uyumu) */
export const eklentiUyar = (t: BeceriTanim, e: BeceriEklentisi) => t.etiketler.includes(e.etiket);

// ---------------------------------------------------------------- yürütücü

const MEKANIK_ONEKI = "beceri:";
/** etkin skill'in mekanik yürütücüdeki enerji tanımı (AbilityActivated "beceri:<id>") */
export function beceriMekanigi(o: BeceriOrnegi): MekanikTanim | null {
  const t = beceriBul(o.id);
  if (!t || t.tur != "aktif") return null;
  return {
    id: MEKANIK_ONEKI + t.id,
    versiyon: 1,
    kategori: "active",
    tetik: "AbilityActivated",
    maliyet: t.maliyet ?? 0,
    beklemeAdimi: 0,
    kazanc: 0,
    kazancBirimi: "olay",
  };
}
export const beceriYetenegi = (id: string) => MEKANIK_ONEKI + id;

/** geçerli, tekil, yuva sınırındaki skill'ler (sıra korunur) */
export function takiliBeceriler(takili: readonly BeceriOrnegi[]): BeceriOrnegi[] {
  const g = new Set<string>(),
    r: BeceriOrnegi[] = [];
  for (const o of takili) {
    if (!beceriBul(o.id) || g.has(o.id) || r.length >= SKILL_YUVASI) continue;
    g.add(o.id);
    r.push(o);
  }
  return r;
}

export const parametre = (t: BeceriTanim, o: BeceriOrnegi) =>
  t.seviyeler[Math.max(0, Math.min(t.seviyeler.length, Math.floor(o.seviye) || 1) - 1)];

/** şimdiki koruma/saldırı bayrakları (etki açık skill'lerden) */
export function bayraklar(d: BeceriDurumu, takili: readonly BeceriOrnegi[]): Bayraklar {
  const b: Bayraklar = { hayalet: false, saldiriKapali: false };
  for (const o of takiliBeceriler(takili)) {
    const y = d.yerel[o.id],
      f = y && beceriBul(o.id)!.bayrak?.(y);
    if (f?.hayalet) b.hayalet = true;
    if (f?.saldiriKapali) b.saldiriKapali = true;
  }
  return b;
}

const SALDIRI_ETIKETI: readonly Etiket[] = ["saldiri", "konum"];

/** skill'in tuşu şimdi çalışır mı (etki/bekleme yok, saldırı kapalı değil, hedef var). Enerji ayrıca denetlenir */
export function beceriHazir(
  d: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  id: string,
): boolean {
  const o = takiliBeceriler(takili).find((q) => q.id == id),
    t = o && beceriBul(o.id);
  if (!o || !t || t.tur != "aktif") return false;
  const y = d.yerel[o.id] ?? yerelBaslat();
  if (y.kalan > 0 || y.bekleme > 0) return false;
  const b = bayraklar(d, takili);
  if (b.saldiriKapali && t.etiketler.some((e) => SALDIRI_ETIKETI.includes(e))) return false;
  return !t.kullanilabilir || t.kullanilabilir(baglamYap(d, t, o, y, dunya, 0, [], b, bosCikti(), [], []));
}

/** tuş istekleri → mekanik yürütücüsüne gidecek yetenek kimlikleri (hazır olmayan istek enerji harcamaz) */
export function beceriIstekleri(
  d: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  istekler: readonly string[],
): string[] {
  return [...new Set(istekler)].filter((id) => beceriHazir(d, takili, dunya, id)).map(beceriYetenegi);
}

const bosCikti = (): BeceriCiktisi => ({
  oyuncuIvme: { x: 0, z: 0 },
  hedefIvme: {},
  olaylar: [],
  tutus: 1,
  guc: 1,
  carpismaHasari: 1,
  hayalet: false,
  saldiriKapali: false,
});

interface Kayit {
  e: BeceriOlayi;
  derinlik: number;
}

function baglamYap(
  d: BeceriDurumu,
  t: BeceriTanim,
  o: BeceriOrnegi,
  y: BeceriYerel,
  dunya: BeceriDunyasi,
  dt: number,
  olaylar: readonly BeceriOlayi[],
  bayrak: Bayraklar,
  cikti: BeceriCiktisi,
  kayit: Kayit[],
  adimHasar: Record<string, number>[],
  kaynak = t.id,
  derinlik = 0,
): BeceriBaglami {
  const c: BeceriBaglami = {
    t,
    o,
    y,
    p: parametre(t, o),
    dunya,
    dt,
    adim: d.adim,
    olaylar,
    bayrak,
    cikti,
    olay: (e) => void kayit.push({ e, derinlik }),
    hasarVer: (hedef, miktar, hasar, aralik) =>
      hasarYaz(d, dunya, bayrak, adimHasar, hedef, miktar, hasar, kaynak, aralik, (e) =>
        kayit.push({ e, derinlik }),
      ),
    durumUygula: (hedef, durum, sure) =>
      durumYaz(d, dunya, hedef, durum, sure, kaynak, (e) => kayit.push({ e, derinlik })),
    ivme: (g, ax, az) => {
      if (!Number.isFinite(ax) || !Number.isFinite(az)) return;
      if (g == "oyuncu") {
        cikti.oyuncuIvme.x += ax;
        cikti.oyuncuIvme.z += az;
      } else if (dunya.hedefler.some((h) => h.id == g)) {
        const a = (cikti.hedefIvme[g] ??= { x: 0, z: 0 });
        a.x += ax;
        a.z += az;
      }
    },
  };
  return c;
}

const hedefDurumu = (d: BeceriDurumu, id: string) => (d.hedefler[id] ??= { govde: 100, durumlar: [] });

function hasarYaz(
  d: BeceriDurumu,
  dunya: BeceriDunyasi,
  bayrak: Bayraklar,
  adimHasar: Record<string, number>[],
  hedef: string,
  miktar: number,
  hasar: HasarTuru,
  kaynak: string,
  aralik: number,
  olay: (e: BeceriOlayi) => void,
): number {
  if (bayrak.saldiriKapali || !(miktar > 0) || !Number.isFinite(miktar)) return 0;
  if (!dunya.hedefler.some((h) => h.id == hedef)) return 0;
  const anahtar = kaynak + "|" + hedef,
    son = d.sonVurus[anahtar];
  if (son !== undefined && d.adim - son < Math.max(1, aralik)) return 0;
  const A = (adimHasar[0] ??= {}),
    H = hedefDurumu(d, hedef),
    yazilan = Math.min(miktar, HASAR_ADIM_UST - (A[hedef] ?? 0), H.govde);
  if (!(yazilan > 0)) return 0;
  d.sonVurus[anahtar] = d.adim;
  A[hedef] = (A[hedef] ?? 0) + yazilan;
  H.govde -= yazilan;
  d.verilen += yazilan;
  olay({ tur: "HasarVerildi", hedef, miktar: yazilan, hasar, kaynak });
  return yazilan;
}

function durumYaz(
  d: BeceriDurumu,
  dunya: BeceriDunyasi,
  hedef: string,
  durum: DurumTuru,
  sure: number,
  kaynak: string,
  olay: (e: BeceriOlayi) => void,
) {
  if (!(sure > 0) || !dunya.hedefler.some((h) => h.id == hedef)) return;
  const H = hedefDurumu(d, hedef),
    s = Math.min(DURUM_UST, sure),
    var_ = H.durumlar.find((q) => q.tur == durum);
  // yenileme: süre uzar, olay yok (aynı durumu tekrar uygulamak ödül üretmez)
  if (var_) return void (var_.kalan = Math.max(var_.kalan, s));
  H.durumlar.push({ tur: durum, kalan: s, kaynak });
  olay({ tur: "DurumUygulandi", hedef, durum, kaynak });
}

const sinirliIvme = (a: { x: number; z: number }) => {
  const m = Math.hypot(a.x, a.z);
  if (m > IVME_UST) {
    a.x *= IVME_UST / m;
    a.z *= IVME_UST / m;
  }
};

/**
 * bir skill adımı (mekanik adımından sonra). tetiklenen: bu adımda enerjisi harcanan yetenek kimlikleri
 * ("beceri:<id>"); olaylar: bu adımda mekanik yürütücüsüne giren olaylar. Dönen çıktının olayları sonraki adımda
 * mekanik yürütücüsüne verilir. Sıra: başlayanlar → bayraklar → skill adımları (aynı girdiyi görür, sıradan
 * bağımsız) → durum etkileri → eklentiler (derinlik/işlem sınırı).
 */
export function beceriAdimi(
  durum: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  tetiklenen: readonly string[],
  olaylar: readonly BeceriOlayi[],
  dt: number,
): { d: BeceriDurumu; cikti: BeceriCiktisi } {
  const d = klonla(durum);
  d.adim++;
  const liste = takiliBeceriler(takili),
    cikti = bosCikti(),
    kayit: Kayit[] = [],
    adimHasar: Record<string, number>[] = [],
    gecerliDt = dt > 0 && dt <= 1 / 30 && Number.isFinite(dt) ? dt : 0;
  // sahip olunmayan skill'in geçici durumu kalmaz (kaybedilen skill'in etkisi aynı adımda biter)
  for (const k of Object.keys(d.yerel)) if (!liste.some((o) => o.id == k)) delete d.yerel[k];
  const baglam = (o: BeceriOrnegi, b: Bayraklar) =>
    baglamYap(
      d,
      beceriBul(o.id)!,
      o,
      (d.yerel[o.id] ??= yerelBaslat()),
      dunya,
      gecerliDt,
      olaylar,
      b,
      cikti,
      kayit,
      adimHasar,
    );
  // 1) enerjisi harcanan etkin skill'ler başlar
  const b0 = bayraklar(d, liste);
  for (const o of liste)
    if (tetiklenen.includes(beceriYetenegi(o.id))) {
      const c = baglam(o, b0);
      if (c.y.kalan <= 0 && c.y.bekleme <= 0) c.t.basla?.(c);
    }
  // 2) bayraklar (bu adımda başlayan faz dahil) bütün skill'ler için aynı
  const b = bayraklar(d, liste);
  cikti.hayalet = b.hayalet;
  cikti.saldiriKapali = b.saldiriKapali;
  // 3) skill adımları; etki biterse bekleme başlar
  for (const o of liste) {
    const c = baglam(o, b),
      y = c.y,
      acikti = y.kalan > 0;
    if (!acikti && y.bekleme > 0) y.bekleme = Math.max(0, y.bekleme - gecerliDt);
    c.t.adim(c);
    if (y.kalan > 0) y.kalan = Math.max(0, y.kalan - gecerliDt);
    if (acikti && y.kalan <= 0) {
      y.bekleme = c.p.bekleme ?? 0;
      y.hedef = null;
      y.nokta = null;
      y.islenen = [];
      y.uzatma = 0;
    }
  }
  // 4) durum etkileri: merkezî (her skill'in uyguladığı ateş/elektrik aynı kuralla işler)
  for (const [id, H] of Object.entries(d.hedefler)) {
    const T = dunya.hedefler.find((h) => h.id == id);
    for (const q of H.durumlar) {
      if (T && q.tur == "ates")
        hasarYaz(d, dunya, b, adimHasar, id, ATES.hasar, "ates", "ates", ATES.aralik, (e) =>
          kayit.push({ e, derinlik: 1 }),
        );
      if (T && q.tur == "elektrik") {
        const v = hiz(T);
        if (v > 2) {
          const a = (cikti.hedefIvme[id] ??= { x: 0, z: 0 });
          a.x -= (T.vx / v) * ELEKTRIK_FREN;
          a.z -= (T.vz / v) * ELEKTRIK_FREN;
        }
      }
      q.kalan -= gecerliDt;
    }
    H.durumlar = H.durumlar.filter((q) => q.kalan > 0);
  }
  // 5) skill eklentileri: yalnız takıldığı skill'in kendi olayına (kaynak = skill) tepki verir
  let islenen = 0;
  for (let i = 0; i < kayit.length; i++) {
    const { e, derinlik } = kayit[i];
    if (e.tur != "KonumEtkisi" && e.tur != "HasarVerildi") continue;
    const o = liste.find((q) => q.id == e.kaynak);
    if (!o || !o.eklentiler.length) continue;
    const t = beceriBul(o.id)!;
    for (const eid of o.eklentiler) {
      const ek = beceriEklentisiBul(eid);
      if (!ek || ek.olay != e.tur || !eklentiUyar(t, ek)) continue;
      if (derinlik + 1 > NEDENSEL_DERINLIK || islenen >= ADIM_ISLEM_SINIRI) {
        d.kesilen++;
        continue;
      }
      islenen++;
      durumYaz(d, dunya, e.hedef, ek.durum, ek.sure, t.id + "/" + ek.id, (x) =>
        kayit.push({ e: x, derinlik: derinlik + 1 }),
      );
    }
  }
  cikti.olaylar = kayit.slice(0, ADIM_ISLEM_SINIRI).map((k) => k.e);
  if (kayit.length > ADIM_ISLEM_SINIRI) d.kesilen += kayit.length - ADIM_ISLEM_SINIRI;
  sinirliIvme(cikti.oyuncuIvme);
  for (const a of Object.values(cikti.hedefIvme)) sinirliIvme(a);
  return { d, cikti };
}

/**
 * yakınlık gözlemcisi (fizikten sonra, salt okur): yakın takip ve near-miss olayları. Anti-farm: hedef başına takip
 * kredisi (en çok TAKIP.kredi sn, takip etmeyince yavaş dolar), near-miss hedef başına bekleme; çarpışma yaklaşmayı
 * geçersiz kılar. Yarış dışında olay üretmez.
 */
export function yakinlikGozlemi(
  durum: BeceriDurumu,
  dunya: BeceriDunyasi,
  engeller: readonly Engel[],
  dt: number,
  carpti: boolean,
): { d: BeceriDurumu; olaylar: BeceriOlayi[] } {
  const d: BeceriDurumu = {
      ...durum,
      takipKredi: { ...durum.takipKredi },
      yakin: { ...durum.yakin },
      sonNearMiss: { ...durum.sonNearMiss },
    },
    olaylar: BeceriOlayi[] = [];
  if (!dunya.yarista || !(dt > 0) || dt > 1 / 30) return { d, olaylar };
  const P = dunya.oyuncu,
    v = hiz(P);
  if (carpti) {
    d.yakin = {};
    d.sonCarpma = d.adim;
  }
  const yaklas = (id: string, aciklik: number) => {
    if (aciklik < NEAR_MISS.yakin && v > NEAR_MISS.hiz && !carpti) {
      d.yakin[id] ??= d.adim;
    } else if (d.yakin[id] !== undefined && aciklik > NEAR_MISS.uzak) {
      delete d.yakin[id];
      const son = d.sonNearMiss[id];
      if (
        (son === undefined || d.adim - son > NEAR_MISS.bekleme) &&
        d.adim - d.sonCarpma > NEAR_MISS.carpma
      ) {
        d.sonNearMiss[id] = d.adim;
        olaylar.push({ tur: "NearMiss", hedef: id, hiz: v });
      }
    }
  };
  for (const h of dunya.hedefler) {
    const dx = h.x - P.x,
      dz = h.z - P.z,
      m = Math.hypot(dx, dz);
    const takip =
      v > TAKIP.hiz &&
      m >= TAKIP.enAz &&
      m <= TAKIP.enCok &&
      aciFarki(Math.atan2(dx, dz), yon(P)) < TAKIP.koni &&
      Math.hypot(P.vx - h.vx, P.vz - h.vz) < TAKIP.bagil;
    const kredi = d.takipKredi[h.id] ?? TAKIP.kredi;
    if (takip && kredi > 1e-9) {
      // kredi kalanından fazla takip süresi verilmez
      olaylar.push({ tur: "YakinTakip", hedef: h.id, dt: Math.min(dt, kredi), mesafe: m });
      d.takipKredi[h.id] = Math.max(0, kredi - dt);
    } else if (!takip) d.takipKredi[h.id] = Math.min(TAKIP.kredi, kredi + TAKIP.dolum * dt);
    yaklas(h.id, m - NEAR_MISS.aracYari);
  }
  for (const e of engeller) yaklas(e.id, Math.hypot(e.x - P.x, e.z - P.z) - e.r - 1);
  return { d, olaylar };
}
