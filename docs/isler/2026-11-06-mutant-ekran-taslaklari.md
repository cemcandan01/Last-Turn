# Mutant koşu içi ekranları — F tasarım taslakları (6 Kasım 2026)

- **Sahip:** Codex (Cem: "mutant için tasarımlar oluşturmak için codex'e örnekler çıkarttır"). Görevi açan: Claude.
- **Dal:** `codex/unity-p7-garaj`, başlangıç `6113cc4`. Push/merge/yayın yok; yalnız yerel commit.
- **Tür:** tasarım taslağı (HTML). Unity kodu, oyun verisi, kural ve denge **değişmez**.

## Bağlam

P7'de onaylı F tasarımı (`docs/tasarim/ekranlar-f.html`) ana menü, garaj, mağaza, yarış hazırlığı, Mutant menüsü/başlangıç (§5a–d), profil, ayarlar, duraklatma ve sonuç için uygulandı. Mutant **koşu içi** ekranlarının onaylı tasarımı yok; bugün `Unity/Assets/LastTurn/Scripts/Prototype/MutantScreen.cs` içinde geçici IMGUI olarak duruyorlar. Cem önce örnekleri görüp seçecek, sonra Unity'ye uygulanacak.

## İstenen

`docs/tasarim/mutant-f.html` adlı tek sayfa: `ekranlar-f.html` ile aynı CSS/görsel dil (koyu cam paneller, turuncu vurgu, eğik tuşlar, Barlow/Barlow Condensed, sağ altta tuş ipuçları) ve Mutant'ın kırmızıya çalan tonu (§5a–d gibi). Arka planlar `docs/tasarim/pc/` görselleri. Her ekran için **iki seçenek (A / B)**, kısa açıklama ve klavye/fare akışı:

1. **Sürüş HUD'u (Mutant):** bölge, boss süresi, gövde, enerji, para, seviye, nitro, 3 skill yuvası (1/2/3), görev/işaret bilgisi. Mevcut F yarış HUD'u (panelsiz, `docs/HUD.md` §8) ile çakışmamalı.
2. **Etkinlik seçimi** (`Panel=="event"`): yarış etkinliği, risk seçenekleri, ödül.
3. **Atölye** (`shop`): parça stoğu, fiyat, satın al, tamir, stoğu yenile.
4. **Sandık** (`chest`): teklif, kabul/ret.
5. **Ödül / seviye seçimi** (`choice`): 3 seçenek ×2, değiştir (drop) durumu.
6. **Boss** (`boss`): boss adı, açıklama, zayıflık, tür; başla.
7. **Etkinlik sonucu** (`result`): kazanç ve devam.
8. **Koşu özeti** (`summary`): bölge, boss sayısı, rekor, Mutant menüsüne dönüş.

Her ekran gerçek metin ve değerleri kullanmalı: `Scripts/Core/MutantMenuModel.cs`, `Prototype/MutantScreen.cs`, `Prototype/MutantRuntime.cs`, `Resources/mutant-catalog.json`. Örnek değerler sahte ama oyundaki alan adlarına ve büyüklüklere uygun olmalı. Oyunda olmayan özellik/düğme önerilmez; eklenmesi gerekiyorsa ayrı "öneri" kutusunda belirt.

## Kabul ölçütleri

1. `docs/tasarim/mutant-f.html` tarayıcıda tek başına açılır; 8 ekranın her biri A/B seçenekli, 16:9 çerçevede.
2. Her ekranda klavye (Windows: ↑/↓/←/→, Enter, Esc, 1/2/3, N) ve fare akışı yazılı; Esc davranışı mevcut akışla tutarlı (Esc duraklatma açar).
3. Metinler Türkçe; emoji ve gerçek marka logosu yok.
4. Kullanılan her veri alanının kaynağı (dosya/alan adı) sayfada kısa bir tabloyla listelenir.
5. Unity, TypeScript ve oyun verisi dosyaları değişmez; yalnız `docs/tasarim/mutant-f.html`, gerekirse `docs/tasarim/pc/` altına yeni görsel ve bu kart güncellenir. Tek yerel commit, Türkçe mesaj.

