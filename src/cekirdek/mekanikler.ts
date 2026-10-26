// LT-SYS-001: sistemik mekanik yürütücü (perk/yetenek/enerji). Saf ve belirlenimci: DOM, oyun durumu, zaman ya da
// rastgelelik okumaz. Fizik adımından sonra salt okuyan gözlemci olarak çalışır; fiziğe hiçbir şey yazmaz.
// Oyun yalnız MUTANT modunda çağırır (oyun/mutant.ts); diğer modlarda sürüş, hayalet, ekonomi ve modifiye değişmez.
// Fiziğe tek etkisi tutuş çarpanıdır (tutusCarpani): oyun onu dünya sorgusunun hava tutuşuyla çarpar.
import type { SimDurumu } from "../fizik/tipler";

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
  | { tur: "AbilityActivated"; sira: number; yetenek: string }
  /** her sabit adımda sürüş durumu (yalnız istenirse üretilir): hiz m/s */
  | { tur: "SurusTick"; sira: number; dt: number; hiz: number; havada: boolean };

/** yürütücünün kendi ürettiği olay: enerji değişti (kaynak: mekanik kimliği) */
export type TurevOlay = { tur: "EnergyGained"; miktar: number; kaynak: string };

export type MekanikOlay = GirisOlayi | TurevOlay;
export type OlayTuru = MekanikOlay["tur"];

export type MekanikKategori = "passive" | "active" | "part" | "environment";

/** tetiklenme koşulları (yalnız ilgili olay türünde anlamlı) */
export interface MekanikKosulu {
  enAzHiz?: number;
  enAzAci?: number;
  yetenek?: string;
  /** DriftEnded: en az bu kadar sürmüş ve spinsiz bitmiş olmalı */
  enAzSure?: number;
  spinsiz?: boolean;
  /** DriftStarted: son temiz drift bitişinden en çok bu kadar adım sonra başlamalı */
  zincirAdim?: number;
  /** SurusTick: yerde olmalı */
  yerde?: boolean;
}

/** perk değiştiricileri: başka perk kimliğine değil, ortak parametrelere işler. Birleşim sınırlıdır (DEGISTIRICI_SINIRI) */
export interface Degistirici {
  /** kapasiteye eklenen */
  kapasite?: number;
  /** etkin yeteneklerin maliyet, etki süresi çarpanı */
  maliyet?: number;
  sure?: number;
  /** tutuş çarpanına eklenen */
  tutus?: number;
  /** spinde yanan enerji oranı çarpanı */
  yakma?: number;
}

/** etkin yeteneğin süreli etkisi */
export interface YetenekEtkisi {
  /** tutuş çarpanı (1,2: %20 fazla) */
  tutus: number;
  /** etki süresi (sn) */
  sure: number;
  /** etki bittikten sonra yeniden kullanılamaz süre (sn) */
  sonraBekleme: number;
}

export interface MekanikTanim {
  id: string;
  versiyon: number;
  kategori: MekanikKategori;
  /** yok: yalnız değiştirici (pasif parametre) */
  tetik?: OlayTuru;
  kosul?: MekanikKosulu;
  /** tetiklenince harcanan enerji; yetmezse tetiklenmez */
  maliyet: number;
  /** son tetikten sonra bu kadar yürütücü adımı boyunca tekrar tetiklenmez (0: her adımda en çok bir kez) */
  beklemeAdimi: number;
  /** enerji kazancı: "saniye" ise olay dt'si ile çarpılır (DriftTickQualified, SurusTick), "olay" ise sabit */
  kazanc: number;
  kazancBirimi: "saniye" | "olay";
  degistir?: Degistirici;
  etki?: YetenekEtkisi;
}

/** değiştiricilerin birleşik hâli; her alan sınır içinde (tek perk ya da kombinasyon sınırı aşamaz) */
export interface Parametreler {
  kapasite: number;
  maliyet: number;
  sure: number;
  tutus: number;
  yakma: number;
}

export const TEMEL_KAPASITE = 100;
export const DEGISTIRICI_SINIRI = {
  kapasite: [TEMEL_KAPASITE, 200],
  maliyet: [0.5, 2],
  sure: [0.5, 2],
  tutus: [0, 0.2],
  yakma: [0.2, 1],
} as const;
/** tutuş çarpanının mutlak üst sınırı (etki + değiştirici) */
export const TUTUS_UST = 1.4;

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
  /** bilinçli drift sürüyor mu; bu driftte kazanılan enerji (spinde yanar) */
  driftAcik: boolean;
  driftKazanci: number;
  /** son temiz (spinsiz) drift bitişinin adımı (-1: yok) */
  sonTemizBitis: number;
  /** spinde yanan toplam enerji */
  yanan: number;
  /** süreli etki: kalan süre, sonrası bekleme (sn), etkin tutuş çarpanı */
  etkiKalan: number;
  etkiBekleme: number;
  etkiTutus: number;
  /** etkinin açık olduğu adım sayısı (süre payı ölçümü) */
  etkiAdim: number;
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

