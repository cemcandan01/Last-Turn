# 2026-10-25-ios-iframe

- Durum: yerelde düzeltildi; CI ve denemeye aktarım bekleniyor.
- Aktif sahip: Codex; alan/dal: altyapi / codex/altyapi.
- Temel SHA: 0c4997c3d1fd2c715d83eecf5bb13c165af7842d (0.5.26).

## Kullanıcının özgün isteği

“deneme dürümü adresini yer işaretinde açmaya çalışınca bu geldi”
Ek: IMG_0923.png; iPhone'da `iframe`, `veri - 439 bayt` dosya önizlemesi.

## Kabul ölçütleri

- [x] Başlangıçta HTTP 200 fakat octet-stream/attachment yardımcı geçerli sayılmaz.
- [x] Geçersiz yerel yardımcı yerine Firebase'in kendi HTML yardımcısı seçilir; eski redirect/link SDK çözücüsü korunur.
- [x] Doğru HTML sunan hosting'de kurulu uygulamanın redirect çözücüsü korunur; popup gerektiğinde tıklamada verilir.
- [x] Hesap/yerel oyun verisi silinmez; ağ/404 hatası sağlayıcı kurulumunu durdurmaz.
- [ ] İlgili CI geçer; yama artırılarak deneme adresi doğrulanır.
- [ ] Gerçek iPhone yer işareti açılışı kullanıcı tarafından doğrulanır.

## Kök neden ve kanıt

Deneme kökü HTTP 200, text/html, 0.5.26. `/dev/__/auth/iframe` HTTP 200,
application/octet-stream, 439 bayt; gövde Firebase AuthRelay HTML'i. Ekrandaki dosya adı ve boyutla eşleşiyor.
Eski kontrol yalnız handler.js HTTP 200 arıyordu; Firebase SDK mobil/Safari'de resolver'ı proaktif başlatıyordu.
Yeni kontrol iki HTML uç noktasının MIME/attachment başlıklarını doğrular. Geçersizse yapılandırmadaki Firebase
alan adına popup yolu seçilir. SDK çözücüsü eski _redirectEventId kayıtlarında argument-error üretmemek için korunur. Gerçek cihazda Google popup başarısı bu testlerle kanıtlanmaz.

## Doğrulama / devir

- Önce MIME/koşullu resolver denemesinde testler hatayı yakaladı. Denetimde eski redirect riski bulundu; resolver kaldırılması geri bırakıldı. Son kapsam 8 test (bozuk yardımcı + bekleyen redirect dahil).
- İlgili Firebase/bulut/PWA toplamı: 25/25 test geçti. Tip/lint/biçim sonucu ve CI SHA/koşumu tamamlanınca eklenir.
- Sonraki adım: CI altyapı alanını doğrula, denemeye gönder, kullanıcıya doğru kök adres ve sürümü ver.
- Kapsam dışı: hesap verisi sıfırlama, Firebase/GCP kimlik bilgisi veya hosting taşıma, canlıya çıkış.
- Revize: 0; token/kota tutarı ölçülmedi. Süre/kullanım platform telemetrisiyle ayrıca ölçülmeli.
