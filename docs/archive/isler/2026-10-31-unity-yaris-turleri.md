# Unity yarış türleri: rallikros, ralli, drift, drag oynanabilir — 31 Ekim 2026

## İstek ve kabul

Cem: 40 pist yalnız katalogda değil, türüne uygun fizik ve zeminle oynanabilsin. Rallikros/ralli bölge ve zemin kuralları, drift yarışının fizikle bağı, drag otomatik şanzımanla (manuel vites ayrı görev), sonra rekor/hayalet. TS–C# karşılaştırması, sınır testi, Unity kısa Play. GT/Arazi/Garaj/gp_1 korunur. Yeni zemin değeri/fizik kuralı yok.

1. Beş türün bölge dünyası (yükseklik, yüzey, ipucu, bölge kutusu, su birikintisi) TS ile aynı; 40 pistte.
2. Kariyer drift algısı ve drift yarışı açı sınırı TS ile aynı; fizik → oturum bağlı.
3. 40 pist gerçek fizikle bitirilebilir; temsilî beş pist Unity Play'de.
4. GT/Arazi/Garaj/gp_1 kanıtları geçer; fizik değişikliği yalnız su sağlayan dünyada.

## Sahiplik / Git

Sahip ve uygulayıcı Claude (claude-opus-5-5); Codex kotası dolu, ikinci ajan yok. Dal `claude/unity-yaris-turleri` (taban `745d5d3`). Yalnız yerel commit; bu kart birinci commit, rekor/hayalet ayrı commit.

## Yapılan

- `TrackWorld` beş tür: gp/dp (önceki), **rx** (rampalar `jumpH`; hw+1 dışı çim, çamur, asfalt aralığı, toprak), **rl** (doğal tepeler H0, yol merkez çizgisine yaslanır + rampa; hw+0,8 dışı çim/derin kar, çamur, kar, toprak; kendi bölge kutusu `c ± (ext/2+130)`), **dg** (şerit kutusu asfalt, düz). Su birikintileri `IVehicleWaterWorld`.
- **Su (fizik):** TS `carpismalar`ın “water” dalı Unity fiziğine eklendi. Referans noktası birikintideyse ıslaklık 1, yatay hız birikinti başına `exp(−1,2·dt·min(1, v/10))` (v adım başı). Su sağlamayan dünyada (GT/Arazi) adım aynen kalır (bit eşitliği korunur). Dekor/bariyer/sınır duvarı dalları yine yok.
- **Drift:** `RaceDrift.Detect` (TS `driftSkoru`, kariyer: havada değil, v > 10, |β| > 0,5; `DR.on` yardım kapalı), `GrassWheels` (TS `cimTeker`), `MaxAngle` (TS `driftYarisProfili.azami`). `RaceRun` her fizik adımından sonra drift bayrağı/β/hız/çim teker/direksiyon/sim zamanı/açı sınırını oturuma verir.
- **TS ↺ yeniden doğ** (`surus-tuslari.ts yenidenDog`): pist dışıysa ilk çıkış noktası, değilse en yakın pist izdüşümü; süre durmaz. `RaceSession.ManualReturn`, `RaceRun.Respawn`, HUD **Piste dön**.
- **Drag:** dg bölgesi + mevcut otomatik şanzıman; bitiş N−1, tuzak hızı. Manuel vites yapılmadı (ayrı kart: `2026-10-31-drag-manuel-vites.md`).
- Unity: `RaceTest` her etkinliği açar (`RaceData.Selected`); garajda **Yarışlar** listesi (40 etkinlik: tür, zorluk, hedef, en iyi yıldız, kilit, bütçe uygunluğu; `RaceViewModel.Events`); `RaceTrackVisuals` zemine göre şerit (asfalt/toprak/kar/çamur), su daireleri, rampalı/tepeli arazi; sahne kurucusu yeni malzemeleri mevcut sahneye bağlar (GUID korunur).
- Oracle: yükleyiciye `extraExports` (iç fonksiyonu dışa açar, gövde aynı) ve taklit kipinde `tests/yardimci/` yüklemesi. `export-race-types.mjs` → `Reference/race-types-0.8.18.json`. `export-race-session.mjs` artık her adımda TS'deki gibi `yerel.cx.kurulum = surusKurulumu()` yapar (önceden drift açı sınırı boş geliyordu; düzeltildi, oturum sonuçları değişmedi).
- Doğrulama sürücüsü: türe göre ayar, yokuşta en az yarım gaz, drift kipi (el freni + karşı direksiyon), takılınca TS ↺.
- CI: `export-race-types --check`, `--race-types`, `--race-all` (çalıştırılmadı).

