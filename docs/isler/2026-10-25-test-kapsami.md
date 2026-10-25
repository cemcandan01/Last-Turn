# 2026-10-25-test-kapsami

- Sahip: Codex; dal: codex/kurallar; durum: yerelde tamam, ortak dala aktarılacak.
- İstek: test erken entegre kalsın; her geliştirmede uzun test eforu yerine kısa ama anlamlı kapsam; model seçimi açık olsun.
- Kabul: alan testinde mevcut senaryolar seçilebilsin; yanlış/boş seçim başarısız olsun; tam regresyon daraltılamasın; model önerisi gerçek araç seçimiyle karıştırılmasın.
- Uygulama: `--senaryo <id,...>`, isteğe bağlı `--liste`; risk bazlı test/model politikası ortak rehberde.
- Yerel kanıt: kurallar alanı 18/18 test (822 ms); tip/ESLint/biçim temiz. Oyun testleri bu süreç değişikliğinde tekrarlanmadı.
- Sınır: CI hâlâ ilgili alanın tamamını koşar; otomatik değişen-dosya seçimi veya model yönlendirici kurulmadı.
- Sonraki adım: kaynak CI ve ortak dala aktarımı PR'dan doğrula. Oyun sürümü artırılmaz.
