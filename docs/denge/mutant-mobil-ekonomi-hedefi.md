# MUTANT — kısa mobil koşu ekonomisi / beceri tasarımı (taslak)

## Hedef
Üç bölgenin boss öncesi toplam süresi 19,5 dakika. Bu süre boss yarışlarını içermez. Hedef zor ama öğrenilebilir bir koşu; otomatik kazanma veya gizli AI güçlendirmesi yok. **Süreleri kısaltmak tek başına dengelenmiş ekonomi değildir.**

## Mevcut kurallar (2026-10-27)
- Başlangıç 150 para, 40 nitro enerjisi; atölye fiyatları 40/80/170/380, nadir ×1,4.
- Etkinlik temel ödülü: XP = 40+20×pist seviyesi, para = 60+30×pist seviyesi.
- Güvenli: ×1 ödül, başarısızlıkta ×0,3; riskli: ×2, başarısızlıkta 45 sn ceza; ölümcül: ×3,5, başarısızlıkta 90 sn ceza. Kumarbaz ölümcül başarı ×5, ceza iki kat.
- XP seviye n eşiği: 80n + 30n(n−1). Hasar tamiri: puan başına 3 para. Üç sandık/bölge (ikisi ücretsiz normal, biri lanetli).
- Yeni sayaçlar: 330/390/450 sn. Bu değişiklik henüz pist/sürüş simülasyonunda doğrulanmadı.

## Temel karar: beceri kaynak üretir
- Hızlı gitmek **tek başına** XP/para üretmemeli: düz yolda gazı tutarak kaynak kasma önlenmeli.
- Temiz viraj, kontrollü drift, doğru fren, rakibi temiz geçme gibi ölçülebilir sürüş olayları nitro/ısı gibi **yarış içi** kaynakları besler. Ödül ekonomisi yarış sonucu + seçilen risk üzerinden çalışır; sonsuz farm yok.
- Build, doğru sürüş biçimini değiştirir: grip (fren noktası/çıkış), drift (açı ve hız), agresif (yakın mücadele, gövde maliyeti). Üçü de ayrı pist türlerinde yaşayabilir olmalı.
- Çarpışarak para/enerji kasmak, tamir ve süre maliyetini aşmamalı. Ödülün başarıya bağlı olması, güvenli yarışın en iyi stratejiye dönüşmemesi gerekir.

## Kabul kapıları — uygulama öncesi sayısal simülasyon
1. 5 başlangıç aracı × 3 sürüş stili × 3 seed, en az 2 pist türü: bölge 1 için ulaşılabilir boss ve en az 2 anlamlı build kararı.
2. Başarılı ama sıradan sürüşte 1. bölgede 2–3 etkinlik + bir atölye/sandık etkileşimi mümkün; başarısız riskli yarışın maliyeti hissedilir.
3. Usta oyuncu daha çok ödül alabilir; fakat riskli/ölümcül başarısızlığı telafi etmek ücretsiz değildir.
4. Hiçbir tek motor/turbo yolu bütün yarış türlerinde baskın olmamalı. Yalnız güvenli etkinlik oynayarak üst bölgeleri garantili geçmek mümkün olmamalı.
5. Zamanın etkinlik ve seçim ekranlarında nasıl aktığı, harita ulaşım süresi, iki turluk düello ve boss süreleri gerçek mobil cihazda ölçülmeli.
6. Önce CI ve otomatik matris, sonra iPhone 13 gerçek oynanış. Bu ölçümler geçmeden /dev veya master birleştirmesi yapılmamalı.

## Takip işleri
- **E1:** Koşu telemetrisi: süreyi sürüş / harita / atölye / seçim / yarış olarak ayır, XP ve para akışını kaydet.
- **E2:** Ölçülen gerçek süreye göre bölge 1–3 ödül/fiyat/seviye eşikleri; risk cezalarını 330–450 sn bağlamında yeniden dengele.
- **E3:** Beceri olayları için antifarm, nitro temel dolum, ısı ve build etkileşimleri.
- **E4:** AI temas, savunma, geçiş; ödül ve hasar ekonomisini rakipli yarışa bağla.

> Bu belge bir denge hedefidir; kazanma oranı veya oynanabilirlik henüz kanıtlanmış değildir.

## Cem kararı — 2026-10-27: zaman cezası yerine gövde baskısı
- Riskli/ölümcül yarış başarısızlığında boss sayacından 45/90 saniye silinmesi **kaldırılacak**; önceki tablo artık hedef tasarım değildir.
- Süre hedefli yarışta hedef süre aşıldığı anda görsel kırmızı tehlike durumu başlar; hedefin üzerindeki **her tam saniye için 1 gövde** kaybı (delta-time tabanlı, FPS bağımsız). Yarış bitene veya araç pert olana kadar sürer.
- Zarar doğrudan koşu gövdesine işlenir, sonraki yarışa taşınır ve tamir ekonomisine girer. Hasar tetikleyen pasifler/para/enerji ile sonsuz kaynak üretimi engellenir; zaman aşımı hasarı çarpışma sayılmaz.
- Süre hedefi ile boss geri sayımı farklıdır. Bölge boss sayacı bittiğinde boss'a geçiş kuralı korunur; yarışın kendi süresi aşıldığında gövde baskısı işler.
- Drift puanı hedefi ve rakibi önce bitirme düellosu için süre sınırı/sonlandırma kuralı ayrı tanımlanmalı; doğrudan zaman bazlı yarış kodu bütün türlere uygulanmamalı.
- Testler: 0,99 sn hasarsız; 1,00 sn −1; 10 sn −10; 60/120 FPS aynı; gövde 0'da pert; yarıştan çıkınca hasar durur; pasif kaynak farmı yok; kırmızı ekran yalnız zaman aşımında.
