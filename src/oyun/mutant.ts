// MUTANT modu (oyun tarafı, A1): açık dünyada roguelite koşu. Kurallar saf modülde (mutant-kosu.ts); burası koşuyu
// tutar, her sabit adımda süreyi akıtır, haritadaki işaretlere girişi algılar, etkinliği (mevcut pist yarışı) koşu
// aracıyla başlatır, sonucu ödüle çevirir ve haritaya döndürür. Kariyer ödülü, rekor ve hayalet yazılmaz; rekor
// lt_mutant'ta. Yarışta koşu yokken hiçbir şey yapmaz.
import { CARS } from "../arac/araclar";
import { aracKur, parcaBul } from "../arac/parcalar";
import { okuJson, yazJson } from "../cekirdek/depo";
import { isaretleriKur } from "../cizim/isaretler";
import { COND, type GununSaati, type Hava } from "../cizim/ortam";
import type { DunyaSorgusu, SimDurumu } from "../fizik/tipler";
import type { Pist } from "../dunya/pist";
import { rakip, rakipEtkisi, rakipGovdesi, rakipSirasi, RAKIP, type RakipAyari } from "./rakip";
import { beceriDunyasiYap, engelListesi } from "./mutant-beceri";
import { KISILIKLER } from "../yz/kisilik";
import { kurulum, applyPreset } from "./kurulum";
import { bosGorev, gorevAdimi, gorevCek, type GorevOlayi } from "./mutant-gorev";
import { TELEW } from "../dunya/corak";
import { mulberry32 } from "../cekirdek/rastgele";
import { PRESETS } from "../fizik/veriler";
import { setCar } from "./durum";
import {
  ATOLYE,
  BOSS_YERI,
  beceriGorunumu,
  beceriYarisBasi,
  bossBitti,
  bossHedefi,
  etkinlikHedefi,
  bossPisti,
  bossaGir,
  DUELLO,
  enerjiAdimi,
  etkinlikBitti,
  hasarAl,
  kaporaBelirle,
  kesmeCezasi,
  kosuAraci,
  etkinlikRakibi,
  bossRakibi,
  toprakDengesi,
  kosuBaslat,
  nitroDurumu,
  zamanAkis,
  type EtkinlikSonucu,
  type Kosu,
  type PistAdayi,
  type BeceriHudEngeli,
  type Risk,
} from "./mutant-kosu";

/** MUTANT rekoru: kariyerden ayrı */
const ANAHTAR = "lt_mutant";
/** işarete giriş: yarıçap (m), en yüksek hız (m/s), içeride bekleme (sn) */
const ISARET_R = 10,
  ISARET_V = 5,
  ISARET_SURE = 0.5;
export { BOSS_YERI };

export type MutantIsaret =
  { tur: "etkinlik"; id: number } | { tur: "sandik"; id: number } | { tur: "atolye" } | { tur: "boss" };

export interface MutantArayuzu {
  /** koşu başı: araç + başlangıç pasifi */
  basla(): void;
  /** seviye atlayınca pasif seçimi */
  secim(): void;
  /** işarete girildi: etkinlik kartı / atölye / boss kartı */
  isaret(i: MutantIsaret): void;
  /** etkinlik ya da boss bitti */
  sonuc(r: EtkinlikSonucu | null, boss: boolean, gecti: boolean): void;
  /** süre doldu: boss kartı (zorunlu) */
  sureDoldu(): void;
  /** hasar aldı (gövde düştü); pert ise koşu bitti */
  hasar(tur: "carpma" | "spin", pert: boolean): void;
  bitti(): void;
  /** yol görevi başladı / tamamlandı / kaçtı (LT-SYS-007) */
  gorev?(o: GorevOlayi): void;
}

