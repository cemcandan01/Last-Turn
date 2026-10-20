// Test ve hata ayıklama arabirimi: tarayıcı testleri oyunun içine window.LT üzerinden erişir.
// Oyun kodu bu dosyayı kullanmaz.
export { CARS } from "../arac/araclar";
export { showMenu, startWorld } from "../arayuz/menu";
export { openGarage, closeGarage } from "../arayuz/garaj";
export { showSet } from "../arayuz/ayarlar-ekrani";
export { R, scene, cam } from "../cizim/sahne";
export { kamera } from "../cizim/kamera";
export { COND } from "../cizim/ortam";
export { perf } from "../cekirdek/performans";
export { REG } from "../dunya/bolgeler";
export { WORLDS, dunya } from "../dunya/dunya";
export { ipucu } from "../dunya/pist";
export { set, CT, gorunum, HUDLAR } from "./ayarlar";
export { hudDuzeniUygula } from "../arayuz/hud";
export { oyun, setCar } from "./durum";
export { I } from "./girdi";
export { kurulum, applyPreset } from "./kurulum";
export { demoStop } from "./sinematik";
export { sim, reset } from "./surus";
export { EVENTS, startEvent, yaris } from "./yarislar";
import { tt } from "./dongu";

/** görsel saat */
export const saat = () => tt;
export const surum = __APP_VERSION__;
