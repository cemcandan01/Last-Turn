# LT-SYS-002 MUTANT: roguelite yarış tasarımı (sıfırdan)

Durum: tasarım önerisi, Cem'in kararını bekliyor. Sahip: Claude. Dal: claude/mutant. Önceki: LT-SYS-001 (çekirdek, MUTANT v1 0.8.1 denemede).
Neden: v1'de Tutuş Darbesi hissedilmedi (ölçüm: düz yolda +0,3 km/sa, virajda x1,2 tutuş spin attırdı) ve görev döngüsü ana oynanış olmaya uygun değil (Cem: görevler yan challenge/küçük yükseltme olsun).

## 1. Tür neden bağlar? (en iyilerden çıkarılan 8 ilke)

| İlke | Kim en iyi yapıyor | Ne öğreniyoruz |
|---|---|---|
| Kısa, bitebilen koşu | Vampire Survivors 15–30 dk, Nova Drift 15–45 dk; ticari başarılıların çoğu 20–40 dk | "Bir koşu daha" süresi. Mobilde 10–15 dk, ara verilebilir etaplar |
| Sık ve anlamlı seçim | Hades: her ödülde 3'ten 1 kalıcı-koşu gücü; VS: 3–4'ten 1, 6 slot, geri alınmaz | Az slot = her seçim önemli; seçim koşu boyunca güçlendiğini hissettirir |
| Sinerji ve kırılma anı | Balatro: "Rube Goldberg makineni kur, izle"; Slay the Spire: tek oyunculu olduğu için nadir aşırı güçlü kombolara izin | Kombo hata değil ödül; ama tek kart her şeyi bozmamalı ("her kartın bir yeri olsun") |
| Teatral, görünür geri bildirim | Balatro: sayılar tık tık artar, çarpan alev alır | Hissedilmeyen güç yok hükmündedir (v1 Darbe dersi) |
| Artan baskı | Balatro yükselen hedef puan; Risk of Rain 2 zamanla artan zorluk | Koşu hep biraz daha zor; oyuncu build'iyle yetişmeye çalışır |
| Başarısızlık ileri taşır | Hades: ölünce kalıcı küçük güçler + hikâye; Isaac: ödül çeşitlilik | Meta ilerleme seçenek açmalı, yalnız güç değil; aşırı meta güç "ben mi iyileştim, açılım mı?" sorusunu bulandırır |
| Rota/risk seçimi | Slay the Spire haritası, Hades kapı ödülü önizlemesi | Sonraki etabı ve ödülünü görerek seç: risk-ödül kararı |
| Ustalık + şans | Nova Drift: öğrenmesi kolay, ustalaşması zor hareket | Şans seçenek sunar, kararı ve sürüşü oyuncu yapar |

Yarış roguelite'larından: Road Redemption (yarışlar arası para ile koşu içi yükseltme, ölünce kaybolur; XP ile kalıcı perk; harita/hedef her koşuda değişir), Driving Rogue (prosedürel sokaklarda drift + near-miss kombo puanı, Balatro tarzı kart/modifiye), SCHROTT (arcade roguelite akrobasi). Ortak nokta: **çekirdek fiil sürüş, roguelite katmanı puan/yükseltme ekonomisi.**

## 2. Last Turn'ün elindekiler ve eksikleri
- Güçlü: gerçekçi drift fiziği, drift puanı (kombo × çarpan, bonuslar, x6), 40 pist / 5 tür, rekor hayaleti, garaj parça sistemi (fiziğe gerçekten işler), açık dünya.
- Eksik: rakip yapay zekâ, araç-araç çarpışma, trafik/near-miss, hasar/lastik aşınması.
- Sonuç: bugün kurulabilecek en güçlü döngü **puan/süre avı etap zinciri**; rakipli yarış sonraki büyük katman (boss/düello).

