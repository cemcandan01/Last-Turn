# LT-SYS-003 — MUTANT A3: ilk gerçek YZ rakip (düello dikey dilimi)

- **Sahip:** Claude · **Dal:** `claude/mutant-a3-rakip` · **Taban:** `origin/gelistirme` 9f92589 (PR #24 birleşmiş)
- **Kaynak:** issue #22 (27 Ekim yorumları: AI zorunlu tasarım kuralları, `AracOrnegi`/`Simulasyon` kullanımı), issue #25 (sonraki iş; bu işte dokunulmadı)
- **Risk:** ortak fizik değişmez; yeni saf YZ modülü + MUTANT etkinliğine bağ. Tek uygulayıcı, yardımcı ajan yok.

## İstek (Cem, aynen)

> MUTANT için görsel geliştirmeleri Unity aşamasına erteledik. Artık oynanış ve gerçek yarışçı AI önceliğimiz. […] Öncelikle A3'ün ilk oynanabilir sürümünü geliştir: tek kısa asfalt pistinde gerçekten yarışabilen bir NPC. AracOrnegi, Simulasyon ve mevcut diğer araç çizim altyapısını kullan. NPC oyuncuyla aynı fizik üzerinden sürsün. Fren, gaz, direksiyon kararlarını kendisi versin. Rubber-band, ışınlanma veya gizli hız artışı kesinlikle olmasın. İlk sürümde güvenilir sürüşü ve tur tamamlamayı kanıtla; sonra karakter, geçiş ve boss davranışlarına geçeceğiz. Deterministik testler, performans ölçümleri ve deneme sürümü kabul kriterleriyle bir PR oluştur.

## Yorum ve kapsam

- Oyuncu MUTANT koşusunda bölge 1'in asfalt etkinliğine (haritada ASFALT işareti) girince **Düello** kartı görür: Yeşil Vadi (1,49 km, geniş, gündüz), 2 tur, ızgarada yanında tek YZ rakip. Hedef süre yok: **rakipten önce bitir**.
- Kartta iki kademe = rakibin kişiliği: **Güvenli → Çaylak** (ödül ×1, kaybedince teselli parası), **Riskli → Deneyimli** (ödül ×2, kaybedince boss'a −45 sn). Ödül/ceza mevcut `RISKLER`'den; ekonomi değişmedi.
- Rakip = oyuncunun seçtiği başlangıç aracının **stok** hâli (parça/pasif/nitro yok), oyuncunun **yardım seviyesi** ve türün aynı yarış lastiği. Oyuncu atölye/pasif/nitro avantajını taşır; rakibe hiçbir çarpan yoktur.
- Kapsam dışı (sonraki kartlar): geçiş/savunma taktiği, iki rakip, boss rakip, nitro/el freni kullanan YZ, araçlar arası temas, rakibe pist dışı geri dönüş kuralı (aşağıda açık soru), issue #25 ekonomisi.

## Kabul ölçütleri

1. **Aynı fizik, yalnız girdi:** rakip kendi `AracOrnegi`/`Simulasyon`'unda `aracAdimi` ile yalnız `tg/g/b` girdisiyle sürer; konum yazılmaz, ışınlanma/rubber-band/gizli tutuş-güç yok. Kanıt: birim testi (kurulum stok araca eşit; adım başına yol ≤ hız·dt; girdi sınırları), e2e kare kare sıçrama yok.
2. **Güvenilir tur:** 5 başlangıç aracı × 2 kişilik × 5 tohum düelloyu (2 tur) bitirir; takılma/pist dışı/spin/çarpma yok. Zorlanma: ters ve dik başlangıç, iki yana genişe kaçma (20°, 22 m/s) toparlanır.
3. **Belirlenimci, tohuma bağlı:** aynı tohum birebir aynı yarış; farklı tohum farklı (viraj başına tohumlu sapma, saniye başına titreme değil).
4. **Karakter farkı fiziksel ve ölçülü:** deneyimli 2★–3★ (43,0–46,7 sn/tur), çaylak 1★–2★ (46,7–53,8 sn/tur) temposunda; fark yan ivme/fren noktası/kenar payı/tutarlılıktan.
5. **Oynanabilir ve hafif:** MUTANT'ta kart → geri sayım → yan yana kalkış → HUD'da sıra/fark (m) → sonuç ("Rakibi yendin"/"Rakip önde bitirdi") → haritaya dönüş; yeniden başlatmada rakip ızgaraya döner. Rakip, 4× yavaşlatılmış işlemcide sabit adım maliyetini ≤ 2,6 katına çıkarır (ikinci tam fizik aracı).

## Uygulama

- `src/yz/cizgi.ts` (plan): en az bükülme enerjili yarış çizgisi (kenar payı içinde, dört komşulu yumuşatma) + yanal ivme/fren sınırlı hız profili.
- `src/yz/kisilik.ts`: Çaylak / Deneyimli parametreleri (yan ivme, fren, kenar payı, bakış, tutarlılık, kalkış tepkisi, sabır, kayma sınırı); tohumlu viraj sapması.
- `src/yz/pilot.ts`: Algı (kendi aracı, çizgideki yer, kenara uzaklık) → Taktik (yarış / üç noktalı dönüş / geri vitesle kurtulma / pist dışında momentumu koruyup sığ açıyla dönüş) → Kontrol (saf takip direksiyon + karşı direksiyon, hız profili gaz/fren).
- `src/yz/yarisci.ts`: pilot + `AracOrnegi` + tur sayacı (oyuncunun `evTick` kuralıyla aynı) + stok kurulum. Testler ve ölçüm doğrudan bunu kullanır.
- `src/oyun/rakip.ts`: oyun bağı (ızgarada oyuncunun 4,5 m yanında, `dunyaSorgusuYap` ile yalıtılmış dünya sorgusu, uzak araç çizimi, sıra). `surus.ts` her sabit adımda oyuncudan sonra ilerletir.
- MUTANT: `Etkinlik.rakip`, `DUELLO` (mutant-kosu), `mutantRakibi()` (tohum koşu+etkinlikten), düello kartı/sonucu (mutant-ui), HUD satırı, `mutantDurumu().rakip` (sözleşmeye ek alan; eski alanlar aynı).

## Kanıt

- Birim `tests/birim/rakip.test.ts` (9 test): çizgi/hız profili/kişilik saf testleri, stok kurulum eşitliği, 5 araç × 2 kişilik 2 tur, tohum tekrarı, zorlanma.
- Ölçüm `npm run olcum -- rakip` → `docs/denge/2026-10-27-rakip-olcum.json` (aşağıda özet).
- Tarayıcı `tests/e2e/bolumler/rakip.mjs` (alan `mutant` → senaryo `rakip-duello`), görüntü `tests/cikti/rakip.png`.

### Ölçüm özeti (2026-10-27, Node, `docs/denge/2026-10-27-rakip-olcum.json`)

| | Çaylak | Deneyimli |
| --- | --- | --- |
| Düello bitirme (5 araç × 5 tohum) | 25/25 | 25/25 |
| Uçan tur ort. (en iyi–en kötü) | 49,0 sn (46,5–51,1) | 44,0 sn (42,0–45,4) |
| Aynı araçta tohumlar arası sapma | ~0,4 sn | ~0,08 sn |
| 2 tur bitiş ort. | 103,6 sn | 94,0 sn |
| Takılma / pist dışı / spin / duvar | 0 / 0 sn / 0 / 0 | 0 / 0 sn / 0 / 0 |

- Fark: deneyimli 5,0 sn/tur hızlı (yan ivme 10 vs 7,5 m/s², fren 8 vs 5,5 m/s², kenar payı 2,8 vs 3,4 m, tutarlılık 0,9 vs 0,55).
- Aynı tohum tekrarı birebir aynı (son durum, süre, pilot durumu).
- Zorlanma (5 araç × 2 kişilik): ters başlangıç 10/10, dik 10/10, genişe kaçma 20°/22 m/s sol 10/10 · sağ 10/10; **sert taşma 34°/25 m/s sol 9/10 · sağ 7/10** (kalanlar çime gömülüp duruyor; stok araç çimde duruştan kalkamıyor, oyuncu da).
- Yardım seviyesi: Arcade/Dengeli/Gerçekçi × 5 araç deneyimli raporda (rakip oyuncunun seviyesinde sürer).
- İki YZ yan yana: deneyimli her araçta önde bitirdi; sıra değişimi 0 (geçiş taktiği yok, beklenen).
- Maliyet: yarış başında plan ~10 ms; adım başına ~0,5 ms (Node), pilot payı ölçüm gürültüsünde; maliyet ikinci fizik aracının kendisi. Tarayıcıda 4× yavaş işlemcide sabit adım maliyeti rakipsizin 1,84 katı. **Gerçek iPhone 13 ölçülmedi** (Cem'in telefonunda `?perf` ile bakılacak).

### Doğrulama (yerel, Linux, Node 22, Chromium; kaynak bu daldaki son commit)

- `npm run kontrol` (tip + ESLint + biçim) temiz; `npx vitest run` 376/376.
- `npm run alan -- mutant` 11/11 (yeni: rakip-yz, rakip-plan, rakip-duello), `npm run alan -- hud` 4/4.

## Deneme sürümü kabul kriterleri (Cem, /dev/, iPhone 13 yatay)

1. MUTANT → araç + pasif → haritada ASFALT işaretinde dur: kart başlığı **Düello**, iki kademe (Rakip: Çaylak / Rakip: Deneyimli).
2. Kademe seç → geri sayım; rakip yanında. Işıkta ikisi birlikte kalkar; rakip virajlarda frenler, pistte kalır, 2 turu kendi sürer.
3. Sol üst satır `Tur 1/2 · 1.` ya da `2.` ve rakiple fark (m); rakip öndeyken yaklaştıkça/uzaklaştıkça değişir.
4. Önce bitirirsen **Rakibi yendin** + ödül; rakip önce bitirirse **Rakip önde bitirdi** (+ Riskli'de boss'a −45 sn). Sonuçta rakibin ve senin süren.
5. Hissedilen: Çaylak yenilebilir, Deneyimli zorlayıcı ama adil; rakip hile yapıyor hissi yok. Kare hızı düellosuz yarıştan belirgin düşük değil.

## Açık soru (Cem)

- Oyuncuya yarışta 6 sn pist dışı kalınca çıkış noktasına geri koyma kuralı uygulanıyor. "Işınlanma yok" kuralı gereği rakibe **uygulanmadı**: rakip çime gömülürse (stok araç çimde duruştan kalkamıyor) yarışı bitiremez ve oyuncu kazanır. Normal yarışta ölçülen pist dışı süre 0; yalnız aşırı taşmada görüldü. Aynı açık kural rakibe de uygulansın mı?

## Durum

- 2026-10-27 Claude: uygulama + testler + ölçüm tamam; PR açıldı (bkz. DEVIR). Sonraki tek adım: Cem /dev/'de düelloyu oynasın; geri bildirime göre kişilik ayarı, sonra geçiş/savunma taktiği (LT-SYS-004).
