# LT-SYS-004 — MUTANT: sistemik skill mimarisi (ilk uçtan uca dilim)

- **Sahip:** Claude · **Dal:** `claude/mutant-skill-mimarisi` · **Taban:** `origin/gelistirme` 8b036df (0.8.6, A3 dahil)
- **Kaynak:** Cem'in ChatGPT ile aldığı MUTANT skill kararları (27 Ekim mesajı; mesaj §10 "Skill ekleme," cümlesinde kesik geldi, kalanı okunamadı). Skill havuzu taslağı `origin/codex/mutant-kisa-bolge-temposu:docs/denge/mutant-skill-havuzu-v1.md` ve aynı daldaki `mutant-mobil-ekonomi-hedefi.md` (kapora kararları). O dal `gelistirme`ye girmemiş; bu iş yalnız belgelerini okudu, sayaç değişikliğini (330/390/450 sn) almadı.
- **Risk:** ortak fiziğe tek, isteğe bağlı giriş (dış ivme; yokken birebir aynı). Kariyer/hayalet/rekor etkilenmez. Tek uygulayıcı.

## İstek özeti

Build değil build kurulabilecek sistem. Oyuncu aynı anda en çok 3 skill taşır; skill/pasif/eklenti/upgrade/evrim/modifiye ayrı. Skill'ler birbirine özel kodla bağlanmaz; ortak olaylar ve durumlar üzerinden etkileşir (`cekirdek/mekanikler.ts` genişletilir, ikinci motor yok). İlk örnekler Grappling Hook, Flying Dutchman, Risk Taker. Drift etkinliğinde rastgele, kilitli skill kaporası. Güçlü kombinasyonlara izin; yalnız risksiz/sonsuz döngüler engellenir. Test: belirlenimcilik, sonlu zincir, tekrar eden olaydan sınırsız ödül yok, ekonomi döngüsü ölçümü, aynı tohum aynı sonuç. Çalışan kod + test + PR.

## Kabul ölçütleri