/** Tutuş Darbesi: MUTANT'ın her koşuda takılı temel yeteneği; enerjinin tek harcama yolu */
export const TUTUS_DARBESI: MekanikTanim = {
  id: "tutus-darbesi",
  versiyon: 1,
  kategori: "active",
  tetik: "AbilityActivated",
  maliyet: 30,
  beklemeAdimi: 0,
  kazanc: 0,
  kazancBirimi: "olay",
  etki: { tutus: 1.2, sure: 2.5, sonraBekleme: 2 },
};

const sinirla = (v: number, [a, b]: readonly [number, number]) => Math.min(b, Math.max(a, v));

/** takılı perklerin değiştiricilerini birleştir (kapasite ve tutuş toplanır, çarpanlar çarpılır), sınırla */
export function parametreler(takili: readonly MekanikTanim[]): Parametreler {
  const p = { kapasite: TEMEL_KAPASITE, maliyet: 1, sure: 1, tutus: 0, yakma: 1 };
  for (const m of takiliDuzenle(takili)) {
    const d = m.degistir;
    if (!d) continue;
    if (Number.isFinite(d.kapasite)) p.kapasite += d.kapasite!;
    if (Number.isFinite(d.maliyet) && d.maliyet! > 0) p.maliyet *= d.maliyet!;
    if (Number.isFinite(d.sure) && d.sure! > 0) p.sure *= d.sure!;
    if (Number.isFinite(d.tutus)) p.tutus += d.tutus!;
    if (Number.isFinite(d.yakma) && d.yakma! >= 0) p.yakma *= d.yakma!;
  }
  const S = DEGISTIRICI_SINIRI;
  return {
    kapasite: sinirla(p.kapasite, S.kapasite),
    maliyet: sinirla(p.maliyet, S.maliyet),
    sure: sinirla(p.sure, S.sure),
    tutus: sinirla(p.tutus, S.tutus),
    yakma: sinirla(p.yakma, S.yakma),
  };
}

/** perk eklenince kapasiteyi yeni parametrelere uydur (enerji taşmaz) */
export function kapasiteUygula(d: MekanikDurum, takili: readonly MekanikTanim[]): MekanikDurum {
  const kapasite = parametreler(takili).kapasite;
  return { ...d, kapasite, enerji: Math.min(d.enerji, kapasite) };
}

/** fiziğe giden tek değer: süreli etki açıkken tutuş çarpanı, değilse 1 */
export const tutusCarpani = (d: MekanikDurum) => (d.etkiKalan > 0 ? d.etkiTutus : 1);

export function mekanikBaslat(kapasite = TEMEL_KAPASITE, baslangic = 0): MekanikDurum {
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
    driftAcik: false,
    driftKazanci: 0,
    sonTemizBitis: -1,
    yanan: 0,
    etkiKalan: 0,
    etkiBekleme: 0,
    etkiTutus: 1,
    etkiAdim: 0,
  };
}

const gecerliTanim = (m: MekanikTanim) =>
  !!m.id &&
  m.versiyon >= 1 &&
  Number.isSafeInteger(m.beklemeAdimi) &&
  m.beklemeAdimi >= 0 &&
  m.maliyet >= 0 &&
  m.kazanc >= 0 &&
  Number.isFinite(m.maliyet) &&
  Number.isFinite(m.kazanc) &&
  (!m.etki ||
    (Number.isFinite(m.etki.tutus) &&
      m.etki.tutus >= 1 &&
      m.etki.sure > 0 &&
      Number.isFinite(m.etki.sure) &&
      m.etki.sonraBekleme >= 0));

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

const gecerliDt = (dt: number) => dt > 0 && dt <= 1 / 30 && Number.isFinite(dt);

