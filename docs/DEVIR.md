# Son devir: yakın takip kamerası 0.7.7

- Codex / codex/kamera; kart docs/isler/2026-10-26-yakin-takip.md. Taban mesafe 9 → 6,8 m, hız eki 3 → 2 m; yükseklik 1,7 m, açı 0,25 rad. Uzak/garaj/menü/kaput/kokpit korunur.
- Kaynak ef5803f; CI: https://github.com/cemcandan01/Last-Turn/actions/runs/40238496618. Yalnız kamera alanı ve iPhone 13 yatay görsel kanıtı; tam regresyon değil.
- Sonraki: deneme yayınını doğrula; canlı çıkış regresyon + Cem onayı ister.

## Önceki iş: kariyer gelişimi 0.7.6 denemede

- Codex / codex/kariyer tamamladı. Kart docs/isler/2026-10-25-kariyer-uygulama.md. Kaynak 1fb87cd; CI 40227251363 başarılı: 31/31 alan, 91 seçilen birim + 11 tarayıcı bölümü. Tam regresyon değildir. 0.7.6 birleştirmesi 95ba863; Yayın 40227752816 başarılı. Adres kontrolü kök 0.6.8, /dev/ 0.7.6 doğruladı. Canlı 0.6.8 değişmez.
- 40 yarış sabit D200/D250/D400/C500/B600/açık999 bütçesinde. Üstü ödülsüz deneme, ayrı rekor/hayalet; yeni kariyer rekoru kariyer1_ ön ekinde, eski rekorlar profil/bulutta korunur. Bitiriş tekil.
- Normal motor 8/16/28%; büyük dönüşüm pahalı. Net kategori yatırım kredisi, süreye normalize para/XP, aynı türde iki yıldızla erişim alternatifi; mevcut XP/para/sahiplik/yıldız silinmez. Otomatik bileşik + K1/K2/K3 kalite.
- docs/DENGE.md temel; oyun/kariyer.ts sözleşme. Ölçüm raporları docs/denge/2026-10-25-kariyer-olcum.json (40 pist) ve yatirim-olcum.json (15 örnek). Yeni araç/pist/parça/fizik alanları ölçüm imzası + fiyat sözleşmesini koşar; yalnız etkilenen ölçüm yenilenir. İnsan keyfi/başarı oranı otomasyonla doğrulanmış değildir.
- Gelistirme 0.7.2–0.7.5 drift bonus, drift2 rekor, kerb ve 1 sn sonrası sayaç işleri korundu; yeni kuralla 8 drift hedefi + 3 yatırım örneği yeniden ölçüldü. 32 zamanlı pistte kuvvet/kinematik aynı olduğu kanıtlanıp başarılı ölçüm yeniden kullanıldı.
- Seviye penceresinin sonuçtan sonra garaj/sürüşü kapatması ve bonusun direksiyon alanıyla çakışması düzeldi. Garaj mevcut aracı geliştirmeyi önerir; sınıf/puan büyük, motor düğmesi altında kalır.
- Sonraki: Cem denemede oynasın, gerekirse ince ayar; canlı çıkış ancak regresyon + Cem onayıyla. Konu/deneme gönderiminde yeniden onay isteme. Önceki canlı kanıtı docs/isler/2026-10-25-canli-esitleme-regresyon.md.
