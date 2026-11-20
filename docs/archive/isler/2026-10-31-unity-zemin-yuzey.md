# Engebeli zemin ve yüzey fiziği

- Sahip Codex: mevcut C#/GT/oracle/Editor bağlamı. Dal `codex/unity-zemin-yuzey`, temiz taban `201d7b3`. Önceki fizik düzeltmeleri ve kullanıcı tarafından korunması istenen sürüş davranışı devralındı; yeni kullanıcı talimatı arazi aşamasına geçişi onaylar. Ek bir manuel test yapılmış sayılmaz.
- TS 0.8.18 sabit SHA `df3549e709469f0b519ebfbeaa9f63c1040fee05`. GTTest, geri 3000 RPM manevra ayarı, teker bazlı TCS, 1/60 × 8, otomatik vites ve Input System ayarları korunur. Push/merge/uzun regresyon/yayın yok.
- Bağımsız `zemin_inceleme` alt ajanı önce salt okunur TS/C# sözleşme incelemesi yaptı, sonra yalnız yeni `Unity/Validation/export-terrain-reference.mjs` ve `Reference/terrain-0.8.18.json` dosyalarını geliştirdi. Bu iki dosya ayrı sahipliktedir; mevcut fizik dosyalarına dokunmadı. Core/Runtime/Editor/C# test/belgelerin tek uygulayıcısı görev sahibidir. Kapasite/kesin model bilinmiyor; API/ek kredi yok.

## Kullanıcı kararı — manuel vites

31 Ekim 2026: TS 0.8.18'de manuel vites yoktur; genel sürüşe eklenmeyecek. Manuel vites yalnız gelecekte **Drag yarışlarının özgün beceri mekaniği** olacak. Asfalt, ralli, drift ve serbest sürüş/test modları otomatik kalacak. Drag için ileride kalkış RPM kontrolü, patinaj, doğru vites zamanlaması ve gerçek tork eğrisine dayalı performans tasarlanacak. Ayrı manuel debriyaj tuşu ilk aşamada zorunlu olmayacak. Bu görev yalnız kararı belgeler; Drag geliştirmesi içermez.

## İstek ve kabul ölçütleri

TS'nin H/surf, normal, temas ışını, süspansiyon ve yüzey lastik hazırlığı taşınacak. Ayrı Unity arazi sahnesi; yüzey/teker-temas/süspansiyon tanıları ve kısa Editor Play isteniyor.

1. Saf Core dünya sorgusu; eğim/engebe, her tekerde ayrı yüzey; asfalt/toprak TS tutuşu ve yuvarlanma/gövde-zemin teması. Yükseklik ve çizim aynı veriyi kullanmalı.
2. Sabit TS kaynak bloğuyla eğim, karışık yüzey, tüm tekerlerin temas kaybı, havalanma/iniş ve sıkışma senaryoları her adım sayısal karşılaştırılmalı. Kabul toleransları önceden: eski 45 alan limitleri (konum/hız 1e-5, dördey 1e-6, teker omega 1e-4, yük 0,05 N); yüzey kimliği/temas tam eşit. Tolerans büyütülmez.
3. GTTest düz asfalt sahnesi ve kabul edilmiş sayısal izler korunmalı; 30/60/120 FPS, tekrar/reset ve önceki fizik regresyonları geçmeli.
4. Ayrı `TerrainTest` sahnesinde düz başlangıç, asfalt/toprak geçişi, eğim, engebe ve rampa; geliştirici tanıları ve sıfırlama çalışmalı. Rigidbody/WheelCollider ikinci fizik yok.
5. Unity derleme + kısa gerçek Play kontrolü, ölçüm/kanıt, manuel liste ve yerel commit/devir. Yeni pist/kupa/ekonomi, Drag uygulaması, çevre bariyeri ve tam dünya taşıması kapsam dışında; test parkuru ödülsüz tanı alanıdır.

## Sonuç — 31 Ekim 2026, yalnız yerel

Tamamlandı. Teslim SHA'sı kartı son değiştiren commit'tir: `git log -1 --format=%H -- docs/isler/2026-10-31-unity-zemin-yuzey.md`. Kullanıcının Esc ile durdurduğu ilk Computer Use turundan sonra **“computer use tekrar yapabilris”** talimatıyla kalan Editor kontrolleri tamamlandı. Yeni araç/Pİ/ödül/edinim dengesi eklenmedi; sahne ödülsüz fizik tanısıdır. Yeni mekanik Drag sistemi geliştirilmedi.

### Taşınan sözleşme