export const mutant = {
  kosu: null as Kosu | null,
  /** yarışta açık etkinlik (id) ya da boss */
  etkinlik: null as number | "boss" | null,
  /** etkinlikte seçilen risk kademesi */
  risk: 0 as Risk,
  /** etkinlikten dönüş noktası */
  donus: null as [number, number, number] | null,
  /** koşu dışı koşullar (boss havası/gecesi bitince geri yüklenir) */
  kosul: null as { wx: Hava; tod: GununSaati } | null,
  /** içinde durulan işaret ve süre (aynı işaret çıkıp yeniden girilene dek tekrar açılmaz) */
  icinde: "",
  bekle: 0,
  kapali: "",
  /** süre etkinlik içinde doldu: dönüşte boss kartı */
  bossBekliyor: false,
  /** hasar algısı: son görülen sert çarpma zamanı, spin sürüyor mu */
  sonHit: -9,
  spinde: false,
  /** NİTRO tuşuna basıldı: bir sonraki sabit adımda yetenek olayı olur */
  nitro: false,
  /** basılan skill tuşları (skill kimliği): bir sonraki sabit adımda istek olur */
  beceriIstek: [] as string[],
  /** son reddedilen skill isteği ve nedeni (HUD yuvada kısa uyarı, ses); n her retle artar */
  red: { id: "", engel: "" as BeceriHudEngeli | "basla" | "", n: 0 },
  yeniRekor: false,
  /** yol görevleri (LT-SYS-007): açık dünyada etkinlikler arası kısa görevler */
  gorev: bosGorev(),
  ui: null as MutantArayuzu | null,
};

/** etkinliğe aday pistler (yarislar.ts'teki EVENTS; döngüsel içe aktarım çağrı anında çözülür) */
let pistlerOnbellek: PistAdayi[] | null = null;
let pistKaynagi: (() => PistAdayi[]) | null = null;
export const mutantPistKaynagi = (f: () => PistAdayi[]) => {
  pistKaynagi = f;
  pistlerOnbellek = null;
};
export const mutantPistleri = () => (pistlerOnbellek ??= pistKaynagi ? pistKaynagi() : []);

export const mutantRekoru = () => okuJson(ANAHTAR, { bolge: 0, boss: 0 });

export function mutantBaslat(tohum = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0) {
  // Sadece yerel geliştirme veya /dev/ deneme adresinde; normal koşunun süresini değiştirmez.
  const test =
    (import.meta.env.DEV || location.pathname.includes("/dev/")) &&
    new URLSearchParams(location.search).get("mutantTest") == "1";
  mutant.kosu = kosuBaslat(tohum, mutantPistleri(), test);
  mutant.etkinlik = null;
  mutant.donus = null;
  // Başlangıç noktası atölye halkasının içindedir: kullanıcı alandan çıkıp geri dönmeden açma.
  mutant.icinde = mutant.kapali = "a";
  mutant.bekle = 0;
  mutant.bossBekliyor = false;
  mutant.yeniRekor = false;
  mutant.gorev = bosGorev();
}

export function mutantKapat() {
  mutantKosuluGeriYukle();
  isaretleriKur([], () => 0);
  mutant.kosu = null;
  mutant.etkinlik = null;
}

/** koşu aracı: seçilen stok araç + atölye parçaları + pasifler (kurulum.mod; fizik kodu değişmez) */
export let mutantArac = -1;
export function mutantAracSec(i: number) {
  mutantArac = i;
  setCar(i);
  mutantKurulumUygula();
}

/** hasar sonrası yalnız aracın değerleri (güç kaybı) yenilenir; yarış kurulumu (lastik, önayar) değişmez */
export function mutantAracGuncelle() {
  const k = mutant.kosu;
  if (!k || mutantArac < 0 || !kurulum.mod) return;
  kurulum.mod = {
    ...kurulum.mod,
    car: toprakDengesi(kosuAraci(aracKur(mutantArac, k.parcalar).car, k), kurulum.tire),
  };
}

export function mutantKurulumUygula() {
  const k = mutant.kosu;
  if (!k || mutantArac < 0) return;
  const P = aracKur(mutantArac, k.parcalar),
    lastik = P.parcalar.some((id) => parcaBul(id)!.e.lastik != null);
  // MUTANT yarışında lastik değişmez: pist asfaltı/toprağı açık dünyadakiyle aynı tutar (Cem 0.8.12)
  kurulum.yarisLastik = null;
  kurulum.mod = {
    taban: CARS[mutantArac],
    car: toprakDengesi(kosuAraci(P.car, k), lastik ? P.tire : PRESETS[P.pk].tire),
    tire: lastik ? P.tire : null,
    ayar: P.ayar,
    parcalar: P.parcalar,
  };
  kurulum.pk = P.pk;
  applyPreset();
}

