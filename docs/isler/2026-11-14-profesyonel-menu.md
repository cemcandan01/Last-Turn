# Profesyonel menü yapısı — 14 Kasım 2026

## Unity uygulaması — 15 Kasım 2026, Codex

Cem: “tasarımı beğendim. uygula. mutant ekran tasarımlarını da buna benzer ama mutantın havasına da uygun olsun”. İkinci görsel yön kabul edildi; tekrar tasarım onayı beklenmez. Aynı dal `codex/unity-p7-garaj`, başlangıç `92c2c7e`; önceki yerel örnek ve `_Recovery` korunur. Yeni özellik/denge/kayıt değişikliği yok.

Kabul: (1) Onaylı dikey numaralı ana menü ve yarış afişi gerçek Unity/model/komutlarıyla çalışır. (2) Kariyer, garaj/modifiye, mağaza, hazırlık, profil, ayarlar ve duraklatma/sonuç ortak pit/fiş diline geçer; örnek veriler oyuna taşınmaz. (3) Mutant başlangıcı, ödül seçimi, boss, etkinlik, atölye, sandık, koşu özeti/sonucu ve sürüş HUD'ı ortak tipografi/teknik etiketler kullanır; koyu petrol/asit yeşili ve lanet/tehlike vurgusu Mutant kimliğini ayırır; ikonlar ve nadirlik anlamları korunur. (4) Fare/klavye işlemleri, odak, ipuçları, hazırlık dönüşü ve uzun metin/kilit durumları korunur. (5) İlgili proje/çekirdek kontrolleri ve ayrı test ürününde Unity derleme/Play/görüntü kanıtı; kullanıcı Editor'ı ve gerçek kayıtlar korunur. Genel regresyon veya canlı yayın bu işin kapsamı değildir.

Tek uygulayıcı Codex; önceki Claude incelemesinin erişim bulguları uygulanır. Yeni Claude oturumu veya ek ücretli hizmet başlatılmaz. Görsel revizyonun sonuçları burada güncellenecek.

## İstek

> görünümü profesyonel hale getirelim. gerçek oyunların yapısını bizim oynumuzla uyumlu olacak şekilde entegre edelim. gerçekten emek kokan bir menü yapısı olsun ama aynı zamanda erişilebilirliği de akıcı olsun. claude ile birlikte çalıısn

## Sahiplik ve başlangıç

- Uygulayan: Codex; dal `codex/unity-p7-garaj`, başlangıç `92c2c7e`. Origin fetch başarılı. Yalnız mevcut `_Recovery` ve meta izlenmiyor; korunacak.
- Unity / Windows önceliği. Mevcut F tasarımının turuncu, Barlow ve yarış kimliği korunur; büyük öznel değişiklikten önce gezilebilir örnek yapılır.
- Codex: akış, görsel örnek ve doğrulama. Claude: aynı kart ve sağlanan dosya görüntüleri üzerinden bağımsız salt okunur tasarım/erişim incelemesi; dosya yazmaz. Kullanıcı birlikte çalışma istedi. Gerçek Claude Pro oturumu doğrulandı; kalan 5 saat/hafta kapasitesi bilinmiyor. Kullanıcı ücretli ek kullanımın kapalı olduğunu güncel olarak doğruladı. API/ek kredi yetkisi yok.
- Yeni sistem kurulmaz; `scripts/koordinator.mjs` yordamı kullanılır. Görev görsel/UX; oyun ekonomisi ve fizik değişmez.

## Kabul ölçütleri

1. Ana menü dört mevcut ana hedefi açıkça sunar; Yarış → Kariyer / Garaj / Mağaza yapısı korunur. Ana ekrandan yarış hazırlığına en fazla üç işlem.
2. Ana ekran, kariyer, yarış hazırlığı, garaj, mağaza, Mutant, profil ve ayarlar aynı tipografi, boşluk, seçim ve geri dönüş dilini kullanır. Örnek işlemler gerçek oyunda çalışıyormuş gibi sunulmaz.
3. Fare ve klavyeyle gezinilebilir; görünür odak, Escape ile katmanlı geri dönüş, renk dışında seçili/kilitli açıklaması ve azaltılmış hareket vardır. 1280×720 ve 1920×1080 ana hedefler; 2560×1080 ve dar pencere de kontrol edilir.
4. Gerçek yarış oyunlarından alınan akış ilkeleri kaynaklarıyla belirtilir; Last Turn'de olmayan çevrimiçi sezon, ödül veya mekanik vaat edilmez. Mevcut oyun görselleri ve yerel fontlar kullanılır.
5. Claude gerçekten çalışırsa yanıt/eleştiri ve uygulanan düzeltmeler kaydedilir. Çalışmazsa birlikte inceleme yapılmış sayılmaz. Tasarım örneği ve Unity entegrasyonu ayrı raporlanır; görsel yön kullanıcıya somut örnekle sunulur.

