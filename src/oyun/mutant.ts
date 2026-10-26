// MUTANT modu (oyun tarafı, A1): açık dünyada roguelite koşu. Kurallar saf modülde (mutant-kosu.ts); burası koşuyu
// tutar, her sabit adımda süreyi akıtır, haritadaki işaretlere girişi algılar, etkinliği (mevcut pist yarışı) koşu
// aracıyla başlatır, sonucu ödüle çevirir ve haritaya döndürür. Kariyer ödülü, rekor ve hayalet yazılmaz; rekor
// lt_mutant'ta. Yarışta koşu yokken hiçbir şey yapmaz.
import { CARS } from "../arac/araclar";
import { aracKur, parcaBul } from "../arac/parcalar";
import { okuJson, yazJson } from "../cekirdek/depo";
import { isaretleriKur } from "../cizim/isaretler";
import { COND, type GununSaati, type Hava } from "../cizim/ortam";
import { kurulum, applyPreset } from "./kurulum";
import { setCar } from "./durum";
import {
  ATOLYE,
  bossBitti,
  bossHedefi,
  etkinlikHedefi,
  bossPisti,
  bossaGir,
  etkinlikBitti,
  hasarAl,
  kosuAraci,
  kosuBaslat,
  zamanAkis,
  type EtkinlikSonucu,
  type Kosu,
  type PistAdayi,
  type Risk,
} from "./mutant-kosu";

/** MUTANT rekoru: kariyerden ayrı */
const ANAHTAR = "lt_mutant";
/** işarete giriş: yarıçap (m), en yüksek hız (m/s), içeride bekleme (sn) */
const ISARET_R = 10,
  ISARET_V = 5,
  ISARET_SURE = 0.5;
/** boss işareti: tırmanış yolunun tepesi */
export const BOSS_YERI: [number, number] = [-40, 440];

export type MutantIsaret = { tur: "etkinlik"; id: number } | { tur: "atolye" } | { tur: "boss" };

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
  yeniRekor: false,
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
  mutant.kosu = kosuBaslat(tohum, mutantPistleri());
  mutant.etkinlik = null;
  mutant.donus = null;
  mutant.icinde = mutant.kapali = "";
  mutant.bekle = 0;
  mutant.bossBekliyor = false;
  mutant.yeniRekor = false;
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
  kurulum.mod = { ...kurulum.mod, car: kosuAraci(aracKur(mutantArac, k.parcalar).car, k) };
}

export function mutantKurulumUygula() {
  const k = mutant.kosu;
  if (!k || mutantArac < 0) return;
  const P = aracKur(mutantArac, k.parcalar),
    lastik = P.parcalar.some((id) => parcaBul(id)!.e.lastik != null);
  kurulum.mod = {
    taban: CARS[mutantArac],
    car: kosuAraci(P.car, k),
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
  return k && mutant.etkinlik == "boss"
    ? { laps: p.laps, limit: bossHedefi(k, p) }
    : etkinlikHedefi(p, mutant.risk);
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
) {
  const k = mutant.kosu;
  if (!k) return;
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
    if (tur) {
      const pert = hasarAl(k, tur);
      mutantAracGuncelle();
      mutant.ui?.hasar(tur, pert);
      if (pert) return;
    }
  }
  if (k.faz == "surus" && zamanAkis(k, dt) == "boss") {
    if (yarista) mutant.bossBekliyor = true;
    else mutant.ui?.sureDoldu();
    return;
  }
  if (yarista || k.faz != "surus") return;
  // en yakın işaret
  let bulunan = "",
    isaret: MutantIsaret | null = null;
  const yakin = (px: number, pz: number) => Math.hypot(x - px, z - pz) < ISARET_R;
  for (const e of k.etkinlikler)
    if (!e.yapildi && yakin(e.x, e.z)) {
      bulunan = "e" + e.id;
      isaret = { tur: "etkinlik", id: e.id };
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
export function mutantYarisBitti(gecti: boolean) {
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
  mutant.ui?.sonuc(etkinlikBitti(k, et, gecti, mutant.risk), false, gecti);
}

/** boss'a gir (işaretten ya da süre dolunca) */
export function mutantBossaGir() {
  const k = mutant.kosu;
  if (!k) return;
  bossaGir(k);
  mutant.etkinlik = "boss";
}