export function mutantKosuluGeriYukle() {
  if (!mutant.kosul) return;
  COND.wx = mutant.kosul.wx;
  COND.tod = mutant.kosul.tod;
  mutant.kosul = null;
}

/** boss yarışının koşulları (hava, gece); dönüşte geri yüklenir */
export function mutantBossKosulu() {
  const b = mutant.kosu?.boss;
  if (!b) return;
  mutant.kosul = { wx: COND.wx, tod: COND.tod };
  if (b.hava) COND.wx = b.hava;
  if (b.gece) COND.tod = "night";
}

/** yarış başlarken (EVENTS indeksi): etkinlik tek tur + risk kademesinin yıldızı; boss tam tur + ölçülmüş bölge hedefi */
export function mutantYarisAyari(i: number) {
  const k = mutant.kosu,
    p = mutantPistleri()[i];
  if (k) {
    beceriYarisBasi(k);
    // drift kaporası girişte de kilitlenir (kart açılmadan girilse bile aynı belirlenimci seçim)
    if (typeof mutant.etkinlik == "number") kaporaBelirle(k, mutant.etkinlik);
  }
  const r = mutantRakibi();
  if (k && mutant.etkinlik == "boss") return { laps: p.laps, limit: r ? 0 : bossHedefi(k, p) };
  if (r?.duello) return { laps: DUELLO.tur, limit: 0 };
  return etkinlikHedefi(p, mutant.risk);
}

/** açık etkinlik düelloysa rakibin ayarı: kişilik risk kademesinden, araç oyuncunun başlangıç aracı (stok), tohum
 *  koşudan ve etkinlikten (aynı koşuda yeniden başlatınca rakip aynı sürer). Düello değilse null */
export function mutantRakibi(): RakipAyari | null {
  const k = mutant.kosu,
    et = mutant.etkinlik;
  if (!k || et == null || mutantArac < 0) return null;
  if (et == "boss") {
    // LT-SYS-007: boss gerçek rakip (drift boss'u puan hedefiyle kalır)
    const b = bossRakibi(k);
    return b ? { ...b, duello: true } : null;
  }
  const e = k.etkinlikler.find((q) => q.id == et);
  if (!e) return null;
  if (!e.rakip) {
    // LT-SYS-007: düello dışındaki etkinliklerde de rakip (hedef süre geçerli, rakibi geçmek ek para)
    const r = etkinlikRakibi(k, e, mutantPistleri()[e.i], mutant.risk);
    return r ? { ...r, duello: false } : null;
  }
  return {
    kisilik: DUELLO.kisilikler[Math.min(mutant.risk, DUELLO.kisilikler.length - 1)],
    arac: mutantArac,
    tohum: (Math.imul(k.tohum ^ 0x5bd1e995, 31) + e.id * 7919) >>> 0 || 1,
    duello: true,
  };
}

/** boss pisti (EVENTS indeksi) */
export const mutantBossPisti = () => (mutant.kosu ? bossPisti(mutant.kosu, mutantPistleri()) : -1);