## Doğrulama planı

HTML örneği: ilgili biçim kontrolü, gezilebilir akış, klavye/odak/geri dönüş, farklı ekran boyutlarında taşma ve görsel inceleme. Runtime değişmediği sürece Unity/.NET veya tam oyun regresyonu gerekmez. Görsel beğeni kullanıcı kabulüdür.

## Teslim ve kanıt — Codex

- Sekiz gezilebilir yüzey: ana menü, kariyer, hazırlık, garaj, mağaza, Mutant, profil, ayarlar. `docs/tasarim/menu-profesyonel.html` + CSS/MJS; tasarım ve mevcut Unity model/komut eşlemesi `docs/tasarim/menu-profesyonel.md`.
- Windows 720p için sıkı yerleşim, fare/Tab/yön tuşu/Enter, katmanlı Escape, kardeş sekmelerde temiz geri dönüş, hazırlık-aracına geri dönme, renk dışı seçim/kilit metni, büyük metin ve azaltılmış hareket. Gerçek yarış/satın alma/hesap işlemi yok; örnek olduğu ekranda belirtilir. Dış font/servis çağrısı yok.
- Yerel gerçek Chrome / Playwright: **14 kontrol grubu başarılı**, hata/eksik varlık yok. 1280×720, 1920×1080, 2560×1080 ve 640×900 ana menü; tüm alt yollar 1280/640 genişlikte büyük metinle yatay taşmasız. Hazırlık → garaj → hazırlık araç/saat/hava koruması, kilitli etkinlik, onay iptali, yön tuşu+Enter, örnek ayar değerleri. Ek inceleme sonrası Q/E tam döngü, hiyerarşik Esc, H yardım ve odağın geri gelmesi doğrulandı. `tests/cikti/menu-profesyonel/result.json` ve PNG'ler (ignore; başka makineye taşınmaz).
- Prettier HTML/CSS/MJS ve `node --check` başarılı. Vite native rolldown eksikliği nedeniyle açılamadı; paket/kilit değiştirilmeden Python statik sunucusu kullanıldı. Unity runtime değişmediği için .NET/Editor/tam regresyon çalıştırılmadı. İnsan görsel kabulü açık.
- **Claude incelemesi tamamlandı.** İlk otomatik onay reddinden sonra Cem iki dosyanın gönderilmesini açıkça onayladı. İlk izinli komut eski Claude worktree'sinde Unity dosyası olmadığı için model başlamadan durdu (`5da8a53e-4524-4918-914a-03235b0bf3ba.json`). Mevcut worktree'ler değiştirilmeden aynı `92c2c7e` üzerinde depo içi `tests/cikti/koordinator/menu-inceleme`, dal `claude/menu-inceleme-20261114` oluşturuldu. Ortak yordamda salt okunur inceleme başarılı; **model `claude-opus-5-5`, oturum `c8149aa8-95a9-479a-9ac5-dc8f077ede3d`**, kaynak/hedef değişimi yok. Kanıt `tests/cikti/koordinator/c8149aa8-95a9-479a-9ac5-dc8f077ede3d.json`. Gerçekte gönderilen içerik yalnız `MainMenuView.cs` ve kısa tasarım/görev özeti; kart içeriği, HTML ve görseller gönderilmedi. Claude bu sınırlamayı açıkça belirtti. Pro/claude.ai ve güncel ek kullanım kapalı kullanıcı teyidi doğrulandı; API/ek kredi geçişi yok. Liste fiyatı telemetrisi gerçek fatura veya kalan kota değildir.
- Aynı dal ve son commit `92c2c7e`; bu teslim yerel, commit edilmedi. `_Recovery` ve meta korundu. Push/merge/CI/yayın yok. Yerel inceleme sunucusu `127.0.0.1:5181`.

## Claude incelemesi sonrası revize

