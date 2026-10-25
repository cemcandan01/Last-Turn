# LT-SYS-001 Sistemik oynanış ve etkileşim çekirdeği

Durum: FAZ 0 bağımsız değerlendirme tamam; FAZ 1 uygulamada. Aktif sahip: Claude (2026-10-25'te ChatGPT/Codex'ten devraldı; aynı görevde başka uygulayıcı yok).
Dal: codex/sistemik-oynanis-tasarim, taban: gelistirme.
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