/** sabit adım (fizikten sonra): süre akar; hasar (sert çarpma: hit zamanı, spin: kayma açısı); işaret girişi */
export function mutantAdimi(
  x: number,
  z: number,
  v: number,
  dt: number,
  yarista: boolean,
  hit = -9,
  beta = 0,
  d: Readonly<Pick<SimDurumu, "S" | "DR" | "D">> | null = null,
  /** skill dünyası: bulunulan pist, çarpışma sorgusu ve yarış başladı mı (geri sayımda skill çalışmaz) */
  cevre: { TR: Pist | null; dunya: Pick<DunyaSorgusu, "yakin">; kosuyor: boolean } | null = null,
) {
  const k = mutant.kosu,
    nitro = mutant.nitro,
    istekler = mutant.beceriIstek;
  mutant.nitro = false;
  mutant.beceriIstek = [];
  if (!k) return;
  let carpti = false;
  if (k.faz == "surus" || k.faz == "boss") {
    if (hit < mutant.sonHit) mutant.sonHit = hit;
    let tur: "carpma" | "spin" | null = null;
    if (hit > mutant.sonHit + 0.25) {
      mutant.sonHit = hit;
      tur = "carpma";
    }
    const spin = Math.abs(beta) > 1.3 && v > 4;
    if (spin && !mutant.spinde) tur ??= "spin";
    mutant.spinde = Math.abs(beta) > 0.4 && (mutant.spinde || spin);
    carpti = tur == "carpma";
    if (tur) {
      const pert = hasarAl(k, tur);
      mutantAracGuncelle();
      mutant.ui?.hasar(tur, pert);
      if (pert) return;
    }
    // enerji, nitro ve skill'ler: güç/tutuş değişince (nitro, hayalet, dönüşüm) araç değerleri yenilenir
    if (d) {
      // geri sayımda (yarış var, başlamadı) skill isteği düşer: kalkıştan önce çekiş/avantaj yok
      const kosuyor = yarista && (cevre?.kosuyor ?? true),
        S = d.S,
        R = kosuyor ? rakipGovdesi() : null,
        // kanca bağlantısı: yarışta pist, açık dünyada (serbest sürüş) yol ağı
        dunya = beceriDunyasiYap(
          { x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz },
          R ? [R] : [],
          yarista ? (cevre?.TR ?? null) : null,
          kosuyor,
          !yarista && !!cevre,
        );
      // hazır olmayan istek: neden yuvada gösterilir (enerji harcanmaz)
      if (istekler.length) {
        const g = beceriGorunumu(k);
        for (const id of istekler) {
          const engel = yarista && !kosuyor ? "basla" : (g.find((b) => b.id == id)?.engel ?? null);
          if (engel) mutant.red = { id, engel, n: mutant.red.n + 1 };
        }
      }
      if (
        enerjiAdimi(k, d, dt, nitro, {
          dunya,
          istekler: yarista && !kosuyor ? [] : istekler,
          engeller: cevre ? engelListesi(cevre.dunya, S.x, S.z) : [],
          carpti: tur == "carpma",
        })
      )
        mutantAracGuncelle();
      // rakip varken her adım yazılır: yarış durunca çekiş kalkar (takılı kalmaz)
      if (rakip.y)
        rakipEtkisi(R ? (k.becCikti?.hedefIvme[RAKIP] ?? null) : null, k.bec.hedefler[RAKIP]?.govde ?? 100);
    }
  }
  if (k.faz == "surus" && zamanAkis(k, dt) == "boss") {
    if (yarista) mutant.bossBekliyor = true;
    else mutant.ui?.sureDoldu();
    return;
  }
  if (yarista || k.faz != "surus") return;
  if (d && !k.test) yolGoreviAdimi(k, x, z, v, d, carpti, cevre, dt);
  // en yakın işaret
  let bulunan = "",
    isaret: MutantIsaret | null = null;
  const yakin = (px: number, pz: number) => Math.hypot(x - px, z - pz) < ISARET_R;
  for (const e of k.etkinlikler)
    if (!e.yapildi && yakin(e.x, e.z)) {
      bulunan = "e" + e.id;
      isaret = { tur: "etkinlik", id: e.id };
    }
  for (const q of k.sandiklar)
    if (!q.acildi && yakin(q.x, q.z)) {
      bulunan = "s" + q.id;
      isaret = { tur: "sandik", id: q.id };
    }
  if (yakin(ATOLYE[0], ATOLYE[1])) {
    bulunan = "a";
    isaret = { tur: "atolye" };
  }
  if (yakin(BOSS_YERI[0], BOSS_YERI[1])) {
    bulunan = "b";
    isaret = { tur: "boss" };
  }
  if (bulunan != mutant.icinde) {
    mutant.icinde = bulunan;
    mutant.bekle = 0;
    if (bulunan != mutant.kapali) mutant.kapali = "";
  }
  if (!isaret || bulunan == mutant.kapali || v > ISARET_V) return;
  mutant.bekle += dt;
  if (mutant.bekle >= ISARET_SURE) {
    mutant.kapali = bulunan;
    mutant.ui?.isaret(isaret);
  }
}

