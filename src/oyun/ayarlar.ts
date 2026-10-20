// Oyuncu ayarları: mekanik seçenekler, kontrol modu, kamera. Telefonda kalıcıdır (lt_ayar).
import { okuJson, yazJson } from "../cekirdek/depo";
import type { SeviyeAnahtari } from "../fizik/veriler";

export const set = {
  /** hıza duyarlı direksiyon */
  ss: 1,
  /** direksiyon yumuşatma */
  sm: 1,
  /** hıza göre görüş açısı */
  fov: 1,
  /** hız sarsıntısı */
  shk: 1,
  /** direksiyon yönünü ters çevir */
  inv: 0,
  /** telefonu çevirme: tam direksiyon açısı (derece) */
  tlt: 38,
  /** yarışta türe uygun araç */
  ac: 1,
  /** gölgeler */
  shd: 1,
  /** performans göstergesi */
  perf: 0,
};

export type DireksiyonModu = "btn" | "wheel" | "tilt";
export type GazModu = "btn" | "analog" | "auto";

/** kontrol modları */
export const CT = { steer: "btn" as DireksiyonModu, gas: "btn" as GazModu };

/** HUD düzenleri (docs/HUD.md): göstergelerin yeri ve biçimi */
export type HudDuzeni = "kose" | "kadran" | "bant" | "sade";
export const HUDLAR: Record<HudDuzeni, { n: string; d: string }> = {
  kose: { n: "Köşe", d: "Hız sağda, gaz tuşunun üstünde" },
  kadran: { n: "Kadran", d: "Yuvarlak hız kadranı, yuvarlak harita" },
  bant: { n: "Bant", d: "Hız üstte ortada, alt taraf boş" },
  sade: { n: "Sade", d: "Panelsiz, en az gösterge" },
};
export const gorunum = { hud: "kose" as HudDuzeni };

/** aç/kapat ayarları: [anahtar, ad, açıklama] */
export const TOG: [keyof typeof set, string, string][] = [
  ["inv", "Direksiyon yönünü ters çevir", "Sağ ve sol tuşlarının yönünü değiştirir"],
  ["ss", "Hıza duyarlı direksiyon", "Hızlandıkça direksiyon açısı azalır"],
  ["sm", "Direksiyon yumuşatma", "Tuşa basınca direksiyon kademeli döner"],
  ["fov", "Hıza göre görüş açısı", "Hızlandıkça görüş genişler"],
  ["shd", "Gölgeler", "Kapatmak eski telefonlarda akıcılığı artırır"],
  ["shk", "Hız sarsıntısı", "Yüksek hızda kamera hafif titrer"],
  ["perf", "Performans göstergesi", "Ekranın üstünde kare hızı, kare süresi ve çizim sayısı"],
];

interface AyarKaydi {
  set?: Partial<typeof set>;
  CT?: Partial<typeof CT>;
  hud?: HudDuzeni;
  cam?: number;
  lk?: SeviyeAnahtari;
}

/** kayıtlı ayarları oku (yoksa varsayılanlar) */
export function ayarlariYukle(): AyarKaydi {
  const k = okuJson<AyarKaydi>("lt_ayar", {});
  if (k.set) Object.assign(set, k.set);
  if (k.CT) Object.assign(CT, k.CT);
  if (k.hud && k.hud in HUDLAR) gorunum.hud = k.hud;
  return k;
}

export function ayarlariKaydet(cam: number, lk: SeviyeAnahtari) {
  yazJson("lt_ayar", { set, CT, hud: gorunum.hud, cam, lk });
}
