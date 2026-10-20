// Fizik katmanının ortak tipleri. Fizik bu arabirimler üzerinden dünyayı okur ve olay bildirir;
// three.js'e, DOM'a ya da oyun durumuna doğrudan dokunmaz.
import type { Arac } from "../arac/araclar";
import type { Rastgele } from "../cekirdek/rastgele";
import type { Carpisan } from "./carpisma";
import type { Ayarlar, Lastik, OnayarAnahtari, Yardimlar, Zemin } from "./veriler";

/** aracın yer düzlemindeki durumu (x-z düzlemi, y yukarı; yön h, ileri = (sin h, cos h)) */
export interface AracDurumu {
  x: number;
  z: number;
  y: number;
  vy: number;
  h: number;
  vx: number;
  vz: number;
  /** yalpa hızı (rad/s) */
  w: number;
  /** boylamsal ivme (süzülmüş), ağırlık aktarımı ve gövde eğimi için */
  axs: number;
  air: boolean;
  /** çamur (0-1), ıslaklık (0-1) */
  mud: number;
  wet: number;
  /** son sert çarpmanın simülasyon zamanı */
  hit: number;
  kerb: 0 | 1;
  spin: 0 | 1;
  /** süzülmüş gaz (0-1) */
  gas: number;
  /** önceki adımın hız yönü (drift desteği için) */
  pv?: number;
}

/** drift modu durum makinesi */
export interface DriftDurumu {
  on: number;
  dir: number;
  hold: number;
  bt: number;
  t: number;
  k: number;
  cool: number;
  nc: number;
}

/** drift göstergesi ve puanı (HUD ve drift yarışı okur) */
export interface DriftSkoru {
  act: number;
  t: number;
  score: number;
  gap: number;
  beta: number;
}

/** fiziğe giden girişler (her adımda) */
export interface FizikGirdisi {
  /** hedef direksiyon (-1 sağ ... 1 sol); tuş, ekran direksiyonu ya da telefon eğiminden */
  tg: number;
  /** gaz ve fren (0-1) */
  g: number;
  b: number;
  /** direksiyon analog mu (ekran direksiyonu, telefon) */
  analogDireksiyon: boolean;
  /** gaz analog pedal mı */
  analogGaz: boolean;
}

/** sürüş kurulumu: araç, lastik, ayarlar, yardımlar ve mekanik seçenekler */
export interface SurusKurulumu {
  car: Arac;
  pk: OnayarAnahtari;
  tire: number;
  tu: Ayarlar;
  as: Yardimlar;
  /** hıza duyarlı direksiyon, direksiyon yumuşatma */
  ss: number;
  sm: number;
}

/** fiziğin dünyadan okuduğu her şey */
export interface DunyaSorgusu {
  /** zemin yüksekliği */
  H(x: number, z: number): number;
  /** zemin türü (SURF indeksi) */
  surf(x: number, z: number): number;
  /** yakındaki çarpışma nesneleri */
  yakin(x: number, z: number): Iterable<Carpisan>;
  /** sürülebilir alan [xmin, xmax, zmin, zmax] */
  kutu(): [number, number, number, number];
  /** bulunulan bölgede kerb var mı (son surf çağrısına göre) */
  kerbli(): boolean;
  /** hava tutuş çarpanı (yağmur, kar) */
  havaTutusu(): number;
  /** karlı tema mı (çalıda kar tozu yerine yaprak çıkmaz) */
  karli(): boolean;
}

/** fiziğin bildirdiği olaylar: görsel ve ses katmanı dinler */
export interface FizikOlaylari {
  spin(): void;
  /** toz, duman, su sıçraması. col: renk */
  puf(x: number, y: number, z: number, vx: number, vz: number, col: number): void;
  /** çalı rengi (yaprak tozu) */
  caliRengi(): number;
}

export interface FizikBaglami {
  dunya: DunyaSorgusu;
  kurulum: SurusKurulumu;
  olay: FizikOlaylari;
  /** fizik içi rastgelelik (çarpma savrulması). Tohumlu: tekrar oynatılabilir */
  rng: Rastgele;
  /** görsel rastgelelik (toz parçacıkları). Fizik sonucunu etkilemez */
  gorselRng: Rastgele;
}

/** bir fizik adımının durumu: araç, drift, direksiyon ve simülasyon saati */
export interface SimDurumu {
  S: AracDurumu;
  DR: DriftDurumu;
  D: DriftSkoru;
  /** süzülmüş direksiyon (-1..1) */
  st: number;
  /** ön teker açısı (rad) */
  delta: number;
  /** simülasyon zamanı (s) */
  zaman: number;
}

/** adımın oyuna döndürdüğü özet: aracın altındaki zemin, lastik, hız, zemin indeksi */
export interface AdimSonucu {
  Sf: Zemin;
  T: Lastik;
  v: number;
  si: number;
}
