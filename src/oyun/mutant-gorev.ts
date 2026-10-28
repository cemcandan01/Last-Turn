// LT-SYS-007 yol görevleri (saf, belirlenimci): açık dünyada etkinlikten etkinliğe giderken sırayla kısa, süreli
// görevler çıkar; ara sürüş oynanışa döner. Haritada ayrı yer istemez: o an sürülen yolda yapılır. Yarışta, seçim
// ekranında ya da araç dururken çıkmaz. Başarı para ve nitro enerjisi verir; kaçırmak cezasızdır.
import type { Rastgele } from "../cekirdek/rastgele";

export type GorevTuru = "drift" | "hiz" | "kilpayi" | "sicrama";

export interface YolGorevi {
  tur: GorevTuru;
  /** hedef: drift/sıçrama sn, hız km/sa, kıl payı adet */
  hedef: number;
  ilerleme: number;
  /** kalan süre (sn) */
  kalan: number;
  para: number;
  enerji: number;
}

export interface GorevDurumu {
  aktif: YolGorevi | null;
  /** sonraki göreve kalan (sn) */
  bekleme: number;
  tamamlanan: number;
  /** kıl payı: yaklaşılan engeller (kimlik → yaklaşıldı) */
  yakin: Record<string, true>;
}

/** sabitler: görev süresi, aralık, kıl payı mesafeleri (m) ve hızı (m/s), rampa yakınlığı (m) */
export const YOL_GOREVI = {
  sure: 25,
  aralik: 8,
  ilkBekleme: 6,
  kilPayi: { yakin: 2.2, uzak: 4.5, hiz: 15 },
  rampaYakin: 450,
  enAzHiz: 6,
} as const;

/** görev metni (HUD ve bildirim) */
export const GOREV_ADI: Record<GorevTuru, (h: number) => string> = {
  drift: (h) => h + " sn kesintisiz drift",
  hiz: (h) => h + " km/sa'e çık",
  kilpayi: (h) => h + " engelin yanından kıl payı geç",
  sicrama: (h) => h.toFixed(1).replace(".", ",") + " sn havada kal",
};

export const bosGorev = (): GorevDurumu => ({
  aktif: null,
  bekleme: YOL_GOREVI.ilkBekleme,
  tamamlanan: 0,
  yakin: {},
});

/** ödül bölgeyle büyür: etkinlik ödülünün yaklaşık dörtte biri */
export const gorevOdulu = (bolge: number) => ({ para: 25 + 12 * bolge, enerji: 20 });

/**
 * yeni görev: türün hedefi aracın gücüne ve bölgeye göre (hız hedefi aracın son hızının %85'ini aşmaz). Sıçrama
 * yalnız rampaya yakınken çıkar (açık dünyada uçmak başka yerde zor).
 */
export function gorevCek(rng: Rastgele, bolge: number, vmaxKmh: number, rampaUzaklik: number): YolGorevi {
  const turler: GorevTuru[] = ["drift", "hiz", "kilpayi"];
  if (rampaUzaklik < YOL_GOREVI.rampaYakin) turler.push("sicrama");
  const tur = turler[Math.floor(rng() * turler.length)],
    hedef =
      tur == "drift"
        ? 2 + bolge
        : tur == "hiz"
          ? Math.min(Math.round((vmaxKmh * 0.85) / 5) * 5, 100 + 15 * bolge)
          : tur == "kilpayi"
            ? 2 + bolge
            : 0.8,
    o = gorevOdulu(bolge);
  return { tur, hedef, ilerleme: 0, kalan: YOL_GOREVI.sure, para: o.para, enerji: o.enerji };
}

export interface GorevGirdisi {
  /** hız (m/s) */
  v: number;
  havada: boolean;
  /** bilinçli drift sürüyor mu (fizik drift durumu) */
  drift: boolean;
  /** bu adımda sert çarptı mı */
  carpti: boolean;
  x: number;
  z: number;
  /** yakındaki katı engeller (kimlik, merkez, yarıçap) */
  engeller: readonly { id: string; x: number; z: number; r: number }[];
}

export type GorevOlayi =
  | { tur: "basladi"; gorev: YolGorevi }
  | { tur: "tamam"; gorev: YolGorevi }
  | { tur: "kacti"; gorev: YolGorevi };

/** bir sabit adım: görev yoksa bekleme sayar ve yenisini çeker; varsa ilerletir. Olay yoksa null */
export function gorevAdimi(
  g: GorevDurumu,
  e: GorevGirdisi,
  dt: number,
  cek: () => YolGorevi,
): GorevOlayi | null {
  const a = g.aktif;
  if (!a) {
    if (e.v < YOL_GOREVI.enAzHiz) return null;
    g.bekleme -= dt;
    if (g.bekleme > 0) return null;
    g.aktif = cek();
    g.yakin = {};
    return { tur: "basladi", gorev: g.aktif };
  }
  a.kalan -= dt;
  if (a.tur == "drift") a.ilerleme = e.drift && !e.carpti ? a.ilerleme + dt : 0;
  else if (a.tur == "sicrama") a.ilerleme = e.havada ? a.ilerleme + dt : 0;
  else if (a.tur == "hiz") a.ilerleme = Math.max(a.ilerleme, Math.round(e.v * 3.6));
  else {
    const K = YOL_GOREVI.kilPayi;
    if (e.carpti) g.yakin = {};
    for (const o of e.engeller) {
      const aciklik = Math.hypot(o.x - e.x, o.z - e.z) - o.r;
      if (aciklik < K.yakin && e.v > K.hiz && !e.carpti) g.yakin[o.id] = true;
      else if (g.yakin[o.id] && aciklik > K.uzak) {
        delete g.yakin[o.id];
        a.ilerleme++;
      }
    }
  }
  if (a.ilerleme >= a.hedef) {
    g.aktif = null;
    g.bekleme = YOL_GOREVI.aralik;
    g.tamamlanan++;
    return { tur: "tamam", gorev: a };
  }
  if (a.kalan <= 0) {
    g.aktif = null;
    g.bekleme = YOL_GOREVI.aralik;
    return { tur: "kacti", gorev: a };
  }
  return null;
}
