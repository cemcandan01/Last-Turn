# TerrainTest düşük hız toprak kararlılığı

- Sahip Codex, mevcut C#/GT/TerrainTest ve oracle bağlamı. Dal `codex/unity-toprak-kararlilik`, temiz taban `25690f9`; önceki commit geçmişi korunur. Push/merge/uzun regresyon/yayın yok.
- Bağımsız `zemin_inceleme` ajanı yalnız TS MUTANT kurulum/toprak dengesi kök neden denetimi yapar; dosya yazmaz. Tek uygulayıcı görev sahibidir. Kesin kapasite/model bilinmiyor; yeni API/ek kredi/Claude CLI yok.
- Cem TerrainTest'te en düşük hızda buz gibi kayma bildirdi. Bu görevin ardından fizik için yeni özellik geliştirme durur; mevcut TS sistemlerini Unity'ye taşıma aşamasına dönülür. Manuel vites yalnız gelecekteki Drag kararı korunur.

## İstek ve önceden belirlenen kabul

1. Aynı GT/lastik ve TerrainTest toprak sorgusuyla düşük hız yönlendirme + gaz kesip toparlama, asfalt karşılığı, yüksek hız/sert direksiyon, fren ve el freni ölçülecek. Önce/sonra Cg beta, teker kayma açısı/kuvveti, hız ve toparlanma kaydedilecek.
2. Sabit TS 0.8.18 `df3549e709469f0b519ebfbeaa9f63c1040fee05` model/lastik ve MUTANT `toprakDengesi` gerçek kurulum zinciri incelenecek. Kaynağı olmayan ortak tutuş çarpanı, direksiyon kısma veya yeni gizli kuvvet eklenmeyecek.
3. Lastik ve araç sırası korunacak; toprakta uzman araç/uygun lastik üstünlüğü, yüksek hız ve el freniyle kayma mümkün kalacak. GTTest asfaltının önceki tam hassasiyetli izleri korunacak.
4. Yeni regresyonlar + etkilenen kısa TS/C# karşılaştırmaları, reset/30/60/120 FPS ve Unity derleme/Play kanıtı. Sayısal port limitleri mevcut 45/51 alan toleranslarıdır; genişletilmez.
5. Yerel commit, devir, ölçüm tablosu ve Cem'in manuel listesi; bu düzeltmeden sonra yeni fizik özelliği başlatılmayacak.

## İlk bulgu

Ham lastik/teker modeli doğru taşınmış; ancak önceki TerrainTest verisi ar/yarış lastiğiyle ham `car.gr` kullanıyor. TS 0.8.14–0.8.18 MUTANT kurulumunda `toprakDengesi` üst katmanda uygulanıyor. Aynı “buz gibi” şikâyet için kaynakta lastik × araç toprak açığının %55'ini bırakan, 1 ve üstündeki birleşik tutuşu/asfaltı değiştirmeyen kural mevcut. Bu görevde ham fizik ile oynanabilir kurulum eksikliğinin etkileri ayrı ölçülecek; kariyer/serbest sürüş referansının sessizce yeniden tasarlanması diye sunulmayacak.

## Sonuç — yalnız yerel, 31 Ekim 2026

Tamamlandı; teslim SHA'sı bu kartı son değiştiren commit'tir (`git log -1 --format=%H -- docs/isler/2026-10-31-unity-toprak-kararlilik.md`). Mevcut ham referanslar korunur. TerrainTest üst kurulumu **TS MUTANT toprak dengesi** profilini kullanır; GTTest ham kabul edilmiş GT/asfalt profilini kullanmayı sürdürür. Bu bir yeni genel fizik kuralı değildir; önceki taşımada eksik kalan gerçek kurulum zinciri tamamlandı.

### Kök neden ve çözüm

- TS sabit SHA `src/oyun/mutant-kosu.ts` içindeki `toprakDengesi`, gerçek `mutant.ts → mutantKurulumUygula` zincirinde seçili lastikle uygulanır. Kaynak `TOPRAK_ACIK_PAYI=.55`: `t*gr0 < 1` ise birleşik değer `1-(1-t*gr0)*.55` olur; aksi halde araç aynı döner. Asfalt `gr1` aynen korunur. Geçmiş karar/ölçüm: `docs/isler/LT-SYS-006-mutant-drift-laboratuvari.md` Revize 3 ve `docs/denge/2026-10-28-mutant-toprak-dengesi.md`.
- TerrainTest daha önce yalnız ham GT/ar/yarış lastiği tablosunu kullanıyordu. Böylece GT lastik×araç değeri **.396**, ön/arka toprak mu **.3196908/.2751886566** kalmıştı. Eksik kaynak kurulumundan sonra **.6678**, mu **.53911494/.46406814363** olur. Bu sabit GT bonusu değil; seçili lastik ve aracın açığından çıkan kaynak değeridir. Uygun toprak lastikli RX birleşik **1.4 → 1.4**, GT Toprak lastiği **1.1 → 1.1** kalır; GT Karışık lastik **.704 → .8372** olur. Lastik/araç farkı düzleştirilmez.
- `GtPrototypeParameters.CreateTerrain()` ayrı ve açık profil, `Create()` eski ham referanstır. Yüzey tabloları özgün TS `toprakDengesi` + özgün lastik hazırlığından üretilir; ortak lastik kuvveti, VD_X/VD_Y, Kp/Ap/C, diferansiyel, sürtünme modeli, direksiyon, motor ve zemin sorgusu değiştirilmedi. Tutuş oranı anlık hıza veya araç kimliğine bağlı bir kestirme değildir. Toprak sütununu kullanan diğer gevşek yüzeyler de kaynak kuralıyla tutarlı türetilir.
- Analiz, düşük gaz/boşta küçük direksiyonun ham veride de kararlı olduğunu gösterdi. Esas ağır kayma, güçlü GT'nin düşük hızdan tam gazla dönerken yanal tutuş payını kaybetmesi ve gaz kesildikten sonra uzun toparlanmasıydı. Denge, her sert girdiyi tutunur hâle getirmez: daha yüksek çekiş aynı gazla daha hızlı ivmelendirir ve uzun tam gaz/direksiyon yine sınırı aşabilir. Bu davranış gizlenmedi; testte korunur.

