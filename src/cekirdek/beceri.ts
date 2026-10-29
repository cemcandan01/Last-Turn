// LT-SYS-004: MUTANT skill yürütücüsü. Saf ve belirlenimci: DOM, oyun durumu, saat ya da rastgelelik okumaz.
// Skill'ler birbirini tanımaz; yalnız mekanikler.ts'teki ortak olay sözlüğünü (HasarVerildi, KonumEtkisi, NearMiss…)
// üretir ve dinler. LT-SYS-009: etkin skill'ler enerji harcamaz, yalnız bekleme süresiyle (ya da hak sayısıyla)
// sınırlıdır: skill'ler art arda kullanılıp birleştirilebilsin. Enerji ve pasifler mekanik yürütücüsünde kalır (nitro);
// skill'lerin ürettiği olaylar bir sonraki adımda oraya girer.
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
/** uçuş/sarkaç ivmesinin yatay ve (yer çekimi dışında) dikey üst sınırı (m/s²) */
export const UCUS_IVME_UST = 60;
/** oyunun yer çekimi (fizik/veriler.ts YERCEKIMI ile aynı; saf çekirdek fiziğe bağlanmasın diye sabit) */
export const YER_CEKIMI = 24;
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
  /** ağırlık merkezi yüksekliği ve dikey hız (LT-SYS-008 uçuş/sarkaç; verilmezse yerde sayılır) */
  y?: number;
  vy?: number;
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
  /** oyuncunun önünde (yol boyunca) enAz–enCok m ilerideki bağlantı noktası: yarışta pist, serbest sürüşte açık
   *  dünyanın yol ağı; uygun nokta yoksa null */
  baglanti(enAz: number, enCok: number): [number, number] | null;
  /** yarışta mı (risk/takip yalnız yarışta birikir; serbest sürüşte farm yok) */
  yarista: boolean;
  /** oyuncunun altındaki zemin yüksekliği (uçuş irtifası buna göre); verilmezse 0 */
  zemin?: number;
  /** LT-SYS-009: şu an basılı tutulan skill tuşları (Volt basılı tuttukça uçar) */
  basili?: readonly string[];
  /** direksiyon (-1..1, + sola): yerde kancanın hangi köşeye atılacağı */
  direksiyon?: number;
  /** yerde önündeki köşe: ipin döndüğü nokta p ve çizildiği köşe uc (x, z); yon: +1 sol, −1 sağ, 0 en yakın */
  kose?(yon: number): { p: [number, number]; uc: [number, number] } | null;
  /** havada: burun yönünde sokak üstü asılma noktası (fizik x, y, z) ve ipin çizildiği bina noktası; yoksa null */
  gokBaglanti?(): { p: [number, number, number]; uc: [number, number, number] } | null;
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
  /** etki bitince parametre beklemesi yerine kullanılacak bekleme (sn; ör. kancanın kısa sarkaç beklemesi) */
  ozelBekleme?: number;
  /** LT-SYS-009 hak: kalan kullanım, verilmiş en çok hak ve sonraki hakkın dolum süresi (sn) */
  sarj?: number;
  sarjUst?: number;
  dolum?: number;
  /** ipin çizildiği uç (bina noktası; fizik noktasından ayrı olabilir) */
  uc?: [number, number, number];
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
  /** LT-SYS-008 uçuş/sarkaç: oyuncuya 3B ivme (m/s²; y yer çekimine eklenir) ve havada duruş denetimi (0-1).
   *  LT-SYS-009: ileri (havada burun yönünde itki), inis (düşüş hızı sınırı), yalpa (istenen yalpa hızı, rad/s) */
  ucus: (UcusEki & { x: number; y: number; z: number; denge: number }) | null;
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
  /** oyuncuya 3B ivme (uçuş/sarkaç); yatay bileşeni yatay ivme sınırına tabi değil, UCUS_IVME_UST ile sınırlı */
  ucus(ax: number, ay: number, az: number, denge: number, ek?: UcusEki): void;
  olay(e: BeceriOlayi): void;
}

