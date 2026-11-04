# Kalıcı yerel Codex–Claude koordinatörü

- Durum: revize 3 tamamlandı; resmi oturum doğrulaması + ayrı manuel ek kullanım kontrolüyle kısa salt okunur analiz çalışıyor. Commit/push/merge yok.
- Aktif sahip: Codex (bu revizyondaki mevcut bağlam nedeniyle; kalıcı üstünlük/koordinatör rolü değil)
- Alan: altyapı / Unity geçiş süreci
- Dal: `unity/yerel-gelistirme`
- Başlangıç SHA: `cf6aa8ab497114f09104a0306f034cd5698511e5`
- Sabit TS referansı: `typescript-baseline-0.8.18` → `df3549e709469f0b519ebfbeaa9f63c1040fee05`
- İkinci ajan: ilk kurulumda yalnız salt okunur sürüm okuma doğrulaması yapıldı. Revize 2'de küçük/yerel mimari-test işi için ikinci model çağrısı yok; maliyet kaynağı belirsizken yeni CLI modeli başlatılmaz.

## Revize 2 — kullanıcının yeni özgün isteği

Last Turn ajan koordinatörü için önemli bir mimari değişiklik istiyorum.

Codex ve Claude Code arasında kalıcı baş geliştirici / ikinci geliştirici hiyerarşisi olmayacak. İkisi de eşit yetkili geliştirme ajanları olacak.

**Dinamik görev yönlendirme:**

1. Görev sahibini işin türüne, gerekli uzmanlığa, mevcut bağlama, başarı geçmişine ve kullanılabilir kapasiteye göre seç.
2. Küçük görevlerde yalnızca bir ajan çalışsın. Bağımsız geliştirme, inceleme veya test gerçekten faydalıysa ikinci ajan devreye girsin.
3. Her iki aboneliğin 5 saatlik ve haftalık kullanım sınırlarını dikkate al. Resmi kullanım verileri erişilebilir değilse kapasiteyi bilinmiyor olarak raporla; kalan kota veya token miktarı uydurma.
4. Kota nedeniyle görev yarıda kalırsa görev kartı, mevcut commit, değişiklikler ve test kanıtları üzerinden diğer ajan güvenli biçimde devralabilsin.
5. Claude veya Codex'in tek başına koordinatör olması zorunlu olmasın. Koordinatör betiği mümkün olduğunca ajanlardan bağımsız çalışsın.
6. Kullanılan model, ajan, test kapsamı, görev sonucu ve varsa kullanım bilgileri kısa bir rapora işlensin.
7. Gereksiz alt ajan, tekrarlanan analiz ve uzun regresyon çalışmalarından kaçın.
8. API üzerinden kullanım ile abonelik kapsamındaki kullanımı ayırt et. Benim açık onayım olmadan ücretli API kullanımına veya ek kredi tüketimine geçme.

Mevcut koordinatör geliştirmesini bu kurallarla tamamla. Henüz push veya merge yapma.

## Revize 3 — kullanıcının özgün isteği ve manuel kontrolü

Koordinatörün 28/28 testinin geçmesi iyi. Şimdi kalan abonelik doğrulama engelini çözmeni istiyorum.

Hedefimiz kusursuz kota ölçümü değil, mevcut ChatGPT ve Claude abonelikleriyle güvenli çalışmak.

1. Codex ve Claude CLI'ın mevcut oturum türünü resmi ve desteklenen yöntemlerle doğrula.
2. Abonelik kotası bilinmiyorsa bilinmiyor olarak raporla. Bunu çalışmayı otomatik engelleyen bir koşul haline getirme; ancak faturalandırma kaynağının güvenliği doğrulanmadan model çağrısı yapma.
3. API anahtarı veya ücretli ek krediye istemsiz geçişi önle. Kimlik bilgilerini, tokenları veya gizli yapılandırma değerlerini loglama.
4. Bir CLI'ın abonelik üzerinden çalıştığı güvenilir biçimde doğrulanamıyorsa manuel başlatma seçeneği sun; güvenlik kilidini dolanma.
5. Görev sahibi olarak Claude veya Codex seçilebilsin. Gereksiz ikinci ajan çağrısı yapılmasın.
6. İlk gerçek çalıştırma denemesi yalnızca salt okunur, kısa bir analiz olsun. Push, merge, commit ve uzun regresyon yapma.

