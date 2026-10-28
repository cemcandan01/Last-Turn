# LT-SYS-007 — MUTANT: rekabet ve boş zaman

**İstek (Cem, 2026-10-28):** Daha eğlenceli olmalı. Yarıştan yarışa giden süre ve yarışta rekabetsiz düz gidişler boşa zaman gibi; boss yarışları çok basit. Seçimler: yolda mini görevler, her yarışa YZ rakip, boss gerçek rakip.

**Sahip:** Claude. **Dal:** `claude/mutant-eglence`, taban `gelistirme` 0988774.

## Ölçülen başlangıç durumu
- 16 etkinlik yeri merkezden 140–750 m; ardışık etkinlikler çoğu kez 500 m+ (100 km/sa'te 20–40 sn boş sürüş).
- Rakip yalnız bölge 1 asfalt düellosunda; öteki etkinlikler ve boss süreye karşı tek başına.
- Boss hedefi bot pilotun ölçtüğü süre + pay (bölge 1 stok +%5): insan oyuncu kolay geçer.

## Kabul ölçütleri
1. Asfalt, rallikros, ralli ve drag etkinliklerinde ızgarada YZ rakip var; başarı yine risk kademesinin hedefi, rakibi geçmek ek para verir. Drift etkinliği rakipsiz (puan yarışı). Bölge 1 düellosu olduğu gibi.
2. Rakip yalnız ölçümde bitirebildiği pistlerde çıkar (27/32; rampada takılan 5 pist rakipsiz); temposu hedefe yakındır, yani yarış kafa kafayadır.
3. Boss yarışı (drift boss'u hariç) boss rakibine karşıdır: boss'tan önce bitirmek gerekir. Boss "boss" kişiliğinde, türün başlangıç aracı ve bölgenin referans build'iyle sürer; bölge 1'de stok başlangıç aracıyla geçilebilir, sonraki bölgelerde yatırım ister.
4. Açık dünyada etkinlikler arası yolda kısa mini görevler çıkar (drift, hız, kıl payı, rampaya yakınken sıçrama); başarı para/enerji verir, HUD'da görünür. Yarış içinde çıkmaz.
5. Kariyer ve serbest sürüş değişmez; normal koşu süresi aynı.

## Denge notu
Rol: MUTANT koşusunun ara sürüşünü ve yarışını oyuna çevirmek. Ödül sayıları (rakip bonusu, mini görev ödülü) tahmindir; Cem'in telefon testine göre ayarlanır. Boss zorluğu YZ ölçümüne dayanır, insan performansı ölçülmedi.

## Yapılanlar
- Etkinlik rakibi (`etkinlikRakibi`, mutant-kosu.ts): gp/rx/rl/dg; pistin kariyer hedef kurulumu; Güvenli Çaylak, Riskli/Ölümcül Deneyimli. Başarı hedef; rakibi geçmek +%50 etkinlik parası (risk çarpanıyla). HUD sıra + fark + hedef; sonuçta "Rakibi geçtin". Rakipsiz pistler `RAKIPSIZ_PISTLER`.
- Boss rakibi (`bossRakibi`): drift hariç boss'a karşı; türün başlangıç aracı + bölge build'i (1 stok, 2 uzman + Motor ayarı, 3 nadir motor + uzman + 3 Motor ayarı) + `boss` kişiliği. Drift boss'u puan hedefiyle.
- Rakip YZ: açık pist (ralli, drag) bitişi; geri sayımda el freni (ayak freni geri vitese takıp ızgaradan kaçırıyordu, düelloda da); takılı 8 sn → pistte 3 nokta geriye dönüş.
- Yol görevleri (`mutant-gorev.ts`): açık dünyada 6 sn sürüşten sonra, 8 sn arayla; drift (2+bölge sn), hız (aracın %85'i, en çok 100+15·bölge km/sa), kıl payı (2+bölge), sıçrama (rampaya 450 m yakınken 0,8 sn). 25 sn süre; ödül 25+12·bölge para + 20 enerji; kaçırmak cezasız; yarışta yok.
- Ölçüm `docs/denge/2026-10-28-mutant-rakip-olcum.md`.

## Doğrulama
- Yerel: kontrol temiz (2 eski uyarı), npm test 451/451, alan mutant 24/24, kariyer 31/31, hud 4/4. Görüntü `tests/cikti/mutant-gorev.png`.

## Açık
- Asfalt boss'u bölge 2–3'te eski hedeften biraz yavaş (ölçüm). Daha zor istenirse pilotun asfalt temposu iyileştirilmeli.
- 5 pist rakipsiz (rampa). Kıl payı görevi engel azsa zor olabilir; gerçek cihazda his denenmedi. Ödül sayıları tahmin.
