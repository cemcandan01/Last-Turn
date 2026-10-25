// LT-SYS-001: sistemik mekanik yürütücü (perk/yetenek/enerji). Saf ve belirlenimci: DOM, oyun durumu, zaman ya da
// rastgelelik okumaz. Fizik adımından sonra salt okuyan gözlemci olarak çalışır; fiziğe hiçbir şey yazmaz.
// FAZ 1: oyun bu modülü çağırmaz (MEKANIK_SISTEMI_ACIK kapalı); sürüş, hayalet, ekonomi ve modifiye değişmez.
import type { SimDurumu } from "../fizik/tipler";

/** özellik bayrağı: kapalıyken oyun yürütücüyü hiç çağırmaz */
export const MEKANIK_SISTEMI_ACIK = false;

/** bir girdi olayından doğan türev olay zincirinin en fazla derinliği (A → B → C …) */
export const NEDENSEL_DERINLIK = 3;
/** bir adımda işlenebilecek en fazla olay (girdi + türev); aşılırsa kalanlar sayılıp atılır */
export const ADIM_ISLEM_SINIRI = 64;

/**
 * dışarıdan gelen olaylar: `sira` aynı koşu içinde kesin artan tamsayıdır (olay sırası). Görülmüş sıra numarası
 * yeniden gelirse yok sayılır: aynı olay iki kez ödül vermez, bellek sabit kalır.
 */
export type GirisOlayi =
  | { tur: "DriftStarted"; sira: number; yon: number }
  /** bilinçli drift sürerken bir sabit adım (dt sn); hiz m/s, aci kayma açısı (rad, işaretli) */
  | { tur: "DriftTickQualified"; sira: number; dt: number; hiz: number; aci: number }
  /** sure: drift modunda geçen süre (sn); spin: abartıp spinle bitti */
  | { tur: "DriftEnded"; sira: number; sure: number; spin: boolean }
  | { tur: "AbilityActivated"; sira: number; yetenek: string };

/** yürütücünün kendi ürettiği olay: enerji değişti (kaynak: mekanik kimliği) */
export type TurevOlay = { tur: "EnergyGained"; miktar: number; kaynak: string };

export type MekanikOlay = GirisOlayi | TurevOlay;
export type OlayTuru = MekanikOlay["tur"];

export type MekanikKategori = "passive" | "active" | "part" | "environment";

export interface MekanikTanim {
  id: string;
  versiyon: number;
  kategori: MekanikKategori;
  tetik: OlayTuru;
  /** tetiklenme koşulları (yalnız ilgili olay türünde anlamlı) */
  kosul?: { enAzHiz?: number; enAzAci?: number; yetenek?: string };
  /** tetiklenince harcanan enerji; yetmezse tetiklenmez */
  maliyet: number;
  /** son tetikten sonra bu kadar yürütücü adımı boyunca tekrar tetiklenmez (0: her adımda en çok bir kez) */
  beklemeAdimi: number;
  /** enerji kazancı: "saniye" ise olay dt'si ile çarpılır (yalnız DriftTickQualified), "olay" ise sabit */
  kazanc: number;
  kazancBirimi: "saniye" | "olay";
}

export interface MekanikTelemetri {
  tetik: number;
  kazanc: number;
  harcama: number;
}

export interface MekanikDurum {
  /** yürütücü adımı (yalnız etkin adımlarda artar) */
  adim: number;
  enerji: number;
  kapasite: number;
  /** işlenen en büyük girdi olayı sırası (-1: hiç) */
  sonSira: number;
  sonTetik: Record<string, number>;
  telemetri: Record<string, MekanikTelemetri>;
  /** derinlik ya da adım sınırı yüzünden atılan olay sayısı (denge alarmı) */
  kesilen: number;
}

export const DRIFT_HARVESTER: MekanikTanim = {
  id: "drift-harvester",
  versiyon: 1,
  kategori: "passive",
  tetik: "DriftTickQualified",
  kosul: { enAzHiz: 11, enAzAci: 0.2 },
  maliyet: 0,
  beklemeAdimi: 0,
  kazanc: 6,
  kazancBirimi: "saniye",
};

export function mekanikBaslat(kapasite = 100, baslangic = 0): MekanikDurum {
  if (!Number.isFinite(kapasite) || kapasite <= 0 || !Number.isFinite(baslangic))
    throw new RangeError("Geçersiz enerji kapasitesi veya başlangıcı");
  return {
    adim: 0,
    enerji: Math.max(0, Math.min(kapasite, baslangic)),
    kapasite,
    sonSira: -1,
    sonTetik: {},
    telemetri: {},
    kesilen: 0,
  };
}

const gecerliTanim = (m: MekanikTanim) =>
  !!m.id &&
  m.versiyon >= 1 &&
  m.beklemeAdimi >= 0 &&
  m.maliyet >= 0 &&
  m.kazanc >= 0 &&
  Number.isFinite(m.maliyet) &&
  Number.isFinite(m.kazanc);

/** aynı kimlik ikinci kez takılmaz (yığınlama yok); geçersiz tanımlar atılır. Sıra korunur */
export function takiliDuzenle(takili: readonly MekanikTanim[]): MekanikTanim[] {
  const gorulen = new Set<string>(),
    r: MekanikTanim[] = [];
  for (const m of takili) {
    if (!gecerliTanim(m) || gorulen.has(m.id)) continue;
    gorulen.add(m.id);
    r.push(m);
  }
  return r;
}

