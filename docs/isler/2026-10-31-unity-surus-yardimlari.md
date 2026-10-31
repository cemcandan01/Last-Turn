# Unity sürüş yardımları ve yardım seviyesi — açık görev (karar gerekli) — 31 Ekim 2026

## Bulgu

- TS'de oyuncu yardım seviyesi (`kurulum.lk`, varsayılan `real`) sürüşe yardım değerleri verir (`as`: acc, bra, grip, tcs, abs, dft, ini, str, stm); önayar `ast`/`cap` ile sınırlanır. Drift desteği (`as.dft`, model.ts `DR`) driftte kaybedilen hızın çoğunu geri verir ve driftte kalmayı kolaylaştırır.
- Unity motor adımında drift/viraj/ESC yardımları kapalı (önceki dilim kararı). Unity garaj adaptörü kurulumu `norm` seviyesiyle yapıyor; TS varsayılanı `real` (ör. araç 0: TS dft 0,4, Unity 0,5).
- Etkisi: drift yarışı Unity'de TS'den zor (doğrulama sürücüsü drift puanı 0–82, yıldız yok). Diğer türlerde TCS/ABS/acc/bra farkı da olabilir; ölçülmedi.

## Önerilen adımlar (Cem onayıyla)

1. Yardım seviyesi kararı: TS gibi oyuncu ayarı (varsayılan `real`) mı, sabit mi.
2. TS `model.ts` yardım blokları (drift desteği, ESC/viraj yardımı) TS oracle'ıyla parça parça portlanır; yardımsız profiller (GT/Arazi) bit düzeyinde aynı kalır.
3. Drift yarışı doğrulaması yardım açıkken tekrar ölçülür.