Sonuç olarak hangi güvenlik kontrollerinin gerçekten uygulanabildiğini, hangilerinin manuel kaldığını ve koordinatörün nasıl başlatılacağını raporla.

- Kullanıcının bu oturumdaki doğrudan hesap-ayar teyidi: **“İkisinde de ücretli ek kullanım kapalı.”** Bu, ücretli kullanım izni değildir; resmi otomatik kredi ayarı doğrulaması diye sunulmaz. Ignore edilen sabit `tests/cikti/koordinator/abonelik-kontrol.json` kaydı 24 saat geçerlidir; hesap/ayar değişikliğinde geçersizdir. Yeni teyit yalnız etkileşimli manuel kontrolle alınır; genel `--baglam` verisi maliyet kapısını açmaz.
- Resmi metadata kontrolü (model yok): `codex login status` → ChatGPT; `claude auth status` → claude.ai / Pro. Codex stable app-server `account/read` → ChatGPT Plus; `account/rateLimits/read` → bu okuma anında 5 saat %37 kullanılmış, haftalık %9 kullanılmış ve mevcut kredi havuzu yok. Bunlar tarihli gözlemdir, kalan token tahmini değildir. Claude kapasitesi bilinmiyor; bu tek başına çağrıyı engellemez.
- Yeni kontroller: temiz çocuk ortamı (API anahtarı/bearer/OAuth override/proxy/üçüncü sağlayıcı env taşınmaz), CLI auth kaynak sabitlemesi, gizli çıktı alanı/kalıbı maskesi, raw auth/stderr kaydetmeme, gerçek probe makbuzu ve manuel ek kullanım teyidi ayrımı. Kimlik bilgisi dosyaları okunmadı veya değiştirilmedi.
- Claude yürütme: forceLoginMethod=claudeai, safe/restricted, yalnız Read/Glob/Grep, MCP/hook/skill kapalı. Codex yürütme: ChatGPT/OpenAI sabit, ignore-user-config, read-only/never, shell/apps/plugins/hooks/alt ajan/web kapalı; dosya anlık görüntüsü stdin. Proje/üst dizin Codex config'i varsa manuel profil incelemesi için durur. Codex modeli bu revizyonda canlı sınanmaz; parser/argv sahte süreç testleriyle doğrulanır.
- Kısa testler ilk revize 3 koşumu: **34/34**, `tests/cikti/koordinator-revize3-test.tap`; offline biçim ve sözdizimi başarılı. İlk gerçek model denemesi yalnız Claude'da package.json sürüm incelemesi olacak; sonuç aşağıya kaydedilir. Tekrar/ikinci model yok.
- Gerçek analiz: `93b95e95-7296-438f-9280-ea93c8ff2b68`, `claude-opus-5-5`, resmi claude.ai/Pro doğrulaması ve kullanıcının manuel ek kullanım teyidiyle `agents/claude` @ `df3549e` üzerinde. Çıkış 0 / `basarili`, yaklaşık 5,6 sn model süresi, 12 sn toplam yardımcı; package.json:3 → 0.8.18. Read/Glob/Grep araçlarıyla kısıtlı oturumda araç çağrısı 0; yalnız sağlanan görüntü incelendi. Kaynak ve hedef dosya/dal farkı 0, test/komut/Git yazması yok. Kanıt `tests/cikti/koordinator/93b95e95-7296-438f-9280-ea93c8ff2b68.json`.
- Model cevabındaki ek commit cümlesi kabul kanıtına alınmadı; sürüm yalnız package.json satırına ve başlatıcının doğruladığı HEAD'e bağlandı. Ham kanıt değiştirilmedi. Bu başarılı analizdeki devir adayı tarihsel yardımcı raporudur, geliştirme sahipliği devredilmiş sayılmaz; sonraki kod düzeltmesinde başarılı analiz için gereksiz devir manifesti kaldırıldı.
- Son kısa koşum **34/34**, yaklaşık 6,5 sn; offline Prettier 3.9.10 ve sözdizimi/whitespace kontrolleri geçti. Son düzeltmeler: makbuz alanları değiştirilirse reddetme, dar PATH yürütülebilir çözümü, manuel kaydın ajan kapsamını önceki süreyi uzatmadan koruma, ham stderr atma ve rapor maskelemesi. Tek gerçek model çağrısı tekrar edilmedi.
- Son `node scripts/koordinator.mjs --oturum` doğrulaması başarılı. 2026-10-30 17:20 İstanbul gözleminde Codex ChatGPT Plus: 5 saat %50, haftalık %11 kullanılmış, mevcut kredi havuzu yok; Claude claude.ai Pro, pencereler bilinmiyor. Bunlar zamanlı metadata, canlı kalan token garantisi değildir. İki oturumun kapısı resmi auth + manuel hesap kontrolüyle açık; API/ek kredi onayı yoktur. Bu denetim model başlatmadı.
- Gerçek/model kullanım ayrımı: CLI'nin 0,0280478 USD liste fiyatı telemetrisi fatura değildir; abonelikle yapılan çağrıyı ücretli API kullanımı diye sınıflandırmadık. Ek kredi tüketimi otomatik olarak ölçülmedi; hesap ayarının kapalı olduğu kullanıcı teyidine dayanır.
- Revize 3 dosyaları: `scripts/abonelik.mjs`, `scripts/tests/abonelik.test.mjs` yeni; `scripts/koordinator.mjs`, `scripts/ajan-yonlendirme.mjs`, mevcut koordinatör testi, `package.json`, ortak/Unity geçiş belgesi, bu kart ve devir güncellendi. Mevcut kullanıcı Input System dosyaları ve referans etiketi değişmedi; eski revizyon kanıtları korundu.
- Şema incelemesi: kurulu Codex'in resmi `app-server generate-json-schema` çıktısı ignore edilen `tests/cikti/codex-schema/` altında; ilk aramada tipler ayrı dosya sanıldığı için yol bulunamadı, gerçek response şemasından CreditsSnapshot doğrulandı. Sandbox `features list` HOME bulamadı; normal kullanıcı metadata kontrolüyle çözüldü. Bu adımlar model veya kredi tüketmedi.
- Manuel kalan: ek-kullanım/otomatik kredi ayarının gerçekten kapalı kalması ve hesap değişikliğinde teyidin yenilenmesi, CLI auth doğrulanamazsa normal terminalde abonelikle giriş, Codex adaptörünün ilk canlı kısa analizi (bu tur gereksiz ikinci çağrı yapılmadı). API anahtarı veya hesap ayarı değişikliği yapılmadı. Uzun regresyon/commit/push/merge yok.