function kosulUyar(m: MekanikTanim, o: MekanikOlay): boolean {
  if (m.tetik !== o.tur) return false;
  const k = m.kosul;
  if (o.tur === "DriftTickQualified") {
    if (!(o.dt > 0) || !Number.isFinite(o.dt) || !Number.isFinite(o.hiz) || !Number.isFinite(o.aci))
      return false;
    if (k?.enAzHiz !== undefined && o.hiz < k.enAzHiz) return false;
    if (k?.enAzAci !== undefined && Math.abs(o.aci) < k.enAzAci) return false;
  }
  if (o.tur === "AbilityActivated" && o.yetenek !== (k?.yetenek ?? m.id)) return false;
  // kendi ürettiği enerji olayına tepki vermez (doğrudan öz döngü yok)
  if (o.tur === "EnergyGained" && o.kaynak === m.id) return false;
  return true;
}

/**
 * bir yürütücü adımı. olaylar sıra numarasına göre artan verilmelidir; etkin değilse aynı durum nesnesi döner
 * (hiçbir kayıt, enerji ya da sayaç değişmez). Türev olaylar aynı adımda, derinlik ve işlem sınırı içinde işlenir.
 */
export function mekanikAdimi(
  durum: MekanikDurum,
  olaylar: readonly GirisOlayi[],
  takili: readonly MekanikTanim[],
  etkin = false,
): MekanikDurum {
  if (!etkin) return durum;
  const yeni: MekanikDurum = {
    ...durum,
    adim: durum.adim + 1,
    sonTetik: { ...durum.sonTetik },
    telemetri: { ...durum.telemetri },
  };
  const liste = takiliDuzenle(takili);
  const kuyruk: { o: MekanikOlay; derinlik: number }[] = [];
  for (const o of olaylar) {
    if (!Number.isInteger(o.sira) || o.sira <= yeni.sonSira) continue;
    yeni.sonSira = o.sira;
    kuyruk.push({ o, derinlik: 0 });
  }
  let islenen = 0;
  for (let i = 0; i < kuyruk.length; i++) {
    if (islenen >= ADIM_ISLEM_SINIRI) {
      yeni.kesilen += kuyruk.length - i;
      break;
    }
    islenen++;
    const { o, derinlik } = kuyruk[i];
    for (const m of liste) {
      if (!kosulUyar(m, o)) continue;
      const son = yeni.sonTetik[m.id];
      if (son !== undefined && yeni.adim - son <= m.beklemeAdimi) continue;
      if (yeni.enerji < m.maliyet) continue;
      const kazanc =
        m.kazancBirimi === "saniye" ? (o.tur === "DriftTickQualified" ? m.kazanc * o.dt : 0) : m.kazanc;
      const once = yeni.enerji;
      yeni.enerji = Math.min(yeni.kapasite, Math.max(0, once - m.maliyet + kazanc));
      yeni.sonTetik[m.id] = yeni.adim;
      const t = yeni.telemetri[m.id] ?? { tetik: 0, kazanc: 0, harcama: 0 };
      yeni.telemetri[m.id] = {
        tetik: t.tetik + 1,
        kazanc: t.kazanc + Math.max(0, yeni.enerji - once + m.maliyet),
        harcama: t.harcama + m.maliyet,
      };
      const fark = yeni.enerji - once;
      if (fark > 0) {
        if (derinlik + 1 <= NEDENSEL_DERINLIK)
          kuyruk.push({ o: { tur: "EnergyGained", miktar: fark, kaynak: m.id }, derinlik: derinlik + 1 });
        else yeni.kesilen++;
      }
    }
  }
  return yeni;
}

/** drift gözlemcisinin kendi durumu (fizikten ayrı; fizik bunu bilmez) */
export interface DriftGozlemi {
  acik: boolean;
  sure: number;
  /** sonraki olayın sıra numarası */
  sira: number;
}

export const driftGozlemiBaslat = (): DriftGozlemi => ({ acik: false, sure: 0, sira: 0 });

/**
 * fizik adımından sonra bilinçli drift durumundan (DR.on) olay üretir; SimDurumu'nu okur, değiştirmez.
 * D.act kaynak alınmaz: o kontrolsüz savrulmada da 1 olur. Havadayken drift adımı nitelikli sayılmaz.
 */
export function driftGozlemcisi(
  g: DriftGozlemi,
  d: Readonly<Pick<SimDurumu, "S" | "DR" | "D">>,
  dt: number,
): { g: DriftGozlemi; olaylar: GirisOlayi[] } {
  const olaylar: GirisOlayi[] = [];
  let { acik, sure, sira } = g;
  const on = !!d.DR.on;
  if (on && !acik) {
    olaylar.push({ tur: "DriftStarted", sira: sira++, yon: d.DR.dir });
    acik = true;
    sure = 0;
  }
  if (on) {
    sure += dt;
    if (!d.S.air)
      olaylar.push({
        tur: "DriftTickQualified",
        sira: sira++,
        dt,
        hiz: Math.hypot(d.S.vx, d.S.vz),
        aci: d.D.beta,
      });
  } else if (acik) {
    // spinle biten driftte fizik soğuma süresini (DR.cool) başlatır; normal bitişte soğuma ≤ 0'dır
    olaylar.push({ tur: "DriftEnded", sira: sira++, sure, spin: d.DR.cool > 0 });
    acik = false;
    sure = 0;
  }
  return { g: { acik, sure, sira }, olaylar };
}
