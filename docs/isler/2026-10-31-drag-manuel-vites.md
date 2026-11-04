# Drag'e özel manuel vites ve kalkış — 31 Ekim 2026

## İstek ve kabul (Cem)

TS'de manuel şanzıman yok; mevcut sürüşü koruyarak yalnız drag'e özel beceri: oyuncu kalkış devrini yönetir, vites zamanlaması gerçek devir/tork eğrisi/oran/çekişle sonucu etkiler; “mükemmel vites” bonusu yok; ayrı debriyaj düğmesi yok (klavye + ileride dokunmatik); anlaşılır devir göstergesi ve vites uyarısı, otomatik vites yok; oturum, sonuç, rekor ve hayaletle bağlı; otomatik drag referans olarak korunur; drag dışı TS–C# eşdeğerliği korunur.

1. Drag dışında vites girdisi etkisiz (bit düzeyinde); otomatik dal değişmez.
2. Uygun zamanda vites erken/geç/hiç vitesten hızlı; fark yalnız fizikten.
3. Kalkış devri düşük/bant/yüksek farkı ölçülür; reddedilen istekler ve kesici sınanır.
4. Hayalet vites girdileri ve kalkış devriyle bit düzeyinde tekrar eder.
5. 8 drag pisti manuel vitesle biter; Unity'de dg_1 oyuncu tarafından tamamlanabilir.

## Sahiplik / Git

Sahip/uygulayıcı Claude; dal `claude/unity-drag-manuel-vites` (taban `fcac30e`). Yalnız yerel commit.

## Tasarım

- `PowertrainParameters.ManualGearbox` yalnız drag etkinliğinde açılır (`GarageRace.Prepare`). Açıkken otomatik vites bloğu çalışmaz; oyuncu isteği (`DrivingInput.Shift` +1/−1) yalnız önceki geçiş bitmişken uygulanır; geçiş süresi (yukarı 0,12 sn, aşağı 0,1 sn, bu sırada tork yok) otomatikle aynı. Sınır dışı/geçiş sırasındaki istek reddedilir (sayılır). Kesici: tork eğrisi `u ≥ 1,02`'de sıfır (mevcut fizik).
- **Kalkış:** geri sayımda araç durur (TS gibi fizik donuk) ama motor gazla serbest devirde tutulur (`PreRev`; hedef rölanti + gaz × kesici, hız 3/sn). Yeşil ışıkta debriyaj bırakılır: kayan debriyaj devri teker devrine ~0,25 sn'de iner (`EngageRate` 4/sn), yetişince kavrar ve motor teker devriyle döner. Kalkış devrinin etkisi bu kayma süresinde tork eğrisinden; patinaj lastik fiziğinden. Ayrı debriyaj düğmesi yok.
- **Gösterge (otomatik vites yok):** `DragGearAdvisor` — geçiş devri: bir üst vitesin teker torku mevcudunkine eşitlendiği ilk devir (tork eğrisi + oranlar; yoksa kesici); kalkış bandı: tork tepesinin %95'i. HUD: devir çubuğu, vites, yeşil kalkış bandı (geri sayımda), sarı vites bölgesi, uyarı (KALKIŞ HAZIR / DEVİR DÜŞÜK / DEVİR YÜKSEK / VİTES ↑ / KESİCİ / DÜŞÜK DEVİR). Klavye: E yukarı, Q aşağı; geri sayımda W ile devir. Dokunmatikte iki düğme + gaz pedalı aynı girdiye bağlanır.
- **Kayıt/hayalet:** girdi kaydı biçimi 2 (bayrak 8 yukarı, 16 aşağı; biçim 1 okunur). Hayalet şanzıman kipini ve yarış başındaki motor durumunu (gaz, devir, tutma devri) saklar.
- Geri sayım Unity'de artık sabit 1/60 adımla sayılır (TS kare süresiyle; süre aynı 3 sn).

## Kanıt (.NET, gerçek fizik; `tests/cikti/unity-yaris/drag.txt`)

dg_1 kariyer aracı, norm yardım, klavye gazı:

| Senaryo | Süre | Tuzak | İlk 20 m |
|---|---|---|---|
| Otomatik (TS referansı) | 8,783 sn | 126 km/sa | 2,250 sn |
| Manuel, gösterge noktasında vites + bant kalkışı | 8,833 sn | 126 | 2,267 |
| Erken vites (%75) | 9,167 sn | 120 | 2,317 |
| Geç vites (kesicide 0,25 sn) | 8,933 sn | 125 | 2,267 |
| Hiç vites | 13,633 sn | 56 | 2,267 |
| Kalkış rölantide | 8,933 sn | 125 | 2,367 |
| Kalkış kesicide | 9,617 sn | 125 | 2,933 |

- Manuel en iyi hâliyle otomatikten 0,02–0,05 sn yavaş (aynı geçiş süreleri; bonus yok). 8 drag pistinin hepsi manuel bitti; yıldızlar otomatikle aynı (dg_1 3★, dg_2 2★, dg_3 1★, dg_4 3★, dg_5 2★, dg_6 1★, dg_7 3★, dg_8 2★).
- Patinaj: kariyer aracı hiçbir devirde patinaj yapmıyor (kayma 0,03). Klavye gazında TS'nin “tuşla kalkış” çekiş sınırı da geçerli. Güçlü araç 9 (1200 hp), real, analog gaz: kalkış devri yükseldikçe ilk 20 m 2,267 → 2,050 sn, kayma 0,03 → 0,04. Lastik/tahrik fiziği büyük patinaja izin vermiyor; bu TS fiziğinin sonucu, değiştirilmedi.
- Reddedilen istekler: geçiş sırasında tekrar yukarı (2 red), 1. viteste aşağı, 6. viteste yukarı; yüksek hızda düşürme devri kesiciye çıkarır, tork kesilir (ceza/hasar yok).
- Otomatikte vites girdisi bit düzeyinde etkisiz; hayalet manuel sürüşü bit düzeyinde tekrar ediyor. `--drag` 20 koşul.
- Regresyon: varsayılan teker/gövde/motor 18 PASS, `--assists` (TS 24 durum), `--race-session`, `--race-drive` (gp_1 2:11.8 aynı) geçti.
- Unity: derleme ve editor (35 Core)/katalog/pist kanıtları geçti (UTC 14:40). **Kısa Play doğrulamaları koşulmadı:** Cem bilgisayarda başka bir tam ekran oyun oynarken Unity arka plandaydı; odak zorla alınmadı. İlk deneme GT/Arazi'de zaman aşımına uğradı (Unity arkada, Play döngüsü kısıldı). RacePlay (5 tür) dg_1'i artık manuel vitesle ve bant kalkışıyla sürer.

## Açık

- **Unity Play bekliyor:** Last Turn → GT, Arazi, Garaj ve **Yarış Kısa Play Doğrulaması (5 tür)** menüleri; sonra `check-prototype/terrain/garage/race-proof.mjs`.
- Kalkış bandı tork tepesi yaklaşığıdır; güçlü araçta daha yüksek kalkış devri daha hızlı çıkabilir (ölçüldü). Bant metni “tork tepesi”, “en iyi” değil.
- Dokunmatik düğmeler henüz yok (girdi hazır).

## Sonraki tek adım

Unity Play doğrulamaları; ardından Cem'in dg_1'de klavyeyle manuel denemesi (`Unity/YARIS.md`).