### İstenen / çıkan / fark / düzeltme

- İstenen: eşit iki geliştirme ajanı ve dinamik görev sahipliği.
- İlk kurulumdan çıkan: Codex'e kalıcı koordinatör, Claude'a yalnız yardımcı rolü verilmişti.
- Fark: marka bazlı rol sabitleme ve yalnız Claude başlatan genel CLI yolu yeni kararla uyuşmuyordu. OAuth/abonelik girişi de ek kredi tüketiminin kapalı olduğunu kanıtlamıyordu.
- Düzeltme: ajanlardan bağımsız saf yönlendirme, iki aday için simetrik bağlam/geçmiş/kapasite kararı, yerel plan/devir CLI'sı ve maliyet doğrulanamadığında iki ajan için de kapalı çalıştırma yolu. Önceki model çağrısı tarihsel kanıt olarak korundu; yeni canlı doğrulama sayılmaz.

### Revize 2 kabul ölçütleri

1. Kök/Unity/ortak rehberlerde kalıcı sahip/yardımcı hiyerarşisi yok; iki ajan da görev sahibi ve geliştirme uygulayıcısı olabilir.
2. İş türü, kanıtlı uzmanlık, aynı kart/SHA bağlamı ve ilgili sonuç geçmişi karara girer; eşitlikte mevcut bağlam, yoksa seçim bekleme. Küçük işte ikinci ajan yok; bağımsız iş için rol ve gerekçe gerekir.
3. Her adayda 5 saatlik/haftalık pencereler ayrı; resmi gözlem yoksa bilinmiyor. Token/liste maliyeti abonelik kotası sayılmaz. Eski/eksik veri bilinmiyor olur.
4. Devir aynı kart, HEAD, Git durumu, dosya içerik manifesti ve mevcut test kanıtlarını bağlar. Önceki süreç durması doğrulanmadan güvenli devir iddia edilmez; yıkıcı Git işlemi yapılmaz.
5. API/abonelik ve ek kredi kaynağı canlı doğrulanmadığı için `--calistir` model başlatmadan hata/kanıt verir. Bağlam JSON'u izin belgesi olamaz. Kısa testler ve iki yönlü yerel planlar model/ek kredi kullanmadan doğrulanır.

