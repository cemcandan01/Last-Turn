# Claude + Codex ortak çalışma

Cem aynı Last Turn projesinde iki aracı dönüşümlü kullanır. Bu bir sohbetler arası otomatik mesajlaşma değildir: diğer araç repoyu güncelleyip `CLAUDE.md`, `docs/DEVIR.md` ve ilgili görev kartını okuyunca ortak çalışmayı ve son durumu öğrenir. Bu dosya, görev/devir/verimlilik konusunda eski ayrıntılı rehber ve skill'lerdeki çelişen varsayılanların yerini alır; oynanış kararlarını ve canlı onayı şartını değiştirmez.

## Tek görev, tek kart, tek aktif uygulayıcı

- Kart: `docs/isler/<kimlik>.md`. İlk kullanıcının isteğini aynen koru; yorumunu ayrıca yaz.
- Başlamadan görev sahibi, konu dalı ve temel SHA'yı yaz. Başka araç görevi yürütüyorsa aynı dosyalara başlama. Sahip kaydı koordinasyon içindir; teknik bir kilit değildir. Git durumunu ve uzak dalı ayrıca doğrula.
- Cem “diğer araca geçiyorum/devral” dediğinde bu devir yetkisidir; eski ajanın ayrıca onayı beklenmez. Devralan uzak/yerel değişiklikleri kontrol edip kartın sahibini ve devir nedenini günceller; önceki ajanın gönderilmemiş dosyalarına erişimi yoksa bunları var saymaz.
- Kota bitmeden ara commit'i konu dalına gönder; yarım iş denemeye birleştirilmez. Devirde çalışmayan/denenmeyen şeyi açıkça yaz. Gönderilemeyen yerel dosya diğer araca geçmiş sayılmaz.
- Devralan araç önce commit'i ve test kanıtını doğrular, aynı karttaki sıradaki adımdan devam eder. Aynı işi yeniden planlamaz. Yeni bir sohbet açılması, yeni bir görev yaratmak anlamına gelmez.
- Gerekmedikçe aynı anda iki modelle aynı geliştirmeyi yaptırma. İkinci model bağımsız risk denetimi için yararlı olabilir; bedelsiz bir kalite artışı varsayma.

## Kullanıcının fikrini ilk seferde karşılamak

Kullanıcı teknik prompt yazmak zorunda değildir. Ajan, doğal isteği şu sözleşmeye çevirir:

1. Oyuncu hangi ekranda/hangi hareketten sonra ne görecek veya hissedecek?
2. Referans/örnek: varsa ekran görüntüsü, beğenilen önceki sürüm veya örnek manevra.
3. 3–5 gözlenebilir kabul ölçütü; korunacak mevcut davranış ve kapsam dışı.
4. Kanıt: ilgili ekran, iPhone 13 yatay ölçüsü, otomatik test veya sayısal ölçüm.
5. Sonucu gerçekten değiştiren açık sorular; soruları tek turda topla. Küçük ve açık işte kartı ajan doldurup devam eder. Görünüşü belirsiz büyük işte yanlış yönü büyük kod değişikliğine çevirmeden küçük bir örnekle netleştir.

Revize geldiğinde eski maddeyi sessizce değiştirme: “istenen / çıkan / fark / düzeltme / kanıt” şeklinde karta ekle. Görsel kaliteyi yalnız unit test ile, sürüş hissini yalnız ekran görüntüsüyle doğrulama. Kullanıcının keyfi tercihini hata diye sunma; kullanıcıya sorulması gereken tercihi tahmin ederek kesinleştirme.

## Daha az tekrar, aynı doğrulama

- Başlangıçta kısa kök rehber + devir + görev + yalnız ilgili alan. Ayrıntılı kararları ihtiyaç oldukça aç. Keşif için önce `rg`; dosyayı veya tüm araç listesini gereksiz yere dökme.
- Küçük iş doğrudan tek uygulayıcıyla; bağımsız keşif/test/denetim yalnız belirsizlik veya risk varsa. Ajanlara bütün sohbet yerine dar görev ve dosya ver.
- Yerelde hızlı ilgili denetim; aynı kaynak SHA, bağımlılık kilidi, hedef dal ve test kapsamı için başarılı CI kanıtını tekrar üretme. Kartta test edilen kaynak/merge SHA, hedef SHA, kilit dosyası özeti, çalıştırıcı ve ortam kaydı bulunmalı. Birleştirmeden sonra yalnız etkilenmiş kontrolleri yenile; hedef dal veya kod değişirse eski kanıtın kapsamını yeniden değerlendir.
- Görsel değişiklikte ilgili ekranları al; bütün pist görüntülerini her metin değişikliğinde çekme. Fizik değişikliğinde ilgili senaryo ve ölçümleri çalıştır. Tam regresyon canlı öncesi aynı ciddiyetle sürer.
- Başarılı testin özeti, koşulan kapsam, commit ve CI/kanıt yolu yeterlidir. Ham logu sakla; yalnız hata ayıklarken ilgili satırlarını oku. Başarısız veya ortam yüzünden koşulamayan test ayrı yazılır.
- Aynı ağ/kota/izin hatasını tanı koymadan tekrar tekrar deneme. Alternatif olarak mevcut yetkili CI/yerel ortamı kullan. Sadece başka adrese giderek erişim kısıtını aşmaya çalışma.
- Dal notunda en çok 2.000 karakter güncel özet hedefle; tarihsel açıklamalar ilgili belge/görev kartında kalır. Satır sayısı tek başına bağlam bütçesi değildir.