/** yarış bitti (yarislar.ts endEvent): ödül/boss sonucu, rekor */
export function mutantYarisBitti(gecti: boolean, rakipGecti: boolean | null = null) {
  const k = mutant.kosu,
    et = mutant.etkinlik;
  if (!k || et == null) return;
  mutant.etkinlik = null;
  if (et == "boss") {
    bossBitti(k, gecti, mutantPistleri());
    if (k.faz == "bitti") {
      const r = mutantRekoru(),
        yeni = k.bolge > r.bolge || (k.bolge == r.bolge && k.yenilenBoss > r.boss);
      mutant.yeniRekor = yeni;
      if (yeni) yazJson(ANAHTAR, { bolge: k.bolge, boss: k.yenilenBoss });
    }
    mutant.ui?.sonuc(null, true, gecti);
    return;
  }
  mutant.ui?.sonuc(etkinlikBitti(k, et, gecti, mutant.risk, rakipGecti), false, gecti);
}

/** boss'a gir (işaretten ya da süre dolunca) */
export function mutantBossaGir() {
  const k = mutant.kosu;
  if (!k) return;
  bossaGir(k);
  mutant.etkinlik = "boss";
}

/** skill'lerin oyuncuya çekme/itme ivmesi (sonraki fizik adımında kuvvet; koşu yoksa null) */
export function mutantOyuncuIvmesi(): { x: number; z: number } | undefined {
  const a = mutant.kosu?.becCikti?.oyuncuIvme;
  return a && (a.x || a.z) ? { x: a.x, z: a.z } : undefined;
}

/**
 * skill efektleri için salt okunur durum (cizim/beceri-efekt.ts, ses, kamera). Efekt skill'e göre seçilir; etkisi
 * yalnız görüntü/ses. Koşu yoksa null. kanca: bağlı uç ("rakip" ya da yol noktası)
 */
export function beceriEfektDurumu() {
  const k = mutant.kosu;
  if (!k) return null;
  const y = k.bec.yerel,
    acik = (id: string) => (y[id]?.kalan ?? 0) > 0,
    kanca = acik("grappling-hook") ? y["grappling-hook"] : null;
  return {
    kanca: kanca ? (kanca.hedef ? ("rakip" as const) : kanca.nokta) : null,
    hayalet: !!k.becCikti?.hayalet,
    donusum: acik("risk-taker"),
    iz: y["risk-taker"]?.iz ?? [],
    ruzgar: acik("slipstream-engine"),
  };
}

/** yarışta pist kesildi (yarislar.ts): atlanan mesafeye göre gövde cezası; pert olursa koşu biter. Dönen: düşen gövde */
export function mutantKesme(metre: number): number {
  const k = mutant.kosu;
  if (!k) return 0;
  const h = kesmeCezasi(k, metre);
  if (h > 0) mutantAracGuncelle();
  if (k.pert) mutant.ui?.hasar("carpma", true);
  return h;
}

/** Flying Dutchman fazı açık mı: oyuncu ağaç/kaya gibi katı nesnelerin içinden geçer (duvarlar ve pist kuralı aynı) */
export const mutantHayalet = () => !!mutant.kosu?.becCikti?.hayalet;

/** nitro şu an açık mı (kamera, alev, ses için; koşu yoksa false) */
export const nitroAcik = () => (mutant.kosu?.mek.etkiKalan ?? 0) > 0;

