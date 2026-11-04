# Claude + Codex ortak çalışma

Cem aynı Last Turn projesinde iki aracı dönüşümlü kullanır. Devirde diğer araç repoyu güncelleyip `CLAUDE.md`, `docs/DEVIR.md` ve ilgili görev kartını okuyunca son durumu öğrenir. Aşağıdaki yerel betik iki eşit ajan için plan/devir kanıtı üretir; açık sohbetlere mesaj göndermez. Bu dosya, görev/devir/verimlilik konusunda eski ayrıntılı rehber ve skill'lerdeki çelişen varsayılanların yerini alır; oynanış kararlarını ve canlı onayı şartını değiştirmez.

## Yerel koordinatör — eşit ajanlar ve dinamik sahiplik (Cem, 2026-10-30, revize 3)

Codex ve Claude Code **eşit yetkili geliştirme ajanlarıdır**. Kalıcı baş geliştirici, yardımcı veya zorunlu koordinatör ajan yoktur. Sahip ve sonuçları birleştiren ajan görev bazında değişebilir. `scripts/koordinator.mjs` ile `scripts/ajan-yonlendirme.mjs` yerel plan/devir araçlarıdır; mevcut görev kartı ve devir kaydı korunur.

1. İsteği alan ajan aynı kartta iş türünü, gereken uzmanlığı, kabul ölçütlerini, başlangıç dal/SHA'yı ve korunacak değişiklikleri kaydeder. Marka adına göre uzmanlık atanmaz.
2. Karar, ilgili kanıtlı uzmanlığı (en çok 3 alan ×4), aynı kart/SHA bağlamını (+3), aynı iş türündeki son 5 tekil kanıtlı sonucu (−2…+2) ve iki güncel kapasite penceresinin uygunluğunu (+1) kullanır. Bu puan yerel yordamdır; genel yetenek ölçümü değildir. Eşitlikte mevcut bağlam korunur; o da bilinmiyorsa `secim-bekliyor`. `--ajan` açık seçimdir, kota/erişim engelini kaldırmaz.
3. Küçük işte tek ajan. İkinci ajan yalnız gerekçeli bağımsız geliştirme, inceleme veya test için planlanır. Ayrı dosya sahipliği aynı kartta yazılır; aynı dosya/sahne/prefab eşzamanlı düzenlenmez. Betik varsayılan olarak yalnız plan üretir; açık --calistir isteğinde doğrulanmış abonelikle salt okunur analiz başlatabilir. Yazma yetkisi dağıtmaz.
4. **5 saatlik ve haftalık** abonelik pencereleri ayrı değerlendirilir. Resmi veri yoksa her biri `bilinmiyor`; bilinmeyen kapasite boş veya dolu sayılmaz. Yerel token sayacı, CLI liste fiyatı veya model tahmini kalan kotaya çevrilmez. Güncel resmi veri olarak sunulan kayıtta bir pencere doluysa aday elenir.
5. Sahip bağımsız sonuçları birleştirir. Kapanış: değişen dosyalar, gerçek ajan/model (bilinmiyorsa bilinmiyor), test kapsamı/kanıtı, başarısızlıklar, görev sonucu, yönlendirme gerekçesi, varsa kullanımın kaynağı ve faturalama türü, dal/SHA, tek sonraki adım. Planlanan ajan gerçekten kullanılmış gibi, analiz başarısı geliştirme başarısı gibi raporlanmaz.

### Kullanım ve bağlam

Doğal dil isteğini iki ajan da işleyebilir; teknik alt görevi kullanıcıya yazdırma. Varsayılan komut yalnız yerel plan üretir, yeni model kullanımı yoktur:

```powershell
npm run koordinator -- --kart docs/isler/2026-10-30-yerel-koordinator.md --gorev "İlk fizik diliminin sahipliğini ve bağımsız test ihtiyacını planla." --dosya Unity/Validation/Program.cs --mevcut claude
```

