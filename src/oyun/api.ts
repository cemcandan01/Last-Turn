// Test ve hata ayıklama arabirimi: tarayıcı testleri oyunun içine window.LT üzerinden erişir.
// Oyun kodu bu dosyayı kullanmaz.
export { CARS } from "../arac/araclar";
export { showMenu, startWorld } from "../arayuz/menu";
export { openGarage, closeGarage } from "../arayuz/garaj";
export { showSet } from "../arayuz/ayarlar-ekrani";
export { R, scene, cam } from "../cizim/sahne";
export { kamera } from "../cizim/kamera";
export { mmDonustur, miniHaritaCiz } from "../arayuz/mini-harita";
export { aynaDurumu } from "../cizim/ayna";
export { kokpit } from "../cizim/kokpit";
export { COND, applyEnv, ortam } from "../cizim/ortam";
export { perf } from "../cekirdek/performans";
export { ekran } from "../cekirdek/ekran";
export { REG } from "../dunya/bolgeler";
export { WORLDS, dunya } from "../dunya/dunya";
export { ipucu } from "../dunya/pist";
export { set, CT, gorunum, HUDLAR, HUD_PARCALARI } from "./ayarlar";
export { hudDuzeniUygula } from "../arayuz/hud";
export { hudDuzenleyiciAc, hudDuzenleyiciKapat, duzenleyici } from "../arayuz/hud-duzenleyici";
export { oyun, setCar } from "./durum";
export { I } from "./girdi";
export { kurulum, applyPreset } from "./kurulum";
export { demoStop, CINE, cekimKaydi } from "./sinematik";
export { sim, reset, yerel } from "./surus";
export { uzak, hayalet, uzakAracEkle, uzakAracSil, uzakAnlikEkle } from "./uzak";
export { aracAnligi } from "../fizik/arac-ornegi";
export { kaydiSerilestir, kaydiCoz, kaydiOynat } from "../fizik/girdi-kaydi";
export { EVENTS, startEvent, endEvent, yaris } from "./yarislar";
import { tt } from "./dongu";

/** görsel saat */
export const saat = () => tt;
export const surum = __APP_VERSION__;
export { sesKaydi } from "../ses/kayit";
export { sesBilgi } from "../ses/ses";
export {
  seviye,
  pistAcikMi,
  aracAcikMi,
  xpEkle,
  ilerlemeVerisi,
  ilerlemeYukle,
  kilitTablosu,
} from "./ilerleme";
