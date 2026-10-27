# LT-SYS-005 — MUTANT: skill'ler hissedilir, görünür, anlaşılır; açık dünyada asfalt yol ağı

- **Sahip:** Claude · **Dal:** `claude/mutant-skill-his` · **Taban:** `origin/gelistirme` 8817dd3 (0.8.7) + Codex PR #29 (`codex/mutant-skill-feedback-fix` edf3380, birleştirme 21892f4, çakışma yok)
- **Risk:** MUTANT kuralları, açık dünya zemini (Çorak Topraklar), HUD. Ortak fizik kodu değişmedi (`cx.dis` ve `kurulum` yolu aynı). Kariyer/yarış pistleri etkilenmez (pistler ayrı bölgelerde). Tek uygulayıcı.

## İstek (Cem, 27 Ekim; özet değil, maddeler aynen)

> MUTANT'ın yeni skill sistemini oynadım. Kodda mevcut olmalarına rağmen skillerin etkilerini neredeyse hiç hissedemiyorum. Ayrıca arayüzün iyileştirilmesi ve açık dünyada asfalt araçlarıyla sürüşün kolaylaştırılması gerekiyor. PR #29 Risk Taker'ın açık dünyada kontrollü drift ile dolabilmesini sağlıyor; koru, önce çakışmaları kontrol et.
> 1. Skill'lerin gerçek oynanış etkilerini denetle (Grappling Hook, Flying Dutchman, Risk Taker başta, hepsi): tetikleniyor mu, enerji harcanıyor mu, fiziksel etki araca ulaşıyor mu, süre/büyüklük hissediliyor mu, kullanılamıyorsa neden gösteriliyor mu, serbest sürüş/yarış ayrımı doğru mu. Kanca çekişi yeterli mi, Flying Dutchman'ın 1,5 sn'lik ilk seviyesi fark ediliyor mu. Değerleri yalnızca artırma; etkilerin entegrasyonda kaybolmadığını doğrula.
> 2. Minimum grafik ayarında bile görünür efektler: kanca halatı/bağlantı/çekiş, hayalet araç ve faz başlangıç-bitişi, Risk Taker dolum/dönüşüm/alev ve alev izi, diğerlerine temel görsel+ses. Minimumda kapatma; grafik ayarı avantaj/dezavantaj yaratmasın.
> 3. MUTANT arayüzü: üç skill slotu belirgin; ad/ikon, seviye, enerji maliyeti, bekleme, etkinlik durumu; kullanılamıyorsa neden (enerji, hedef yok, bekleme, faz…). HUD kalabalıklaşmasın, iPhone 13. Risk Taker kalan süre ve bar dolumu açık.
> 4. Açık dünyada asfalt araçlarla sürüş: zemin dağılımı, asfalt bağlantıları, etkinlik konumları, tutuş katsayıları incelensin; bağlantılı asfalt yollar. Asfalt ve ralli araçlarını aynılaştırma; herkese yapay arazi tutuşu verme.
> 5. Mimari ve CLAUDE.md korunur, küçük commit'ler, testler (tetik, fiziksel etki, HUD, açık dünya), mevcut birim/E2E/regresyon, master'a dokunma, PR ile sun; hangi skill gerçekten çalışıyor, hangisi efekt kazandı, açık dünyada ne değişti ayrı rapor. Öncelik yeni skill değil, mevcutların eğlenceli/anlaşılır/hissedilir olması.

## Kabul ölçütleri