Gerekli: `--kart`, `--gorev`, 1–8 `--dosya`. İsteğe bağlı: `--mevcut codex|claude`, `--ajan auto|codex|claude`, `--baglam <depo-içi-json>`, `--devir` veya `--calistir`. `--sure` (varsayılan 180, 15–600 sn) ve `--worktree` salt okunur çağrıyı sınırlar. `--oturum` yalnız resmi oturum/kota metadata kontrolüdür; kart gerektirmez. Varsayılan hedef seçilen ajan için kardeş `Last-Turn-Codex` veya `Last-Turn-Claude` worktree'sidir. Bağımsız çalıştırmada temiz, aynı depoya kayıtlı, ayrı ve `agents/<ajan>` / `<ajan>/*` dalındaki hedef yeniden doğrulanmalıdır. Worktree/branch oluşturma, checkout veya fetch yoktur.

`--baglam` ikinci görev kartı değildir: aynı karta bağlı kısa karar girdisidir; tercihen ignore edilen `tests/cikti/` altında tutulur. Örnek:

```json
{
  "tur": "fizik",
  "boyut": "buyuk",
  "gerekenUzmanlik": ["C#", "belirlenimcilik"],
  "bagimsizIs": { "gerekli": true, "rol": "inceleme", "gerekce": "Ayrı TS referans testi" },
  "ajanlar": {
    "codex": { "uzmanlik": [], "gecmis": [] },
    "claude": { "uzmanlik": [], "gecmis": [] }
  },
  "testKaniti": []
}
```

Ajan kaydı: `baglam: {kart, sha, kanit}`, `uzmanlik: [{alan, kanit}]`, `gecmis: [{tur, sonuc: "basarili"|"basarisiz", kanit}]`, gerekirse `erisim: {durum: "yok", kanit}`. Eksik/kanıtsız alan avantaj sağlamaz. Aynı kanıt çoğaltılarak puan büyütülmez. Veriyi hazırlayan ajan kanıtı gerçekten okumalı; betik dosyadaki iddiaları kendiliğinden tasdik etmez.

İkinci rol `gelistirme` veya `test` ise `sahipDosyalari` ve `bagimsizIs.dosyalar` dolu, depo-içi somut yol listeleri olmalıdır. Aynı dosya/üst dizin kapsamı, büyük-küçük harf/ayraç/nokta takma adları veya geçersiz kapsam varsa ikinci ajan seçilmez ve eksik raporlanır. Globs kabul edilmez. Bu plan kontrolü işletim sistemi ACL'si değildir; symlink/gerçek worktree sınırı ve fiili tek yazan sahiplik de başlatma öncesinde doğrulanır.

İsteğe bağlı kapasite kaydı: `ajan`, `tur: "resmi-anlik-goruntu"`, `kaynak`, `kanit`, ISO `zaman`, `pencereler: [{dakika: 300|10080, kullanilanYuzde, sifirlanma}]`. Kaynak belge kimlikleri Codex için `https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt`, Claude için `https://code.claude.com/docs/en/costs#using-the-usage-command`. Bunlar **hesap verisi değildir**; gerçek resmi `/status`, `/usage` veya hizmet dökümünü `kanit` ile bağla. Yalnız URL yazarak kota üretme. Kayıt sağlanmış anlık görüntü olarak `canliDogrulama: false` etiketlenir. 5 dakikadan eski/gelecek tarihli, sıfırlanmış, eksik veya yanlış süreli pencere bilinmiyor kalır. Bu sürüm canlı hesap verisini toplamaz; mevcut iki aboneliğin kapasitesi bilinmiyor.

### Abonelik, API ve ek kredi (revize 3)

Kota bilinmiyorsa bilinmiyor yazılır ve bu **tek başına çalıştırmayı engellemez**. Abonelik oturumu, ek kullanım ayarı ve kalan kota ayrı denetlenir. Açık kullanıcı onayı olmadan API veya ücretli ek krediye geçilmez; bu sürümde böyle bir geçiş yolu yoktur.

Resmi kontroller: `codex login status`, `claude auth status`. Codex için stable app-server yalnız `initialize`, `account/read` (`refreshToken:false`) ve `account/rateLimits/read` çağırır; model/turn/login/reset-kredi/tüketim işlemi göndermez. Beş saat ve haftalık pencereler varsa resmi yüzdeler/zamanlar ayrı alınır; yoksa bilinmiyor kalır. Ham auth/stderr, e-posta, kimlik/token, config değeri veya auth dosyası içeriği loglanmaz. Yalnız izinli metadata ayıklanır.

