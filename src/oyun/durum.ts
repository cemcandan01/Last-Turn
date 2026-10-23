// Oyun durumu: ekran modu, kamera, seçili araç, açık dünya
import { CARS, type Arac } from "../arac/araclar";
import { yaz } from "../cekirdek/depo";
import { aracModeliKur } from "../cizim/arac-modeli";
import { WORLDS, type AcikDunya } from "../dunya/dunya";

export type Mod = "menu" | "drive" | "pause" | "result" | "garage";

export const oyun = {
  mode: "menu" as Mod,
  /** kamera: 0 takip, 1 uzak takip, 2 kaput, 3 kokpit */
  camMode: 0,
  /** seçili açık dünya */
  CURW: WORLDS[0] as AcikDunya,
  /** seçili araç */
  CAR: CARS[0] as Arac,
};

export const CAMS = ["Takip", "Uzak takip", "Kaput", "Kokpit"];

/** aracı değiştir: model, iç mekân, kayıt */
/** vitrin: garajda önbellekli, iç mekânsız kurulum */
export function setCar(i: number, vitrin = false) {
  oyun.CAR = CARS[i];
  aracModeliKur(oyun.CAR, vitrin);
  yaz("lt_car", i);
}

export const carIndex = () => CARS.indexOf(oyun.CAR);
