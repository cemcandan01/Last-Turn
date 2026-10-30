# Arazi ve yüzey tanı parkuru

Unity **6000.3.9f1** → **Last Turn → Arazi Test Sahnesini Aç**. Alternatif: `Assets/LastTurn/Scenes/TerrainTest.unity` dosyasını aç. Play'e basıp Game'e tıkla. Ayrı düz asfalt sahnesi `GTTest.unity` korunur.

W/↑ gaz, S/↓ fren ve durunca geri, A/D veya oklar yön, Space el freni, R başlangıç. Vites otomatiktir. Genel sürüşe manuel vites eklenmez; gelecekte yalnız Drag beceri mekaniği olacaktır. GT'nin geri manevra kesicisi 3000 RPM ve önceki teker bazlı TCS düzeltmesi bu sahnede de geçerlidir.

## Parkur

Başlangıç ve sağ şerit asfalt, aracın solundaki kahverengi şerit topraktır (TS x ≥ 4; Unity x ≤ −4). Aynı araç ve yarış lastiği kullanılır; toprakta doğal olarak daha az tutuş vardır. TerrainTest ayrıca TS 0.8.18 MUTANT kurulumunun `toprakDengesi` profilini kullanır: seçili lastik × araç toprak tutuşu 1'in altındaysa açığın %55'i bırakılır. Uygun toprak kombinasyonları ve asfalt değişmez. Bu, ham model portunda eksik kalan kurulum kuralıdır; genel lastik modeli/direksiyon/diferansiyel değiştirilmedi. GTTest ham kabul edilmiş GT/asfalt profilinde kalır. HUD bu profili “TS toprak dengesi” olarak belirtir.

| Başlangıçtan Z mesafesi | Bölüm |
| --- | --- |
| 0–20 m | Düz kalkış ve yüzey geçişi |
| 20–60 m | Çıkış, tepe ve iniş |
| 70–90 m | Ardışık tümsekler |
| 105–120 m | Rampa, üst düzlük ve iniş dudağı |
| 120–360 m | Düz frenleme alanı |

HUD merkez yüzeyini, dört tekerin ayrı yüzeyini, TEMAS/HAVA durumunu ve süspansiyon sıkışmasını cm olarak gösterir. Z/Y ve dikey hız, rampaya nerede ulaştığını ve inişi takip etmeyi sağlar. Küçük Editor penceresinde Game'i büyütmek okunurluğu artırır; Free Aspect / Scale 1x kullanılabilir.

## Manuel kontrol listesi

1. R → W ile asfalt üzerinde kalk. 20–60 m tepesinde gövde eğimi ve teker sıkışmaları değişmeli; zemin içinden geçmemeli.
2. R → W+A ile kahverengi şeride geç; sonra direksiyonu düzelt. Ön/arka tekerler sınırdan farklı anlarda geçerken HUD farklı yüzeyler göstermeli. Aynı gazda toprak daha kolay kaymalı ve daha yavaş hızlanmalı.
3. Tümseklerde tekerlerin sıkışması ve açılması görülmeli. Rampayı yeterli hızla geçince temas 0/4 olabilir; havada tekerler motor/fren tepkisi vermeye devam eder. İnişte yeniden temas ve kısa sıkışma olmalı.
4. Düz alanda S ile frenle, durunca geri git; yaklaşık 37 km/sa manevra hızı ve otomatik R beklenir. W ile ileriye dön. Space arka tekerleri kilitlemeli.
5. R araç, kamera ve biriktiriciyi başlangıca birlikte döndürmeli. Console'da hata/uyarı olmamalı.

### Toprak düzeltmesini yeniden dene

Toprak şeridine geçip gazı bırak veya kısa Space ile yavaşla. 10–20 km/sa civarında W'ye kısa basışlar ve A/D'ye kısa yön düzeltmeleri yap; yön tuşunu bırakınca sürekli savrulma sürmemeli. Ardından 25–35 km/sa civarında kısa bir dönüşten sonra gazı ve direksiyonu bırakıp toparlanmayı değerlendir. Aynı manevrayı asfalt tarafında tekrarla.

Son olarak daha yüksek hızda veya uzun tam gaz/tam direksiyonda kaymanın hâlâ mümkün olduğunu, kısa Space ile arkanın açıldığını ve S ile normal frenlemeyi dene. Klavyede W tam gaz, A/D tam direksiyon isteğidir: bunları uzun süre birlikte tutmak tutuş sınırını aşabilir; düzeltme bütün aşırı girdileri yola yapıştırmaz. Düşük gaz ölçümlerinde toprak kararlı; tam gazdan gaz kesme toparlanması belirgin iyileşmiştir. Ölçüm kartı `docs/isler/2026-10-31-unity-toprak-kararlilik.md`.

Test alanı ödülsüz ve sınırlandırılmış bir gösterimdir: mesh x=±40 m, z=−15…360 m; fizik sorgusu devam eder. Gösterim sınırından çıkarsan R kullan. Duvar/bariyer, çevre nesnesi çarpışması veya tam yarış pisti değildir. Rigidbody/WheelCollider kullanılmaz. Zemin çizimi aynı H fonksiyonundan yarım metrelik örneklerle üretilir; kıvrımlı tümseklerde üçgen çizim ile analitik H arasında küçük örnekleme farkı olabilir.

## Kısa otomatik kontrol

**Last Turn → Arazi Kısa Play Doğrulaması**, gerçek Play'de Input System sanal klavyesiyle tepe/tümsek/rampa, havalanma/iniş, frenleme, R ve asfalt/toprak geçişini çalıştırır. Kayıtlı fizik girdilerini 30/60/120 FPS'de bit düzeyinde tekrarlar; sonunda Play'i kapatır. Unity'nin yerleşik kısayollarıyla çakışmaması için bu iki arazi menüsünün kısayolu yoktur.

```powershell
node Unity/Validation/export-terrain-reference.mjs --check
node Unity/Validation/export-dirt-balance-reference.mjs --check
node Unity/Validation/export-gt-prototype.mjs --check
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release
node Unity/Validation/check-editor-proof.mjs
node Unity/Validation/check-terrain-proof.mjs
```

Son iki komut güncel yerel Editor/Play hash kanıtını ister. Kaynak, sahne veya materyal değişince yeniden çalıştırılmalıdır. Bu kısa doğrulama tam Unity test paketi, CI Editor veya cihaz testi yerine geçmez. Ayrıntılı ölçümler ve kapsam `docs/isler/2026-10-31-unity-zemin-yuzey.md` içindedir.