```powershell
npm run koordinator -- --oturum
npm run koordinator -- --oturum --ajan claude
```

Abonelik kaynağı yalnız o çağrıda alınan gerçek probe makbuzuyla kabul edilir; görev JSON'u, kopya/ değiştirilmiş auth nesnesi kanıt değildir. Claude'da `claude.ai` + bilinen abonelik, Codex'te `Logged in using ChatGPT` aranır. API key, helper, üçüncü sağlayıcı, belirsiz OAuth token yöntemi veya bozuk/başarısız CLI çıktısında model başlamaz. Tek adayın çalıştırılmasında yalnız o aday sorgulanır; gereksiz ikinci model yoktur.

CLI oturum kontrolü ücretli ek kullanımın kapalı olduğunu otomatik kanıtlamaz. **Bu kısım manuel hesap ayarı kontrolüdür.** Cem bu görevde “İkisinde de ücretli ek kullanım kapalı” diye açıkça doğruladı. Bu teyit sabit ve ignore edilen `tests/cikti/koordinator/abonelik-kontrol.json` içinde, ajan kapsamı ve en çok 24 saat geçerlilikle saklanır; ücretli kullanım izni değildir. Hesap veya ayar değişirse yeniden kontrol edilmelidir. Genel `--baglam` bunu oluşturamaz; dosya makine doğrulaması veya imzalı sağlayıcı kanıtı olarak sunulmaz. Aynı yerel kullanıcı bu manuel kaydı değiştirebilir; betik hesap ayarını uzaktan kilitlemez.

Teyit yoksa/süresi geçmişse kendi terminalinde hesap ayarını kontrol edip şu etkileşimli yordamı çalıştır:

```powershell
npm run koordinator -- --oturum --ajan claude --manuel-kontrol
```

TTY üzerinde yalnız gerçekten kontrol ettiysen `EK KULLANIM KAPALI` yaz. Aynı yordam `--ajan codex` için de geçerlidir; diğer ajan için halen geçerli teyit uzatılmadan korunur. Non-interactive ortam bunu kendiliğinden onaylayamaz. Abonelik kaynağı doğrulanamıyorsa `manuel-baslatma-gerekli` sonucu alınır: kendi terminalinde CLI'ı aç, resmi `/login`/durum yordamıyla abonelik girişini ve hesap ek-kullanım ayarını kontrol et, sonra tekrar dene. API girişi, sahte ortam/bayrak veya güvenlik azaltan alternatif kullanılmaz; ajan mevcut izinli abonelik oturumunda da görevi sürdürebilir.

Doğrulanmış oturum ve manuel ek kullanım kontrolü birlikteyse ilk kapsam **yalnız kısa salt okunur analizdir**:

```powershell
npm run koordinator -- --kart docs/isler/2026-10-30-yerel-koordinator.md --gorev "package.json sürümünü doğrula; en fazla 100 kelime; test/komut/dosya yazma yok." --dosya package.json --mevcut codex --ajan claude --sure 90 --calistir
```

Görev sahibi `--ajan codex` ile de seçilebilir; kalıcı hiyerarşi yoktur. Yazan geliştirme yetkisi bu analiz betiğinden otomatik verilmez. İki aday için de ayrı/temiz/kayıtlı worktree ve kaynak tabanı, çalıştırma öncesinde doğrulanır. Dosya anlık görüntüsü stdin'e verilir (en çok 8 dosya / toplam 32000 karakter); gizli yapılandırma yolları reddedilir.

Uygulanan teknik kontroller:

- Çocuk ortamında yalnız OS/PATH ve mevcut auth deposunu bulmaya yarayan değişkenler taşınır. API anahtarı, bearer/OAuth override, üçüncü sağlayıcı ve endpoint/proxy override değişkenleri taşınmaz. Sistem/global ortam veya kimlik bilgileri değiştirilmez. CLI yalnız PATH üzerindeki mutlak yürütülebilir dosyadan çözülür; proje içi `claude.exe`/`codex.exe` aranmaz.
- Claude: `forceLoginMethod=claudeai`, safe/restricted, yalnız Read/Glob/Grep, dontAsk/none, MCP/hook/skill/Chrome/prompt önerisi kapalı. Başlangıç araç/cwd/MCP/izin/oturum bilgileri kontrol edilir. Gizli dosya yolları için ek Read deny kuralları vardır.
- Codex: `forced_login_method=chatgpt`, `model_provider=openai`, `--ignore-user-config`, `--no-daemon`, `read-only`/`never`, shell/apps/plugins/hooks/alt ajan/browser/web kapalı; yalnız sağlanan görüntüyle analiz. Proje/üst dizin `.codex/config.toml` varsa manuel profil incelemesi için durur. Beklenmeyen araç olayında süreç sonlandırılır. Codex adaptörü argv/protokol testleriyle doğrulandı; bu revizyonda gereksiz ikinci canlı model denemesi yapılmadı.
- CLI bayrakları veya yönetilen güvenlik politikası uyuşmazsa izin azaltılmadan hata raporlanır; fallback model/API yoktur. Süre (15–600 sn), çıktı (2 MiB) ve Claude araç çağrısı (12) sınırı korunur. Süreç durması doğrulanamazsa kilit korunur. Kaynak ve hedef dosya/dal durumları başta/sonda karşılaştırılır; değişiklik otomatik geri alınmaz.
- Raw stderr/auth kaydedilmez; rapordaki kimlik alanları ve bilinen anahtar/Bearer/JWT/e-posta kalıpları maskelenir. Bu filtre genel amaçlı sır keşfi değildir; gizli dosya/ortam toplama yapılmaz. Sağlayıcının token/liste fiyatı telemetrisi aboneliğin kalan kotası veya gerçek fatura değildir.

