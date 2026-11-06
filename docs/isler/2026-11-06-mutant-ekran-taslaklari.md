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

- Durum:
- Commit:
- Notlar / açık sorular:
