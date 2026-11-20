# 2026-10-25-ios-iframe

- Durum: otomatik doğrulama tamamlandı; 0.5.27 denemeye aktarılıyor, gerçek cihaz doğrulaması bekleniyor.
- Aktif sahip: yok; son uygulayıcı Codex; alan/dal: altyapi / codex/altyapi.
- Temel SHA: 0c4997c3d1fd2c715d83eecf5bb13c165af7842d (0.5.26).

## Kullanıcının özgün isteği

“deneme dürümü adresini yer işaretinde açmaya çalışınca bu geldi”
Ek: IMG_0923.png; iPhone'da `iframe`, `veri - 439 bayt` dosya önizlemesi.

## Kabul ölçütleri

- [x] Başlangıçta HTTP 200 fakat octet-stream/attachment yardımcı geçerli sayılmaz.
- [x] Geçersiz yerel yardımcı yerine Firebase'in kendi HTML yardımcısı seçilir; eski redirect/link SDK çözücüsü korunur.
- [x] Doğru HTML sunan hosting'de kurulu uygulamanın redirect çözücüsü korunur; popup gerektiğinde tıklamada verilir.
- [x] Hesap/yerel oyun verisi silinmez; ağ/404 hatası sağlayıcı kurulumunu durdurmaz.
- [x] Altyapı CI 19/19 senaryo geçti; yama 0.5.27 hazır. Deneme adresi doğrulaması PR açıklamasına eklenir.
- [ ] Gerçek iPhone yer işareti açılışı kullanıcı tarafından doğrulanır.

## Kök neden ve kanıt

Deneme kökü HTTP 200, text/html, 0.5.26. `/dev/__/auth/iframe` HTTP 200,
application/octet-stream, 439 bayt; gövde Firebase AuthRelay HTML'i. Ekrandaki dosya adı ve boyutla eşleşiyor.
Eski kontrol yalnız handler.js HTTP 200 arıyordu; Firebase SDK mobil/Safari'de resolver'ı proaktif başlatıyordu.
Yeni kontrol iki HTML uç noktasının MIME/attachment başlıklarını doğrular. Geçersizse yapılandırmadaki Firebase
alan adına popup yolu seçilir. SDK çözücüsü eski _redirectEventId kayıtlarında argument-error üretmemek için korunur. Gerçek cihazda Google popup başarısı bu testlerle kanıtlanmaz.

## Doğrulama / devir

- Önce MIME/koşullu resolver denemesinde testler hatayı yakaladı. Denetimde eski redirect riski bulundu; resolver kaldırılması geri bırakıldı. Son kapsam 8 test (bozuk yardımcı + bekleyen redirect dahil).
- İlgili Firebase/bulut/PWA toplamı: 25/25 test; 0.5.27 tip/lint/biçim temiz.
- CI https://github.com/cemcandan01/Last-Turn/actions/runs/40134724477: altyapi 19/19, tarayıcı senaryoları dahil.
- Kaynak SHA: 8caed4cfd4399baf2152712a65bf010327d4da9a; test edilen merge SHA: 37d4ea2bf5ad49c531649deebaf83a068be25128; hedef SHA: 0c4997c3d1fd2c715d83eecf5bb13c165af7842d.
- CI ortamı Ubuntu/Node22; test edilen lock SHA256 ea3a7a4bd8277ef09d132831d3fd060482f0e41056a42fcc0642c8ec0455e590. Son fark yalnız yama sürümü/lock kök sürüm alanları ve devir kanıtıdır; bağımlılıklar değişmez.
- Sonraki adım: 0.5.27 deneme adresini doğrula; Cem eski yer işaretini kapatıp doğru oyun kökünü Safari'de ve yer işaretinden açarak sonucu bildirsin. Site verisi silme önerilmedi.
- Kapsam dışı: hesap verisi sıfırlama, Firebase/GCP kimlik bilgisi veya hosting taşıma, canlıya çıkış.
- Revize: 0; token/kota tutarı ölçülmedi. Süre/kullanım platform telemetrisiyle ayrıca ölçülmeli.