function kosulUyar(m: MekanikTanim, o: MekanikOlay, d: MekanikDurum): boolean {
  if (!m.tetik || m.tetik !== o.tur) return false;
  const k = m.kosul;
  if (o.tur === "SurusTick") {
    if (!gecerliDt(o.dt) || !Number.isFinite(o.hiz)) return false;
    if (k?.yerde && o.havada) return false;
    if (k?.enAzHiz !== undefined && o.hiz < k.enAzHiz) return false;
  }
  if (o.tur === "DriftEnded") {
    if (k?.spinsiz && o.spin) return false;
    if (k?.enAzSure !== undefined && !(o.sure >= k.enAzSure)) return false;
  }
  if (o.tur === "DriftStarted" && k?.zincirAdim !== undefined)
    if (d.sonTemizBitis < 0 || d.adim - d.sonTemizBitis > k.zincirAdim) return false;
  if (o.tur === "DriftTickQualified") {
    // bir sabit adımdan (1/60 sn) uzun tek adım nitelikli sayılmaz (Codex 0b418c3 sınırı)
    if (
      !(o.dt > 0) ||
      o.dt > 1 / 30 ||
      !Number.isFinite(o.dt) ||
      !Number.isFinite(o.hiz) ||
      !Number.isFinite(o.aci)
    )
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
 * dt: süreli etkilerin ilerlediği süre (sabit fizik adımı).
 * Ortak kurallar: bilinçli drift spinle biterse o driftte kazanılan enerji (yakma oranıyla) yanar; süreli etki
 * açıkken ya da sonrası beklemede aynı etki yeniden açılmaz.
 */
export function mekanikAdimi(
  durum: MekanikDurum,
  olaylar: readonly GirisOlayi[],
  takili: readonly MekanikTanim[],
  etkin = false,
  dt = 1 / 60,
): MekanikDurum {
  if (!etkin) return durum;
  const yeni: MekanikDurum = {
    ...durum,
    adim: durum.adim + 1,
    sonTetik: { ...durum.sonTetik },
    telemetri: { ...durum.telemetri },
  };
  const adimDt = gecerliDt(dt) ? dt : 0;
  if (yeni.etkiKalan > 0) {
    yeni.etkiAdim++;
    yeni.etkiKalan = Math.max(0, yeni.etkiKalan - adimDt);
    if (yeni.etkiKalan <= 0) yeni.etkiTutus = 1;
  } else if (yeni.etkiBekleme > 0) yeni.etkiBekleme = Math.max(0, yeni.etkiBekleme - adimDt);
  const liste = takiliDuzenle(takili),
    P = parametreler(liste);
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
    if (o.tur === "DriftStarted") {
      yeni.driftAcik = true;
      yeni.driftKazanci = 0;
    }
    for (const m of liste) {
      if (!kosulUyar(m, o, yeni)) continue;
      const son = yeni.sonTetik[m.id];
      if (son !== undefined && yeni.adim - son <= m.beklemeAdimi) continue;
      if (m.etki && (yeni.etkiKalan > 0 || yeni.etkiBekleme > 0)) continue;
      const maliyet = m.kategori === "active" ? m.maliyet * P.maliyet : m.maliyet;
      if (yeni.enerji < maliyet) continue;
      const kazanc =
        m.kazancBirimi === "saniye"
          ? o.tur === "DriftTickQualified" || o.tur === "SurusTick"
            ? m.kazanc * o.dt
            : 0
          : m.kazanc;
      const once = yeni.enerji;
      yeni.enerji = Math.min(yeni.kapasite, Math.max(0, once - maliyet + kazanc));
      yeni.sonTetik[m.id] = yeni.adim;
      if (m.etki) {
        yeni.etkiKalan = m.etki.sure * P.sure;
        yeni.etkiBekleme = m.etki.sonraBekleme;
        yeni.etkiTutus = Math.min(TUTUS_UST, m.etki.tutus + P.tutus);
      }
      const kazanilan = Math.max(0, yeni.enerji - once + maliyet);
      if (yeni.driftAcik) yeni.driftKazanci += kazanilan;
      const t = yeni.telemetri[m.id] ?? { tetik: 0, kazanc: 0, harcama: 0 };
      yeni.telemetri[m.id] = {
        tetik: t.tetik + 1,
        kazanc: t.kazanc + kazanilan,
        harcama: t.harcama + maliyet,
      };
      const fark = yeni.enerji - once;
      if (fark > 0) {
        if (derinlik + 1 <= NEDENSEL_DERINLIK)
          kuyruk.push({ o: { tur: "EnergyGained", miktar: fark, kaynak: m.id }, derinlik: derinlik + 1 });
        else yeni.kesilen++;
      }
    }
    if (o.tur === "DriftEnded") {
      if (o.spin) {
        const yak = Math.min(yeni.enerji, yeni.driftKazanci * P.yakma);
        yeni.enerji -= yak;
        yeni.yanan += yak;
      } else yeni.sonTemizBitis = yeni.adim;
      yeni.driftAcik = false;
      yeni.driftKazanci = 0;
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
  /** her adımda SurusTick de üret (hız perkleri ve görevler için) */
  surusTiki = false,
): { g: DriftGozlemi; olaylar: GirisOlayi[] } {
  const olaylar: GirisOlayi[] = [];
  let { acik, sure, sira } = g;
  if (surusTiki)
    olaylar.push({ tur: "SurusTick", sira: sira++, dt, hiz: Math.hypot(d.S.vx, d.S.vz), havada: d.S.air });
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