- Claude 8 bulgu verdi: Q/E, sekme vurgusu, Tab/odak, fare-klavye tutarlılığı, ana işlem hiyerarşisi/geliştirici araçları, büyük metin, hareket azaltma, hata durumundan çıkış.
- **İki bulgu doğrulanmadı:** Q/E zaten döngüseldir (`GarageView:59`, `StoreView:42`); her ayrı görünüm kendi etkin sekmesini vurgular (`GarageView:37`, `StoreView:23`). Yalnız tek dosyanın statik incelemesinden gelen bu öneriler mevcut hata sayılmadı; C# değiştirilmedi.
- Örnekte zaten var: baskın kariyer işlemi, geliştirici/kayıt araçlarını oyuncu yüzeyinden ayırma, native Tab/Shift+Tab ve odak çizgisi, büyük metin, azaltılmış hareket; seçim ve başlatma ayrı işlemlerdir, hover seçim değiştirmez.
- Yeni uygulanan: Q/E ile üç yarış bölümünün döngüsel geçişi, ekrana göre Q/E veya H ipucu, H ile Mutant yardımını açma, pencere kapanınca yardım düğmesine odak dönüşü, ana içerik için erişilebilir ekran adı ve tarayıcı başlığının güncellenmesi. İlk yeni test H ile açılan pencerede odağın yardım düğmesine dönmediğini buldu; açılışta yardım düğmesi odaklanarak düzeltildi ve 14 grup geçti.
- Runtime `Menu()` hatasında klavyenin erken dönüşle engellenmesi ve kayıt başarısızlığının sessiz kalması, Unity entegrasyonunda ele alınacak gerçek hata yolu adayıdır. Bu turda çalışma anında üretilmedi; statik bulgu olarak tutulur. Görsel örnek Unity davranışı kanıtı değildir.

## Revize 2 — pit panosu / yarış afişi

**İstenen:** Cem: “tasarım güzel olmuş ama biraz fazla gpt standart tasarımına benzemiş biraz daha farklı olsun”. İlk yönün okunaklılığı beğenildi; görsel kimliği kabul edilmiş sayılmaz.

**Çıkan / fark:** İlk örnekte büyük reklam sloganı, altta dört kutu ve aynı koyu panel düzeni fazla genel bir dijital ürün görünümü oluşturuyordu.

**Düzeltme:** Aynı gezilebilir örnekte ikinci görsel yön (`menu-pit.css`). Solda numaralı dikey menü, sağda oyunun kendi görüntüsünden yarış afişi; konturlu LAST TURN tipografisi, eğik kalkış numarası, baskı noktalaması ve arşiv işaretleri. Grafit + krem kâğıt + turuncu; teknik etiketlerde sistem monospace. Kariyer listesi kâğıt servis fişi, garaj özeti kesik ayraçlı teknik döküm, mağaza numaralı katalog, ayarlar kontrol masası. Alt ekran başlıkları slogan yerine doğrudan bölüm adı. Tüm yüzeyler aynı dile geçti; yalnız ana menüyle sınırlı değil.

**Korunan:** Dört ana hedef, tüm rota/komut sınırları, hazırlık seçimleri, Q/E/H/Esc/Tab, büyük metin ve azaltılmış hareket. Açık kâğıt yüzeyde koyu odak çizgisi eklendi. Yeni mekanik, denge veya oyun kaydı değişmedi. Yeni raster/görsel paketi/servis yok; CSS ve yerel kaynaklar kullanıldı. Küçük revize tek Codex ile yapıldı; önceki Claude erişim ilkeleri korundu, bu yeni görsel yön Claude tarafından görülmüş sayılmaz.

**Kanıt:** Chrome/Playwright güncel 14 grup başarılı. Ana menü 1280/1920/2560 ve dar pencere; tüm yollar 1280/640 büyük metinde yatay taşmasız. Sekiz 1280×720 ekranın tamamı tam 720 px yüksekliğe sığıyor. Ana menü, kariyer, garaj, Mutant ekranları görsel olarak incelendi; Prettier/sözdizimi/diff kontrolü başarılı. Güncel PNG/JSON aynı `tests/cikti/menu-profesyonel/` klasöründe. İnsan beğeni kabulü açık.

**Sonraki tek adım:** Cem'in ikinci yönü örnek üzerinden değerlendirmesi; ardından aynı kartta Unity entegrasyonu. Aynı dal/SHA `codex/unity-p7-garaj` / `92c2c7e`, yerel değişiklikler commit edilmedi. Push/merge/yayın yok; `_Recovery` korundu. Bu teslim Unity entegrasyonu tamamlandı anlamına gelmez.