1. **Yuva ve ayrım:** en çok 3 skill (etkin + tetiklenen ikisi de yuva tüketir); pasif, sandık eklentisi, atölye parçası yuva tüketmez. Yuva doluyken yeni skill ancak biri bırakılınca alınır; bırakılan seviyesi, skill eklentileri ve evrimiyle gider. Seviye (parametre), skill eklentisi (etiket uyumlu ortak olay tepkisi) ve evrim (davranış değişimi) ayrı seçeneklerdir.
2. **Ortak olaylarla etkileşim:** skill kodu başka skill kimliği içermez; yeni olaylar `HasarVerildi`, `YakinTakip`, `NearMiss`, `KonumEtkisi`, `DurumUygulandi`, `KorumaEngelledi`, `Carpisma` aynı sıra uzayında mekanik yürütücüsüne girer; pasifler (ör. Hasar Bataryası) hangi skill'in ürettiğini bilmeden tepki verir.
3. **Üç (+1) skill uçtan uca:** MUTANT koşusunda seçilir, tuş/bar olarak görünür, gerçek fizikte etki eder (kanca: ışınlanma yok), HUD sözleşmesinde (`mutantDurumu().beceriler`) okunur.
4. **Drift kaporası:** kart açılınca belirlenimci seçilir ve etkinliğe kilitlenir; vazgeçip dönmek değiştirmez; kazanınca +1 seviye (tavanda para), kaybedince yalnız o skill tamamen gider; skill yoksa kural açık.
5. **Sınırlar ve ölçüm:** aynı girdi aynı sonuç; olay zinciri derinlik/işlem sınırında; takip/near-miss/durum/hasar/dönüşüm uzatması tavanlı; en saldırgan kurulumun ekonomi döngüsü ölçülür ve rapora yazılır; eski matris (1-3'lü bütün perk kombinasyonları) yeni olaylarla da kırılmaz.

## Mimari

- **Olay sözlüğü** (`src/cekirdek/mekanikler.ts`): yeni girdi olayları + `kazancBirimi: "miktar"` (olayın miktarıyla orantılı enerji) + koşullar (`hasar`, `durum`). Mekanik yürütücüsü değişmeden enerji ekonomisinin sahibi.
- **Skill yürütücüsü** (`src/cekirdek/beceri.ts`, saf): skill = veri (ad, açık açıklama, tür, etiketler, seviye tablosu, evrimler, maliyet) + davranış kancaları (`kullanilabilir`, `basla`, `bayrak`, `adim`, `bar`). Davranış yalnız ortak API'yi kullanır: `hasarVer`, `durumUygula`, `ivme`, `olay`. Merkezî kurallar her skill'e kendiliğinden uygulanır:
  - hasar: saldırı kapalıyken verilmez; aynı kaynak→hedef tick aralığı; hedefe adım başına ≤ 10 gövde (`HASAR_ADIM_UST`);
  - durum (ateş: 0,5 sn'de 2 hasar; elektrik: hıza karşı 3,5 m/s² fren): yığılmaz, süre ≤ 3 sn, **yenileme olay üretmez**;
  - itme/çekme: gövde başına ≤ 12 m/s² (oyun yerçekimi 24), fiziğe kuvvet olarak;
  - skill eklentisi yalnız takıldığı skill'in kendi olayına tepki verir (kendi çıktısına değil), `NEDENSEL_DERINLIK`/`ADIM_ISLEM_SINIRI` ile kesilir;
  - sıra bağımsızlığı: bütün skill'ler aynı adımda aynı girdi olaylarını ve aynı bayrakları görür.
- **Adım akışı** (`enerjiAdimi`): drift gözlemcisi + yakınlık gözlemcisi + önceki adımın skill olayları + hazır skill tuşları (`AbilityActivated "beceri:<id>"`) → mekanik yürütücüsü (enerji harcar) → enerjisi harcanan skill'ler başlar → skill adımı → çıktı (oyuncu/rakip ivmesi, güç/tutuş çarpanı, olaylar sonraki adıma). **Hazır olmayan istek (hedef yok, beklemede, saldırı kapalı) enerji harcamaz.**
- **Yakınlık gözlemcisi** (anti-farm): yakın takip hedef başına 4 sn kredi (takip etmeyince 0,25 sn/sn dolar); near-miss hedef başına 3 sn bekleme, 18 m/s üstü, çarpışmadan sonraki 1 sn sayılmaz; yarış dışında olay yok.
- **Fizik** (`FizikBaglami.dis`, `fizik/yeni/model.ts`): isteğe bağlı yatay dış ivme kütle merkezine kuvvet olarak eklenir. Yokken/sıfırken fizik birebir aynı (test). MUTANT'ta girdi kaydı zaten kesik işaretli; kariyer ölçüm imzası bu bloğu ayıklar (`tests/yardimci/kariyer-imza.ts`, 0.7.5 `cimTeker` emsali).
- **Rakip:** skill'in hedefi `rakip`; skill hasarı rakip gövdesini düşürür, rakip gücü oyuncunun gövde kuralıyla aynı oranda (gövde 0'da −%30) azalır; pert yok. Çekme kuvveti rakibin fiziğine aynı yoldan. Rakip pilotu yine yalnız girdi üretir.
- **Koşu** (`oyun/mutant-kosu.ts`): `k.beceriler` (yuva sırası), seçim ekranında 3 pasiften üçüncüsünün yerine bir skill teklifi (ayrı tohum: ana rastgelelik sırası, dolayısıyla etkinlik/sandık yerleşimi eski koşularla aynı), `kaporaBelirle`/`kaporaUygula`, `beceriYarisBasi` (yarış başında rakip gövdesi/kredi sıfır). Güç: nitro × skill ≤ ×1,9 (`GUC_ETKI_UST`); skill tutuşu ≤ ×1,3.
- **Arayüz** (`arayuz/mutant-ui.ts`): seçim kartında tür satırı (Pasif / Skill / Skill seviyesi / Evrim / Skill eklentisi), yuva sayacı, dolu yuvada "hangisini bırakacaksın" sayfası; NİTRO'nun yanında skill tuşları (etkin: dolgu = etki/bekleme, tetiklenen: bar; klavye 1/2/3); drift kartında kapora kartı; sonuçta kapora satırı. Tarif/kombinasyon önerisi yok; açıklamalar yalnız skill'in kendisini anlatır.

## Skill'ler (sayılar ilk tahmin; ölçüm aşağıda)

| Skill | Tür / yuva | Davranış | Sv1 → Sv3 | Evrim |
|---|---|---|---|---|
| Grappling Hook | etkin, 25 enerji | Öndeki ±26° konide 8–menzil m içindeki en yakın rakibe bağlanır: oyuncu ona çekilir (yaklaşma hızı 12→22 m/s arasında azalır), rakip oyuncuya doğru frenlenir; 7 m'de ya da menzil×1,3'te kopar. Rakip yoksa yarışta pistte ilerideki merkez noktasına tutunur (oyuncu hızı 35→50 m/s arasında çekiş azalır). Hedef/nokta yoksa enerji harcamaz. | menzil 35→55 m, çekiş 7→10, fren 3→4 m/s², süre 1,2→1,6 sn, bekleme 6→5 sn | Ters Kanca: arkadaki rakibe, 2× fren, oyuncu çekilmez, pist noktası yok |
| Flying Dutchman | etkin, 30 enerji | Hayalet fazı: oyuncu hasarı (çarpma/spin) işlemez → `KorumaEngelledi`; tutuş ×1,12→1,18. Faz boyunca hasar veremez, konum/saldırı skill'i başlatamaz, takip/near-miss risk biriktirmez. Fizik çarpışması ve pist/kontrol noktası kuralları aynı (duvarın içinden geçmez, tur atlatmaz). | süre 1,5→2,5 sn, bekleme 9→7 sn | Lanetli Geçiş: fazda 4 m içinden geçilen rakibe bir kez 1,5 sn elektrik |
| Risk Taker | tetiklenen (bar) | Yarışta ≥ 20° (0,35 rad) ve ≥ 11 m/s bilinçli drift (12/sn), yakın takip (15/sn, kredi sınırlı), near-miss (+15) barı doldurur. Bar dolunca dönüşüm: güç ×1,25→1,35, tutuş ×1,10→1,15, arkada 1,5 sn'lik alev izi (2,5 m; 0,5 sn'de 4→6 ateş hasarı), araç çarpışma hasarı ×1,5 (çarpışma üreticisi gelince). Herhangi bir kaynaktan rakibe hasar dönüşümü 0,5 sn uzatır, toplam ≤ 2→3 sn. Bitince 4 sn yorgunluk (bar dolmaz). | bar verimi ×1→×1,4, süre 5→7 sn | Kıvılcım İzi: iz hasar yerine 1 sn elektrik |
| Slipstream Engine | tetiklenen (bar) | Yakın takipte depolar (≤ 2→3 sn); takipten çıkınca 0,25 sn sonra depo kadar güç ×1,2→1,3. 0,5 sn'den az depo boşa gider. Takip kredisini Risk Taker ile paylaşır (çatışma). | depo/güç yukarıda, bekleme 3→2,5 sn | Rüzgâr Kırıcı: near-miss depoya +0,5 sn, boşalırken tutuş ×1,08 |

