# Yakın takip kamerası

- İstek: “takip kamera açısını biraz daha yakınlaştır, diğer yarış oyunlarındaki default yakınlık mesafesinde olsun”
- Sahip: Codex; dal: codex/kamera; temel: c9d135ae5983aa72f003a0b4ac7e7e9148103edc.
- Küçük görsel ayar; tek uygulayıcı. Fizik, ekonomi ve kayıt değişmez.

## Kabul ve kapsam

1. Yakın takip araca yaklaşık %25 yaklaşır: taban mesafe 9 → 6,8 m; hız eki 3 → 2 m.
2. Yükseklik tabanı 2,4 → 1,7 m, dikey açı 0,30 → 0,25 rad: daha alçak takip; yol görüşü korunur.
3. Uzak takip, kaput, kokpit, garaj ve menü açıları korunur. Yarış ve serbest sürüş aynı yakın takibi kullanır.
4. iPhone 13 yatay karede araç kesilmez; tüm araçlarda kadraj ve yakın/uzak ayrımı tarayıcıda doğrulanır.

## Doğrulama ve teslim

- Tip/kod/biçim + kamera alan senaryosu. Yerel Chromium ağ engeli biliniyor; tarayıcı ve görüntü kanıtı GitHub Actions ortamında.
- Yerel tip, ESLint, Prettier ve üretim derlemesi başarılı.
- Kaynak ef5803f7dd0c34d7901fac7217ee6fd3d5a173a9; CI 40238496618 başarılı. 1/1 kamera alan senaryosu: 15/15 araç yakın kadrajda, çevre kutuları kesilmiyor; uzak açı korunuyor. Görsel kanıt kamera-yakin-iphone13 (artifact 12615653962), iPhone 13 yatay.
- Görüntü incelendi: araç belirgin, gövde kesilmiyor, ileri yol görünür. Tüm pist görüntüleri yerine ilgili kamera karesi kullanıldı; fizik ölçümü gerekmiyor.
- Deneme sürümü 0.7.7. Canlı 0.6.8 değişmez. Yayın 40238705321 başarılı; kontrol işi 121305996779 adresleri doğruladı: /dev/ 0.7.7, kök 0.6.8. Yayın kaynağı 0746c6f; test edilen kaynakla oyun/test dosyaları birebir aynı. Sonraki: Cem kadrajı denesin.
- Tek uygulayıcı, revize yok; platform token maliyeti ölçülmüyor.

- Son belge kaydı yalnız teslim kanıtı içerir; [skip ci] ile aynı kaynak için ikinci derleme başlatılmaz.
