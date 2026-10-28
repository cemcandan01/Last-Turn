# LT-SYS-008 — MUTANT şehir bölgesi, sokak yarışları, uçan araba ve bina sarkacı

**İstek (Cem, 2026-10-28):** Şehir haritası: yüksek binalar arasında sokaklarda yarış, New York gibi, Central Park merkezde. Uçan araba skill'i; kanca varsa binalara kanca ata ata örümcek adam gibi gezmek. Seçimler: şehir MUTANT'ta Çorak'tan sonraki bölge; sokak yarışının üç türü de (kontrol noktalı A→B, blok turu, kovalamaca); uçan araba süreli uçuş; kanca sarkaç sallanma.

**Kısıt:** gerçek marka/şehir adı yok (CLAUDE.md): kurgusal şehir "Kule Şehri", merkez park "Büyük Park", skill "Volt Kanat".

**Sahip:** Claude. **Dal:** `claude/mutant-sehir`, taban `gelistirme` 17b6828.

## Kabul ölçütleri
1. Bölge 2'den itibaren koşu Kule Şehri'nde: ızgara caddeler/sokaklar, yüksek binalar (çarpışmalı), merkezde uzun dikdörtgen park; kenarda nehir ve bariyer; mini haritada bloklar ve park.
2. Şehirde etkinlik, sandık, atölye ve boss işaretleri; sokak yarışları üç türde (A→B, blok turu 2 tur, kovalamaca) şehir sokaklarında, rakip YZ ile; rakip bütün rotaları bitirir (ölçüm).
3. Volt Kanat: basınca araç yükselir (bina üstüne çıkacak kadar), direksiyonla döner, süre bitince yumuşak iner; enerji ister; skill havuzunda.
4. Kanca şehirde ilerideki bina tepesine 3B iple tutunur: araç sarkaç gibi savrulur, bırakınca hızını korur; kısa beklemeyle zincirlenir. Çorak'ta eski davranış aynı.
5. Kariyer, serbest sürüş ve Çorak bölgesi değişmez; fizik `cx.ucus` yokken birebir aynı (kariyer imza testi).

## Yapılanlar
- Kule Şehri (`src/dunya/sehir-duzen.ts` saf, `sehir.ts` çizim): x=9000 merkezli 1,6 km ızgara (14 cadde, 21 sokak), ~650 bina (tek birleşik geometri, cephe dokusu; parka ve güneydeki iş merkezine doğru yükselir, en çok 260 m), Büyük Park (çim, göl, halka park yolu, patikalar), kenarda bariyer ve nehir. Çatılar zemin yüksekliği (çatıya inilir); bina çarpışma kutusu tepe yüksekliğiyle, oyuncu tepenin üstündeyken çarpmaz (`surus.ts` sorgusu).
- Fizik: isteğe bağlı `cx.ucus` (dikey ivme + havada duruş/yalpa denetimi); yokken birebir aynı, kariyer imzasından ayıklanır.
- Volt Kanat (aktif, 40 enerji): 4/4,5/5 sn, irtifa 30/45/65 m, ileri itki, süre bitince yere değene dek en çok 8 m/s iniş; evrim Fırtına Kanadı. Uçuşta rüzgâr efekti.
- Kanca sarkacı: şehirde rakip hedefi yokken öndeki bina tepesine 3B ip (boyu uzaklığın %80'i, yavaşça kısalır); 2,4 sn, bekleme 0,5 sn (zincir). Halat çatıya çizilir. Çorak'ta eski davranış.
- MUTANT: bölge 2+ Kule Şehri (etkinlik/sandık/atölye/boss yerleri şehirde, boss sonrası şehrin girişine). Şehir etkinlikleri sokak yarışı: blok turu, A→B, kovalamaca (rakip 45 m önde, önde bitir). Rota boyunca kontrol noktası kapıları. Boss yarışları eski pistlerde.
- Ölçüm `docs/denge/2026-10-28-mutant-sokak-olcum.md`.

## Doğrulama
- Yerel: kontrol temiz (2 eski uyarı), npm test 460/460, alan mutant 26/26 (yeni `mutant-kule-sehri`, `mutant-sehir-kurali`). Görüntüler `tests/cikti/mutant-sehir*.png`.

## Açık
- Volt Kanat ve sarkaç dengesi (enerji, süre) tahmin; zincirlemek için enerji sınırlı (kanca 25/atış).
- iPhone 13 performansı (650 bina tek çizim çağrısı; gölge) gerçek cihazda ölçülmedi. Şehirde trafik/yaya yok.
- Boss bölge 2+'da da eski pist türlerinde (şehirde boss rotası yok).