Skill eklentileri (seviye seçiminde, en çok 2/skill, etikete göre): **Şok bobini** (konum etiketli skill bir hedefin konumunu değiştirince 1,2 sn elektrik), **Kor çekirdeği** (hasar etiketli skill hasar verince hedef 2 sn yanar). Pasif (yuva tüketmez) enerji kaynakları: **Hasar Bataryası** (verilen hasarın %50'si, 0,25 sn'de bir), **Kalkan Bataryası** (engellenen hasar kadar), **Takip Dinamosu** (takipte 5/sn).

İlişki örnekleri (iç not; oyuncuya tarif olarak verilmez): sinerji — kanca rakibi alev izine yaklaştırır, Hasar Bataryası her hasar kaynağından beslenir; bağımsızlık — Slipstream ile Dutchman; çatışma — Dutchman fazı Risk Taker'ın takip/near-miss birikimini ve alev hasarını durdurur, Slipstream ile Risk Taker aynı takip kredisini tüketir.

## Kapora kuralları

- Kart ilk açıldığında (ya da girişte) `tohum + etkinlik + deneme` ile sahip olunan skill'lerden biri seçilir, `e.kapora`ya kilitlenir. Kart aç/kapa, uzaklaşıp dönme değiştirmez (test + e2e). Kilitli skill başka yoldan elden çıktıysa deneme +1 ile yeniden seçilir (oyuncu seçemez).
- Kart kaporayı ve sonucunu açık yazar; girmezsen bir şey kaybetmezsin. Sonuç bir kez uygulanır (`etkinlikBitti`).
- Kazanç: skill +1 seviye; Sv3'te +100 para. Kayıp: o skill seviye, skill eklentileri ve evrimiyle silinir; pasif/sandık eklentileri kalır.
- **Skill yokken** kapora 15 gövdedir: kaybedince −15 gövde (pert ettirmez), kazanınca tohumlu yeni bir skill (Sv1). Ücretsiz giriş yok.
- Mevcut risk kademesi (Güvenli/Riskli/Ölümcül) ve ödülü değişmedi; kapora onun üstüne ek bahistir. Açık soru: Cem'in "drift puanına bağlı sınırlı ek para" notu bu dilimde yok.