1. **Hissedilir etki (ölçülü):** her skill tetiklenince enerjisi harcanır ve etkisi gerçek fizikte ölçülebilir fark bırakır (kanca: Sv1 rakibe ≥ 10 m yaklaştırır, pist/yol noktasında bütün süre bağlı kalır; dönüşüm 6 sn'de ≥ 5 m yol); kaynak perki olmayan koşuda da enerji sürüşle yeniden dolar.
2. **Neden görünür:** kullanılamayan skill yuvasında neden yazar (enerji x/y, HEDEF YOK, FAZDA, RAKİP YOK, bekleme süresi, BAŞLANGIÇ); basınca yuva kırmızı yanar, ses verir, enerji gitmez. Serbest sürüş/yarış ayrımı testte.
3. **Efekt:** kanca halatı ve bağlantısı, hayalet gövde + giriş/çıkış halkası, Risk Taker alev dilleri + alev izi korları + dönüşüm anı, Slipstream rüzgârı; her biri için ses. Gölgeler kapalıyken de aynı (tarayıcı testinde gölge kapalı).
4. **HUD:** üç yuva iPhone 13 yatayda sol grupta, aracın solunda; ikon, seviye çentiği, kısa ad, durum satırı; Risk Taker'da bar % ve dönüşüm kalan süresi.
5. **Açık dünya:** bütün etkinlik/sandık yerleri, atölye ve boss asfalt yolla bağlı; yolda engel yok; asfalt araç yolu izleyerek her yere varır; araç tutuşları değişmedi, ralli aracı toprakta hâlâ belirgin hızlı.

## Denetim bulguları (önce) → düzeltme (sonra)

Ölçüm `tests/birim/beceri-his.test.ts` (Yeşil Vadi, başlangıç aracı, YZ sürücü, gerçek fizik; yapay senaryo, insan hissi değil) → `tests/cikti/beceri-his.json`.

| Skill | Tetik / enerji | Fiziğe ulaşıyor mu | Bulgu | Düzeltme |
|---|---|---|---|---|
| Grappling Hook | Evet / 25 | Evet (`cx.dis`, kütle merkezine kuvvet) | Rakibe güçlü: Sv1 2,5 sn'de fark 28,3 → 12,0 m, +19 km/sa. **Pist noktasına 100 km/sa'te 0,57 sn'de kopuyordu** (nokta 21-35 m önde, 7 m'de kopma): +10 km/sa. **Açık dünyada rakip yok → hiç kullanılamıyordu** (sessizce). | Yol/pist noktasına 14 m yaklaşınca halat ilerideki noktaya kayar: Sv1 bütün 1,2 sn, 108 → 131 km/sa (+23). Açık dünyada asfalt yol ağına tutunur (+30 km/sa, 20 m/s'den). Yolsuz arazide "HEDEF YOK". Değerler (menzil, çekiş, süre) değişmedi. |
| Flying Dutchman | Evet / 30 | Tutuş ×1,12 araca gidiyor | 1,5 sn tutuş ×1,12 yolda **0,0 m** fark (6 sn ölçüm); hissedilen tek şey hasar bağışıklığı ve o da görünmüyordu. Kararlılık yardımı denendi (stm tabanı): drift yardımı açısı tuttuğu için ölçülebilir fark yok, eklenmedi. | Görünür hayalet gövde + giriş/çıkış halkası ve sesi; süre 1,5/2/2,5 → **2,5/3/3,5 sn**, bekleme 9/8/7 → **10/9/8 sn** (kullanım payı %14 → %20). Fazda kanca yuvası "FAZDA". |
| Risk Taker | Bar (tetikli) | Güç ×1,25, tutuş ×1,1 araca gidiyor | 6 sn'de +11,9 m (101,3 → 113,2 m); etkiyi hiçbir şey göstermiyordu. Açık dünyada dolmuyordu. | PR #29: açık dünyada drift doldurur (25° driftte 8,3 sn), takip/near-miss yalnız yarışta. Alev dilleri, gerçek hasar alanında korlar, dönüşüm halkası + ses, görüş +5°. Değerler aynı. |
| Slipstream Engine | Bar (tetikli) | Güç ×1,2 | Yalnız rakip arkasında dolar; açık dünyada nedeni görünmüyordu. | Yuvada "RAKİP YOK"; boşalırken rüzgâr çizgileri + ses. |
| Enerji | — | — | **Kaynak perki olmayan koşuda enerji hiç dolmuyordu:** ilk seçimde skill alan oyuncu 40 başlangıç enerjisini bitirince skill'ini bütün koşu kullanamıyordu (orijinal tasarım "enerji sürüş stilinden dolar", LT-SYS-002 §7). | Temel sürüş enerjisi (`SURUS_ENERJISI`): kontrollü driftte (≥ 20°, ≥ 11 m/s) 2,5/sn → bir kanca 10 sn drift. Kaynak perkleri üstüne eklenir. Matris testi kırılmadı. |

Grafik: oyunda ayrı "grafik kalitesi" ayarı yok; tek görüntü ayarı Gölgeler. Efektler gölgeden bağımsız aynı çizilir (MeshBasic, ışıksız, sabit havuz: 1 halat + 1 uç + 1 halka + 2 alev dili + 26 kor, mevcut parçacık havuzu). Oynanışa yazmazlar.

## Açık dünya (Çorak Topraklar)

- **Önce:** asfalt yalnız oval (yarı genişlik 11 m) ve x=210 düz yol; ikisi birbirine ve 6 uzak etkinlik yerine (rampa önü, tırmanış başı, 4 düzlük) bağlı değildi; boss tepesine yol toprak. Yarış lastikli asfalt aracı toprakta ~4 kat az tutuşa iner (yarış lastiği toprak 0,45 × araç 0,7 × zemin 26/30 ≈ 0,27; asfaltta 1,15 × 0,95 ≈ 1,09).
- **Sonra:** `src/dunya/yollar.ts`: 8 yol (yarı genişlik 7 m): doğu bağlantısı, tırmanış/boss yolu, kuzeydoğu/kuzeybatı/güneybatı çaprazları, rampa önü, güney yolu ve halka. Bütün `YERLER`, atölye ve boss asfaltta. Zemin yalnız yolun üstünde asfalt; araç tutuşları ve lastikler değişmedi. Yolda ağaç/çalı/koni yok; mini harita yolları çizer. Kanca açık dünyada bu yollara tutunur.
- **Ölçüm** (`tests/birim/yol-agi.test.ts` → `tests/cikti/yol-agi.json`; asfalt başlangıç aracı, yolu izleyen basit pilot, asfaltta ≤ 150, toprakta ≤ 108 km/sa): atölyeden 17 hedefin hepsine vardı, asfalt payı 1,00, çarpma 0, en uzun 43 sn. Aynı pilotla arazi üstünden dümdüz: uzak düzlüklerin ikisinde 1'er çarpma ve %6-8 kayma; süre bazen yoldan kısa (pilot temkinli; insanın asıl sorunu kontrol kaybı). Toprakta 300 m: ralli aracı 16,5 sn, asfalt aracı 22,0 sn (karakter korunuyor).

## Arayüz

- Yuva (`.mbk`, 78 × 52 px; NİTRO aynı yükseklik): solda ikon + seviye çentiği (1-3), sağda kısa ad + durum. Durum: maliyet + şimşek (hazır), kalan süre (açık, dolu renk; Risk Taker turuncu), bekleme süresi, `enerji/maliyet`, HEDEF YOK, FAZDA, RAKİP YOK, BAŞLANGIÇ. Risk Taker beklerken `%bar`. Reddedilen istekte yuva 0,9 sn kırmızı kenar + kısa ses.
- iPhone 13 yatay (844 × 390): sol grup NİTRO + 3 yuva ≈ 33 + 78 + 3 × 78 + 18 px ≈ 363 px; araç ortada (~370-475 px) kalır. Görüntüler: `tests/cikti/beceri-hud.png`, `beceri-kanca.png`, `beceri-hayalet.png`, `beceri-alev.png`.

## Denge (DENGE.md §9)

- Rol: MUTANT koşu içi; kariyer/araç/pist/PI etkilenmez. Hedef: bölge 1 düellosu, zamanlı etkinlikler, açık dünyada dolaşım.
- Değişen sayılar: Dutchman süresi/beklemesi (yukarıda); temel sürüş enerjisi 2,5/sn (yeni); kanca davranışı (değer aynı, kopma kuralı). Nitro da temel enerjiden yararlanır: driftli sürüşte 16 sn'de bir nitro (önceden perksiz hiç). Boss hedefleri nitrosuz ölçüldüğü için değişmedi; **nitro gücü/sıklığı Cem'in denemesine açık soru.**
- Ölçülen gerçek etki yukarıdaki tabloda; insan keyfi ölçülmedi.

## Kapsam dışı / açık

- Flying Dutchman'ın engellerin (ağaç/kaya) içinden geçmesi tasarıma aykırı ("duvar dışına çıkma yok") olduğu için yapılmadı; faz daha "hayalet" hissettirsin istenirse Cem karar verir.
- Kancanın engel görüş hattıyla kesilmesi (havuz taslağı) yok. Araç-araç çarpışması, YZ'nin skill kullanması hâlâ yok.
- iPhone 13 gerçek cihazda denenmedi (başsız tarayıcı 844 × 390).

## Kanıt

- Birim: `tests/birim/beceri-his.test.ts` (8), `tests/birim/yol-agi.test.ts` (4), `tests/birim/beceri.test.ts` (güncellendi: açık dünya drift, kanca dünya bağlantısı, Dutchman süresi).
- Tarayıcı: `tests/e2e/bolumler/beceri-his.mjs` (7, gölgeler kapalı), `beceri.mjs` (6).
- Sonuçlar: aşağıda "Doğrulama".

## Doğrulama

- Yerel: `npm run kontrol` temiz; `npm test` 30 dosya 415/415; tarayıcı `beceri-his` 7/7, `beceri` 6/6.
- Regresyon (Cem'in isteğiyle yarıda kesildi, "yalnız gerekli alanlar"): kesilene dek 392 madde geçti, MUTANT/rakip/skill bölümleri dahil; 2 kalış garajın 4x yavaş araç geçişi kare süresi (yük kaynaklı; garaj bölümü tek başına koşunca geçti, bu iş garaja dokunmuyor).
- iPhone 13 gerçek cihazda denenmedi. Sürüm numarası denemeye birleştirmede artar (0.8.7 → 0.8.8).