### Önce / sonra ölçümleri

İzolasyon: TerrainTest'in H=0 toprak şeridiyle aynı yüzey/GT/ar/yarış lastiği; ham ve dengeli profiller aynı başlangıç ve kayıtlı girdilerle çalıştırıldı. Rampalar kök nedeni izole etmek için bu karşılaştırmaya katılmadı; gerçek sahne Play ayrıca doğrulandı.

| Ölçüm | Ham | Düzeltilmiş TerrainTest |
| --- | --- | --- |
| GT birleşik toprak değeri | .3960 | .6678 |
| Ön/arka toprak mu | .31969 / .27519 | .53911 / .46407 |
| 18 km/sa başlangıç, %100 gaz + %35 direksiyon 2 s; bırakınca 1 s sonraki CG beta | 82,00° | 9,60° |
| 28,8 km/sa başlangıç, %20 gaz + %35 direksiyon; en büyük beta | 4,54° | 1,89° |
| Aynı %20 gaz testinde bırakınca 1 s sonraki beta | 0,33° | 0,01° |
| 43,2 km/sa, %50 fren, düz toprak durma mesafesi | 11,6299 m | 6,6243 m |
| Aynı fren testi, asfalt | 3,47504 m | 3,47504 m |
| Sert el freni/viraj, toprak en büyük beta | 86,18° | 84,94° (kayma hâlâ mümkün) |

Normal düşük gaz senaryolarında 10,8/18/28,8 km/sa başlangıçlar, tepe beta <5° ve gaz/direksiyon bırakılınca 1 s beta <.1° koşullarını geçer. Tam gaz başlangıçlarında kayma tepesinin her durumda azalması beklenmedi; aynı girdide hızın da arttığı ölçüldü. Tablo gaz kesme toparlanmasını ve sınır davranışını ayrı gösterir.

### Test/kanıt

