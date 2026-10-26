# LT-SYS-001 Sistemik oynanış ve etkileşim çekirdeği

Durum: FAZ 0 tamam; FAZ 1 yerelde doğrulandı. Aktif sahip: Claude (2026-10-26 Cem kararı: tek uygulayıcı, dal claude/sistemik-oynanis-faz1; codex/sistemik-oynanis-tasarim ve PR #15 bu dala birleştirildi, Codex bu görevde durur).
Dal: claude/sistemik-oynanis-faz1 (eski: codex/sistemik-oynanis-tasarim), taban: gelistirme.
Hedef: LEGO benzeri parçalarla oyuncu kendi build kombinasyonlarını keşfetsin. Hazır kombo tarifleri veya koşulsuz üstün build üretmeyelim.

## Doğrulanan mimari
- TypeScript, Vite, Three.js, Vitest; paket sürümü master üzerinde 0.6.8.
- src/fizik/ortak.ts: driftPenceresi kasıtlı drift için DR.on/DR.cool/DR.bt/DR.t; driftSkoru D.beta/D.act/D.score.
- src/fizik/arac-ornegi.ts: aracAdimi ve tohumlu Simulasyon; src/oyun/surus.ts: sabit adımda fizik, tur, yarış, uzak araç.
- docs/MIMARI.md: saf fizik 1/60 adımlı; replay girdilerle deterministik; uzak araçlar görüntü anlığıdır, araçlar arası çarpışma henüz YOK.
- README: yarış lastikleri otomatik atanıyor; garaj modifiye sistemi mevcut. Bunları geriye uyumlu koru.
- Bu bulgular master belgeleriyle sınırlı, uygulama öncesi gelistirme HEAD doğrulanmalı. (Doğrulandı: aşağıdaki FAZ 0 bölümü.)

## 10 çekirdek sistem ve ortak etiketler
1. Hareket: speed, acceleration, yawRate, brake, mass.
2. Tutuş/drift: slipAngle, driftIntent, driftActive, grip, stability.
3. Termal: tireTemp, engineHeat.
4. Aşınma: tireWear.
5. Enerji: energy, gain, spend, capacity.
6. Temas: relativeSpeed, contactNormal, damage, integrity.
7. Araç yapısı: drivetrain, differential, gearRatio, massDistribution.
8. Çevre: surface, wetness, weather, pickup.
9. Rakip AI: driverIntent, aggression, defense, adaptation.
10. Yarış: allowedSkills, objective, fairness.
Kodda bulunmayan etiketler uygulanmış varsayılmaz; önce adaptör veya yeni durum gerekir.

## Evrensel mekanik sözleşmesi
id, version, category (passive/active/part/environment), consumes, triggers, conditions, effects, costs, limits ve telemetry.
Tipli olay örnekleri: DriftStarted, DriftTickQualified, DriftEnded, NearMissConfirmed, ContactResolved, PickupCollected, AbilityActivated.
Kaynaklar: enerji, ısı, aşınma, hız, stabilite, slot.
Koruma: cooldown, cap, diminishingReturns, oncePerEvent, causalDepth, seed ve olay sırası.
Özel perk -> başka perk ID bağı yerine aynı ortak olaylara ve duruma tepki ver. Çekirdek saf ve deterministik kalsın.

## Kritik etkileşim matrisi (yönlü)
Tutuş/drift -> enerji: Drift Harvester; yalnız doğrulanmış drift, çift ödül yok.
Enerji -> tutuş: Traction Pulse; kendi enerjisini sınırsız üretme tehlikesi.
Drift -> drift: Slide Memory; kontrollü eşik, istemsiz drift ve sonsuz stack engeli.
Termal/aşınma -> tutuş: Soft Compound; aşınmayla kayma ve frenleme bedeli.
Temas -> hasar/enerji: Side Ram ve Close Call; gerçek rakip/temas altyapısı olmadan etkinleştirme.
Çevre -> enerji: Shared Boost Drops; seed, toplanma sırası, tüm yarışmacılara eşit kural.
Yetenek -> yetenek: olay zinciri derinlik sınırı ve kaynak döngüsü testi.
Modifiye -> hareket/tutuş: vites oranları, diferansiyel, kütle; mevcut fizik önce kullanılsın.
Rakip AI -> yarış: açıklanabilir sürüş profili, keyfî hız avantajı yok.

## 24 başlangıç yapı taşı
Fizik: Momentum, Slip Angle, Grip Envelope, Impact Geometry.
Lastik: Heat Curve, Wear Curve, Compound Choice.
Enerji: Energy Pool, Boost Output, Regeneration, Cooling.
Modifiye: Gear Ratios, Differential, Mass Distribution, Cooling Hardware.
Yetenek: Drift Harvester, Slide Memory, Close Call, Side Ram, Traction Pulse.
Çevre: Surface State, Shared Drops.
Rakip: Driver Personality, Adaptive Tactics.

## Fazlar
FAZ 0 Kod envanteri: gerçek tipler, drift, modifiye, replay, testler ve rakip mimarisi. Oynanış değişikliği yok.
FAZ 1 Feature flag kapalı saf mekanik yürütücü + Energy Pool + Drift Harvester + birim testleri.
FAZ 2 Slide Memory; mevcut kasıtlı drift, spin, replay ve sürüş-yardımı regresyonu.
FAZ 3 Lastik ısısı ve yıpranma, varsa mevcut modeli kullan; yarış lastiklerini bozma.
FAZ 4 Rakip fizik ve temas; ancak sonra Side Ram / Close Call / ortak pickup.
FAZ 5 Tek pist, iki farklı build ve açıklanabilir boss; oyun ve denge ölçümleri.

## İlk teknik PR kabul ölçütleri
1. Feature flag kapalıyken eski sürüş, hayalet, ekonomi ve modifiye değişmemeli.
2. Aynı seed ve olay sırası eşit enerji/durum üretmeli.
3. Tetikleme döngüsü sonlu, enerji sınırlı, tek olayla iki ödül yok.
4. Drift Harvester yalnız nitelikli kasıtlı drift'te enerji vermeli; sadece savrulma yeterli değil.
5. İlgili unit test, typecheck, lint, build CI kanıtı kaydedilmeli.

## Denge ve OP denetimi
Kaynak grafında pozitif döngü, otomatik tekrar, sonsuz yığınlama, hasar spam, sınırsız enerji ve karşı oyun yoksunluğu aranır. Ölçüler: winRate koşul bazlı, lapTime, energyUptime, skillDependency, counterCoverage, buildDiversity. Durumsal güçlü komboları otomatik nerf etme; test alarmı ve inceleme uygula.

## Claude/Codex devir talimatı
CLAUDE.md, docs/DEVIR.md ve bu kartı oku. Önce gelistirme HEAD ve dal durumunu doğrula. Faz 0 envanterini tamamla ve ardından Faz 1 saf sözleşme/yürütücü/unit testi kodunu ayrı commit ile uygula. Fizik dengesini ve master yayınını değiştirme. Kart ve devir dosyalarına gerçek test/commit sonucunu yaz.

## 2026-10-26 kullanıcı kararı: Roguelike test alanı
- Ana menüdeki Serbest Sürüş, güvenli çekirdek doğrulandıktan sonra arcade roguelike deneme moduyla değiştirilebilir. Eski serbest sürüşün temel amacı mekanik testiydi; test alanı yeni mod içinde korunabilir.
- Yarış/kariyer, ana menü, kayıt, ekonomi ve canlı sürüm şimdilik değiştirilmez.
- Roguelike yapı: her denemede seçmeli perk/skill/modifiye parçaları, oyuncunun kendi build'ini yaratması, değişen rakip/pist koşulları, karşı oyun ve deneme sonu analiz. Zorunlu hazır kombo yok.
- Öncelik: önce FAZ 1 çekirdeği ve CI; ardından ayrı deneysel menü akışı. Menüyü henüz değiştirme.

## FAZ 1 ara uygulama ve doğrulama (Codex, codex/sistemik-oynanis-tasarim; Claude dalına birleştirildi, kod yerine Claude sürümü geçti)
- src/cekirdek/mekanikler.ts bağımsız enerji ve tipli olay yürütücüsü olarak eklendi; varsayılan kapalı. tests/birim/mekanikler.test.ts eklendi.
- PR #15 taslak; gelistirme/master ile birleştirilmedi.
- İlk CI #40244805763: typecheck + lint başarılı, biçim (Prettier) başarısız; sonraki adımlar atlandı. Testlerin geçtiği iddia edilemez.
- Sonraki düzeltmeler: olay kimlikleri yalnız adım içinde biriktirilir (sınırsız bellek büyümesi kaldırıldı), sayı girdileri doğrulanır. Olaylar gerçek fizik adapter'ına henüz bağlı değildir.
- Açık engel: yeni iki dosyanın Prettier biçim uyumu ve CI doğrulaması; ardından olay kimliği ve deterministik tekrar testlerinin genişletilmesi. Code dosyaları bu durumdayken 'tamamlandı' veya 'yayında' sayılmamalıdır.

## FAZ 0 bağımsız değerlendirme (Claude, 2026-10-25)

Taban: origin/gelistirme 75be48a (paket 0.7.7; canlı master 0.6.8 / 147ea03). Dal o tabanın üstünde, 4 commit önde: 9452d2a (kart), f35dd39 + 38c254e + 8c5a3f9 (FAZ 1 taslağı `src/cekirdek/mekanikler.ts`, 5 birim testi geçiyor). Taslağı oyun kodu hiçbir yerden çağırmıyor; oynanış değişmemiş.

### Gerçek entegrasyon noktaları
1. **Drift olayı kaynağı:** iki ayrı "drift" var. `DR.on` (`fizik/ortak.ts → driftPenceresi`) bilinçli drift durum makinesidir: açı eşiği + gaz + 0,25 sn ya da el freni+direksiyon; abartınca `DR.cool=1,2` ve `cx.olay.spin()`. `D.act` (`driftSkoru`) ise `DR.on || |beta|>0,5` olduğu için **kontrolsüz savrulmada da 1** olur. Drift Harvester'ın "nitelikli" girdisi yalnız `DR.on` geçişlerinden türemeli; `D.act`/yarış komboyu (`yaris-kurallari.ts → driftAdimi`) kaynak alınırsa savrulma enerji üretir.
2. **Bağlanma yeri:** `oyun/surus.ts → surusAdimi` sabit adımda `aracAdimi` → `turSayaci` → `evTick` → `uzakAdimi` sırasını çalıştırır. Mekanik yürütücü, fizik adımından **sonra**, salt okuyan bir gözlemci olarak buraya bağlanmalı (FAZ 1'de bağlanmaz). Fizik içine (model.ts 935 satır) kanca konmaz.
3. **Fizik etkisi kapısı:** Fizik dünyayı yalnız `FizikBaglami` (dunya/kurulum/olay/rng) ve `SurusKurulumu` üzerinden okur. Enerji harcayan bir etki (Traction Pulse, boost) ileride fiziğe ancak yeni, açıkça tipli bir girdi alanı olarak girebilir; `rng` tüketmemeli (tohumlu fizik rastgeleliği sırası değişir).
4. **Modifiye:** `arac/parcalar.ts` + `oyun/modifiye.ts` araç değerlerine ve kurulum alanlarına (`diff`, `lock`, `bal`, `susp`, lastik) zaten işliyor. Gear Ratios / Differential / Mass Distribution yapı taşları yeni sistem değil, bu mevcut parça hattının parçasıdır; ayrı perk olarak çoğaltılmamalı.
5. **Yarış lastiği:** `arac/yaris-lastigi.ts` otomatik atama yapar; lastik ısısı/aşınma modeli kodda **yok** (`grep` boş). FAZ 3 yeni durum ister.
6. **Çevre:** `havaTutusu` (yağmur/kar), `S.wet`, `S.mud`, `SURF` mevcut; pickup/drop sistemi **yok**.
7. **Rakip/temas:** Uzak araçlar (`oyun/uzak.ts`) hayalet/ağ anlık görüntüsüdür; araçlar arası çarpışma ve rakip AI **yok**. `cok-arac.test.ts` yalnız yan yana bağımsız fizik örneklerini sınar. Side Ram, Close Call, Adaptive Tactics, Driver Personality FAZ 4 öncesi etkinleştirilemez.

### Riskler (önem sırasıyla)
1. **Hayalet/rekor belirlenimciliği (yüksek):** `GirdiKaydi` adım başına yalnız direksiyon/gaz/fren/bayrak saklar (`SURUM=1`); `surusAdimi` kurulum JSON imzası değişince kaydı `kesik` sayar; `hayaletGirdiKaydiOku` sürüm-3 başlığı + kurulum ister. Fiziğe dokunan herhangi bir mekanik geldiğinde (a) takılı mekanik listesi + sürümleri kurulum imzasına, (b) yetenek etkinleştirme girdisi kayıt alanına girmeli, (c) kayıt sürümü artmalı; aksi hâlde hayalet sapar ve eski rekor yeni kuralla karşılaştırılır. Mekanikli koşu rekoru ayrı anahtar ister (`kariyer1_`/`drift2` örneğindeki gibi).
2. **Sınıf/denge bütçesinin delinmesi (yüksek):** Sınıf altı görünür özellik toplamından gelir (DENGE §1, ALANLAR "Özellik toplamı"). Performans veren perk bu toplamın dışında kalırsa D sınıfı yarışta gizli güç olur. Etki üreten her mekanik için slot/bütçe kuralı ve DENGE §9 dört etki (performans bütçesi, başarı eşiği, kazanç hızı, kayıt uyumu) karta yazılmadan oyuna açılmamalı.
3. **Tür tarafsızlığı (orta):** ALANLAR kararı: fizik `yolTuru` okumaz, tür çarpanı yok. Mekanik koşulları da pist türüne göre değil fiziksel duruma göre tetiklenmeli (ör. "drift yarışında +%x" yasak).
4. **Drift yarışıyla çift ödül (orta):** Drift yarışı zaten açı×hız kombo, bonus ve x6 verir. Harvester enerjisi skora dönüşmemeli; enerji→puan yolu açılırsa aynı drift iki kez ödüllenir.
5. **Taslak teknik borcu (orta, FAZ 1'de düzeltilir):** `gorulenOlaylar` her adımda kopyalanıp sınırsız büyür (60 Hz'de O(n²) bellek/zaman); drift eşikleri (`hiz<11`, `aci<0,2`) fizikten kopya sabit; olay kimliğini kimin ve nasıl ürettiği tanımlı değil; nedensel derinlik ve telemetri yok.
6. **Sürüş yardımı etkileşimi (FAZ 2):** `as.dft`/`as.ini` drift desteği `DR.on`u kolaylaştırır; yüksek yardımla Harvester daha çok enerji toplar. Slide Memory ile birlikte yardım seviyesine göre ölçülmeli; yardım sınıfı değiştirmez kuralı korunur.
7. **Performans (düşük):** iPhone 13'te adım başına ayrım yapan bir dizi/nesne kopyası her karede GC baskısı yaratır; yürütücü sabit boyutlu durumla çalışmalı.

### FAZ 1 için alınan kararlar
- Oyuna bağlanmaz; `surus.ts` ve fizik dosyaları değişmez. "Bayrak kapalı" = yürütücü çağrılmaz + `etkin=false` aynı durumu döndürür.
- Olay kaynağı salt okuyan `driftGozlemcisi` adaptörü: `DR.on` geçişlerinden DriftStarted / DriftTickQualified / DriftEnded üretir, `SimDurumu`nu değiştirmez.
- Tekrar engeli sınırsız kimlik listesi yerine artan olay sıra numarası (`sira`); bellek sabit.
- Nitelik koşulları mekanik tanımında veri (en az hız/açı); "kasıtlı" bilgisi yalnız `DR.on`.
- Olay kuyruğu nedensel derinlik ve adım başı işlem sınırıyla sonlu; mekanik başına telemetri (tetik, kazanç).

## FAZ 1 uygulaması (Claude)

Kapsam: `src/cekirdek/mekanikler.ts` (taslağın yerine), `tests/birim/mekanikler.test.ts`. Oyun kodu, fizik, `surus.ts`, hayalet, ekonomi, modifiye **değişmedi**; modülü oyunda çağıran yer yok. Oyun sürümü artmaz (oynanış değişikliği yok).

- `MEKANIK_SISTEMI_ACIK = false`; `mekanikAdimi(..., etkin=false)` aynı nesneyi döndürür.
- Tipli girdi olayları `DriftStarted`, `DriftTickQualified`, `DriftEnded{spin}`, `AbilityActivated` + türev `EnergyGained`. Tekrar engeli artan `sira` (sabit bellek).
- Mekanik tanımı: id, versiyon, kategori, tetik, `kosul` (enAzHiz/enAzAci/yetenek), maliyet, beklemeAdimi (0 = adımda en çok bir kez), kazanç + birim (saniye/olay). Aynı id ikinci kez takılmaz; geçersiz tanım atılır.
- Sonluluk: mekanik kendi `EnergyGained`ine tepki vermez; adım başı tek tetik; `NEDENSEL_DERINLIK=3`, `ADIM_ISLEM_SINIRI=64`, atılanlar `kesilen` sayacında (denge alarmı).
- Telemetri: mekanik başına tetik/kazanç/harcama (ileride energyUptime ölçümü).
- `driftGozlemcisi`: yalnız `DR.on`dan olay üretir; havada nitelikli adım yok; spin bitişi `DR.cool > 0` ile.
- Drift Harvester v1: 6 enerji/sn nitelikli drift, en az 11 m/s ve 0,2 rad. **Bu sayılar ölçülmüş denge değildir**; DENGE §9 dört etkisi (performans bütçesi, başarı eşiği, kazanç hızı, kayıt uyumu) enerji harcayan ilk mekanikle birlikte yazılacak. Enerjinin şu an hiçbir harcama yolu yok.

### Kabul ölçütleri ve testler (17 birim)
1. Bayrak kapalı → eski davranış: bayrak `false`, kapalı yürütücü aynı nesne; gerçek fizikte (Boş Otopark, Beyaz Kurt, drift önayarı, gerçekçi, 9 sn) gözlemci+yürütücü açık/kapalı `SimDurumu` JSON birebir aynı.
2. Belirlenimcilik: aynı girdilerle yürütücü ve gerçek fizik koşusu aynı enerji/olay dizisi.
3. Sonluluk/sınır: karşılıklı EnergyGained döngüsü her mekanikte 1 tetikte durur; işlem sınırı aşımı sayılır; enerji 0..kapasite; aynı olay/aynı mekanik iki kez ödül vermez; aynı adımda iki tik tek ödül.
4. Nitelik: savrulma (DR.on=0, D.act=1, 0,9 rad) olay/enerji üretmez; havada nitelikli adım yok; eşik altı hız/açı ve geçersiz dt enerji vermez; ölçülü gerçek drift enerji üretir, abartan sürüş `DriftEnded{spin:true}`.
5. CI kanıtı: aşağıda.

### Açık tasarım soruları (FAZ 2 öncesi Cem'e)
- Spinle biten driftin o ana kadar topladığı enerji korunsun mu, yansın mı (yarış kombosu yanıyor)?
- Enerjinin ilk harcama yolu ne olacak (boost / Traction Pulse) ve hangi yarışlarda açık (allowedSkills)? Kariyer rekorları için ayrı anahtar kabul mü?

### Doğrulama (yerel, 91f193d kodu; CI koşmadı)
- `npm run kontrol` (tip + ESLint + Prettier) başarılı. `npm test` 23/23 dosya, 323/323 test başarılı (mekanikler 17). `npm run build` başarılı (Firebase yardımcı indirme uyarısı ağ kaynaklı, derlemeyi bozmadı).
- `npm run alan -- fizik`: 47 vitest geçti, 35 alan seçimiyle atlandı (fizik.test 28, parcalar.test 7; aynı testler tam `npm test`te geçti), tarayıcı 16/16.
- Durum: kod `claude/sistemik-oynanis-faz1` dalında. `codex/sistemik-oynanis-tasarim`a eşzamanlı Codex commit'leri (0b418c3, 08551ed, 5748895, PR #15) geldiği için o dala push edilmedi; tek sahip kararı Cem'de. gelistirme/master'a birleştirilmedi.

### 2026-10-26 birleştirme
- Cem kararı: Claude dalı tek sahip. codex/sistemik-oynanis-tasarim (5748895) merge commit ile alındı; kodda Claude sürümü korundu, Codex'in "adım süresi ≤ 1/30 sn" ve "bekleme tamsayı" sınırları eklendi (test kapsamında). origin/gelistirme 6783c6a (0.7.8) de birleştirildi.
- Yeniden doğrulama: `npm run kontrol` temiz, mekanikler 17/17. gelistirme birleşmesi mekanik modülüne ve onu çağıran koda dokunmadığı için önceki tam `npm test` 323/323 sonucu mekanik kapsamı için yeniden kullanıldı; birleşik HEAD'de tam koşu CI'da yapılacak.

### Cem'in vereceği kararlar (FAZ 2 öncesi)
1. İlk deneme yeri: mekanikler yalnız yeni roguelike/deneme modunda mı açılsın (öneri; kariyer, sınıf, rekor ve ekonomi hiç etkilenmez) yoksa kariyerde de mi?
2. Enerjinin ilk harcama yolu: kısa boost (hız) mı, Traction Pulse (geçici tutuş) mu? Öneri: Traction Pulse; düz hız avantajı drag/zamanlı yarışlarda sınıf bütçesini en çabuk deler.
3. Spinle biten drift: o drift boyunca toplanan enerji kalsın mı, yansın mı (yarış kombosu yanıyor)? Öneri: yansın, abartma cezası tutarlı olsun.
4. Mekanikli koşuların rekor/hayaleti: ayrı anahtarda, kariyer ödülü vermeden (öneri) mi?
5. Sürüş yardımı: yüksek drift yardımı enerji kazancını azaltsın mı, yoksa önce ölçülüp sonra mı karar verilsin (öneri)?
6. Sıradaki adım: FAZ 2 Slide Memory mi, yoksa önce Harvester + enerji göstergesi + tek harcama yolunu yalnız /dev/ deneme sürümündeki gizli bir test alanına bağlayıp elle hissetmek mi (öneri; oyun değişikliği olduğu için deneme yaması +1)?
7. Codex'in taslak PR #15'i kapatılsın mı (içeriği bu dala alındı)?
