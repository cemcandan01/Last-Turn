# Son Codex işi: 0.8.13 MUTANT DEV drift ölçümü — PR #33

- **Sahip:** Codex; dal `codex/mutant-drift-telemetri`; görev `docs/isler/LT-SYS-007-mutant-dev-drift-tanisi.md`; PR [#33](https://github.com/cemcandan01/Last-Turn/pull/33).
- **Kapsam:** Fizik değiştirmeden DEV drift yarışında giriş açısı, kontrol edilebilir açı, karşı direksiyon, hazırlık ve spin soğuması görünür; DEV atölyesinden aç/kapat. Normal HUD'da drift açısı gösterilmez.
- **Test:** Hedefli birim + Playwright başarılı (GitHub Actions 40720719293); tam MUTANT alanı, tip/lint/biçim başarılı (40721212555). iPhone gerçek sürüş hissi ve görsel uyum manuel test gerektirir.
- **Sınırlar:** Normal MUTANT, kariyer drift, serbest sürüş ve `master` aynı. **Sonraki tek adım:** iPhone'da stok araç ile drift paketli aynı aracın giriş/limit ve kontrol hissini karşılaştır.

# Son devir: 0.8.12 denemede — MUTANT drift yarışında her araç drift yapabilir

- Claude / gelistirme. Cem: her araç drift yarışında drift yapabilmeli; driftte kalmak upgrade'le kolaylaşmalı, uygunsuz araçta zor ama mümkün. Kart LT-SYS-006 Revize 2; ölçüm `docs/denge/2026-10-28-mutant-drift-tutma.md`.
- `src/fizik/ortak.ts` (yalnız `driftYarisi`): tam direksiyon + gaz tutma girişi (`zorlama`), destek gücü drift uygunluğuna bağlı (`destek`). Kariyer/serbest sürüş değişmedi (kariyer testi geçti).
- Yerel: kontrol temiz (2 eski uyarı), npm test 435/435, alan mutant 21/21. Cem kararı: kolay drift yapan araç kolay yapsın (araçların güçlü olduğu tür farklı olabilir); şart yalnız her aracın drift yapabilmesi. Açık: cihazda his.
- Sonraki tek adım: Cem /dev/ 0.8.12'de uygunsuz bir araçla (ör. Gümüş Serçe, Haki Keçi) stok ve drift paketli drifti karşılaştırsın.

# Önceki devir: 0.8.11 denemede — MUTANT drift yarışında yön kilidi düzeltmesi

- Claude / gelistirme. Cem: "drifte girdikten sonra yön değiştiremiyorum, araba o açıda sabitleniyor". Neden: `driftPenceresi` yarış dalında hedef açı `giris` altına inemiyor, drift yönü girişte kilitleniyordu; yardım direksiyonu bu açıya çekiyordu. Düzeltme (`src/fizik/ortak.ts`, yalnız `driftYarisi`): alt sınır 0, `bt < giris/2` drifti bitirir, kıç öbür yana geçince yön döner. Kariyer/serbest sürüş değişmedi.
- Test: `mutant-drift-test.test.ts` tam fizikle ters direksiyon senaryosu (düzeltmesiz kalıyor, düzeltmeyle geçiyor). npm test 434/434, alan mutant 21/21. Açık: cihazda his; açı/yardım dengesi ölçülmedi.
- Sonraki tek adım: Cem /dev/ 0.8.11'de drift geçişlerini denesin.

# Önceki devir: 0.8.10 denemede — Codex drift atölyesi (#31) + canlı DEV paneli (#32)

- Claude / gelistirme (Cem: "canlıya çıkarma, teste yolla"). Regresyondaki 0.8.9 canlıya çıkarılmadı; `regresyon` dalı ve durum.json olduğu gibi (onay-bekliyor). Bu sürüm ondan sonraki işleri içerir.
- #31 ve #32 sürüm artırmadan birleşmişti; 0.8.10 yapıldı. Birleşme sonrası `kariyer.test.ts` 2 kalış: `driftYarisi` bütün `dp` yarışlarında (kariyer dahil) açılıyordu. Düzeltme: `src/oyun/surus.ts` yalnız `yaris.EV.mutant` iken; kariyer drifti eski ölçülmüş fizikte. İmza yardımcısı kapalı bayrak satırını ayıklar.
- `tests/e2e/duman.mjs` test sunucusu `/dev/` önekini köke eşler (DEV senaryosu `/dev/?mutantTest=1`e geçince 404 veriyordu).
- Yerel: kontrol temiz (2 eski uyarı), npm test 433/433, alan mutant 21/21. Açık: drift his/dengesi ve MUTANT_REFERANS yeniden ölçümü (LT-SYS-006), iPhone 13 cihaz.
- Sonraki tek adım: Cem /dev/ 0.8.10'da DEV paneli ve MUTANT drift yarışını denesin.

# Son devir: MUTANT drift deneme atölyesi ve sandık revizyonu — Codex dalında, inceleniyor

- **Codex / codex/mutant-drift-laboratuvari** (taban gelistirme 5a57aa6), görev kartı `docs/isler/LT-SYS-006-mutant-drift-laboratuvari.md`. Cem'in 28 Ekim isteği; kullanıcı henüz test etmedi ve gelistirme/master'a birleşmedi.
- Eklenen: yalnız yerel veya `/dev/?mutantTest=1` ile 3/3,5/4 dakikalık boss süresi, pasif/skill/seviye/parça seçebildiği ve tek tıkla kurulumu sıfırlayabildiği laboratuvar, doğrudan drift yarışı, yarıştan dönüp tekrar kurma, testte 1–3. bölge atlama. Normal koşu süresi korunur.
- Drift yarışı: serbest sürüşten ayrı ve modifiyeyle değişen 9–17° giriş açısı ile 0,1–0,2 sn hazırlık, otomobil stok karakteri/diferansiyel/açı kiti/drift ayarlarından kontrollü açı tavanı, aşımda spin ve kombo kaybı; diğer yarış tiplerine yeni mekanik henüz eklenmedi. **Gerçek sürüş dengesi ve tüm 3. bölge hedefleri ölçülmedi.**
- Sandık: açılışta bir rastgele ödül, al/reddet, alınmış veya başka açık sandıkta teklif edilmiş olanı diğer sandık sunmaz; eşsiz ödül havuzu bitince kaynak ödülü (para/tamir/enerji); görünür minimap ve ışık kuleleri yerine gizli 3B model. Bilinen yarış uzmanlığı olan upgrade kartında yarış rengi ve ikon; genel kartlar nötr.
- Doğrulama: birim/e2e testleri yeni sandık akışı için güncellendi, drift testleri yazılıp mutant alan koşucusuna kaydedildi; temel 75d4d7 test paketi başarılı, en son commitler için CI tekrarı gerekiyor. Tam kapsam ve kullanıcı kabulü görev kartında. **Claude aynı dosyalarda paralel kodlama yapmasın.** Sonraki adım: PR ve CI sonuçlarına bakıp hataları gider, cihazda drift hissini ve sandık keşfini dene; sonra kontrollü biçimde devral.

# Son devir: MUTANT skill hissi + açık dünya yol ağı (LT-SYS-005) — PR'da

- Claude / claude/mutant-skill-his (taban gelistirme 8817dd3 + Codex PR #29). Kart docs/isler/LT-SYS-005-mutant-skill-his.md.
- Denetim: kanca pist noktasında 100 km/sa'te 0,57 sn'de kopuyordu, açık dünyada hiç çalışmıyordu; Dutchman 1,5 sn yolda 0 m fark; perksiz koşuda enerji hiç dolmuyordu. Düzeltme: halat kayması + yol ağına tutunma, temel sürüş enerjisi (drift 2,5/sn), Dutchman 2,5/3/3,5 sn; efekt+ses (cizim/beceri-efekt.ts); 3 yuvalı HUD + neden; Çorak'a 8 asfalt yol (dunya/yollar.ts).
- Yerel: kontrol temiz, npm test 415/415, tarayıcı beceri-his 7/7, beceri 6/6. Regresyon Cem isteğiyle kesildi (392 geçti; 2 garaj perf kalışı yük kaynaklı, tek başına geçti).
- Açık: nitro sıklığı temel enerjiyle arttı (Cem), Dutchman engel içinden geçsin mi (Cem), iPhone 13 gerçek cihaz.
- Revize 1: pist kesme cezası (atlanan/10 gövde, hayalet de yer) + Dutchman katı nesnelerden geçer. Alan mutant 19/19, yarista-reset 3/3. Açık: kariyerde kesme cezası (şimdi yalnız uyarı).
- Sonraki tek adım: Cem PR #30'u incelesin; birleşince denemeye 0.8.8.

## Önceki iş: MUTANT sistemik skill mimarisi (LT-SYS-004) — 0.8.7 denemede

- Claude / claude/mutant-skill-mimarisi (taban gelistirme 8b036df). Kart docs/isler/LT-SYS-004-mutant-skill-mimarisi.md; kural ALANLAR "MUTANT → Skill sistemi".
- En çok 3 skill; skill'ler ortak olaylarla (HasarVerildi, YakinTakip, NearMiss, KonumEtkisi, DurumUygulandi, KorumaEngelledi) birbirini tanımadan çalışır: saf yürütücü src/cekirdek/beceri.ts, enerji yine mekanikler.ts. Grappling Hook, Flying Dutchman, Risk Taker, Slipstream Engine; seviye/skill eklentisi/evrim ayrı; 3 yeni enerji pasifi. Drift kaporası kilitli (tohum+etkinlik+deneme). Fiziğe tek isteğe bağlı giriş FizikBaglami.dis (yokken birebir aynı; kariyer imzası ayıklar).
- Yerel: kontrol temiz; npm test 402/402; alan mutant birim 80/80 + matris/plan; tarayıcı mutant 14/14, rakip 11/11, beceri 6/6; görüntü tests/cikti/beceri-hud.png (844×390). Ölçüm: kanca Sv3 1,5 sn'de farkı 28,3→15,8 m kapatır, ışınlanma 0; ekonomi döngüsü kendini beslemiyor (tests/cikti/beceri-ekonomi.json). iPhone 13 gerçek cihazda denenmedi.
- Açık: araç-araç çarpışması (Carpisma olayı/çarpışma hasarı hazır, üretici yok), YZ'nin skill kullanması, havuzun kalanı, ralli/drag zaman aşımı gövde erimesi (Codex dalındaki Cem kararı), kaporada drift puanına bağlı ek para. Cem'in mesajı §10'da kesik geldi.
- PR #28 birleşti (gelistirme d86bd72; kaynak 22af3a4). Denetim 40558110357 + 40558096290 başarılı (ilk koşu 40556618708: MUTANT e2e NİTRO denetimi rastgele tohumda Sert Nitro seçince enerji yetmiyordu; 22af3a4'te test o kartı seçmez). Yayın 40558864694 (derleme, /dev/ yayını, adres kontrolü) başarılı. Canlı 0.7.8 değişmedi. Bu ortamdan github.io'ya erişim yok (proxy 403); adres denetimi CI'da.
- Sonraki tek adım: Cem /dev/ 0.8.7'de PR #28'deki 5 deneme kabul maddesiyle oynasın (kanca düelloda, hayalet, Risk Taker drift etkinliğinde, kapora kartı).

## Önceki iş: MUTANT A3 ilk YZ rakip (issue #22) — 0.8.6 denemede

- Claude / claude/mutant-a3-rakip (taban gelistirme 9f92589, PR #24 dahil). Kart docs/isler/LT-SYS-003-a3-rakip-yz.md; ölçüm docs/denge/2026-10-27-rakip-olcum.json.
- Bölge 1 asfalt etkinliği = Yeşil Vadi'de 2 turluk düello; tek YZ rakip (src/yz: çizgi/hız planı, kişilik, pilot, yarışçı; oyun bağı oyun/rakip.ts) oyuncunun stok başlangıç aracıyla, aynı fizikte yalnız gaz/fren/direksiyonla. Güvenli→Çaylak, Riskli→Deneyimli. Çarpışma yok; ışınlanma/rubber-band yok.
- Yerel: kontrol temiz, npm test 376/376, alan mutant 11/11 + hud 4/4. Ölçüm: 50/50 düello bitti, 0 takılma/pist dışı/spin; deneyimli 44,0 / çaylak 49,0 sn uçan tur; tohum tekrarı birebir; sert taşma 16/20 (açık soru: rakibe pist dışı dönüş kuralı). iPhone 13 gerçek cihazda ölçülmedi.
- PR #26 birleşti (gelistirme 3cf10af; kaynak 82727a7). Denetim 40427125277 + 40427117424 başarılı (ilk koşu 40426397044 MUTANT e2e NİTRO beklemesi yavaş CI'da kaldı, 82727a7'de sağlamlaştı). Yayın 40427799983 (derleme, /dev/ yayını, adres kontrolü) başarılı. Canlı 0.7.8 değişmedi.
- Sonraki tek adım: Cem /dev/ 0.8.6'da kart/PR'daki 5 deneme kabul kriteriyle oynasın; sonra issue #25 ya da geçiş/savunma taktiği (Cem'in sırası).

## Önceki iş: MUTANT A2 (issue #19) 0.8.5 denemede

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
