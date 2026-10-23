# Ekran uyum denetimi (sanal cihazlar)

Gerçek telefon yok: oyunun bütün ekranları ~25 sanal cihazda (yatay) otomatik ölçülür. Amaç: yazı kesilmesin, öğe ekran/çentik/güvenli alan dışına taşmasın, düğmeler üst üste binmesin, dokunma hedefi ≥ 40 px olsun, istenmeyen kaydırma çıkmasın, 3B tuval ekranı tam kaplasın.

## Komut

```
npm run cihaz                                     iPhone 13 (referans), bütün ekranlar
npm run cihaz -- --ekran garaj-panel              tek ekran (virgülle çoğul; dal adı da olur: --ekran garaj)
npm run cihaz -- --cihaz iphone-se,ipad-mini      belirli cihazlar
npm run cihaz -- --hizli                          hızlı alt küme (7 cihaz)  ·  --hepsi: bütün cihazlar
npm run cihaz -- --liste                          cihaz ve ekran listesi
```

Seçenekler: `--derlemeden` (dist/ hazır), `--adres https://…/` (canlı/deneme adresi), `--paralel N` (varsayılan 2), `--resimsiz`.
Çıktı `tests/cikti/cihaz/`: `<cihaz>/<ekran>.png`, `ozet.html` (kontak tablosu), `ozet.png` (birleşik görüntü), `ozet.md` (cihaz × ekran tablosu), `hatalar.txt`, `uyarilar.txt`, `sonuc.json`.

Hata satırı: `<sahip dal> | <cihaz> | <ekran> | <öğe seçici> | <sorun>`. Hata varsa çıkış kodu 1.

## Dosyalar

| Dosya                                | İş                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/cihazlar.mjs`                 | Cihaz listesi: gerçek CSS ölçüsü, DPR, güvenli alan payları, çentik, köşe yuvarlaklığı; kaynak notları dosya başında. `kesin:false` = ölçü Android'de yaklaşık (DevTools/üretici). Tarayıcı sekmesi varyantları (`tarayici:true`) adres çubuğu kadar kısadır. |
| `tests/yardimci/cihaz-ekranlari.mjs` | Ekran listesi: her ekranın sahibi dal (`dal`), nasıl açıldığı (`ac`), hazır olma seçicisi (`bekle`), `dikeyKaydirma`, `haric`.                                          |
| `tests/yardimci/cihaz-olcum.mjs`     | Sayfa içi ölçüm (`olc`).                                                                                                                                                  |
| `tests/yardimci/cihaz-denetim.mjs`   | Cihaz bağlamı (güvenli alan: CDP `Emulation.setSafeAreaInsetsOverride`), ekran döngüsü, özet.                                                                              |
| `tests/e2e/bolumler/cihaz-*.mjs`     | Senaryo bölümleri: `cihaz-menu/garaj/hud` (sahip dalın ekranları), `cihaz-dogrulama` (altyapı: denetimin kendisi).                                                       |

## Neyi hata sayar

- **yazı/düğme kesiliyor:** kapsayıcının `overflow` kenarı yazıyı ya da düğmeyi kesiyor (üç nokta ile kısaltma dahil). Kaydırılabilir kaplarda (auto/scroll) taşan kısım beklenen davranıştır, sayılmaz.
- **ekran dışına taşıyor**, **çentiğe giriyor** (cihazın çentik/ada/delik dikdörtgeni, iki yatay yönde), **yuvarlak ekran köşesine giriyor**.
- **güvenli alanı aşıyor:** `docs/HUD.md` toleransı: göstergeler güvenli alana en çok 20 px, tuşlar 14 px, üst/alt 12 px girer. Etkileşimli öğede hata, yalnız metinde uyarı (`uyarilar.txt`).
- **üst üste biniyor:** düğme-düğme, yazı-düğme, yazı-yazı (dönük/eğik öğelerde gerçek şekle bakılır, sınır kutusuna değil).
- **dokunma hedefi küçük:** etkileşimli öğe (dinleyicisi olan, düğme/giriş ya da `cursor:pointer`) 40 px'ten küçük. Ekranın %35'inden büyük yüzeyler (sürükleme alanı) sayılmaz.
- **sayfa kaydırılabiliyor**, **istenmeyen dikey kaydırma** (kaydırması serbest ekranlar `dikeyKaydirma:true`), **3B tuval ekranı kaplamıyor / gerilmiş**.
- Başka katmanın altında kalan (görünmeyen) öğe sayılmaz. `haric` yalnız bilerek taşan öğeler içindir (ör. kapak akışı yan kartları); her kullanımın nedeni yorumda yazılı olmalı.

## Bilerek bozulmuş sayfa doğrulaması

`node tests/e2e/duman.mjs --bolum cihaz-dogrulama` (senaryo `altyapi/cihaz-denetim`): taşan yazı, üç nokta, üst üste düğme/yazı, ekran dışı, küçük hedef, çentik, ana ekran çubuğu, yuvarlak köşe, sayfa ve iç kaydırma yakalanmalı; düzgün sayfa, eğik ama değmeyen kartlar ve kaydırılabilir liste yanlış alarm vermemeli. Denetimi değiştirince bunu koş.

## Senaryolar ve süre

`menu/cihaz-uyum`, `garaj/cihaz-uyum`, `hud/cihaz-uyum` (P2): `npm run alan -- menu` hızlı alt kümeyi (7 cihaz), `npm run regresyon` bütün cihazları koşar (`LT_CIHAZ_KAPSAM=tam`). Hepsi tek koşumu paylaşır; bölümler yalnız kendi dalının hatalarını raporlar. Cihaz-bölümleri `npm run test:e2e`'nin varsayılan listesinde yok (pahalı); `--bolum cihaz-menu` ile koşar. Süre ölçümü `docs/notlar/altyapi.md`'de.

## Hata çıkınca

Hata satırındaki sahip dal düzeltir (`stil.css`, ekranın `…ts` dosyası); düzeltmeyi `npm run cihaz -- --ekran <ekran> --cihaz <cihaz>` ile doğrula, görüntü `tests/cikti/cihaz/<cihaz>/<ekran>.png`. Yanlış alarm olduğunu düşünüyorsan önce `cihaz-olcum.mjs`'i düzelt ve `cihaz-dogrulama`'ya o durumu ekle; hatayı gizlemek için `haric` kullanma.