### Revize 2 doğrulama

- Kullanılan ajan: yalnız bu Codex oturumu; oturumun kesin model kimliği betikten alınmadığı için bilinmiyor. Yeni Claude/Codex CLI model çağrısı yok. İki aboneliğin canlı 5 saatlik/haftalık kapasitesi bilinmiyor; API/ek kredi onayı verilmedi.
- Yeni/değişen kod: `scripts/ajan-yonlendirme.mjs`, `scripts/koordinator.mjs`, `scripts/tests/ajan-yonlendirme.test.mjs`, mevcut taşıma/protokol testleri ve npm test komutu. Aynı rehber/kart/devir sistemi korunur.
- Son birlikte koşum **28/28**, yaklaşık 6,3 sn. Kanıt: `tests/cikti/koordinator-revize2-test.tap`. Saf yönlendirme, iki yönde sahip seçimi, ilgili/kanıtlı geçmiş, 5 saat/haftalık pencere, eski/bozuk veri, dosya sahipliği çakışması, maliyet engeli, devir ve önceki taşıma/protokol güvenlikleri kapsandı. Testler sahte CLI süreçleri ve gerçek depoda yerel planlar kullandı; yeni model çağrısı yok.
- Prettier 3.9.10 offline biçim kontrolü, dört JavaScript dosyasının `node --check` kontrolü ve `git diff --check` başarılı. Tam regresyon, CI, TS tam test/lint, .NET veya Editor çalıştırılmadı; bu revizyon yalnız koordinasyon JavaScript/belge değişikliğidir.
- Gerçek depodaki yerel plan örnekleri: Codex `d90f2a08-ca03-47a6-9ab6-5754749834d9`, Claude `61e20331-9855-4d1b-8e68-8c80fcc931e3`. İki maliyet engeli: Codex `7253746f-471a-49ad-9ff3-7b73980f4b16`, Claude `6e024cab-7062-4ac1-907a-eaead720944c`. Raporlar `tests/cikti/koordinator/` altında; tümünde model çağrısı ve kaynak dosya farkı 0. Bunlar test anındaki plan/devir adaylarıdır, tamamlanmış ajan devri değildir.
- Belge düzenlemesinde ilk Python pipe denemesi Windows metin kodlaması yüzünden bölüm başlığını bulamadı; dosya yazılmadan durdu. Native PowerShell UTF8 yazımıyla düzeltildi.
- Engel: otomatik CLI model çağrısı için abonelik/ek krediyi canlı doğrulayabilen maliyet adaptörü yok. Bu revizyonda güvenli plan/devir tamamlanır; mevcut izinli abonelik oturumunda geliştirme sürer. Maliyet engeli OS izni yükseltme veya JSON beyanıyla aşılmaz.
- Son durum: `unity/yerel-gelistirme` / `cf6aa8a`; TS etiketi `df3549e` ve sürüm 0.8.18 korunuyor. İki Input System dosyasının SHA256 değeri ilk kurulum kaydıyla aynı. Commit/push/merge ve Git ref değişikliği yok.
- Tek sonraki adım: mevcut ilk fizik kartını/görevini bağlama göre iki ajandan birine yönlendir; aynı referans ve kanıttan devam et.