## Kanıt

- `--race-types` **132.239 koşul**, en büyük fark 2,1e-14: 40 pist × 300 dünya adımı (yüzey dağılımı toprak 3.374, asfalt 6.941, çim 48.033, çamur 182, kar 331, derin kar 1.139; ipucu ve bölge kutusu birebir); su 8 durum (TS `carpismalar`'ın kendisi; 6 ıslak, yarıçap ±0,1 sınırı, iki birikinti); drift algısı 72 durum (v 9,99/10/10,01, havada); 15 aracın TS `startEvent` kurulumu (lastik, kilit, diferansiyel, drift yardımı) ve azami açı (33,9°–41,3°).
- `--race-all` gerçek fizik, kariyer aracı + yarış lastiği, doğrulama sürücüsü: **40/40 pist bitti** (`tests/cikti/unity-yaris/race-all.txt`). gp 8/8 (5 yıldızlı), rx 8/8 (3), dp 8/8 (0), rl 8/8 (4), dg 8/8 (8). Sürüşte görülenler: rx çamur ve rampadan havalanma, rx/rl su (ıslak adım), rl −20…+22 m tepeler, rl_6 kar/derin kar, dg tuzak 100–323 km/sa, dp gerçek kaymadan drift adımı ve puan.
- **TS içerik bulgusu (rl_3):** kariyer aracı 12 (Haki Keçi, 85 hp) 24 % yokuşta duruyor. Aynı noktada **TS fiziği + TS YZ sürücüsü de** kalıyor (en ileri ipucu 217/407; Unity 214–216). Araç 3 (Mavi Yıldız) TS'de 54,6 sn'de bitiriyor; Unity'de 1:08.4, 3★. Unity davranışı TS ile aynı; kural değiştirilmedi. Cem'e karar: kariyer aracı/pist dengesi.
- **rl_2:** sürücü bir kez devrildi, TS ↺ ile devam etti.
- Unity 6000.3.9f1 Play (UTC 11:33–11:34), son kodla: **Yarış 51/51** — gp_1 2:12.0 2★, rx_1 2:23.8 2★ (çamur + rampa), rl_1 0:58.4 2★ (12 adım ıslak, tepeler), dp_1 2:11.9 (121 drift adımı, 10 puan), dg_1 0:11.3 (tuzak 100 km/sa); her birinde TS görseli, başlangıç yüksekliği, 181 kare geri sayım, yıldız, ödül kayıtta (yeniden açınca, toplam 1.742); gp_1'de piste dönüş 361 adım ve TS ↺. Aynı koşuda GT 28/28, Arazi 23/23, Garaj 20/20; editor (33 Core), katalog, pist kanıtları geçti. Başlangıç aracı (10) garajın seçili aracı olarak kullanıldı.
- Regresyon: varsayılan teker/gövde/motor (18 PASS), `--gt-physics`, `--dirt-stability`, `--garage*`, `--tracks`, `--race-rules`, `--race-session`, `--race-drive`; `export-catalog/tracks/race-rules/race-session --check` geçti. `--catalog` (uzun) koşulmadı: katalog kodu/verisi değişmedi.

## Mevcut eksikler (TS işlevi kaldırılmadı)

- **Drift yardımı:** TS oyuncu yardım seviyesi drift desteğini (`as.dft`, `DR`) açar; Unity fiziğinde yardımlar kapalı (önceki karar). Driftte hızı koruyan destek olmadığından drift Unity'de TS'den zor; doğrulama sürücüsü drift yıldızına ulaşmadı (puan 0–82). Ayrı fizik görevi: `2026-10-31-unity-surus-yardimlari.md`.
- **Yardım seviyesi:** TS varsayılanı `real`, Unity garaj adaptörü `norm` kuruyor (ayar ekranı yok). Karar Cem'de (aynı kart).
- Dekor/ağaç/koni/kaya/bariyer çarpışması, bölge sınır duvarı, kerb sarsıntısı; geri sayım ışığı/sesi; rekor/hayalet (sonraki commit).

## Sonraki tek adım

Rekor ve hayalet sistemi (aynı dal, ayrı commit).
