# fizik dal notu

- 5 yeni araç (CARS 5-9, sıra sözleşmeli): gt3 Gri Atmaca (gp), t16 Kum Fırtınası (rx), int Sarı Arı (rl), ae86 Panda (dp), supra Turuncu Ejder (dg). Gövde/teker/renk tek kaynak: garajın `src/arac/gorunumler.ts`'i (araclar.ts `...GORUNUM.<k>` ile alır; dingil ve iz fiziği de etkiler, değişirse ölçümü yenile).
- Turbo eklendi (`tb`, `tbs`, `tbu`; `Y.turbo`): Kum Fırtınası sert/gecikmeli, Turuncu Ejder büyük ve gecikmeli, Sarı Arı hafif.
- Kilit: yeni araçlar geçici olarak seviye 10/11/13/9/15 (lv 20 ilerleme testini bozuyordu: son kilit ≤18); para ile altyapı düzenleyecek.
- Ölçüm (norm, 0-100 / azami / 100-0): Gri Atmaca 2,47 sn / 281 / 9,9 m (Kızıl Ok 2,43 / 279 / 10,0); Kum Fırtınası 2,3 / 186 / 17,7 (Kor RX 2,10 / 185); Sarı Arı 3,18 / 203 / 18,3 (Mavi Yıldız 3,38 / 199); Panda 2,83 / 196 / 16,2 (Beyaz Kurt 2,60 / 223); Turuncu Ejder 2,62 / 376 / 16,1 (Gece Mavisi 2,22 / 331).
- Kendi türünde (olcum uyum, ilk araca göre): Gri Atmaca gp2 +0,2%, gp4 −0,6%; Kum Fırtınası rx2 ~+4%, rx4 ~+4% (bot turbo gecikmesini iyi kullanamıyor; sonuçlar küçük ayarda oynak); Sarı Arı rl2 0%, rl4 −0,5%; Panda drift puanı dp3 −21%, dp5 −7% (başlangıç aracı); Turuncu Ejder 1/4 mil 9,03 (Gece 8,92), 1 mil 21,65 (23,03). Hepsi hedefi geçer; Şehir Drifti hedefini Beyaz Kurt da geçemiyor (pist dalının yeni eşiği).
- Denenip bırakılan: Sarı Arı'da tb 0,25 ve ön tutuş 1,03 (rl2'de %6-8 yavaş); Kum Fırtınası tbu 0,6 (rx4'te %14 yavaş), tb 0,45, awd 0,5. Titreşim testi pilot cesaretini artık `sev`'den alır (7-8 numaralı pistlerde tanımsızdı).
- Uyum testi artık türün bütün araçlarını başka türlerin araçlarıyla karşılaştırır (`tests/birim/uyum.test.ts`); ölçümde ☆ sonradan gelen tür aracı.
- Açık: botun sürüşü Gri Atmaca'nın yüksek tavanını tam kullanamıyor (insan sürüşünde fark belli olur); garaj çubuk değerleri (a100, lat, b100, t90) mevcut ölçekle tahmin, ölçülen değer değil. Yıldız eşikleri ilk araçla ölçülü; yeni araçlar için değişmedi.