## 3. Öneri: MUTANT = "etap zinciri puan avı" roguelite
**Koşu (10–15 dk):** 3 bölge × (3 etap + 1 boss etabı). Etap 45–90 sn, mevcut pistlerden.
**Harita:** Her etaptan sonra 2–3 sonraki düğüm görünür: etap türü (asfalt süre, drift puanı, drag, ralli kontrol noktası) + ödülü (perk / parça / tamir / dükkân / riskli etap). Slay the Spire gibi rota seçimi.
**Tek ölçü — PUAN:** Her etapta hedef puan yükselir (Balatro). Puan kaynakları: drift kombosu (mevcut kural), hedef süreye göre zaman bonusu, temiz sürüş, hız. Her etap türü aynı puan dilini konuşur; perkler bu dili büker.
**Can:** Hedefi kaçırmak ya da ağır hata (spin, duvar) aracın **dayanıklılığını** düşürür; 0 olunca koşu biter. (İleride lastik aşınması/hasar FAZ 3 ile bağlanır.)
**Build üç katmanı (slotlu):**
1. *Parçalar (fizik):* koşu içinde bulunan motor/diferansiyel/lastik/açı kiti; mevcut `aracKur` hattı. Aracın gerçekten değişmesi = roguelite'ın "ben güçleniyorum" hissi.
2. *Puan perkleri (Balatro jokerleri, 5 slot):* "kerb üstündeki drift x2", "direksiyonsuz drift çarpanı +1", "drag'de vites başına zincir", "spin komboyu yakmaz ama çarpan sıfırlanır"… Sinerji burada doğar; puan sahnede teatral sayılır.
3. *Aktif yetenek (1 slot): NİTRO* önce. Basınca hissedilir ileri itiş + kamera/FOV, hız çizgisi, alev, ses. Enerji sürüş stilinden dolar (drift, hava, yakın geçiş). Yeni fizik girdisi 0 iken fizik birebir aynı kalır (test).
**Boss etabı:** Balatro boss blind gibi özel kural: "yağmur + gece", "ters yön", "her duvar teması hedefe +%20", "hayaletinden hızlı ol". Rakip YZ gelince boss = düello.
**Challenge'lar (Cem kararı: yan iş):** Etap içinde isteğe bağlı küçük görev ("bu etapta 3 sn direksiyonsuz drift") → küçük yükseltme/para.
**Meta (rogue-lite):** Koşu sonunda kazanılan ayrı birim (kariyerden ayrı) yeni perk/parça/araç/bölgeyi havuza **açar**; az miktar kalıcı güç. Zorluk basamakları (Ascension/Heat benzeri) ustalara.
**Kariyerle ilişki:** Ayrı mod, ayrı ekonomi; kariyer sınıf/ödül kararları değişmez (DENGE §1).

## 4. Neden sevilir (oyuncu cümlesiyle)
"Her koşuda arabam başka bir canavara dönüşüyor; bu sefer kerb + direksiyonsuz drift build'i tuttu, puan alev aldı. Boss'ta yağmur geldi, bir etap daha geçseydim…"