## Kullanıcının özgün isteği

Last Turn'ün ilk çift ajan denemesi başarıyla tamamlandı. Şimdi bu tek seferlik çalışmayı kalıcı, güvenli ve tekrar kullanılabilir bir koordinasyon sistemine dönüştür.

**Hedef:** Ben Codex'e doğal dille tek bir geliştirme isteği göndereyim. Sen görevi analiz et, gerekiyorsa Claude Code CLI'a bağımsız bir alt görev ver, sonuçları birleştir ve bana tek rapor sun.

**Yapılacaklar:**

1. Mevcut AGENTS.md, CLAUDE.md, docs/ORTAK-CALISMA.md ve görev kartı sistemini koru. Aynı sistemi yeniden oluşturma.
2. Unity geçişi için gerekli ek talimatları oluştur. TypeScript 0.8.18 referansını koru.
3. Tek koordinatörün Claude CLI'ı güvenli, sınırlı yetkilerle çağırabildiği küçük bir yerel yardımcı araç oluştur.
4. Claude çağrıları varsayılan olarak dar kapsamlı ve bağımsız worktree üzerinde olsun. Aynı dosyalara eşzamanlı yazma.
5. Gereksiz yere iki ajan kullanma. Küçük görevlerde tek ajan yeterli; paralel çalışma yalnız bağımsız işlerde kullanılsın.
6. Başarısız çağrı, kota bitmesi, izin reddi ve zaman aşımı durumlarında görevi güvenli biçimde durdur veya tek ajanla devam et; hataları gizleme.
7. Her görev sonunda değişen dosyaları, testleri, başarısızlıkları, kullanılan ajanları ve branch durumunu raporla.

**İzin politikası:**

- Yerel geliştirme ve kısa ilgili testler otomatik olabilir.
- Push işlemlerinin yetkisi mevcut proje kurallarına göre uygulanmalı; ilk koordinatör kurulumunda push yapma.
- Tam regresyon ve canlıya çıkış öncesinde benden onay alınmalı.
- Master'a doğrudan değişiklik yapılmamalı.
- Force push, hard reset, clean, branch silme ve benzeri yıkıcı komutlar otomatik çalıştırılmamalı.
- Kod üzerinden izin kısıtlarını aşmaya çalışma.

**Bu görevde:**

- Koordinatör altyapısını geliştir.
- Yalnızca zararsız, salt okunur bir çift ajan deneme çağrısıyla doğrula.
- Gerekli kısa yerel testleri çalıştır.
- Unity'nin mevcut yerel Input System değişikliklerini koru.
- Commit, push veya merge yapma.

Sonuçta koordinatörün nasıl kullanılacağını, hangi sınırlamalara sahip olduğunu ve ilk Unity fizik taşıma görevini nasıl başlatacağımızı raporla.

## İlk kurulumun kabul ölçütleri (tarihsel; sahiplik için revize 2 geçerli)