## Denge (DENGE.md §9 dört etki)

- **Rol:** MUTANT koşu içi yetenek; kariyer/araç sınıfı/PI etkilenmez (kosuAraci yalnız MUTANT kurulumunda).
- **Hedef:** bölge 1 düellosu ve sonraki rakipli yarışlar; zamana karşı etkinliklerde Risk Taker/Dutchman/kanca pist noktası işe yarar.
- **Edinme:** seviye seçimlerinin üçüncü kartı (ilk seçim dahil); seviye/evrim/eklenti teklifi sahip olunan skill'e göre. Bölge başına ~2-4 seçim (mevcut XP eğrisi değişmedi).
- **Ölçülmüş etki:** Kanca Sv3, Yeşil Vadi düellosunda gerçek fizikte (iki YZ aracı, 3 sn ısınma sonrası 1,5 sn): fark 28,3 m → 15,8 m (kancasız 28,3 m), rakibin bu sürede hızlanması 4,25 → 0,22 m/s; ışınlanma 0 (`tests/birim/beceri-fizik.test.ts`). Ekonomi döngüsü (en saldırgan kurulum, 120 sn, `tests/cikti/beceri-ekonomi.json`): verilen hasar 0,83/sn (rakip gövdesi 100'de tükenir), Hasar Bataryası 0,33 + Takip Dinamosu 0,78 enerji/sn, 120 sn'de 6 kanca (enerji sınırlı, döngü kendini beslemiyor), dönüşüm payı %49, en yüksek enerji 54/100, nitro+skill gücü ≤ ×1,76. Bunlar yapay senaryodur; oyuncu keyfi/zorluk ölçülmedi.

## Kanıt

- Birim `tests/birim/beceri.test.ts` (grup "LT-SYS-004 skill sistemi", 23 test), `tests/birim/beceri-fizik.test.ts` (3 test), matris `tests/birim/mutant-matris.test.ts` (yeni "savaşçı" biçimi; 19 perk/eklenti, 1-3'lü 1160 kombinasyon × 7 biçim, etkisiz perk yok).
- Tarayıcı `tests/e2e/bolumler/beceri.mjs` (senaryo `skill-akis`), görüntü `tests/cikti/beceri-hud.png` (iPhone 13 yatay 844×390).
- Sonuçlar ve CI: aşağıda "Doğrulama".

## Kapsam dışı / sonraki

- Araçlar arası çarpışma (Risk Taker çarpışma hasarı ve `Carpisma` olayı hazır, üreticisi yok), rakibin skill kullanması (YZ aynı kurallar), boss bağışıklıkları.
- Havuzdaki diğer skill'ler (Piston Gatling, Spike Strip, EMP Pulse, Ricochet Shield, Nitro Leech, Overheat Cannon, Handbrake Reversal, Salvage Plating, Last Stand): ısı kaynağı ve mermi/tuzak varlıkları gerektirenler için yürütücüye "varlık" (iz gibi) genellemesi.
- Ralli/drag zaman aşımı gövde erimesi ve asfalt/GP risk modeli (Codex dalındaki Cem kararı) bu işte uygulanmadı; ayrı kart.
- iPhone 13 gerçek cihazda tuş yerleşimi ve hissi ölçülmedi.

## Doğrulama

- Yerel: `npm run kontrol` temiz; `npm test` 28 dosya 402/402; tarayıcı mutant 14/14, rakip 11/11, beceri 6/6.
- PR #28 → gelistirme d86bd72 (kaynak 22af3a4). Denetim 40558110357 + 40558096290 başarılı; ilk koşu 40556618708 MUTANT e2e NİTRO denetiminde kaldı (rastgele tohumda Sert Nitro seçilince maliyet 52 > başlangıç enerjisi 40; test o kartı seçmeyecek biçimde sağlamlaştırıldı). Yayın 40558864694 (derleme, /dev/ yayını, adres kontrolü) başarılı; /dev/ 0.8.7, canlı 0.7.8.
- iPhone 13 gerçek cihazda ölçülmedi.