Resmi kaynaklar: [Codex auth](https://learn.chatgpt.com/docs/auth), [Codex app-server](https://learn.chatgpt.com/docs/app-server), [CLI ayarları](https://learn.chatgpt.com/docs/config-file/config-basic), [Claude auth](https://code.claude.com/docs/en/authentication), [Claude CLI](https://code.claude.com/docs/en/cli-reference), [Claude login kısıtı](https://code.claude.com/docs/en/settings-reference#forceloginmethod).

### Kota devri ve hata güvenliği

Aynı komuta `--devir` ekle. Mevcut kartın özeti, dal/HEAD, Git durumu, izlenen/izlenmeyen dosyaların SHA256 manifesti ve en çok dört mevcut test kanıtı `tests/cikti/koordinator/<id>.devir.json` içine kaydedilir. Dosya içerikleri taşınmaz, patch/commit/reset/clean uygulanmaz. Gönderilmemiş dosyalar kaynak worktree'de kalır; diğer worktree'de var sayılmaz.

Betik başka oturumun durduğunu doğrulayamaz: devir adayı `guvenli: false`, `oncekiSurec: bilinmiyor` ile çıkar. Önceki uygulayıcı durmadan yeni sahip yazmaya başlamaz. Kullanıcının devir talimatı/önceki durma kanıtı, aynı kart, SHA, içerik manifesti ve testler incelenince sıradaki tek adımdan devam edilir; analiz yeniden yapılmaz. Tek sahip olarak mevcut kaynak worktree kullanılabilir veya ayrıca yetkilendirilmiş aktarım doğrulanır. Bu mekanizma otomatik commit/push yapmaz.

Aynı depo için atomik geçici dizin kilidi korunur; yalnız bu betiği kullanan süreçleri koordine eder. Stale kilit PID/süreç/kart denetlenmeden silinmez. Kaynak dal/SHA/dosya özetleri başta/sonda karşılaştırılır; ignore edilen Editor çıktıları kapsam dışıdır. Yol geçişi ve depo dışı symlink/junction reddedilir. Kota, hata, izin reddi ve belirsiz maliyet gizlenmez. Opsiyonel ikinci iş atlanabilir; zorunlu denetim başarı sayılmaz. İzin genişletme, otomatik tekrar veya uzun regresyon zinciri yoktur.

Stdout ve `tests/cikti/koordinator/<id>.json`: plan, aday gerekçeleri/kapasite, gerçekten kullanılan ajan, bilinmeyen model/faturalama, test kanıtları, dosya/dal sonucu. Çıkış 0 yerel plan veya başarılı salt okunur analiz demektir; geliştirme/test başarısı değildir. Oturum modu yalnız resmi giriş kontrolünün sonucunu verir; maliyet alanı ayrıca okunmalıdır. Eksik seçim, maliyet engeli ve ön/son kontrol hatası 1; kullanım/kanıt yazma hatası 2 olur.

İzin politikası: kısa ilgili yerel geliştirme/testler otomatik olabilir. **Tam regresyon başlamadan ve canlıya çıkmadan önce Cem'in açık onayı gerekir.** Push yetkisi mevcut kurala tabidir; bu kurulum/revizyonda commit/push/merge yoktur. Master'a doğrudan değişiklik, force push, hard reset, clean ve branch silme otomatik uygulanmaz. Kısa test: `npm run test:koordinator`; yeni canlı model/API çağrısı olmadan doğrulanır.

## Tek görev, tek kart, dosya başına tek aktif uygulayıcı

- Kart: `docs/isler/<kimlik>.md`. İlk kullanıcının isteğini aynen koru; yorumunu ayrıca yaz.
- Başlamadan görev sahibi, konu dalı ve temel SHA'yı yaz. Başka araç aynı dosyaları yürütüyorsa onlara başlama; bağımsız dosya sahipliği kartta ayrılır. Sahip kaydı koordinasyon içindir; teknik bir kilit değildir. Git durumunu ve uzak dalı ayrıca doğrula.
- Cem “diğer araca geçiyorum/devral” dediğinde bu devir yetkisidir; eski ajanın ayrıca onayı beklenmez. Devralan uzak/yerel değişiklikleri kontrol edip kartın sahibini ve devir nedenini günceller; önceki ajanın gönderilmemiş dosyalarına erişimi yoksa bunları var saymaz.
- Görevdeki commit/push yetkisi izin veriyorsa kota bitmeden ara kanıtı konu dalına gönder; aksi halde yerel değişiklikleri koruyup devir manifesti kaydet. Yarım iş denemeye birleştirilmez. Devirde çalışmayan/denenmeyen şeyi açıkça yaz. Gönderilemeyen yerel dosya diğer araca geçmiş sayılmaz.
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

## Kısa geri bildirim ve risk bazlı test (Cem'in kararı: 2026-10-25)

Test geliştirme başlamadan kabul ölçütleriyle tasarlanır. Her küçük revizede geniş paketi yeniden koşmak yerine:

| Değişiklik | Geliştirme sırasında | İş tamamlanırken |
| --- | --- | --- |
| Metin/belge/renk, davranış değişmez | Dosya türüne uygun kontrol; oyun testi gerekmez | İlgili biçim/kod kontrolü; yerleşim değiştiyse tek ilgili görünüm |
| Tek davranış, ekran veya hesaplama | Değişen davranışın en yakın testi; normal durum, kritik sınır ve önceki hata | Gerekli bağlantı/akış kontrolü; CI'da ilgili alan kanıtı bir kez |
| Kayıt, hesap, ortak fizik veya mimari | Hata tekrarı + kritik sınırlar; etkilenmiş bağlantılar | Etkilenen alanlar ve kritik uçtan uca akışlar; yalnız satır sayısıyla kapsam küçültülmez |
| Canlı çıkış | Önceki başarılı kanıtlar kayıtlı tutulur | Tam regresyon + duman ve kullanıcı onayı korunur |

Senaryo sayısına kör bir üst sınır koyma. Görev kartına seçilen kapsamı ve neden yeterli olduğunu bir satır yaz; aynı şeyi farklı testlerle tekrar ölçme. Yeni kapsam dışı sorun bulursan işi sessizce büyütme, ayrı kaydet.

Dar tur örneği: `npm run alan -- altyapi --senaryo firebase-giris-yardimcisi,bulut-esitleme`.
Önce kapsamı görmek için aynı komuta `--liste` eklenir; bu bir test sonucu değildir. Olmayan senaryo veya boş seçim başarısızdır. `regresyon`/`duman` bu seçenekle daraltılamaz.

Bu komut geliştirme geri bildirimini daraltır. Mevcut GitHub Denetim iş akışı varsayılan olarak tüm ilgili alanı çalıştırmaya devam eder; otomatik dosya-etki analizi veya CI test önbelleği kurulmuş değildir. CI kanıtını aynı kaynakta yeniden yerelde üretme. Kurulum/derleme/yayın beklemesini “test eforu” veya model tokeniyle aynı sayma.

## Model ve ajan seçimi (göreve özgü, eşit yetki)

- Kalıcı varsayılan sahip/model yoktur; gerçek oturum modeli biliniyorsa raporlanır, bilinmiyorsa bilinmiyor yazılır. İstemcinin seçimi kullanılır. Küçük ve net işte daha düşük düşünme düzeyi; zor fizik/mimari veya dirençli hata ayıklamada daha yüksek düzey değerlendirilir. Her iş Max/Ultra değildir.
- Dar, tekrar eden keşif/log özetleme gibi bağımsız yardımcı görev gerçekten gerekiyorsa desteklenen GPT-6 Luna kullanılabilir. Karmaşık uygulama/denetimde GPT-6.1 Sol tercih edilir. Küçük işi ajana devretmek zorunlu değildir.
- Ana sohbetin modeli/düşünme düzeyi kullanıcı arayüzünden seçilir; ajan bunları değiştirdiğini varsaymaz. Yardımcı ajanda açık model seçimi yalnız ortamın izin verdiği araçla uygulanır, yoksa miras alındığı bildirilir.
- Yerel yordam görev sahibini önerir; modeli veya faturalama kanalını otomatik değiştirmez. Görev kartında risk, tek uygulayıcı/yardımcı ihtiyacı ve kullanılan gerçek model (biliniyorsa) kaydedilir. Model, boyutun yanında yanlış sonucun etkisine göre seçilir.
- Önceki iPhone iframe işinde yardımcı ajan daha ucuz modele yönlendirilmedi; ana model/düşünme düzeyini devraldı. Geriye dönük tasarruf veya farklı model kullanımı iddia edilmez.

## Maliyeti nasıl ölçeceğiz?

Şu an Claude/ChatGPT oturumlarının toplam token/kota telemetrisi repoda yok; “en pahalı adım” ve tasarruf yüzdesi kesin ölçülmüş değildir. GitHub dakikası, kullanıcı bekleme süresi ve model kotası farklı ölçülerdir.

Her tamamlanan kartta revize turu, süre, ilk kabul durumu, tekrar test/kurulum, kullanılan ajan sayısı ve varsa platformun gösterdiği kullanım kaydedilir. API fatura verisi olmadan TL/token tutarı uydurma. İlk beş benzer iş bir başlangıç örneklemidir; sonra ilk kabul oranı ve kabul edilmiş iş başına kullanım karşılaştırılır. Kısa prompt veya düşük token tek başına kalite kanıtı değildir.

## Ortam ve eklentiler

- Mevcut temel: GitHub + TypeScript/Vite/Three.js + Vitest/Playwright + GitHub Actions. Telefonla çalışma bu altyapıda sürdürülebilir; aynı oyun için yeniden Unity veya ikinci editör kurmak şart değildir.
- Context7: bağımlılığın sürümüne ait API belirsizse yararlı. Her kod işinde otomatik sorgu yapma. Bu ChatGPT hesabında bağlantı kuruldu; Three.js r186 için resolve-library-id ve query-docs başarılı yanıt verdi. Claude tarafındaki kurulum ayrıca doğrulanır.
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

## Gönderim yetkisi açıklığı (Cem, 2026-10-25)

Konu dalına ve `gelistirme` denemesine gönderim için yeniden push onayı istenmez. Cem'in açık ifadesi: “sadece regresyonda push onayı bekleyecek benden, bu işi gönderebilmen lazım”. Mevcut test/dondurma kuralları ve regresyon sonunda canlıya çıkış onayı korunur.