1. Kök rehber/kart/devir korunur; doğal dil → Codex kararı → gerekiyorsa salt okunur Claude → tek rapor yordamı aynı ortak belgeye eklenir.
2. CLI yalnız temiz, kayıtlı, ayrı Claude worktree'sinde dar inceleme yapar. Komut/yazma/MCP/skill araçları yoktur; gerçek başlangıç politikası doğrulanır.
3. Süre/çıktı/araç bütçesi, tek çağrı kilidi, referans/dal/dosya karşılaştırması ve görünür hata kodu vardır. Hata otomatik izin genişletme/tekrar denemeye dönüşmez.
4. Kısa testler başarı, kota, izin reddi, zaman aşımı, başlatma/protokol/kapsam hatası ve worktree/yol/kilit korumalarını sınar. Tek gerçek çağrı yalnız sürümü okur.
5. Input System dosyaları, TS sürümü ve Git HEAD/ref'leri korunur; commit/push/merge/regresyon yapılmaz. İlk fizik geliştirme görevi belgelenir, bu tur uygulanmaz.

## Korunacak başlangıç durumu

- `Unity/ProjectSettings/ProjectSettings.asset`: mevcut yerel değişiklik; SHA256 `932D7CC94918134ABD2A1832474024300E97565B31B3A393F21D0F07CA08A28D`.
- `Unity/ProjectSettings/PackageManagerSettings.asset`: mevcut izlenmeyen dosya; SHA256 `AC9E80F330154C62CAF293F87DCBCFA5DF8ED2ADEF2E18552B0B34C1EDA7E48C`.
- Claude ve Codex worktree'leri temiz, `df3549e`; ana depo master `6785044`, önceden izlenmeyen `tatus` korunur. Uzak durum için fetch yapılmadı.

## İlk kurulumun devir ve doğrulaması (tarihsel)

- Değişiklikler: kök rehber yönlendirmeleri, ortak koordinasyon yordamı, Unity ek kuralları, `scripts/koordinator.mjs`, kısa Node güvenlik testleri ve npm komutları; yeni görev sistemi/bağımlılık yok.
- Son kısa güvenlik koşumu: `node --test scripts/tests/koordinator.test.mjs` → **12/12**, yaklaşık 1,7 sn; sahte yerel alt süreçler, dış servis yok. Kanıt `tests/cikti/koordinator-yerel-test.tap`. Başlangıç denemesinde sandbox geçici dizin erişimi `EPERM` verdi (testler başlayamadı); açık normal kullanıcı izniyle aynı testler çalıştırıldı, hata gizlenmedi.
- `node --check scripts/koordinator.mjs`, `node --check scripts/tests/koordinator.test.mjs`, offline Prettier 3.9.10 kontrolü ve `git diff --check` başarılı. `node Unity/Validation/validate-project.mjs` başarılı. Markdown dosyaları mevcut `.prettierignore` kuralı gereği formatter kapsamı dışındadır.
- Bu süreç/JavaScript değişikliğinde tam TypeScript test/lint paketi, .NET ve Unity Editor testleri çalıştırılmadı. C# veya oynanış değişmedi; fizik/Editor/gerçek cihaz başarısı iddia edilmez.
- Sandbox gerçek çağrı denemesi: `b01e334b-bd5c-4739-9967-e35879f007c8`, `baslatma: spawn EPERM`, çıkış 1; model başlatılamadı. Başarılı sayılmadı ve kanıt saklandı.
- Tek gerçek model çağrısı: `2b1b4ced-03b5-4aaf-bfea-40622f102525`, Claude Code 2.1.302 / `claude-opus-5-5`, `agents/claude` @ `df3549e`. Normal kullanıcı için açık ortam izniyle **aynı salt okunur bayraklarla** çalıştı. Sonuç `basarili`, çıkış 0; araçlar yalnız Glob/Grep/Read, MCP yok, `dontAsk`; tek Grep `package.json:3` → 0.8.18. İzin reddi ve alt ajan 0. Kaynak ve Claude dosya/ref farkı 0. Kanıt: `tests/cikti/koordinator/2b1b4ced-03b5-4aaf-bfea-40622f102525.json`.
- Biçim aracı ilk denemelerde offline önbellek/global npm dizini hataları verdi (`ENOTCACHED`, `ENOENT`). Projeye bağımlılık eklemeden, süreçlük `npm_config_prefix` çalışma alanına ayarlanıp mevcut önbellekteki Prettier 3.9.10 kullanılabildi. Ağdan paket indirilmedi.
- Yerel / push / CI / deneme / canlı: yalnız yerel geliştirme; gönderim ve yayın yok. Test sonuçları Editor/oynanış kanıtı değildir.
- Son dal/HEAD: `unity/yerel-gelistirme` / `cf6aa8a`; aşamaya alınmış değişiklik, commit/push/merge yok. Claude/Codex worktree'leri temiz `df3549e` üzerinde. İki Input System dosyasının SHA256 değeri başlangıçla aynı. Kaynak TS sürümü/etiketi değişmedi.
- Engel ve tek sonraki adım: ilk fizik dilimini yeni geliştirme isteği kapsamında ayrı kartla başlat. Bu ortamda Claude başlatma ve geçici dizin kullanan testler dış sandbox izni gerektiriyor; yardımcı bunu kendisi aşmaz.

