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
- Sonraki: alan doğrulaması, ardından yama +1 ile deneme yayını; canlı değişmez.