export interface UcusEki {
  ileri?: number;
  inis?: number;
  yalpa?: number;
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
  /** aktif: tuşla kullanılır, bekleme süresiyle sınırlı; tetikli: koşulu dolunca kendi başlar */
  tur: "aktif" | "tetikli";
  etiketler: readonly Etiket[];
  /** seviye başına parametreler (indeks = seviye − 1). "bekleme": etki sonrası bekleme (sn); "sarj" verilirse
   *  skill o kadar hakla çalışır, her hak "bekleme" sürede ayrı dolar (beklemeye girmeden art arda kullanılır) */
  seviyeler: readonly Readonly<Record<string, number>>[];
  evrimler: readonly Evrim[];
  /** aktif: şimdi kullanılabilir mi (ör. hedef var mı). Değilse istek düşer, hak/bekleme harcanmaz */
  kullanilabilir?(c: BeceriBaglami): boolean;
  /** aktif: etki başlıyor */
  basla?(c: BeceriBaglami): void;
  /** aktif: etki sürerken tuşa yeniden basılınca (verilirse tuş aç/kapa çalışır: kanca bırakılır) */
  birak?(c: BeceriBaglami): void;
  /** aktif ve hazırken atılacağı nokta (dünya x, y, z; HUD/efekt parlatır) */
  hedefNokta?(c: BeceriBaglami): [number, number, number] | null;
  /** tetiklenen skill'in dolum barı (0-1; HUD) */
  bar?(y: BeceriYerel, p: Readonly<Record<string, number>>): number;
  /** tetiklenen: şu an dolamıyorsa oyuncuya gösterilecek neden (ör. rakip yok); dolabiliyorsa null */
  dolmaEngeli?(c: BeceriBaglami): BeceriEngeli | null;
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

/**
 * LT-SYS-009 kanca: ilk dokunuş atar, ikinci bırakır (en çok KANCA.enUzun sn). Hedef sırası: önündeki rakip (ona
 * çekilirsin, o yavaşlar) → havadaysan (şehir) burnunun yönündeki sokağın üstüne asılırsın (ip yan binaya çizilir;
 * sokak boyunca savrulursun, duvara değil) → yerdeysen önündeki köşe (ip köşeye takılır, araç köşenin çevresinde
 * döner: hız ve tutuş). Köşe ve rakip yoksa atılamaz. İp boyu yalnız kısalır (gevşeyince yeni boy): kaçınılmaz
 * yakınlaşma ipi geren bir yay gibi davranmaz, araç en yakın geçtiği uzaklıkta yörüngeye girer.
 */
export const SARKAC = "#bina";
export const KOSE = "#kose";
export const KANCA = {
  /** bir atışın en uzun süresi (sn) */
  enUzun: 4,
  /** havada sayılma yüksekliği (ağırlık merkezi zeminden, m) */
  hava: 2.5,
};
export const KANCA_SARKAC = { yay: 28, sonum: 5, kisalma: 3, enKisa: 10, ust: 30 };
/** köşe sarkacı: tutuş çarpanı, teğet itki (m/s²) ve hız tavanı (m/s), en çok dönüş (rad), ipin kopma payı (m) */
export const KANCA_KOSE = { tutus: 1.3, itki: 5, hizUst: 45, donus: 1.6, kopma: 10, ust: 60, enKisa: 4 };

type KancaHedefi =
  | { tur: "rakip"; id: string }
  | { tur: "gok"; p: [number, number, number]; uc: [number, number, number] }
  | { tur: "kose"; p: [number, number]; uc: [number, number] };

const havadaMi = (c: BeceriBaglami) => (c.dunya.oyuncu.y ?? 0) - (c.dunya.zemin ?? 0) > KANCA.hava;

function kancaHedefi(c: BeceriBaglami): KancaHedefi | null {
  const ters = c.o.evrim == "ters-kanca",
    r = koniHedefi(c, c.p.menzil, ters ? 0.6 : 0.45, ters);
  if (r) return { tur: "rakip", id: r };
  if (ters) return null;
  if (havadaMi(c)) {
    const g = c.dunya.gokBaglanti?.();
    return g ? { tur: "gok", p: g.p, uc: g.uc } : null;
  }
  const st = c.dunya.direksiyon ?? 0,
    k = c.dunya.kose?.(Math.abs(st) > 0.15 ? Math.sign(st) : 0);
  return k ? { tur: "kose", p: k.p, uc: k.uc } : null;
}

function sarkacAdimi(c: BeceriBaglami) {
  const P = c.dunya.oyuncu,
    n = c.y.nokta!,
    dx = n[0] - P.x,
    dy = c.y.deger - (P.y ?? 0),
    dz = n[1] - P.z,
    d = Math.hypot(dx, dy, dz) || 1,
    ux = dx / d,
    uy = dy / d,
    uz = dz / d;
  // savrulmanın tepesi: bağlantı geride kaldı ve araç artık yükselmiyor: bırak (hız ileri korunur)
  if (P.vx * dx + P.vz * dz < 0 && (P.vy ?? 0) <= 0 && Math.hypot(dx, dz) > 6) return void (c.y.kalan = 0);
  if ((P.y ?? 0) - (c.dunya.zemin ?? 0) < 1.2 && (P.vy ?? 0) <= 0) return void (c.y.kalan = 0);
  c.y.sayac = Math.max(KANCA_SARKAC.enKisa, Math.min(c.y.sayac, d) - KANCA_SARKAC.kisalma * c.dt);
  const uzama = d - c.y.sayac;
  if (uzama <= 0) return;
  const vr = P.vx * ux + (P.vy ?? 0) * uy + P.vz * uz,
    a = Math.min(
      KANCA_SARKAC.ust + YER_CEKIMI,
      KANCA_SARKAC.yay * Math.min(uzama, 3) + KANCA_SARKAC.sonum * Math.max(0, -vr),
    );
  c.ucus(ux * a, uy * a, uz * a, 0);
}

const aciFarkiIsaretli = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function koseAdimi(c: BeceriBaglami) {
  const P = c.dunya.oyuncu,
    n = c.y.nokta!,
    rx = P.x - n[0],
    rz = P.z - n[1],
    d = Math.hypot(rx, rz) || 1,
    v = hiz(P);
  // köşe döndü (hız yönü yeterince çevrildi), ip koptu ya da araç havalandı: bırak
  if (Math.abs(aciFarkiIsaretli(yon(P), c.y.deger)) > KANCA_KOSE.donus) return void (c.y.kalan = 0);
  if (d > c.y.sayac + KANCA_KOSE.kopma || havadaMi(c)) return void (c.y.kalan = 0);
  c.y.sayac = Math.max(KANCA_KOSE.enKisa, Math.min(c.y.sayac, d));
  c.cikti.tutus *= KANCA_KOSE.tutus;
  const ux = rx / d,
    uz = rz / d,
    vr = P.vx * ux + P.vz * uz,
    vt = P.vx * uz - P.vz * ux,
    uzama = d - c.y.sayac;
  let ax = 0,
    az = 0,
    yalpa: number | undefined;
  if (uzama > 0.05) {
    // gergin ip: merkezcil ivme (teğet hızın gerektirdiği) + uzamaya yay + dışa hıza sönüm
    const a = Math.min(KANCA_KOSE.ust, (vt * vt) / d + 30 * uzama + 6 * Math.max(0, vr));
    ax -= ux * a;
    az -= uz * a;
    // burun yörüngenin teğetine dönsün (tutuş): yörünge açısal hızı + hız yönüne hizalama
    yalpa = vt / d + 3 * aciFarkiIsaretli(yon(P), P.h);
  }
  // teğet: ipin taşıyabileceği hıza kadar itki (hız), üstündeyse fren (ip kopup binaya savrulmasın)
  const vIp = Math.sqrt(0.5 * KANCA_KOSE.ust * c.y.sayac),
    teget = v > vIp ? -Math.min(24, (v - vIp) * 5) : v < KANCA_KOSE.hizUst ? KANCA_KOSE.itki : 0;
  if (v > 1) {
    ax += (P.vx / v) * teget;
    az += (P.vz / v) * teget;
  }
  c.ucus(ax, 0, az, 1, yalpa === undefined ? undefined : { yalpa });
}

export const GRAPPLING_HOOK: BeceriTanim = {
  id: "grappling-hook",
  ad: "Grappling Hook",
  d: "Dokun: kanca atılır ve çeker, yeniden dokun: bırakır. Öndeki rakibe atılırsa ona çekilirsin, o yavaşlar. Yerde köşeye atılır: köşenin çevresinde hızla ve tutuşla dönersin. Havada sokağın üstüne asılıp savrulursun; burnunu yan sokağa çevirip köşe dönebilirsin. Köşe ya da rakip yoksa atılamaz. Her seviye bir hak daha verir.",
  tur: "aktif",
  etiketler: ["hareket", "kontrol", "konum"],
  seviyeler: [
    { menzil: 35, cekis: 7, fren: 3, sarj: 1, bekleme: 6 },
    { menzil: 45, cekis: 8.5, fren: 3.5, sarj: 2, bekleme: 5.5 },
    { menzil: 55, cekis: 10, fren: 4, sarj: 3, bekleme: 5 },
  ],
  evrimler: [
    {
      id: "ters-kanca",
      ad: "Ters Kanca",
      d: "Kanca arkadaki rakibe atılır ve onu iki kat sert frenler; sen çekilmezsin. Köşeye ve binaya tutunmaz.",
    },
  ],
  kullanilabilir: (c) => !!kancaHedefi(c),
  hedefNokta(c) {
    const h = kancaHedefi(c);
    if (!h) return null;
    if (h.tur == "gok") return h.uc;
    if (h.tur == "kose") return [h.uc[0], 1.5, h.uc[1]];
    const H = c.dunya.hedefler.find((q) => q.id == h.id)!;
    return [H.x, 1, H.z];
  },
  basla(c) {
    const h = kancaHedefi(c),
      P = c.dunya.oyuncu;
    if (!h) return;
    c.y.kalan = KANCA.enUzun;
    if (h.tur == "rakip") {
      c.y.hedef = h.id;
      c.y.nokta = null;
      return c.olay({ tur: "KonumEtkisi", hedef: h.id, etki: "cekme", kaynak: c.t.id });
    }
    if (h.tur == "gok") {
      c.y.hedef = SARKAC;
      c.y.nokta = [h.p[0], h.p[2]];
      c.y.deger = h.p[1];
      c.y.uc = h.uc;
      // ip takıldığı uzaklığın %85'i: hemen gerilir, aracı öne ve yukarı savurur
      c.y.sayac = Math.max(
        KANCA_SARKAC.enKisa,
        0.85 * Math.hypot(h.p[0] - P.x, h.p[1] - (P.y ?? 0), h.p[2] - P.z),
      );
      return;
    }
    c.y.hedef = KOSE;
    c.y.nokta = h.p;
    c.y.uc = [h.uc[0], 1.5, h.uc[1]];
    c.y.sayac = Math.hypot(P.x - h.p[0], P.z - h.p[1]);
    // başlangıç hız yönü: dönüş bundan ölçülür
    c.y.deger = yon(P);
  },
  birak(c) {
    c.y.kalan = 0;
  },
  adim(c) {
    if (c.y.kalan <= 0) return;
    if (c.y.hedef == SARKAC) return sarkacAdimi(c);
    if (c.y.hedef == KOSE) return koseAdimi(c);
    const P = c.dunya.oyuncu,
      ters = c.o.evrim == "ters-kanca",
      H = c.dunya.hedefler.find((h) => h.id == c.y.hedef);
    if (!H) return void (c.y.kalan = 0);
    const dx = H.x - P.x,
      dz = H.z - P.z,
      d = Math.hypot(dx, dz);
    // kanca kopar: çok yaklaştı ya da menzilden çok uzaklaştı
    if (d < 7 || d > c.p.menzil * 1.3) return void (c.y.kalan = 0);
    const ux = dx / d,
      uz = dz / d,
      kapanma = (P.vx - H.vx) * ux + (P.vz - H.vz) * uz;
    if (!ters) {
      // yaklaşma hızı arttıkça çekiş azalır (içine fırlatmaz)
      const k = Math.min(1, Math.max(0, (22 - kapanma) / 10));
      c.ivme("oyuncu", ux * c.p.cekis * k, uz * c.p.cekis * k);
    }
    c.ivme(H.id, -ux * c.p.fren * (ters ? 2 : 1), -uz * c.p.fren * (ters ? 2 : 1));
  },
};

export const FLYING_DUTCHMAN: BeceriTanim = {
  id: "flying-dutchman",
  ad: "Flying Dutchman",
  d: "Kısa hayalet fazı: tam dokunulmazsın, hiç hasar almaz, ağaç ve kaya gibi engellerin içinden geçersin; tutuş artar. Duvarlar ve pist kesme cezası geçerli. Faz boyunca hasar veremez, saldırı ve kanca kullanamazsın.",
  tur: "aktif",
  etiketler: ["savunma", "hareket"],
  seviyeler: [
    // 1,5 sn'lik ilk seviye ölçümde fiziksel iz bırakmıyordu (tutuş ×1,12 yolda ~0 m); faz değeri hasar
    // bağışıklığı ve görünür hayalet hâli: süre 1 sn uzadı, bekleme de 1 sn uzadı (kullanım payı %14 → %20)
    { sure: 2.5, tutus: 1.12, bekleme: 10 },
    { sure: 3, tutus: 1.15, bekleme: 9 },
    { sure: 3.5, tutus: 1.18, bekleme: 8 },
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

/** Risk Taker barı: ≥20° kontrollü drift (en az 11 m/s; açık dünyada da), yarışta yakın takip ve near-miss doldurur */
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
  d: "20° üstü kontrollü drift (açık dünyada da), yarışta yakın takip ve kıl payı geçiş risk barını doldurur. Bar dolunca dönüşürsün: güç ve tutuş artar, arkanda yakan alev izi kalır; rakibe hasar vermek dönüşümü biraz uzatır.",
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
  // yalnız rakibin arkasında dolar: açık dünyada ve rakipsiz etkinlikte rakip yok
  dolmaEngeli: (c) => (c.dunya.hedefler.length ? null : "rakip"),
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

/**
 * Volt Kanat (LT-SYS-009): basılı tuttukça araç yükselir ve burnunun yönünde ileri itilir, en çok `sure` sn. Bırakınca
 * ya da süre bitince süzülerek iner (düşüş hızı sınırlı, burun yine parmakla yönetilir). tavanHiz: itkinin kesildiği
 * yatay hız (m/s); inis: süzülmede en çok düşüş hızı (m/s); inisUst: süzülmenin en uzun süresi (sn)
 */
export const VOLT = { tavanHiz: 48, inis: 8, inisUst: 8 };

export const VOLT_KANAT: BeceriTanim = {
  id: "volt-kanat",
  ad: "Volt Kanat",
  d: "Basılı tuttukça araç yükselir ve ileri atılır (en çok 3 sn); bırakınca süzülerek iner. Havada ekranı kaydırarak burnu çevirirsin. Çatılara inebilirsin.",
  tur: "aktif",
  etiketler: ["hareket"],
  seviyeler: [
    { sure: 3, kalkis: 12, tirmanis: 13, itki: 9, bekleme: 9 },
    { sure: 3, kalkis: 14, tirmanis: 15, itki: 10.5, bekleme: 8 },
    { sure: 3, kalkis: 16, tirmanis: 17, itki: 12, bekleme: 7 },
  ],
  evrimler: [
    {
      id: "firtina-kanadi",
      ad: "Fırtına Kanadı",
      d: "Uçarken 8 m içinden geçtiğin her rakibe bir kez 1,5 sn elektrik bırakırsın.",
    },
  ],
  basla(c) {
    c.y.kalan = c.p.sure;
    c.y.islenen = [];
    // sayac: süzülme aşamasının üst süresi
    c.y.sayac = VOLT.inisUst;
  },
  birak(c) {
    c.y.kalan = 0;
  },
  adim(c) {
    const P = c.dunya.oyuncu,
      y = P.y ?? 0,
      vy = P.vy ?? 0,
      zemin = c.dunya.zemin ?? 0;
    if (c.y.kalan <= 0) {
      // süzülme: yere (ya da çatıya) değene dek düşüş hızı sınırlı
      if (c.y.sayac <= 0) return;
      c.y.sayac -= c.dt;
      if (y - zemin < 1.2 && vy > -1) return void (c.y.sayac = 0);
      return void c.ucus(0, 0, 0, 0, { inis: VOLT.inis });
    }
    // tuş bırakıldı: uçuş biter (basılı bilgisi yoksa süre boyunca uçar)
    if (c.dunya.basili && !c.dunya.basili.includes(c.t.id)) return void (c.y.kalan = 0);
    const ay = YER_CEKIMI + Math.max(-6, Math.min(c.p.kalkis, (c.p.tirmanis - vy) * 2)),
      v = Math.hypot(P.vx, P.vz);
    c.ucus(0, ay, 0, 0, { ileri: v < VOLT.tavanHiz ? c.p.itki : 0 });
    if (c.o.evrim != "firtina-kanadi") return;
    for (const h of c.dunya.hedefler)
      if (!c.y.islenen.includes(h.id) && Math.hypot(h.x - P.x, h.z - P.z) < 8) {
        c.y.islenen.push(h.id);
        c.durumUygula(h.id, "elektrik", 1.5);
      }
  },
};

export const BECERILER: readonly BeceriTanim[] = [
  GRAPPLING_HOOK,
  FLYING_DUTCHMAN,
  RISK_TAKER,
  SLIPSTREAM_ENGINE,
  VOLT_KANAT,
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

/**
 * skill şimdi neden kullanılamıyor / dolmuyor (HUD; enerji ayrıca). null: hazır (aktif) ya da doluyor (tetikli).
 * etkin: etki sürüyor · bekleme: etki sonrası bekleme · faz: hayalet fazında saldırı/konum skill'i kapalı ·
 * hedef: menzilde rakip ya da yol noktası yok · rakip: tetikli skill rakip olmadan dolmaz
 */
export type BeceriEngeli = "etkin" | "bekleme" | "faz" | "hedef" | "rakip";

export function beceriEngeli(
  d: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  id: string,
): BeceriEngeli | null {
  const o = takiliBeceriler(takili).find((q) => q.id == id),
    t = o && beceriBul(o.id);
  if (!o || !t) return null;
  const y = d.yerel[o.id] ?? yerelBaslat(),
    p = parametre(t, o);
  // aç/kapa skill etki sürerken basılabilir (bırakır)
  if (y.kalan > 0) return t.birak ? null : "etkin";
  if (p.sarj ? sarjSayisi(y, p) <= 0 : y.bekleme > 0) return "bekleme";
  const b = bayraklar(d, takili),
    c = () => baglamYap(d, t, o, y, dunya, 0, [], b, bosCikti(), [], []);
  if (t.tur == "tetikli") return t.dolmaEngeli?.(c()) ?? null;
  if (b.saldiriKapali && t.etiketler.some((e) => SALDIRI_ETIKETI.includes(e))) return "faz";
  return t.kullanilabilir && !t.kullanilabilir(c()) ? "hedef" : null;
}

/** hak sayısı: ilk kez (ya da seviye artınca) verilmemiş haklar eklenmiş sayılır */
export const sarjSayisi = (y: BeceriYerel, p: Readonly<Record<string, number>>) =>
  (y.sarj ?? p.sarj) + Math.max(0, p.sarj - (y.sarjUst ?? p.sarj));

/** skill'in tuşu şimdi çalışır mı (bekleme/hak var, saldırı kapalı değil, hedef var; açıkken aç/kapa bırakır) */
export function beceriHazir(
  d: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  id: string,
): boolean {
  const o = takiliBeceriler(takili).find((q) => q.id == id);
  return !!o && beceriBul(o.id)!.tur == "aktif" && beceriEngeli(d, takili, dunya, id) == null;
}

/** tuş istekleri → bu adımda başlayacak/bırakılacak skill kimlikleri (hazır olmayan istek düşer) */
export function beceriIstekleri(
  d: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  istekler: readonly string[],
): string[] {
  return [...new Set(istekler)].filter((id) => beceriHazir(d, takili, dunya, id));
}

/** hazır skill'in atılacağı nokta (kanca hedefi parlaması); hazır değilse ya da noktası yoksa null */
export function beceriHedefNoktasi(
  d: BeceriDurumu,
  takili: readonly BeceriOrnegi[],
  dunya: BeceriDunyasi,
  id: string,
): [number, number, number] | null {
  const o = takiliBeceriler(takili).find((q) => q.id == id),
    t = o && beceriBul(o.id);
  if (!o || !t?.hedefNokta) return null;
  const y = d.yerel[o.id] ?? yerelBaslat();
  if (y.kalan > 0 || beceriEngeli(d, takili, dunya, id) != null) return null;
  return t.hedefNokta(baglamYap(d, t, o, y, dunya, 0, [], bayraklar(d, takili), bosCikti(), [], []));
}

const bosCikti = (): BeceriCiktisi => ({
  oyuncuIvme: { x: 0, z: 0 },
  ucus: null,
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
    ucus: (ax, ay, az, denge, ek) => {
      if (![ax, ay, az, denge].every(Number.isFinite)) return;
      const u = (cikti.ucus ??= { x: 0, y: 0, z: 0, denge: 0 });
      u.x += ax;
      u.y += ay;
      u.z += az;
      u.denge = Math.max(u.denge, Math.min(1, denge));
      if (Number.isFinite(ek?.ileri)) u.ileri = Math.min(UCUS_IVME_UST, (u.ileri ?? 0) + ek!.ileri!);
      if (Number.isFinite(ek?.inis)) u.inis = Math.max(2, Math.min(u.inis ?? Infinity, ek!.inis!));
      if (Number.isFinite(ek?.yalpa)) u.yalpa = Math.max(-4, Math.min(4, ek!.yalpa!));
    },
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
 * bir skill adımı (mekanik adımından sonra). tetiklenen: bu adımda basılan hazır skill'ler (beceriIstekleri: açıkken
 * aç/kapa skill bırakılır, değilse başlar; hak ya da bekleme harcanır); olaylar: bu adımda mekanik yürütücüsüne giren olaylar. Dönen çıktının olayları sonraki adımda
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
  // 1) basılan skill'ler: açıksa bırakılır, hazırsa başlar (hak ya da bekleme)
  const b0 = bayraklar(d, liste);
  for (const o of liste)
    if (tetiklenen.includes(o.id)) {
      const c = baglam(o, b0),
        y = c.y;
      if (y.kalan > 0) {
        c.t.birak?.(c);
        continue;
      }
      const sarj = c.p.sarj ? sarjSayisi(y, c.p) : 0;
      if (c.p.sarj ? sarj <= 0 : y.bekleme > 0) continue;
      if (c.t.kullanilabilir && !c.t.kullanilabilir(c)) continue;
      c.t.basla?.(c);
      if (c.p.sarj && y.kalan > 0) {
        y.sarj = sarj - 1;
        y.sarjUst = c.p.sarj;
      }
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
    // hak: eksik hak, etkiden bağımsız, her biri "bekleme" sürede dolar
    if (c.p.sarj) {
      const n = sarjSayisi(y, c.p);
      y.sarjUst = c.p.sarj;
      y.sarj = n;
      if (n < c.p.sarj) {
        y.dolum = (y.dolum ?? 0) + gecerliDt;
        if (y.dolum >= c.p.bekleme) {
          y.sarj = n + 1;
          y.dolum = 0;
        }
      } else y.dolum = 0;
    }
    c.t.adim(c);
    if (y.kalan > 0) y.kalan = Math.max(0, y.kalan - gecerliDt);
    if (acikti && y.kalan <= 0) {
      y.bekleme = c.p.sarj ? 0 : (y.ozelBekleme ?? c.p.bekleme ?? 0);
      y.uc = undefined;
      y.ozelBekleme = undefined;
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
  if (cikti.ucus) {
    const u = cikti.ucus,
      m = Math.hypot(u.x, u.z);
    if (m > UCUS_IVME_UST) {
      u.x *= UCUS_IVME_UST / m;
      u.z *= UCUS_IVME_UST / m;
    }
    u.y = Math.max(-UCUS_IVME_UST, Math.min(YER_CEKIMI + UCUS_IVME_UST, u.y));
  }
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
