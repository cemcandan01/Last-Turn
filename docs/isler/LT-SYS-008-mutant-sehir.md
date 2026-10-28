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
