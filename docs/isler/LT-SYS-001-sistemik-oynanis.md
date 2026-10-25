# LT-SYS-001 Sistemik oynanış ve etkileşim çekirdeği

Durum: tasarım ve keşif. Sahip: ChatGPT; Claude aynı karttan devralabilir.
Dal: codex/sistemik-oynanis-tasarim, taban: gelistirme.
Hedef: LEGO benzeri parçalarla oyuncu kendi build kombinasyonlarını keşfetsin. Hazır kombo tarifleri veya koşulsuz üstün build üretmeyelim.

## Doğrulanan mimari
- TypeScript, Vite, Three.js, Vitest; paket sürümü master üzerinde 0.6.8.
- src/fizik/ortak.ts: driftPenceresi kasıtlı drift için DR.on/DR.cool/DR.bt/DR.t; driftSkoru D.beta/D.act/D.score.
- src/fizik/arac-ornegi.ts: aracAdimi ve tohumlu Simulasyon; src/oyun/surus.ts: sabit adımda fizik, tur, yarış, uzak araç.
- docs/MIMARI.md: saf fizik 1/60 adımlı; replay girdilerle deterministik; uzak araçlar görüntü anlığıdır, araçlar arası çarpışma henüz YOK.
- README: yarış lastikleri otomatik atanıyor; garaj modifiye sistemi mevcut. Bunları geriye uyumlu koru.
- Bu bulgular master belgeleriyle sınırlı, uygulama öncesi gelistirme HEAD doğrulanmalı.

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
