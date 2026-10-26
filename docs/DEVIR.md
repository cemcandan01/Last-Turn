# Son devir: MUTANT A2 (issue #19) 0.8.5 denemede

- Claude / claude/mutant-a2 (taban gelistirme 68b3da9). Kart docs/isler/LT-SYS-002-mutant-roguelite-tasarim.md §10; ölçümler docs/denge/2026-10-26-mutant-olcum-yagmur.json, -nitro-*.json, -nitro-ozet.txt.
- Nitro (NİTRO tuşu/N: 40 enerji, güç ×1,6, 2,5 sn, 4 sn soğuma), ortak olaylar HasarAlindi/RiskBasladi, sistemik güçler (Çarpışma Pili, Risk Kondansatörü, Nitro kalkanı), eklenti sandıkları (2 normal + 1 lanetli/bölge), nitro hissi (FOV, alev, ses), salt okunur mutantDurumu() (Codex HUD PR #20 için), yağmurlu boss referansı (yalnız Plaj Kros).
- Yerel: npm test 366/366; alan mutant 8/8, hud geçti; matris 696 kombinasyon, nitro payı ≤ %44. Açık: nitro enerji build'i bölge 2'de 14/29 pistte stok araçla geçer (Cem: kalsın mı, ×1,4 mü); drift ölçümünde nitro yok; rallikros bölge 3 tek yolla geçilir.
- 0.8.5 denemede: gelistirme 2358ab9; PR #21 birleşti (CI denetim 40410660885 başarılı; ilk kalış ölçüm JSON biçimiydi, af6de67'de düzeldi); Yayın 40410828298 (derleme/yayın/adres kontrolü) başarılı. Canlı 0.7.8 değişmedi.
- Codex PR #23 (UI V2, taslak, taban claude/mutant-a2) `mutantDurumu()` sözleşmesine uyuyor; atölye başlığını "ATÖLYE" yaptığı için e2e'deki `includes("Atölye")` denetimi o dalda güncellenmeli. Sonraki Claude işi: issue #22 (A2 denge kapanışı + A3 tek NPC düello).

## Önceki iş: MUTANT issue #16 denge 0.8.4

- Claude / claude/mutant. Kart docs/isler/LT-SYS-002-mutant-roguelite-tasarim.md §9; ölçüm docs/denge/2026-10-26-mutant-olcum.json (+ birlesik); referans src/oyun/mutant-denge.ts.
- Ölçüm (40 pist × 7 build) motor değişiminin tek başına baskın olduğunu doğruladı: MUTANT'ta satılmaz. Etkinlik risk kademesi (1★/2★/3★, ödül ×1/×2/×3,5, kaçırma süre cezası), bölge atölye stoğu, ölçülmüş boss hedefi (bölge 1 stok, 2 dengeli/uzman, 3 nadir+uzman; bölge 3 pisti tek yolun yetmediği 16 pistten), gövde hasarı/pert/tamir, kural pasifleri (Adrenalin, Cam top, Hurdacı, Kumarbaz, Son nefes).
- 0.8.4 denemede: 14b0548; Denetim 40347092291, Yayın 40347088798 başarılı. npm test 353/353, 5 alan 56/56. Açık risk: rallikros bölge 3 nadir motorla geçilir; drift referansı beceriyi ölçmez. Sonraki: Cem testi; PR #17 (Codex görsel) birleşimi.

## Önceki iş: MUTANT A1 (LT-SYS-002)

- Claude / claude/mutant. Kart docs/isler/LT-SYS-002-mutant-roguelite-tasarim.md §7-8; dal notu docs/notlar/mutant.md; kural ALANLAR "MUTANT".
- v1 (görev + Tutuş Darbesi) Cem testinde başarısız, kaldırıldı. A1: kötü araç + pasif → Çorak Topraklar'da etkinlik/atölye/boss işaretleri → boss geri sayımı (15 dk) → mevcut pistlerde tek turluk etkinlik (kariyer dışı) → XP/pasif, para/atölye → zorunlu boss (hava/gece, sıkı hedef) → bölge 2 ya da özet.
- Yerel: npm test 340/340; 9 alan 89 senaryo (garaj perf ölçümü yük kaynaklı kaldı, tek başına geçti). 0.8.3 denemede: 61fad1d; Denetim 40325792894, Yayın 40325798828 başarılı (0.8.2 CI kalışı yokuştaki etkinlik yeriydi, düzeltildi). Sonraki: Cem oynasın; A2 nitro + eklenti sandıkları.

## Önceki iş: MUTANT v1 0.8.1 denemede (LT-SYS-001)

- Claude / claude/mutant (tek sahip). Kart docs/isler/LT-SYS-001-sistemik-oynanis.md; dal notu docs/notlar/mutant.md; kural ALANLAR "MUTANT".
- Serbest sürüş menüden kalktı, yerine MUTANT: dünya → garaj → 3 perkten 1 → süreli görevler → özet. Tutuş Darbesi tek fizik etkisi (yerel `havaTutusu` çarpanı); yarışta 1. Ödül/XP/kariyer yok, rekor lt_mutant.
- Yerel: kontrol temiz, npm test 338/338, alan mutant+menu+garaj+hud+surus+hayalet+fizik 58/58. CI 40292640713 / 40292780668 başarılı. Matris 129 kombinasyon kırılmasız.
- 0.8.1 denemede: d85e09e; CI 40297645277, Yayın 40297650767 (derleme/yayın/adres kontrolü) başarılı. Canlı 0.7.8 değişmedi. Sonraki: Cem /dev/'de oynasın; zorluk/darbe hissine göre ince ayar; canlı çıkış regresyon + Cem onayı.

## Önceki iş: yakın takip kamerası 0.7.7

- Codex / codex/kamera; kart docs/isler/2026-10-26-yakin-takip.md. Taban mesafe 9 → 6,8 m, hız eki 3 → 2 m; yükseklik 1,7 m, açı 0,25 rad. Uzak/garaj/menü/kaput/kokpit korunur.
- Kaynak ef5803f; CI: https://github.com/cemcandan01/Last-Turn/actions/runs/40238496618. Yalnız kamera alanı ve iPhone 13 yatay görsel kanıtı; tam regresyon değil.
- 0.7.7 denemede: 0746c6f; Yayın 40238705321 derleme/yayın/adres kontrolü başarılı. /dev/ 0.7.7, kök 0.6.8. Sonraki: Cem yeni yakın kadrajı denesin; canlı çıkış regresyon + Cem onayı ister.

## Önceki iş: kariyer gelişimi 0.7.6 denemede

- Codex / codex/kariyer tamamladı. Kart docs/isler/2026-10-25-kariyer-uygulama.md. Kaynak 1fb87cd; CI 40227251363 başarılı: 31/31 alan, 91 seçilen birim + 11 tarayıcı bölümü. Tam regresyon değildir. 0.7.6 birleştirmesi 95ba863; Yayın 40227752816 başarılı. Adres kontrolü kök 0.6.8, /dev/ 0.7.6 doğruladı. Canlı 0.6.8 değişmez.
- 40 yarış sabit D200/D250/D400/C500/B600/açık999 bütçesinde. Üstü ödülsüz deneme, ayrı rekor/hayalet; yeni kariyer rekoru kariyer1_ ön ekinde, eski rekorlar profil/bulutta korunur. Bitiriş tekil.
- Normal motor 8/16/28%; büyük dönüşüm pahalı. Net kategori yatırım kredisi, süreye normalize para/XP, aynı türde iki yıldızla erişim alternatifi; mevcut XP/para/sahiplik/yıldız silinmez. Otomatik bileşik + K1/K2/K3 kalite.
- docs/DENGE.md temel; oyun/kariyer.ts sözleşme. Ölçüm raporları docs/denge/2026-10-25-kariyer-olcum.json (40 pist) ve yatirim-olcum.json (15 örnek). Yeni araç/pist/parça/fizik alanları ölçüm imzası + fiyat sözleşmesini koşar; yalnız etkilenen ölçüm yenilenir. İnsan keyfi/başarı oranı otomasyonla doğrulanmış değildir.
- Gelistirme 0.7.2–0.7.5 drift bonus, drift2 rekor, kerb ve 1 sn sonrası sayaç işleri korundu; yeni kuralla 8 drift hedefi + 3 yatırım örneği yeniden ölçüldü. 32 zamanlı pistte kuvvet/kinematik aynı olduğu kanıtlanıp başarılı ölçüm yeniden kullanıldı.
- Seviye penceresinin sonuçtan sonra garaj/sürüşü kapatması ve bonusun direksiyon alanıyla çakışması düzeldi. Garaj mevcut aracı geliştirmeyi önerir; sınıf/puan büyük, motor düğmesi altında kalır.
- Sonraki: Cem denemede oynasın, gerekirse ince ayar; canlı çıkış ancak regresyon + Cem onayıyla. Konu/deneme gönderiminde yeniden onay isteme. Önceki canlı kanıtı docs/isler/2026-10-25-canli-esitleme-regresyon.md.