## 5. Uygulama sırası (öneri)
1. **Nitro + geri bildirim** (fizik girdisi testli; Darbe kaldırılır ya da perk olur). Telefonda hissedilmeli: kabul ölçütü "Cem 1 basışta fark ediyor".
2. **Puan çekirdeği + etap zinciri + harita + can** (açık dünya görevleri challenge'a dönüşür).
3. **Puan perkleri (jokerler) + parça ödülleri + matris testi genişletmesi** (her perk 5 sn içinde görünür etki kuralı).
4. **Boss kuralları + meta açılımlar.**
5. **Rakip YZ ve temas (FAZ 4)** → düello/boss, yakın geçiş, Side Ram.

## 6. Cem'in kararları
1. Ana dinamik: etap zinciri puan avı (öneri) mı, yoksa önce rakip YZ mi?
2. Can: dayanıklılık (öneri) mı, tek hata = son mu?
3. Meta: seçenek açan + az kalıcı güç (öneri) mı, hiç kalıcı güç yok mu?
4. Koşu süresi: 10–15 dk (öneri) uygun mu?
5. Referans: Balatro/Driving Rogue (puan avı) mı, Hot Wheels/Burnout (hız, aksiyon) hissi mi ağır bassın?

## Kaynaklar
- Roguelite bağımlılığı, 20–40 dk, açılımın seçenek açması: https://www.feedme.design/why-we-cant-stop-playing-these-roguelites , https://www.strayspark.studio/blog/building-roguelike-ue5-procedural-progression , https://www.thegamer.com/roguelike-roguelite-difference-hades-darkest-dungeon/
- Hades döngüleri ve boon seçimi: https://en.wikipedia.org/wiki/Hades_(video_game) , https://mechanicsofmagic.com/?p=47901 , https://benjaminglover.substack.com/p/why-hades-was-a-success
- Balatro: https://rogueliker.com/balatro-interview/ , https://gmtk.substack.com/p/balatros-cursed-design-problem , https://www.pcgamer.com/i-dont-play-poker-at-all-says-solo-developer-who-made-the-poker-roguelike-i-cant-stop-playing/
- Slay the Spire metrik/denge: https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019
- Vampire Survivors: https://www.tuni.fi/playlab/objective-survive-vampire-survivors , https://pixelpoppers.com/review/vampire-survivors/
- Risk of Rain 2 zorluk: https://riskofrain2.wiki.gg/wiki/Difficulty
- Nova Drift: https://rogueliker.com/nova-drift-review/ , https://howtomarketagame.com/2024/09/03/the-ea-success-of-nova-drift/
- Yarış roguelite'ları: https://www.gamespew.com/2017/10/road-redemption-review/ , https://www.gameskinny.com/tips/road-redemption-guide-best-perks-to-buy-in-the-store/ , https://traxion.gg/driving-rogue-is-an-arcade-roguelite-racer-with-a-deckbuilding-twist/ , https://www.fanatical.com/en/game/schrott-roguelike-racer
- Mario Kart konuma göre eşya: https://nintendoworldreport.com/feature/16008
EOF
sed -i 's/^- Sonraki: Cem \/dev\/.*$/&\n- 2026-10-26: Cem v1 sonrası "baştan düşünelim" dedi → tasarım önerisi docs\/isler\/LT-SYS-002-mutant-roguelite-tasarim.md (karar bekliyor)./' docs/isler/LT-SYS-001-sistemik-oynanis.md
git add -A && git commit -qm "docs: LT-SYS-002 MUTANT roguelite yarış tasarım önerisi ve tür araştırması [skip ci]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Dgmbee5u5JseJE1UzquuUi" && git push -q 2>&1|tail -1; git log --oneline -1
## 7. 2026-10-26 Cem'in vizyonu (yön budur; §3 etap zinciri önerisinin yerini alır)
Açık haritada çarpışmalı, kovalamacalı roguelite. Slay the Spire'ın açık dünya + araba hâli:
- Kötü bir araç seç → başlangıç yeteneklerini seç → haritaya atıl. **Boss'a geri sayım (ör. 15 dk)** başlar; gelecek **boss koşu başında rastgele** seçilir, yetenekleri ve oynanış tarzı bilinir.
- Haritada etkinlikler görünür: turlu yarış, drift yarışı, polis kovalamacası, drag, toprak yarışı; serbest alanlar: drift alanı, uçuş/rampa alanı vb. Sokakta polisten kaçılır, NPC'lerle yarışılır.
- **XP** → seviye → skill ya da pasif seçimi. **Para** → araç modifiyesi. **Haritada bulunan eklentiler** → aracı o boss'u yenmeye uyarlama.
- Gerilim: süre her şeye yetmez; boss'a göre neyi yapacağını seçersin. Plan çoğu zaman hayaldeki gibi gitmez, şans + seçimlerle bir oynanış stili doğar.

### Tasarım iskeleti
| Öğe | Karşılık | Kaynak/benzer |
|---|---|---|
| Boss baştan görünür | Boss kartı: tür (ralli/drift/drag/kovalamaca), 2-3 yeteneği, zayıf yanı | Slay the Spire bölüm boss ikonu |
| Geri sayım | Her etkinlik süre yer (1-2 dk); hepsine yetmez | Risk of Rain zaman baskısı |
| Etkinlik ikonu | Tür + ödül önizlemesi (XP, para, eklenti) + risk | Hades kapı ödülü |
| Seviye atlama | 3 skill/pasiften 1, slot sınırlı | Hades boon, Vampire Survivors |
| Para | Haritadaki atölye/dükkânda mevcut parça sistemiyle modifiye + tamir | Road Redemption mağazası |
| Eklenti | Haritada sandık/drop: aktif alet (nitro, EMP, çarpma kalkanı, çivi) ya da benzersiz parça | Isaac eşyaları |
| Polis | Aranma seviyesi; kaçış XP/para çarpanı, yakalanma süre/para/hasar kaybı | GTA aranma, Burnout |
| Hasar | Çarpışma dayanıklılığı düşürür; tamir parayla | Road Redemption canı |
| Koşu sonu | Boss'u yen → sonraki bölge (daha zor boss) ya da kaybet → koşu biter; meta birim yeni araç/skill/boss açar | Hades, StS |

### Örnek bosslar (taslak)
- **Toprak Kurdu** (ralli): toprakta çok hızlı, asfaltta yavaş; parkurun %60'ı toprak → toprak lastiği, AWD, süspansiyon eklentisi kazandırır.
- **Drift Kraliçesi** (drift düellosu): aynı pistte kombo yarışı; kombonu bozmak için seni sıkıştırır → açı kiti, drift skilleri.
- **Şerif** (kovalamaca boss): 3 dk yakalanmadan kaç, barikat ve spike kurar → nitro, çarpma kalkanı, yol bilgisi.
- **Drag Canavarı**: düz çizgi, nitrolu; vites/turbo/kalkış skilleri.

### Teknik bağımlılıklar (büyükten küçüğe, dürüst)
1. **Araç-araç çarpışma** fiziği (çoklu araç yapısı `AracOrnegi` hazır; araçlar arası temas çözümü yok). Belirlenimci kalmalı.
2. **NPC yarışçı YZ**: test pilotları (`tests/yardimci/pilot.ts`, `drift-pilot.ts`) pistte araç sürebiliyor → yarışçı YZ'nin tabanı olur.
3. **Polis YZ**: sokaklarda takip için yol ağı/rota bulma gerekir; en büyük iş.
4. **Şehir haritası**: bugün açık dünya Çorak Topraklar + Boş Otopark; sokak/şehir yok. Rastgelelik önce etkinlik/eklenti/hava yerleşiminde, sonra modüler sokak blokları.
5. **iPhone 13 performansı**: her fizik aracı 480 Hz alt adım; uzak NPC'ler için sadeleştirilmiş fizik gerekir.
6. Koşu mantığı (geri sayım, XP/seviye, para, eklenti, boss seçimi): saf, ucuz; mevcut yürütücü + matris testi kullanılır.

### Aşamalar (her biri /dev/'de oynanır)
- **A1 Koşu iskeleti (YZ'siz):** mevcut açık dünya + pist bölgeleri; geri sayım, boss kartı, harita etkinlik ikonları (mevcut yarış türleri, hedef süre/hayalet), XP/seviye skill seçimi, para + atölye modifiye, boss etkinliği (özel kural + hedef).
- **A2 Eklentiler + nitro + aktif aletler**, geri bildirim (FOV, ses, alev).
- **A3 Çarpışma + NPC yarışçılar** (pilot tabanlı YZ); boss gerçek rakip olur.
- **A4 Polis + aranma + kovalamaca**, yol ağı; şehir/sokak haritası.
- **A5 Modüler rastgele harita, daha çok boss, meta ilerleme.**

## 8. A1 uygulaması (Claude, claude/mutant)
Cem kararları (2026-10-26): A1 ile başla; boss kaybı koşuyu bitirir, etkinlik başarısızlığı zaman/para kaybı; koşu ekonomisi kariyerden ayrı, kalıcı ilerleme ayrı birimle (A5); harita sabit, etkinlik/sandık/hava/boss rastgele. "Yol aldıkça başka fikirler oluşur."

Kabul ölçütleri:
1. Menüde MUTANT → boss kartı + 3 kötü araç + 3 pasif; garaj yok.
2. Çorak Topraklar'da 8 etkinlik (5 türün hepsi) + atölye + boss işareti; 3B sütun ve mini haritada yön.
3. İşarette durunca kart; etkinlik mevcut pistte tek tur, kariyer ödülü/yıldız/rekor/hayalet/PROF yazılmaz; sonuç koşu parası/XP, aynı noktaya dönüş.
4. XP seviyede 3 pasiften 1; atölyede koşu parasıyla parça hemen takılır.
5. Süre dolunca zorunlu boss (boss türü, hava/gece, sıkı hedef); kazan → bölge 2 + yeni boss; kaybet → özet, koşu kapanır; normal yarış etkilenmez.

Yapılanlar: `oyun/mutant-kosu.ts` (saf kurallar), `oyun/mutant.ts`, `arayuz/mutant-ui.ts`, `cizim/isaretler.ts`, mini harita işaretleri, `startEvent(i, ci, true)` + `endEvent` MUTANT dalı, duraklatmada "Etkinlikten vazgeç". v1 görev döngüsü ve Tutuş Darbesi kaldırıldı (fizik yolu gelistirme ile aynı); enerji perkleri `oyun/mutant-enerji.ts`'te A2 için.
Testler: birim `MUTANT koşu (A1)` 12; e2e `mutant.mjs` 10 kontrol; iPhone 13 görüntüleri (başla, pasif, harita, kart, atölye, boss, boss yarışı) incelendi; büyük açılış yazısı küçültüldü, etkinlikler 3 turdan tek tura indi (Amatör asfalt hedefi 3:39 → ~1:13).
Doğrulama (yerel, 0246442): `npm test` 25/25 dosya 340/340; alan mutant, menu, garaj, hud, surus, hayalet, fizik, kariyer, yarista-reset → 89 senaryo, 2 kalış: garaj ve surus alanlarının ortak "araç geçişi takılmıyor" performans ölçümü (9 alan aynı anda, boşta kare 168 ms). Aynı senaryo tek başına yeniden koşunca geçti (garaj 1/1); yük kaynaklı, kod değişikliğiyle ilgisiz (MUTANT garaj koduna dokunmaz).
Yayın: 0.8.2 (48b26cb) Yayın 40323933491 başarılı, ama Denetim 40323915195 kaldı: e2e'de etkinlik kartı açılmadı. Neden: etkinlik yerlerinden biri tırmanış yokuşundaydı (araç kayıp işarette duramıyor). Düzeltme c6f7d20: yerler düz zemine + eğim birim testi + e2e koşul beklemesi; yerelde akış 3/3 kez 10/10. **0.8.3 denemede** (61fad1d): Denetim 40325731909 ve 40325792894 başarılı, Yayın 40325798828 (derleme/yayın/adres kontrolü) başarılı. Canlı 0.7.8 değişmedi.
Sonraki: Cem /dev/'de oynasın (15 dk, ödüller, boss hedefi, pasif/atölye hissi); sonra A2 nitro + eklenti sandıkları.

## 9. Issue #16: oyuncu testi sonrası denge (Claude, claude/mutant)
Cem'in testi (26.10): stok araçla son boss bile yenilebilir hissi; motor değişimi 2-3 etkinlikten sonra alınıyor ve kalan modifiyeleri gereksiz kılıyor; her etkinlik kolay; başarısızlığın bedeli yok; modifiyeler yeni oynanış stili üretmiyor. İstenen: yüksek risk / yüksek ödül, LEGO tarzı kombinasyon. Codex aynı anda yalnız görsel (`codex/mutant-gorsel`, PR #17); mekanik sahibi Claude.

### Ölçüm (tests/olcum/mutant.test.ts, rapor docs/denge/2026-10-26-mutant-olcum.json)
40 pist × 6 build (stok, motor değişimi, dengeli, uzman, nadir motor = yarış motoru + büyük turbo, motor+uzman), türün başlangıç aracı, gerçek fizik + pilot, tek tur. Bulgular:
- Kolay pistlerde stok bile 1-3★; motor değişimiyle her türde 3★ (Cem'in "her şey kolay" gözlemi ölçüldü).
- Motor değişimi tek başına baskın (asfalt sev4: motor 55,98 sn 1★, uzman 66,88 sn 0★; drift Liman: motor 6762 puan, uzman 1758).
- Nadir motor da uzmanı asfaltın çoğunda, rallide kolay pistlerde ve dragın hepsinde geçiyor; uzman parçalar pilotta %1-3 kazandırıyor.
- Driftte pilot puanı güçle büyür, açı kitini kullanamaz: drift uzman referansı insan becerisini ölçmez (açık risk).
- Pilot rallikros/rallinin zor pistlerini temiz bitiremiyor (null): bu pistler boss olmaz.

### Uygulanan (aşama 1: zorluk/ekonomi)
- **Etkinlik risk kademesi:** Güvenli 1★ ×1 (kaçırınca %30 teselli), Riskli 2★ ×2, Ölümcül 3★ ×3,5 (kaçırınca ödülsüz ve boss'a −45/−90 sn). Hedef pistin yıldızının tur başı payı; etkinlik tek tur. Temel ödül 40+20·sev XP, 60+30·sev para.
- **Atölye:** motor değişimi MUTANT'ta satılmaz (ölçümde tek başına baskın). Bölgede 5 parçalık tohumlu stok; zayıf (sv0) yok; nadirler (yarış motoru, büyük turbo, yarış lastiği) bölge 2'den ve stokta en çok bir, ×1,4 fiyat; stok 40 parayla yenilenir. Fiyat sv1 80 / sv2 170 / sv3 380.
- **Boss hedefi ölçülmüş referanstan:** bölge 1 stok ×1,05 (başlangıç aracıyla geçilir), bölge 2 dengeli/uzman iyisi ×1,02, bölge 3+ nadir motor + uzman birleşik build ×1,02. İlk deneme (bölge 3 = uzman/nadir iyisinden %2 iyi) ölçümle reddedildi: birleşik build 29 pistin 13'ünde geçemiyordu (imkânsız boss). Birleşik ölçüm docs/denge/2026-10-26-mutant-birlesik.json. Bölge 3 boss'u yalnız tek yolun yetmediği pistlerden: 16 pist (asfalt 3, drift 4, drag 8, ralli 1); nadir motor tek başına 13/29, uzman 3/29 pistte geçer. Rallikrosta tek yolun yetmediği pist yok: rallikros bölge 3 boss'u nadir motorla geçilebilir (açık risk; Çamur Baronu'nun yağmuru ölçüme girmedi). Referans tek tur, boss tur sayısıyla çarpılır (kalkışlı turun katı: oyuncu lehine pay). Test: tabloda bölge 1'i stok, bölge 3'ü birleşik geçer; bölge 3 adaylarında tek yol yetmez.

### Aşama 2: risk bedeli
Gövde 100: sert çarpma −12, spin (|kayma| > 1,3 rad) −8; düşük gövde gücü en çok %30 düşürür; 0'da pert, koşu biter ve özet çarpma/spin dökümünü yazar. Atölyede 3 para/puan tamir. Zırh (hasar −%35/kademe), Seyyar tamirci (+12/etkinlik).

### Aşama 3: Mutasyon V2 (kural pasifleri)
Adrenalin (gövde < 50 güç +%15), Cam top (güç +%25, hasar ×2), Hurdacı (hasarda tamir bedelinin %80'i para: bilerek çarpmak kârsız), Kumarbaz (ölümcül ×5, ceza ×2), Son nefes (bölgede bir kez +90 sn, boss hedefi %3 sıkı). OP koruması: pasif gücü ≤ ×1,9. Test: 1-3'lü bütün pasif kümelerinde güç sınırı, hurdacı kârsızlığı, etkisiz pasif yok. Örnek LEGO kombinasyonları: Cam top + Adrenalin + Seyyar tamirci (hasarlı ama güçlü), Hurdacı + Zırh (çarpışmacı), Kumarbaz + Zaman bükücü (risk avcısı).

### DENGE §9 dört etki
- Performans bütçesi: MUTANT kariyer sınıf/puanından ayrı; pasif gücü ×1,9 sınırı, motor değişimi yok.
- Başarı eşiği: boss hedefleri ölçülmüş referans; bölge 1 stokla geçilir, bölge 3 birleşik build ister ve ölçümle ulaşılabilir.
- Kazanç hızı: ödül riskle ×1-×3,5; nadir parça ancak bölge 2'de ve ×1,4; para/XP kariyere geçmez.
- Kayıt uyumu: koşu kayıtsız (oturumluk); yalnız `lt_mutant` rekoru; kariyer kaydı değişmez.

### Açık riskler
- Pilot insan değildir; özellikle driftte referans beceriyi değil gücü ölçer. Cem'in testinden sonra drift boss kademesi ayrıca ayarlanmalı.
- Etkinlik yıldızları kariyer eşikleri; güçlü build'le güvenli/riskli kademeler kolay kalabilir (ölümcül hâlâ zor). İkinci oyuncu testinde ölçülmeli.

### Doğrulama ve yayın (issue #16)
- Yerel: `npm test` 353/353; alan mutant, menu, garaj, hud, kariyer 56/56; MUTANT e2e 11/11; iPhone 13 risk kartı/atölye/boss görüntüleri incelendi.
- **0.8.4 denemede** (gelistirme 14b0548): Denetim 40347080656 ve 40347092291 başarılı; Yayın 40347088798 (derleme/yayın/adres kontrolü) başarılı. Canlı 0.7.8 değişmedi. Issue #16'ya teslim raporu yazıldı; PR #17 (Codex görsel) gözden geçirildi: biçim CI'ı ve iki İngilizce metin düzeltilmeli.
- Sonraki: Cem ikinci oyuncu testi (bölge 2-3 ulaşılabilirlik, risk kademesi gerilimi, hasar bedeli); PR #17 birleşince `sayfaAc` sarmalayıcısı.

## 10. A2: nitro, eklenti sandıkları, sistemik güçler (issue #19; Claude, claude/mutant-a2)

### Kabul ölçütleri
1. NİTRO tuşuyla (klavyede N) etkin yetenek: enerjiyle çalışır, süreli güç verir, sonra soğur; koşu yoksa (kariyer, ölçüm, hayalet) etkisiz; belirlenimci.
2. Haritada tohumlu eklenti sandıkları: normal (bedava seçim) ve lanetli (nadir eklenti + bedel); eklenti koşu boyunca kalır, pasif sözleşmesine ve kombinasyon matrisine girer.
3. En az üç oynanışı değiştiren sistemik güç ortak olaylarla (kimliğe bağlı kombo yok), sonlu tetik ve testle.
4. Nitro hissi (görüş, alev, ses) iPhone 13 bütçesinde; HUD dalı için salt okunur `mutantDurumu()`.
5. Ölçüm: yağmurlu boss referansı, nitronun boss'u kolaylaştırma sınırı (≥3 nitro biçimi × 29 pist); açık riskler kartta.

### Uygulanan
- **Nitro** (`oyun/mutant-enerji.ts → NITRO`): 40 enerji, güç ×1,6, 2,5 sn, sonra 4 sn soğuma; koşu 40 enerjiyle (bir nitro) başlar. `enerjiAdimi` (saf) drift gözlemcisi + bekleyen ortak olaylar + nitro isteğini yürütücüye verir; güç değişince `mutantAracGuncelle` (`kurulum.mod.car.hp`), fizik kodu değişmez. Tuş `#mnt` sol grubun üstünde, enerji dolgusu ve maliyet çizgisi.
- **Ortak olaylar** (`cekirdek/mekanikler.ts`): `HasarAlindi` (çarpma/spin, miktar), `RiskBasladi` (etkinlik risk kademesi); değiştirici `guc` [0, 0,3], süreli güç üst sınırı ×1,9.
- **Sistemik güçler** (seviye seçiminde): Çarpışma Pili (hasar +12 enerji), Risk Kondansatörü (riskli/ölümcül başlangıçta +40), Nitro kalkanı (nitro açıkken hasar yarı); ayrıca Drift Hasadı, Temiz Çıkış, Kayma Hafızası, Hız Dinamosu, Geniş Tüp, Verimli/Uzun/Sert Nitro, Sigorta.
- **Eklenti sandıkları** (`sandikDiz`/`sandikAc`): bölge başına 2 normal (2 sıradan eklentiden biri: Yedek tüp, Kızgın egzoz, Takviye tampon) + 1 lanetli (nadir: Turbo kartuşu, Çift ateşleme, Hasar dönüştürücü; bedel: boss −45 sn / gövde −25 pert etmez / paranın yarısı). Bırakılan sandık kalır. Sahip olunan eklenti yeniden çıkmaz; seviye seçiminde eklenti yok.
- **His:** nitro açıkken FOV +9 (yumuşak), egzozdan küçük turuncu/mavi alev (toz havuzunu paylaşır, 3 karede bir: ek nesne yok), açılış hışırtısı + sönüş ıslığı.
- **HUD arayüzü:** `mutantDurumu()` (faz, bölge, boss, kalanSn, govde 0-100, riskYildiz, enerji/kapasite, nitroMaliyet/Acik/KalanSn/Hazir). Codex PR #20'nin okuduğu `mutant.kosu` alanları değişmedi.

### Ölçüm (docs/denge/2026-10-26-mutant-olcum-yagmur.json, -nitro-{tek,periyodik,surekli}.json, -nitro-ozet.txt)
- **Kombinasyon matrisi:** 696 kombinasyon (14 perk/eklenti, 1-3'lü) × 6 oyuncu biçimi kırılmasız; en kötü nitro süre payı %44 (sınır %50). Hasar dönüştürücü +20'de %49,7'ye çıktı, +15'e indirildi.
- **Nitro, stok araç, 29 ölçülü pist:** tek nitro (başlangıç enerjisi) ort. %2,4 (drag %2-9); her fırsatta (sonsuz enerji, %38 süre) ort. %3,7; hep açık (ulaşılamaz) %6,5. Boss hedefini stok+nitro geçer: tek nitro bölge 1/2/3 = 29/5/0; her fırsatta 28/14/1; hep açık 29/22/5. Yorum: enerji build'i (kaynak perkleri) bölge 2'de dengeli/uzman parça yoluna **alternatif yol** olur; bölge 3'ü tek başına çözmez.
- **Drift ölçümünde nitro yok:** drift pilotu nitro biçimini almıyor (sonuç %0 bir ölçüm boşluğudur, gerçek etki değildir).
- **Yağmur (Çamur Baronu):** 8 rallikros pistinden yalnız Plaj Kros'ta (rx_7) beş build de temiz bitti; yağmurlu boss yalnız yağmurda ölçülen pistlerden seçilir (`MUTANT_REFERANS_YAGMUR`). Yağmurda stok 74,33 sn, güneşte 71,63 (%3,8 yavaş).

### Açık riskler / Cem kararı
- Nitro enerji build'iyle stok araç bölge 2 boss'unu 29 pistin 14'ünde geçebiliyor: bu "nitro build yolu" olarak kalsın mı, yoksa nitro gücü ×1,6 → ×1,4 mü? (Şimdilik değiştirilmedi.)
- Bölge 3 `tekYolYetmez` nitroyu hesaba katmaz; nadir motor + nitro tek yol olabilir. Rallikros bölge 3 (güneş ve yağmur) hâlâ tek yolla geçilir.
- Drift boss'unda nitro ölçülmedi. Sayılar tahmin; test geçmesi eğlencenin kanıtı değil, Cem'in telefon testi gerekir.
- Codex PR #20 ile `hud.ts`'te aynı satıra (`pisteDonusSayaci()` sonrası) iki çağrı eklenir: birleştirmede ikisi de kalır.
