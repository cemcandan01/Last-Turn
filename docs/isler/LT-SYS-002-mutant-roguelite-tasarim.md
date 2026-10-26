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