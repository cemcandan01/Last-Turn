# LT-SYS-006 — Mutant modüler test atölyesi ve drift yarış uzmanlığı

**İstek (Cem, 2026-10-28):** Mutant koşuları son faza kadar yaklaşık bir saat sürüyor; testte süreleri kısalt, istediğim skill/upgrade'i seçip bağımsız deneyeyim. Her yarış türüne oynanış ustalığı gerektiren ayrı mekanik gelsin; önce drift. Driftte stok araç da arka kaydırarak girebilsin; kontrollü açı, stock ve gerçek parçalarla artabilsin. Sandıklar keşfedilecek 3B objeler olsun; açıldığı anda tek rastgele ödül gelsin ve sadece al/reddet seçeneği olsun. Upgrade seçimlerinde ait oldukları yarışın çerçeve rengi ve ikonu gözüksün.

**Sahip:** Codex (ChatGPT). **Dal:** `codex/mutant-drift-laboratuvari`, taban `gelistirme` 5a57aa6. **Kapsam:** Mutant test akışı + ilk drift çekirdeği + sandık/UI. Claude aynı dosyalara dalmasın. Sonraki türlerin mekanikleri **bu kartta uygulanmadı**.

## Yapılanlar
1. `src/oyun/mutant-kosu.ts`: test koşusunda boss 3/3,5/4 dk; normal 15/13 dk korunur. `testKurulumu` ile pasif, skill teklifi (yeni/seviye/evrim/eklenti), parça; `testBolgeyeGec` ile 1–3 bölge. Test özellikleri `k.test` korumasında.
2. `src/oyun/mutant.ts`: yalnız yerel geliştirme veya `/dev/` üzerinde `?mutantTest=1` seçeneği. `src/arayuz/mutant-ui.ts` ilk araç/perk seçimi ardından test atölyesi; doğrudan drift yarışı ve yarış sonunda yeniden kurup deneme. Normal koşuya verilmez.
3. `src/fizik/ortak.ts`, `fizik/tipler.ts`, `oyun/surus.ts`, `oyun/yarislar.ts`, `fizik/yeni/model.ts`: `driftYarisi` isteğe bağlı fizik bayrağı; 12° kayma giriş şartı + 0,12 sn; minimum hız 7 m/sn; azami kontrollü açı araç dmax, AWD, ayar lock/diff ve drift desteğinden türetilir (yaklaşık 22°–58°). Fiziksel savrulma sınırı aşınca kombo yakılır; açık dünya ve diğer yarış türlerinin drift akışı etkilenmez.
4. Sandık ödülü sadece ilk açılışta, ayrı tohumla ve sahip olunmayan eklentilerden gelir; tek ödül, al/reddet; reddedince tüketilir ve yeniden zar atılamaz. Minimapten sandık işaretleri kaldırıldı; dünya işaret çiziminde düşük poligonlu 3B ahşap/metal sandık, uzaktan ışık kulesi olmadan.
5. Tüm eşsiz eklentiler alınmışsa boş sandık yerine rastgele para (+180), tamir (+35) veya nitro enerjisi (+60) gelir; kaynağı da oyuncu reddedebilir. Tek ganimet ve alınmış eklentiyi yeniden sunmama kuralı değişmez.
6. Kart uzmanlık sınırları: salt yarış türüne özgü mekaniklerde yarış rengi ve oyundaki ikon, genel parçalarda nötr.

## Kabul / kontrol
- [ ] GitHub CI typecheck+lint+format+test+build (son kaynak ödülü ve CI alan koşucu değişiklikleriyle yeniden doğrulanmalı).
- [ ] Test `mutantTest` ile seçilen parça/skill aynı drift yarışında denenebiliyor; tekrar laboratuvara dönülüyor.
- [ ] Aynı tohum/koşuda bir sandıktan alınan ödül diğer sandıkta görünmüyor; testte reddedilen ganimet tüketiliyor.
- [ ] Drift: stok araçta fiziksel kaymayla giriş, güçlü drift kurulumunda 40°+ ulaşılabilir aralık, sınır dışına çıkınca kombo yanması; gerçek iPhone 13 yatay sürüş hissi ayrıca denenecek.
- [ ] Açık dünya + kariyer regresyonu değişmedi; `driftYarisi` yalnız `dp` yarışına bağlandı.
- [ ] 3B sandıklar çarpışmasız; mobil görsel ölçüm ve gizlilik performansı ayrıca doğrulanacak.

## Açık riskler ve sıradaki işler
- Fizikte açı **teorik kontrol tavanıdır**, gerçek sürücünün her hız/araçla sürdürebildiği açı ölçülmüş değil. Test pilotu ve kullanıcı sürüşüyle gerçek tavan, drift yardımı, pist dışı kayıp, aşırı güçte 360° dönüş dengelenmeli. **360° drift henüz uygulanmış değildir.**
- Seviye ve yarış kartları için eşleme şu anda güvenle türü bilinen kartlarda uygulanır; çok türü etkileyen kartlar nötr kalır. Tüm skill/eklenti tiplerinin renk etiketlerini nihai etkilerine göre sınıflandırıp genişletmek gerek.
- Yeni drift puan eğrisi için mevcut `MUTANT_REFERANS` ve kariyer drift hedeflerini yeniden ölçmek gerekiyor. Önceki ölçümleri yeni fiziğe göre geçerli sayma.
- Başka türlere geçmeden bu drift oynanışını oyuncuyla doğrula; sonra drag (kalkış/tepki), ralli (zemin/rota), rallikros (zemin geçişi/iniş) ve asfalt (ideal çizgi/rakip taktikleri) ayrı kartlarda geliştir.

**Çalışma anlaşması:** Codex'in bu dalında tamamlanmamış/kanıtlanmamış değişiklikleri `gelistirme` veya `master` dalına otomatik birleştirme. Claude ancak Cem devri açıkça isterse devralır, önce dal ve PR'ı kontrol eder.