## Maliyeti nasıl ölçeceğiz?

Şu an Claude/ChatGPT oturumlarının toplam token/kota telemetrisi repoda yok; “en pahalı adım” ve tasarruf yüzdesi kesin ölçülmüş değildir. GitHub dakikası, kullanıcı bekleme süresi ve model kotası farklı ölçülerdir.

Her tamamlanan kartta revize turu, süre, ilk kabul durumu, tekrar test/kurulum, kullanılan ajan sayısı ve varsa platformun gösterdiği kullanım kaydedilir. API fatura verisi olmadan TL/token tutarı uydurma. İlk beş benzer iş bir başlangıç örneklemidir; sonra ilk kabul oranı ve kabul edilmiş iş başına kullanım karşılaştırılır. Kısa prompt veya düşük token tek başına kalite kanıtı değildir.

## Ortam ve eklentiler

- Mevcut temel: GitHub + TypeScript/Vite/Three.js + Vitest/Playwright + GitHub Actions. Telefonla çalışma bu altyapıda sürdürülebilir; aynı oyun için yeniden Unity veya ikinci editör kurmak şart değildir.
- Context7: bağımlılığın sürümüne ait API belirsizse yararlı. Her kod işinde otomatik sorgu yapma. Bu ChatGPT hesabında yalnız kurulum önerildi; kurulmuş/bağlanmış sayılmaz. Claude tarafındaki kurulum ayrıca doğrulanır.
- Playwright: depoda mevcut CLI/testler önceliklidir; daha fazla tarayıcı MCP aracı eklemek otomatik tasarruf değildir. Yerel Chromium indirmesi bu ortamda HTML döndürüyor; GitHub Actions tarayıcı testleri çalışıyor.
- Serena: sembol bazlı gezinmenin gerçekten keşif maliyetini düşürdüğü büyük işler için daha sonra ölçülebilir. Şimdilik `rg` ve mevcut dosya haritasıyla başlamanın ek kurulumu yok.
- Superpowers: tasarım netleştirme, sistematik hata ayıklama ve doğrulama yaklaşımı yararlı; tüm zorunlu ajan/onay zincirini mevcut sürecin üstüne ikinci kez bindirme. Şimdilik kurulu değil.
- Bilgisayar bağlantısı/yerel CLI veya dış servis kimlik doğrulaması gerektiğinde kullanıcıya gereken tek adımı söyle; erişmediğin bilgisayarda kurulum yaptığını söyleme.

## İlk ölçüm ve sonraki beş iş

2026-10-25 başlangıcı: otomatik kök rehber 21.972 bayttan 3.700 bayta indi (~%83 daha küçük metin). Bu kota veya faturada %83 tasarruf ölçümü değildir; eski içerik aynen ayrıntı belgesindedir. Yeni araç 14 testle doğrulandı. Deneme öncesi tip/ESLint/biçim ve kurallar alan testi çalışır; bu süreç değişikliği için bütün oyun regresyonu yeniden koşulmaz.

Sonraki beş geliştirmede hedef: görevin ilk kabul ölçütlerini koddan önce kaydetmek, her revizenin sebebini ayırmak, aynı commit için boş/tekrar test koşumlarını kaydetmek ve kabul edilmiş iş başına süre/kullanımı karşılaştırmak. Hedef sayısal bir başarı garantisi değildir; sonuçlar kötüleşirse süreç sadeleştirilir veya düzeltilir.

Bir sonraki Claude oturumu için Cem'in tek yönlendirmesi yeterlidir: “gelistirme dalını güncelle, CLAUDE.md ile docs/DEVIR.md'yi oku ve görev kartından devam et.” Mevcut açık Claude sohbeti Git'i güncellemeden bu değişikliği kendiliğinden öğrenmiş sayılmaz.

## Araştırma kaynakları (2026-10-25)

- OpenAI: [Best practices](https://learn.chatgpt.com/docs/learn/best-practices), [Customization](https://learn.chatgpt.com/docs/customization/overview): kısa kalıcı rehber, hedef/bağlam/sınır/kabul ölçütü, gerektiğinde yüklenen iş akışları.
- Anthropic: [Manage costs effectively](https://code.claude.com/docs/en/costs): bağlam, ajan ve araç kullanımının maliyeti; Claude Code'da mevcutsa /usage ile gözlem. Yerel geçmiş, diğer cihaz/claude.ai kullanımlarının tamamını kapsamayabilir.
- Microsoft: [Playwright CLI](https://github.com/microsoft/playwright-cli): kod ajanları için küçük CLI çağrıları; mevcut Playwright testleriyle yeni paketi aynı şey sayma. Last Turn mevcut npm playwright testlerini kullanmaya devam eder.
- Upstash: [Context7](https://github.com/upstash/context7/blob/master/packages/mcp/README.md): sürüme uygun API belgeleri; MCP kaynağı açık, servis altyapısının tamamı açık kaynak değil.
- Oraios: [Serena](https://github.com/oraios/serena): sembol ve ilişki bazında kod erişimi; yararı Last Turn üzerinde ölçülmeden tasarruf yüzdesi vaat edilmez.
- Obra: [Superpowers](https://github.com/obra/superpowers): tasarım/plan/test/denetim iş akışları; mevcut süreçle çakışan zorunlu adımlar ikinci kez etkinleştirilmez.