## Sonuç (Codex dolduracak)

- Durum: HTML taslakları tamamlandı; Cem’in ekran bazında A/B seçimi bekleniyor. Çıktı: [mutant-f.html](../tasarim/mutant-f.html). Sekiz ekran × iki 16:9 yerleşim; iki ayrı üçlü teklif ve dolu skill yuvasında değiştir durumu; normal/lanetli sandık, süreli/zorunlu boss ve başarılı/başarısız sonuç örnekleri.
- Commit: Oluşturulamadı. Doğrulanan dal `codex/unity-p7-garaj`, başlangıç/HEAD `60dea55` (kartın tabanı `6113cc4` ardından kart commit’i). `git add -- docs/tasarim/mutant-f.html docs/isler/2026-11-06-mutant-ekran-taslaklari.md` ortak worktree git dizininde `index.lock: Permission denied` verdi. Fetch de `FETCH_HEAD: Permission denied` nedeniyle çalışmadı. Yerel dosyalar bırakıldı; push/merge/yayın yapılmadı. İzinli ortamda tek commit için önerilen Türkçe mesaj: `Mutant koşu içi sekiz ekranın F tasarım seçeneklerini hazırla`.
- Doğrulama: Yerel Edge/Playwright ile **27 kontrol geçti**; `file://` üzerinden 16 çerçeve, 9 durum seçimi, 1440 ve 800 piksel genişlikte 16:9 oranı/yatay taşma/tuş ipuçları güvenli alanı kontrol edildi; 34 PNG üretildi ve ilgili görüntüler görsel incelendi. Kanıt: `tests/cikti/mutant-f-proof.json`, `tests/cikti/mutant-*.png` (ignore edilen yerel çıktılar; commit ile taşınmaz). HTML için Prettier kontrolü geçti. İlk turdaki atölye B alt işlem/tuş ipucu yakınlaşması ve dar genişlikteki yazı ölçeklemesi düzeltildi; son kontrolde taşma yok. Bu belge/tasarım işi için oyun veya Unity regresyonu çalıştırılmadı.
- Kaynak doğruluğu: Karttaki dört dosya okundu; kaynak tablosunda görünür alanlar ve mevcut komutlar belirtildi. HUD enerji/skill ayrıntıları için ayrıca `MutantAbilityDriver.cs`, rekor için `MutantRecordStore.cs`, örnek fiyat/XP doğrulaması için `MutantRun.cs` kullanıldı. Gerçek katalog metinleri ve uygun büyüklükte temsili koşu değerleri var; yeni oyun özelliği eklenmedi.
- Notlar / açık sorular: Esc duraklatmayı açar; panel geri işlemi değildir. Mevcut IMGUI’de bulunmayan ok/Enter odağı ayrı “Öneri” kutusunda sunum eşlemesi olarak açıkça ayrıldı. Sonuç modelinde ayrı kazanım farkı yok; mevcut para/XP toplamı gösterildi. Yeni görsel üretilmedi; mevcut `pc/` arka planları kullanıldı. Unity/TypeScript/oyun verisi değişmedi; başlangıçtaki `_Recovery` dosyaları korundu. Kullanıcının dar dosya sınırı nedeniyle `docs/DEVIR.md` değiştirilmedi; devir kanıtı bu kartta.
- Uygulayıcı: Tek Codex oturumu; alt ajan/API/ek kredi yok. Kapasite ve ayrıntılı model bilgisi bilinmiyor. Bir tasarım turu, dar görsel düzeltmeler sonrası kontrol tekrarlandı; insan görsel kabulü henüz yapılmadı.
- Sonraki tek adım: Cem sekiz ekranın A/B tercihlerini bu taslak üzerinden belirlesin.
