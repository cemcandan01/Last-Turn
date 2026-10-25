# Last Turn: ortak geliştirici rehberi

**Cem bu projeyi Claude ve Codex ile dönüşümlü geliştirir.** Kota bitince diğerine geçilir; ortak bellek sohbet değil bu repodur. Önce `docs/DEVIR.md`, sonra işin görev kartı okunur. İki araç da aynı kararları ve yayın akışını kullanır.

## Her işe başlarken

1. `git fetch origin`; görevde belirtilen konu dalını ve son commit'i doğrula. Yeni iş `origin/gelistirme`den konu dalına açılır. Başka ajanın işini ezme; aynı görevde tek aktif uygulayıcı olur.
2. `node scripts/calisma.mjs baglam <alan>` kısa başlangıç özeti verir. Yalnız görev kartını, `docs/ALANLAR.md`de kendi bölümünü, ilgili `docs/notlar/<alan>.md`yi ve gerekli kodu oku. Bütün rehber/skill/geçmişi topluca yükleme.
3. İstekten 3–5 gözlenebilir kabul ölçütü çıkarıp `docs/isler/`de tek kart tut. Teknik ayrıntıları kullanıcıya yazdırma. Sonucu değiştiren eksik bilgi varsa soruları tek turda topla; açık küçük işte onay bekleme. Revize aynı karta eklenir.

## Değişmez kurallar

- TypeScript + Vite + Three.js; iPhone 13, yatay ekran. Kullanıcı metni, yorum ve commit Türkçe. Oyun arayüzünde emoji/gerçek marka logosu yok.
- Oynanış, tasarım, mimari ve kayıt uyumu kararları korunur. Ayrıntılar `docs/GELISTIRICI-AYRINTILARI.md` → “Genel kurallar ve tuzaklar” ve “Kullanıcının kararları”; yalnız işe değen kısımları oku. Fizik/çekirdek saf, fizik sabit adımlı ve belirlenimci kalır.
- Cem “mesela/örneğin” diyerek bir sorun gösterdiğinde bunu genel davranışın örneği kabul et; aynı sorunu bütün ilgili araç/ekran/türlerde araştır. Yalnız örneği düzeltip genel isteği tamamlanmış sayma; kapsanan öğeleri görev kartında ve testte belirt.
- İş kapsamı dışında oynanışı değiştirme. Büyük/öznel tasarımda önce referansı ve beklenen örnek davranışı netleştir; test geçmesi görsel beğeninin kanıtı değildir.
- Konu dalı → ilgili kontroller → `gelistirme` → deneme yayını. Oyun değişikliği denemeye girerken yama +1; yalnız süreç/belge değişikliğinde oyun sürümü artmaz. `master`a canlı çıkış regresyon ve kullanıcı onayı ister. Rebase/force-push yok.
- Testi kabul ölçütleriyle erken tasarla; geliştirme turunda normal durum + kritik sınır + önceki hataya odaklan. Küçük revizede tam alanı tekrarlama; risk bazlı kapsam/model seçimi `docs/ORTAK-CALISMA.md`de.
- Aynı commit, ortam ve kapsamın başarılı doğrulamasını yeniden kullan; kod/bağımlılık/hedef dal değişince etkilenen kontrolleri yenile. Test atlama, bozuk testi kapatma, boş test koşumunu başarı sayma. Ağ engelini tekrar indirerek çözmeye çalışma; kanıtı kaydet ve uygun CI ortamını kullan.
- Küçük işe otomatik ajan zinciri kurma. Bağımsız veya riskli işte sınırlı keşif/test/denetim rolleri kullan; aynı dosyayı eşzamanlı düzenletme. Ana bağlama tam log yerine sonuç ve hata satırlarını al; ham kanıt dosyada/CI bağlantısında kalsın.
- Bitirirken/devirde görev kartına sahip, dal, son SHA, test kapsamı+sonuç+kanıt, açık engel ve tek sonraki adımı yaz; `docs/DEVIR.md`yi güncelle. Yerel/push/CI/deneme adresi/canlı durumlarını ayrı doğrula.

## Gerektiğinde aç

- Ortak çalışma, kabul ölçütü, devir, maliyet ölçümü: `docs/ORTAK-CALISMA.md` (**bu konularda eski sohbet/skill alışkanlıklarından önceliklidir**).
- Alan kuralları: `docs/ALANLAR.md`; HUD: `docs/HUD.md`; dosya haritası: `docs/HARITA.md`; mimari: `docs/MIMARI.md`.
- Dallar/yayın: `docs/SUREC.md`; test/yayın yordamları: `.claude/skills/oyun-test/` ve `surum-yayinla/`. Yalnız ilgili yordamı yükle.
- Claude'a özgü araçlar yalnız o ortamda varsa kullanılır. Diğer ortamda mevcut araçlarla aynı amacı yerine getir; olmayan merkez/bildirim/sohbet silme işlemini yapılmış sayma. Zamanlanmış görev gerçekten kurulmadıkça gece regresyonu otomatik vaat edilmez.
- Kullanıcıya kısa sonuç ver; araştırma/kurulum açıklaması istediyse gerektiği kadar ayrıntı ver. Kontrol ve test kodlarını model sohbetine kopyalamadan çalıştır.
