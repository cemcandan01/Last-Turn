// Oyuncu ayarları: mekanik seçenekler, kontrol modu, kamera. Telefonda kalıcıdır (lt_ayar).
import { okuJson, yazJson } from "../cekirdek/depo";
import type { SeviyeAnahtari } from "../fizik/veriler";

/** deneme sürümü ya da geliştirme sunucusu: geliştirici ayarları görünür */
export const GELISTIRICI = import.meta.env.MODE == "gelistirme" || import.meta.env.DEV;

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
  /** ses seviyeleri (0-100): oyun sesleri ve menü müziği */
  ses: 85,
  muz: 70,
  /** geliştirici: yerel aracı gecikmeli izleyen hayalet uzak araç (yalnız deneme sürümünde) */
  hayalet: 0,
};

export type DireksiyonModu = "btn" | "wheel" | "tilt";
export type GazModu = "btn" | "analog" | "auto";

/** kontrol modları */
export const CT = { steer: "btn" as DireksiyonModu, gas: "btn" as GazModu };

/** HUD (docs/HUD.md): her gösterge ayrı seçilir; hazır düzenler bunların birleşimidir */
export const HUD_PARCALARI = {
  hiz: {
    n: "Hız",
    s: { kose: "Panel", kadran: "Kadran", bant: "Üstte", sade: "Yazı" },
  },
  sayac: { n: "Sayaç", s: { panel: "Panel", yazi: "Yazı" } },
  tus: { n: "Tuşlar", s: { panel: "Panel", simge: "Simge" } },
  harita: {
    n: "Harita",
    s: { kare: "Kare", yuvarlak: "Yuvarlak", kucuk: "Küçük", kapali: "Kapalı" },
  },
  debriyaj: { n: "Debriyaj", s: { acik: "Açık", kapali: "Kapalı" } },
} as const;
export type HudParcasi = keyof typeof HUD_PARCALARI;
export type HudSecimi = { [K in HudParcasi]: keyof (typeof HUD_PARCALARI)[K]["s"] };
export type HudDuzeni = "kose" | "kadran" | "bant" | "sade";
export const HUDLAR: Record<HudDuzeni, { n: string; d: string; p: HudSecimi }> = {
  kose: {
    n: "Köşe",
    d: "Hız sağda, gaz tuşunun üstünde",
    p: { hiz: "kose", sayac: "panel", tus: "panel", harita: "kare", debriyaj: "acik" },
  },
  kadran: {
    n: "Kadran",
    d: "Yuvarlak hız kadranı, yuvarlak harita",
    p: { hiz: "kadran", sayac: "panel", tus: "panel", harita: "yuvarlak", debriyaj: "acik" },
  },
  bant: {
    n: "Bant",
    d: "Hız üstte ortada, alt taraf boş",
    p: { hiz: "bant", sayac: "panel", tus: "panel", harita: "kare", debriyaj: "acik" },
  },
  sade: {
    n: "Sade",
    d: "Panelsiz, en az gösterge",
    p: { hiz: "sade", sayac: "yazi", tus: "simge", harita: "kucuk", debriyaj: "acik" },
  },
};
export const gorunum: HudSecimi = { ...HUDLAR.kose.p };

/** seçim bir hazır düzene denk geliyorsa onun adı, değilse "ozel" */
export const hudDuzeni = (): HudDuzeni | "ozel" =>
  (Object.keys(HUDLAR) as HudDuzeni[]).find((k) =>
    (Object.keys(gorunum) as HudParcasi[]).every((p) => HUDLAR[k].p[p] == gorunum[p]),
  ) || "ozel";

/** aç/kapat ayarları: [anahtar, ad, açıklama] */
export const TOG: [keyof typeof set, string, string][] = [
  ["inv", "Direksiyon yönünü ters çevir", "Sağ ve sol tuşlarının yönünü değiştirir"],
  ["ss", "Hıza duyarlı direksiyon", "Hızlandıkça direksiyon açısı azalır"],
  ["sm", "Direksiyon yumuşatma", "Tuşa basınca direksiyon kademeli döner"],
  ["fov", "Hıza göre görüş açısı", "Hızlandıkça görüş genişler"],
  ["shd", "Gölgeler", "Kapatmak eski telefonlarda akıcılığı artırır"],
  ["shk", "Hız sarsıntısı", "Yüksek hızda kamera hafif titrer"],
  ["perf", "Performans göstergesi", "Ekranın üstünde kare hızı, kare süresi ve çizim sayısı"],
  ...((GELISTIRICI
    ? [["hayalet", "Hayalet araç (geliştirici)", "Uzak araç denemesi: aracın 2 sn geriden izler"]]
    : []) as [keyof typeof set, string, string][]),
];

interface AyarKaydi {
  set?: Partial<typeof set>;
  CT?: Partial<typeof CT>;
  /** eski kayıtlarda hazır düzen adı (3.2 öncesi deneme), yenilerde parça seçimi */
  hud?: HudDuzeni | Partial<HudSecimi>;
  cam?: number;
  lk?: SeviyeAnahtari;
}

/** kayıtlı ayarları oku (yoksa varsayılanlar) */
export function ayarlariYukle(): AyarKaydi {
  const k = okuJson<AyarKaydi>("lt_ayar", {});
  if (k.set) Object.assign(set, k.set);
  if (k.CT) Object.assign(CT, k.CT);
  if (typeof k.hud == "string") {
    if (k.hud in HUDLAR) Object.assign(gorunum, HUDLAR[k.hud].p);
  } else if (k.hud)
    for (const p of Object.keys(HUD_PARCALARI) as HudParcasi[]) {
      const v = k.hud[p];
      if (v && v in HUD_PARCALARI[p].s) (gorunum as Record<string, string>)[p] = v;
    }
  return k;
}

export function ayarlariKaydet(cam: number, lk: SeviyeAnahtari) {
  yazJson("lt_ayar", { set, CT, hud: gorunum, cam, lk });
}
