// Test ve hata ayıklama arabirimi: tarayıcı testleri oyunun içine window.LT üzerinden erişir.
// Oyun kodu bu dosyayı kullanmaz.
export { CARS } from "../arac/araclar";
export { gorunumUygula } from "../arac/gorunumler";
export { showMenu } from "../arayuz/menu";
export { kontrolleriKur } from "../arayuz/kontroller";
import { startWorld as dunyaBaslat } from "../arayuz/menu";
/** test sürüşü: açık dünyada MUTANT koşusu olmadan (eski testler); MUTANT için mutantBasla */
export const startWorld = (w: number) => dunyaBaslat(w, false);
export const mutantBasla = (w: number) => dunyaBaslat(w, true);
export { mutant, mutantArac, mutantDurumu, mutantKapat, mutantYarisBitti } from "./mutant";
export { rakip, rakipDurdur } from "./rakip";
export { BOSSLAR, PASIFLER } from "./mutant-kosu";
export { openGarage, closeGarage, magazaAc, magazaAc as openStore } from "../arayuz/garaj";
export { lastikDegistir } from "../arayuz/ayarlar-ekrani";
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
export { hudDuzeniUygula, hudGuncelle } from "../arayuz/hud";
export { hudDuzenleyiciAc, hudDuzenleyiciKapat, duzenleyici } from "../arayuz/hud-duzenleyici";
export { epostaFormuAc, epostaFormuKapat } from "../arayuz/hesap-ui";
export { oyun, setCar } from "./durum";
export { I } from "./girdi";
export { kurulum, applyPreset } from "./kurulum";
export { demoStop, CINE, cekimKaydi } from "./sinematik";
export { hayaletKaydet, hayaletOku } from "./hayalet-kayit";
export { rekorHayaleti, uzakAdimi } from "./uzak";
export { sim, reset, yerel, surusAdimi } from "./surus";
export { uzak, hayalet, uzakAracEkle, uzakAracSil, uzakAnlikEkle } from "./uzak";
export { aracAnligi } from "../fizik/arac-ornegi";
export { kaydiSerilestir, kaydiCoz, kaydiOynat } from "../fizik/girdi-kaydi";
export { EVENTS, startEvent, leaveEvent, endEvent, yaris, evTick, yarisiYenidenBaslat } from "./yarislar";
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
  ilerlemeSifirla,
  ilerlemeyiSifirla,
  kilitTablosu,
  para,
  paraEkle,
  aracFiyati,
  aracSatinAlinabilirMi,
  aracSatinAl,
  parcaFiyati,
  parcaSahipMi,
  parcaSatinAl,
} from "./ilerleme";
export {
  takiliParcalar,
  takiliYukle,
  parcaTak,
  parcaSok,
  paketiTak,
  stokaDon,
  modifiyeUygula,
  modifiyeSifirla,
} from "./modifiye";
export { performansPuani, SINIFLAR } from "../arac/performans";
export { aracKur, PARCALAR, PAKETLER } from "../arac/parcalar";