- `tests/cikti/dirt-validation.txt`: eski teker 1800/26.241, gövde 3000/150.073, motor 4800×58/288.063, GT 6×1200/10.033 ve ham arazi 4200×51/218.790 koşul geçti. Eski fixture/tolerans değişmedi.
- Yeni **8 profil** (GT üç lastik + RX kendi Toprak lastiği, ham/dengeli); kaynak araç/lastik sırası, uygun kombinasyonun aynılığı, Kp/Ap/C ve asfalt aynılığı doğrulandı. **8×600×51 / 250.042 koşul** yeni TS/C# izi: düşük/yüksek hız dönüş, fren ve el freni; asfalt ve toprak. Başlangıç, reset/tekrar ve 30/60/120 FPS bit eşitliği geçti.
- Son odaklı koşum `tests/cikti/dirt-final-focused.txt`: **48 karşılaştırma + fren/el freni/araç-lastik/FPS, 197 koşul** ve sekiz TS izi geçti. Önce ölçümü `dirt-before.txt`, ham/dengeli metrikler `dirt-after.txt`. Koşul sayıları ayrı test sayısı değildir.
- `export-dirt-balance-reference.mjs --check`, kaynak `mutant-kosu.ts` SHA256 **5c846bfff853137d39025d1413359fff621fca5054a7bc0e60807f0a8f50aefd** ve sabit TS modelinden bağımsız referans üretir. C# sonucundan oracle üretilmez. Mevcut arazi exporter'ı yeniden kullanılabilir fonksiyona ayrıldı; eski `--check` sonucu aynen kaldı. Özgün üç TS oracle, önceki GT hata düzeltme oracle'ı ve fabrika `--check` başarılı.
- Unity CI akışına eski GT düzeltme, ham arazi ve yeni toprak kurulum `--check` adımları bağlandı; yerel karşılıkları başarılıdır. CI/push bu tur çalıştırılmadı. Proje dosya kontrolü yeni referansı da zorunlu tutar.
- **Asfalt koruması:** `tests/cikti/compare-dirt-asphalt.mjs`, 201d7b3/25690f9'da kabul edilmiş **120 tam hassasiyetli GT ölçüm satırının** aynılığını doğruladı. Ham/dengeli asfalt fren mesafesi ve 12 hız/gaz eşleşmesinin beta/lastik metrikleri de tam aynı. GTTest sahnesi, eski lastik/teker/gövde fizik dosyaları, paketler, TimeManager ve iki korunan Input System ayar hash'i değişmedi.
- **Unity 6000.3.9f1:** 17 Core + 5 Prototype; eski 600 teker + 600 gövde + 1200 motor ve 6 gösterim kontrolü. Son kaynak derleme UTC `2026-10-30T23:41:24.9312156Z`, MVID `3377535f-aa33-44a4-b2b1-cee065645588`.
- **TerrainTest gerçek Play 23/23:** UTC `2026-10-30T23:40:36.5049426Z` (31 Ekim 02:40:36 Türkiye). Gerçek Input System klavyesiyle toprak şeridine girme/park, 18 km/sa'e kalkış, 12 adımlık A darbesi, 60 adım toparlanma. Tepe beta **3,88355°**, son beta **0,00009495°**. Kaydedilen 64 değerin 30/60/120 FPS tekrarları, tepe/rampa/iniş, fren, el freniyle park ve R geçti. `check-terrain-proof.mjs` güncel kaynak hash'lerini doğruladı; HUD “TS toprak dengesi” profilini gösterir.
- **GTTest gerçek Play 28/28:** UTC `2026-10-30T23:41:44.9603792Z` (31 Ekim 02:41:44 Türkiye). İleri **22,737907 m/sn**, fren **5,762140**, geri **36,738779 km/sa**, tam sol/sağ kalkış **34,439316 km/sa**, kabul edilmiş değerlerle aynı. `check-prototype-proof.mjs`, `check-editor-proof.mjs` başarılı; son Console **0 hata/0 uyarı**. Bunlar kısa yerel Editor kontrolleridir; tam Unity Test Framework/CI/cihaz/IL2CPP veya Cem'in his onayı değildir.

### Sahiplik, sorunlar ve sınırlar

Tek uygulayıcı Codex tüm değişiklikleri yaptı. Bağımsız `zemin_inceleme` ajanı TS kurulum zinciri, sayılar ve kapsam ayrımını salt okunur denetledi; dosya değiştirmedi. Plan makbuzu `tests/cikti/koordinator/3caeb74e-2d30-416e-a726-5e3d08e31870.json`; kesin model/kota bilinmiyor, API/ek kredi/Claude CLI yok.

İlk genişletilmiş Play testinin S ile park aşaması kaynak otomatik geri seçimine takılıp uzadı; test yine 23 kontrolü tamamladı. Daha doğrudan park için test sürücüsü Space kullanacak şekilde güncellendi. Otomatik test bitişiyle aynı anda Ctrl+P gönderilmesi normal Play'i yeniden açtı; bu sırada Refresh, serialize edilmeyen input nesnesinde eski prototip hot-reload NullReference hatası üretti. Oturum kapatılıp temiz sahne/Play'den tekrarlandı; son 23/28 kontroller başarılı ve Console 0/0. Bu hata toprak kuvveti veya bu denge kuralının sonucu değildir; genel Play içi hot-reload iyileştirmesi yapılmadı. Bir UI girişi kullanıcı girdisi nedeniyle reddedildi; yeniden gözlemden sonra devam edildi.

Genel kariyer/serbest sürüş fiziğine MUTANT kuralı sessizce yayılmadı; yalnız TerrainTest'in açık kurulum profilidir. Tam MUTANT yardımları/ESC, kariyer denge ölçümleri veya yeni araç sistemi bu görevde taşınmadı. Push/merge/uzun regresyon/yayın yok. Yeni fizik özelliği başlatılmadı.

## Cem'in yeniden manuel kontrolü ve sonraki tek adım

TerrainTest → Play → toprak şeridine geç → gazı bırak veya kısa Space ile yavaşla. 10–20 km/sa civarında W ve A/D'ye kısa basışlarla küçük yön düzeltmeleri yap; direksiyon bırakılınca sürekli savrulma sürmemeli. 25–35 km/sa civarında dönüşten sonra gazı ve yönü bırakıp toparlanmayı gözle. Aynısını asfalt şeridinde yap. Sonra yüksek hız/sert direksiyon ve kısa Space ile kaymanın hâlâ mümkün olduğunu, S fren ve R'yi dene. W+A/D'yi uzun tutmak güçlü GT'yi hâlâ tutuş sınırından çıkarabilir; düzeltme bunu yapay olarak engellemez.

Bu düzeltmeden sonra **fizik üzerinde yeni özellik geliştirmeye ara verilir**. Cem'in manuel değerlendirmesi alınır; ardından mevcut TypeScript oyun sistemlerinin Unity'ye taşıma sırası seçilir. Drag ve başka fizik özelliği kendiliğinden başlamaz.