- `IVehicleWorld` H/yüzey/hava tutuşu sorgusu ve varsayılan düz asfalt. Teker yüzeyi ve .5 m merkezi-fark normali ana adım başında; yükseklik her alt adımda. Işın mesafesi `N.y*(A.y-H)/max(.2,dot(N,up))`; lastik teğet izdüşümü ve normal yükü özgün sırayla. Süspansiyon kuvveti gövde-up yönünde kalır. Gövde noktalarının H'ye göre ön elemesi, gerçek N ile temas kuvveti/sürtünme ve yatay yüzey direnci taşındı.
- Altı yüzey × dört lastik kuru parametresi gerçek TS araç/lastik/önayar sütunlarından üretilir. Toprak için ayrı `kp=.18`, eğri biçimi/tepe kayma ve ön/arka tutuş değerleri; asfalt için kabul edilmiş eski değerler. Islaklık/çamur taşıması, merkez yüzeyinin gövde direnci ve tekerin yuvarlanma direnci ayrı uygulanır. Bu dilimin sayısal testleri kuru asfalt/toprak ve çamurdan asfalta geçişi içerir; değişken hava/kar sürüşünün tamamı test edilmiş sayılmaz.
- Reset, dört köşenin H değerinden kaynak pitch/roll ve ortalama yüksekliği kurar; başlangıç hızı TS gibi yataydır. Temassız teker serbest motor/fren çözümünü sürdürür; Load=0, tekrar temasta sıkışma/sönüm/tampon çalışır. 1/60 × 8 aynıdır.
- GT fabrikası yüzey tablolarını kullanır; elle yeniden denge ayarı yok. Ham `VehicleParameters` verisinde tablo verilmezse açık eski lastik parametreleri kullanılır; yeni çok-yüzeyli araç kurulumunun gerçek tabloyu sağlaması gerekir.

### Sayısal kanıt

`tests/cikti/terrain-validation.txt` (ignore): eski teker **1800/26.241**, dört teker **3000/150.073**, motor **4800×58/288.063**, GT fizik **6×1200/10.033** koşul başarılı. Yeni arazi **7×600×51 değer, 218.790 koşul**; her senaryoda 30/60/120 FPS bit eşitliği, baştan reset/tekrar ve başlangıç pozunun TS ile karşılaştırması geçti. Eski JSON'lar ve toleranslar değiştirilmedi.

| Kaynak/C# senaryosu | Ölçülen sonuç |
| --- | --- |
| Asfalt, GT sabit 3500 Nm teker torku | 6. s 160,7810 km/sa |
| Toprak, aynı GT/lastik/tork | 6. s 75,2060 km/sa |
| Eğim, RX | Başlangıç pitch/roll ve her adım durumları eşleşti; dört temas korundu |
| Engebe/karışık yüzey, RX | Aynı anda farklı teker yüzeyleri; max sıkışma 0,247059 m |
| 1,5 m düşüş, GT | 20 ana adım dört teker havada, yeniden temas; max sıkışma 0,261829 m |
| Tepe/dudak, GT | 29 ana adım dört teker havada, iniş; max sıkışma 0,245313 m |
| Çamur → asfalt | Ayrı yüzey geçişi, çamur izi 1 → 0 ve dirençler TS ile eşleşti |

Bu hızlar motorlu manuel sürüş ölçümü değil, referansla aynı açık teker torklu düzeneğin çıktısıdır. En büyük konum farkı **2,56e−13 m**, teker yük farkı **6,76e−9 N**; izinler sırasıyla 1e−5 m ve 0,05 N. Yüzey/temas kimlikleri tam aynı. GT'nin `201d7b3` öncesi/sonrası 120 tam hassasiyetli ölçüm satırı aynen korundu; karşılaştırma `tests/cikti/compare-gt-flat.mjs`. İlk karşılaştırma log UTF-16/UTF-8 farkını okumadığı için boş kapsam hatası verdi; BOM duyarlı okuma sonrası gerçek 120 satır geçti.

Özgün üç TS oracle, mevcut GT hata düzeltme oracle'ı, yeni arazi oracle `--check`, GT fabrika üretim `--check`, proje düzeni, Prettier ve whitespace başarılı. Bağımsız arazi oracle C# çıktısından referans üretmez; TS'nin özgün reset, zemin, lastik hazırlığı ve alt-adım bloklarını sabit SHA'dan çalıştırır.

### Unity gerçek derleme ve Play