/** HUD için salt okunur MUTANT durumu (Codex HUD dalı bu arayüzü okur; ekonomi/fizik yazmaz). Koşu yoksa null */
export interface MutantDurumu {
  faz: Kosu["faz"];
  bolge: number;
  /** boss adı ve geri sayımın kalan saniyesi */
  boss: string;
  kalanSn: number;
  /** gövde 0-100 */
  govde: number;
  /** açık etkinliğin risk kademesi (1-3 yıldız); etkinlik yoksa 0, boss'ta 3 */
  riskYildiz: number;
  etkinlik: number | "boss" | null;
  /** nitro: enerji/kapasite, bir basışın maliyeti, açık mı (kalan sn), basılınca çalışır mı */
  enerji: number;
  kapasite: number;
  nitroMaliyet: number;
  nitroAcik: boolean;
  nitroKalanSn: number;
  nitroHazir: boolean;
  /** düello (A3, sözleşmeye eklendi; eski alanlar aynı): sıra 1/2, pist boyunca fark (m, + oyuncu önde), rakibin
   *  kişiliği, rakip bitirdi mi. Düello yoksa null */
  rakip: { sira: number; farkM: number; kisilik: string; bitti: boolean } | null;
  /** skill'ler (LT-SYS-004, sözleşmeye eklendi; eski alanlar aynı): yuva sırasıyla. bar: tetikli skill'in barı
   *  (0-100), aktifte null. hayalet: faz açık. rakipGovde: düelloda skill hasarı sonrası rakip gövdesi */
  beceriler: ReturnType<typeof beceriGorunumu>;
  hayalet: boolean;
  rakipGovde: number | null;
}

export function mutantDurumu(): Readonly<MutantDurumu> | null {
  const k = mutant.kosu;
  if (!k) return null;
  const n = nitroDurumu(k),
    et = mutant.etkinlik;
  return {
    faz: k.faz,
    bolge: k.bolge,
    boss: k.boss.ad,
    kalanSn: Math.max(0, k.kalan),
    govde: Math.max(0, Math.min(100, k.govde)),
    riskYildiz: et == "boss" ? 3 : et == null ? 0 : mutant.risk + 1,
    etkinlik: et,
    enerji: n.enerji,
    kapasite: n.kapasite,
    nitroMaliyet: n.maliyet,
    nitroAcik: n.acik,
    nitroKalanSn: n.kalan,
    nitroHazir: n.hazir,
    rakip: rakipDurumu(),
    beceriler: beceriGorunumu(k),
    hayalet: !!k.becCikti?.hayalet,
    rakipGovde: rakip.y ? (k.bec.hedefler[RAKIP]?.govde ?? 100) : null,
  };
}

function rakipDurumu(): MutantDurumu["rakip"] {
  const EV = yarisDurumu();
  if (!rakip.ayar || !EV) return null;
  const r = rakipSirasi(EV.lap, EV.ti, EV.kurulu);
  return r
    ? { sira: r.sira, farkM: r.fark, kisilik: KISILIKLER[rakip.ayar.kisilik].ad, bitti: r.bitti }
    : null;
}

/** açık yarışın tur/konum bilgisi (yarislar.ts kaydeder; döngüsel içe aktarım olmasın diye kaynakla) */
let yarisDurumu: () => { lap: number; ti: number; kurulu: boolean } | null = () => null;
export const mutantYarisKaynagi = (f: typeof yarisDurumu) => (yarisDurumu = f);

const RAMPA = TELEW.find((t) => t[0] == "Zıplama rampası")!;

/** yol görevi adımı (açık dünya, sürüşte): başlayınca/bitince bildirim; başarı para ve nitro enerjisi */
function yolGoreviAdimi(
  k: Kosu,
  x: number,
  z: number,
  v: number,
  d: Readonly<Pick<SimDurumu, "S" | "DR" | "D">>,
  carpti: boolean,
  cevre: { dunya: Pick<DunyaSorgusu, "yakin"> } | null,
  dt: number,
) {
  const g = mutant.gorev,
    o = gorevAdimi(
      g,
      {
        v,
        havada: !!d.S.air,
        drift: !!d.D.act,
        carpti,
        x,
        z,
        engeller: g.aktif?.tur == "kilpayi" && cevre ? engelListesi(cevre.dunya, x, z) : [],
      },
      dt,
      () =>
        gorevCek(
          mulberry32((k.tohum ^ 0x3c6ef372) + g.tamamlanan * 131 + Math.round(k.zaman)),
          k.bolge,
          CARS[mutantArac]?.vmax ?? 150,
          Math.hypot(x - RAMPA[1], z - RAMPA[2]),
        ),
    );
  if (!o) return;
  if (o.tur == "tamam") {
    k.para += o.gorev.para;
    k.mek = { ...k.mek, enerji: Math.min(k.mek.kapasite, k.mek.enerji + o.gorev.enerji) };
  }
  mutant.ui?.gorev?.(o);
}
