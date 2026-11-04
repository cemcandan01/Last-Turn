# P1 — ana menü ve kariyer denemesi

1. Unity menüsünde **Last Turn → Ana Menüyü Aç**, ardından **Play**. Ana menü görünür. Game alanı darsa sekmesine sağ tık → Maximize; serbest boyutlu önizleme yazıyı küçültmez.
2. Oyuncu kaydını değiştirmeden denemek için **Test / Geliştirici → Ayrı test profilini aç**. Bu mevcut test profili kariyere para aktaramaz. Ana Menü düğmesiyle geri dön.
3. **Garaj / Mağaza**: sahip olunan aracı seç, gerekiyorsa modifiye et. **Ana Menü → Kariyer / Yarışlar → Asfalt → gp_1 → Yarışı Başlat**. Kilitli pist erişim nedenini açıklar; sınıf bütçesi aşılırsa mevcut TS kuralıyla ödülsüz deneme olur.
4. W/S gaz-fren, A/D yön, Space el freni. **Duraklat / Esc** ile yarış/sürüş durur; devam, yeniden başlat, kariyer/garaj/ana menü dönüşü vardır. Drag E/Q kullanır; bu daha önce kabul edilen TS farkıdır.
5. Yarış bitince sonuçtaki yıldız, XP ve para ile **Kariyere dön**. Kazanç mevcut ödül servisiyle kayda işlenir. Daha kötü tekrar en iyi yıldızı düşürmez. **Profil** ekranında ad (en çok 20 karakter), yarış/hedef, toplam yol ve en çok kullanılan araç bulunur.
6. **Kaydet**, sonra Play'i kapat ve yeniden aç. Aynı profilin adı/XP/parası/yıldızları/kurulumu korunur. Test profili kullanıldıysa yeniden Test / Geliştirici'den o profili aç; açılış varsayılanı oyuncu profilidir. Oyuncu uygulamasında **Oyundan çık** kaydeder ve kapanır; Editor'da çıkış için Play'i durdur.

Kısa otomatik kontrol: **Last Turn → P1 Kariyer Kısa Play Doğrulaması**. Geçici ve bağımsız bir profilde gerçek beş yarışı doğrulama sürücüsüyle bitirir; duraklatma, yarım yarış, klavye ile GT sürüşü, ödül/kilit/profil ve iki gerçek Play oturumunda yeniden açmayı kontrol eder. Normal oyuncu dosyalarının hash'leri değişmemeli. Bu, Cem'in manuel oynanış kabulünün veya bütün kupaların manuel sürülmesinin yerine sunulmaz.

Sayısal kontroller: `node Unity/Validation/export-career-flow.mjs --check`, `.NET --career-flow`, `--garage-storage`, `--race-session`. Son Editor kanıtı: `node Unity/Validation/check-career-flow-proof.mjs`.

P2–P5 özellikleri (açık dünya/Mutant/YZ/skill/ses/mobil vb.) P1'de varmış gibi gösterilmez; tam aktarım kartında eksik kalır. P1 sonrası yeni onay olmadan P2 başlatılmaz.