- Unity **6000.3.9f1**, **17 Core + 5 Prototype** kaynak dosyası derlendi; eski 600 teker + 600 gövde + 1200 motor kısa adımı ve 6 gösterim kontrolü geçti. `Unity/Logs/drive-core-compilation.json`; `check-editor-proof.mjs` güncel hash ve kaynak zamanlarını doğrular.
- `TerrainTest.unity`, iki materyal ve üretilmiş zemin mesh'i Editor'da oluşturuldu. Görsel mesh aynı H'den .5 m örneklenir; TS eksen yansıması kullanılır. Kamera/teker/input aynı adaptörle çalışır; sahneye özel arazi bayrağı vardır. GTTest sahnesi ve eski materyaller değişmedi. Yeni kaynakların metaları Editor tarafından üretildi.
- **Arazi gerçek Play 17/17:** UTC `2026-10-30T23:19:40.6464742Z` (31 Ekim 02:19:40 Türkiye), `Unity/Logs/terrain-play.json`. Gerçek Input System sanal klavyesiyle tepe/tümsek/rampa, tüm tekerlerin havalanması, iniş, fren, R, asfalt/toprak ve karışık teker geçişi; 64 gövde/motor/yüzey/iz değerinin kayıtlı girdilerle 30/60/120 FPS bit eşitliği. Gövde merkezi max **3,418881 m**, teker sıkışması max **0,294266 m**; hız **28,04486 → 0,11754 m/sn** frenledi. Hava/iniş/toprak/karışık bayrakları doğru. `check-terrain-proof.mjs` sahne/materyal/mesh/CS/meta hash kapsamını doğruladı.
- **GT koruma Play 28/28:** UTC `2026-10-30T23:19:09.2704850Z` (31 Ekim 02:19:09 Türkiye), `Unity/Logs/gt-prototype-play.json`. İleri **22,737907 m/sn**, fren **5,762140 m/sn**, geri **36,738779 km/sa / 3092,647 RPM**, tam sol/sağ kalkış **34,439316 km/sa**; kabul edilen sonuçlarla aynı. Kamera max göreli kare adımı **0,061209 m**. `check-prototype-proof.mjs` geçti.
- Normal arazi Play'de gövde, asfalt/toprak şeritleri, yüzey/temas/cm tanıları görüldü; sonra Play durduruldu. Son Console **0 hata/0 uyarı**. Bu kısa yerel kontroller tam Unity Test Framework, CI Editor, cihaz/IL2CPP veya Cem'in sürüş hissi kabulü değildir.

### Koruma, sahiplik ve sorunlar

- Önceki `201d7b3` geçmişi, GTTest, Input System 1.14.0, manifest/kilit, TimeManager ve iki korunan ayar hash'i aynıdır. Başlangıç temizdi; bu görev dışında kullanıcı değişikliği görülmedi. Yerel branch/fetch ve önceki NuGet okuma yetkisi kullanıldı; global Git ayarı değiştirilmedi.
- Ana ajan C# çekirdeği, parametre üretimi entegrasyonu, runtime/Editor sahne ve kontrolleri, C# karşılaştırma/testleri ve belgelerden sorumlu. Bağımsız alt ajan yalnız sözleşme denetimi ve ayrılmış iki yeni oracle dosyasını yaptı; aynı fizik dosyasında eşzamanlı yazma yok. Kesin model/kota bilinmiyor. Yerel plan makbuzu `tests/cikti/koordinator/4c07a0de-1992-498d-8777-b50553a37a5d.json`; yeni Claude CLI/API/ek kredi yok.
- İlk Computer Use fiziksel Esc ile durdu ve eksik durum açık bildirildi; kullanıcı devam izni verdi. Ctrl+F9/F10 Unity'nin Focus Player One/Two kısayollarıyla çakıştı; yeni arazi kısayolları kaldırıldı, menüler kullanıldı. Kullanıcı kısayol ayarları değiştirilmedi. Son testte açık hata yok; tolerans gevşetme/test kapatma yapılmadı.
- Push/merge/yayın, uzun regresyon, tam gp3/dünya aktarımı, nesne/bariyer çarpışması, Drag uygulaması, mobil/IL2CPP yapılmadı. Test yüzey modeli altı kaynak yüzey tablosu taşır; oynanabilir sahne asfalt/toprak gösterir. Mesh sınırı x=±40 m, z=−15…360 m; fizik sorgusu bunun dışında da sürer. Kıvrımlı yükseklik çiziminde örnekleme farkı olabilir.

Son staging kontrolünde Unity tarafından üretilen dokuz yeni YAML/asset/meta dosyasındaki boş alan sonu boşlukları temizlendi. Ardından sahne yeniden yüklenip GT 28/28 ve arazi 17/17 Play kaynak hash kanıtları yenilendi; ölçümler aynı kaldı. Son derleme UTC `2026-10-30T23:19:31.2600806Z`, MVID `fbe4c63f-a32c-433f-9f39-deb892a7f139`; whitespace kontrolü başarılı.

## Sonraki tek adım

Cem `TerrainTest.unity` veya **Last Turn → Arazi Test Sahnesini Aç** ile Play'e girip `Unity/ARAZI-PROTOTIP.md` listesini uygulasın: asfalt/toprak geçişi, tepe/tümsek, rampa/havalanma/iniş, fren/Space/R. Önce bu dilimin sürüş hissi değerlendirilir; Drag ve tam dünya taşıması başlatılmaz.
