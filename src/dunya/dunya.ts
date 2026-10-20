// Dünya: açık dünya (Çorak Topraklar) ve bölgeler tek bir koordinat sisteminde. Yükseklik ve zemin sorguları
// bulunulan bölgeye yönlendirilir. Bölgeler yalnız gerektiğinde (seçilince) kurulur.
import * as THREE from "three";
import { CarpismaIzgarasi } from "../fizik/carpisma";
import { scene } from "../cizim/sahne";
import { REG, PARK, regAt, type Bolge, type Kutu, type Tele } from "./bolgeler";
import { buildTest, Htest, surfTest, TELEW } from "./corak";
import { kur, kurulumBaslat, kurulumBitir } from "./kurucu";
import type { Pist } from "./pist";

/** açık dünyanın (Çorak Topraklar) sınırı */
export const HUBB: Kutu = [-880, 880, -880, 880];
const inHub = (x: number, z: number) => Math.abs(x) < 900 && Math.abs(z) < 900;

export const dunya = {
  /** tüm dünyanın çarpışma ızgarası (açık dünya ve kurulan bölgeler) */
  cols: new CarpismaIzgarasi(),
  /** açık dünyanın görsel grubu */
  g: null as THREE.Group | null,
  /** son zemin sorgusunun bölgesi */
  cur: null as Bolge | null,
  /** bulunulan bölgenin pisti (serbest sürüşte tur sayacı ve yeniden doğma için) */
  TR: null as Pist | null,
};

/** dünya yüksekliği */
export function Hw(x: number, z: number): number {
  const r = regAt(x, z);
  if (r) return r.H(x, z);
  return inHub(x, z) ? Htest(x, z) : 0;
}

/** dünya zemini; bulunulan bölgeyi de günceller */
export function surfW(x: number, z: number): number {
  dunya.cur = regAt(x, z);
  if (dunya.cur) return dunya.cur.surf(x, z);
  return inHub(x, z) ? surfTest(x, z) : 2;
}

export interface AcikDunya {
  n: string;
  d: string;
  reg: Bolge | null;
  tele: Tele[];
  box: Kutu;
}

export const WORLDS: AcikDunya[] = [
  {
    n: "Çorak Topraklar",
    d: "Toprak arazi: asfalt oval, uzun düz yol, zıplama rampası ve tırmanış yolu.",
    reg: null,
    tele: TELEW,
    box: HUBB,
  },
  {
    n: "Boş Otopark",
    d: "AVM önünde geniş açık otopark: park sıraları, park etmiş arabalar ve boş asfalt alan. Asfalt testleri için.",
    reg: PARK,
    tele: PARK.tele!,
    box: PARK.box,
  },
];

/** açık dünyayı kur (bir kez) */
export function loadWorld() {
  kur.H = Hw;
  if (dunya.g) return;
  kurulumBaslat(7, dunya.cols);
  buildTest();
  dunya.g = kurulumBitir();
  scene.add(dunya.g);
}

/** bölgeyi kur (ilk seçildiğinde). Tohum bölge sırasından: dekor her açılışta aynı */
export function ensureBuilt(r: Bolge) {
  if (r.g) return;
  kur.H = Hw;
  kurulumBaslat(1000 + r.idx * 7919, dunya.cols);
  r.build();
  r.g = kurulumBitir();
  scene.add(r.g);
}

export { REG, PARK, regAt };
