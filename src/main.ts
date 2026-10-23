// Last Turn: giriş noktası. Modüller burada, belirli bir sırayla kurulur.
import "./stil.css";
import { CARS } from "./arac/araclar";
import { oku } from "./cekirdek/depo";
import { $ } from "./cekirdek/dom";
import { ekranKur } from "./cekirdek/ekran";
import { performansGoster } from "./cekirdek/performans";
import { arkaGorselKur } from "./arayuz/arka-gorsel";
import { dokunmaKur } from "./arayuz/dokunma";
import { hudDuzeniUygula, hudKur } from "./arayuz/hud";
import { kontrolleriKur } from "./arayuz/kontroller";
import { showMenu } from "./arayuz/menu";
import { miniHaritaKur, mmDraw } from "./arayuz/mini-harita";
import { surusTuslariKur } from "./arayuz/surus-tuslari";
import { kameraKur } from "./cizim/kamera";
import { rendererKur } from "./cizim/sahne";
import { zeminKur } from "./cizim/zemin";
import { loadWorld } from "./dunya/dunya";
import { ayarlariYukle, set } from "./oyun/ayarlar";
import { donguBaslat } from "./oyun/dongu";
import { oyun, setCar } from "./oyun/durum";
import { aracAcikMi } from "./oyun/ilerleme";
import { seviyeKutlamaKur } from "./arayuz/seviye-ui";
import { girdiKur } from "./oyun/girdi";
import { applyPreset, kurulum } from "./oyun/kurulum";
import { reset } from "./oyun/surus";
import { pwaKur } from "./pwa/kayit";
import { sesKur } from "./ses/ses";

// eski testler ve hata ayıklama için oyunun iç durumuna erişim
import * as oyunApi from "./oyun/api";

ekranKur();
// ilk kurulan: iptal edilen dokunuşların tıklamasını öteki dinleyicilerden (tık sesi) önce yutar
dokunmaKur();
rendererKur($<HTMLCanvasElement>("#c"));
zeminKur();
hudKur();
miniHaritaKur($<HTMLCanvasElement>("#mm"));
kameraKur($("#c"));
girdiKur();
surusTuslariKur();

// kayıtlı ayarlar ve araç
{
  const k = ayarlariYukle();
  hudDuzeniUygula();
  if (k.cam != null) oyun.camMode = k.cam;
  if (k.lk) kurulum.lk = k.lk;
  let ci = 1;
  const v = oku("lt_car");
  if (v != null && CARS[+v] && aracAcikMi(+v)) ci = +v;
  setCar(ci);
  kurulum.pk = oyun.CAR.pk;
}
applyPreset();
loadWorld();
mmDraw();
reset();
kontrolleriKur();
arkaGorselKur();
seviyeKutlamaKur();
showMenu();
performansGoster(!!set.perf || location.search.includes("perf"));
pwaKur();
sesKur();
donguBaslat();

(window as unknown as { LT: typeof oyunApi }).LT = oyunApi;