## Bu görevde değişen dosyalar

- `scripts/koordinator.mjs`: salt okunur CLI yardımcısı, ön/son kontroller ve kanıt raporu.
- `scripts/tests/koordinator.test.mjs`: kısa yerel güvenlik/hata testleri.
- `package.json`: `koordinator` ve `test:koordinator` komutları; sürüm 0.8.18, bağımlılıklar/kilit aynı.
- `AGENTS.md`, `CLAUDE.md`: mevcut ortak yordam ve Unity kurallarına kısa yönlendirme.
- `Unity/AGENTS.md`: ek alan kuralları; mevcut Unity ayarları değiştirilmedi.
- `docs/ORTAK-CALISMA.md`: doğal dil koordinatör akışı, izinler, sınırlar, hata/fallback ve kapanış raporu.
- `docs/UNITY-GECIS.md`: mevcut worktree düzeni, sabit referans ve ilk fizik görevi.
- `docs/DEVIR.md` ve bu görev kartı: gerçek kanıtlar ve sonraki adım.
- Ignore edilen `tests/cikti/` altında başarılı/başarısız CLI JSON'ları ve yerel test TAP kanıtı; gönderilmez.

## Revize ve kullanım kaydı

- Ajanlar: Codex uygulayıcı; Claude yalnız tek gerçek sürüm incelemesi. CLI süresi 4,9 sn, yardımcı toplamı yaklaşık 8,5 sn. CLI liste fiyatı tahmini 0,0473646 USD; bu fatura/kota ölçümü değildir. Ham kullanım aynı kanıt JSON'undadır.
- Yeni paket kurulmadı; çalışma ortamı Node 20.16.0, deponun genel Node >=22.12 gereksinimi değiştirilmedi.
- Revize: ilk güvenlik testleri sonrası master ön kontrolü HEAD okumasından önceye alındı, ayrı worktree/kapsam koruma testleri eklendi.
- Son denetim: bozuk JSON şekilleri, bilinmeyen seçenekler ve süreç durdurma hataları fail-closed ele alındı. Son kısa testler bu düzeltmeler sonrasında tekrar geçti. Gerçek denemenin ardından prompt, kök CLAUDE/AGENTS okumasını açıkça zorunlu kılacak şekilde netleştirildi; yeni gerçek model çağrısı yapılmadı.
- Model/fatura/kota tasarrufu tahmini yok; CLI'nin gösterdiği kullanım kanıt JSON'unda saklanır.
