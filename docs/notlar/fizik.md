# fizik dal notu

- 0.4.x: 5 yeni araç (CARS 5-9, sıra sözleşmeli): gt3 Gri Atmaca (gp), t16 Kum Fırtınası (rx), int Sarı Arı (rl), ae86 Panda (dp), supra Turuncu Ejder (dg). Gövde profili benzer aracınkinden boyca ölçeklenir (`govde()`); 3B model garaj dalında `k`'ye göre.
- Turbo eklendi (`tb`, `tbs`, `tbu`; `Y.turbo`): Kum Fırtınası sert/gecikmeli, Turuncu Ejder büyük ve gecikmeli, Sarı Arı hafif.
- Kilit: yeni araçlar geçici olarak seviye 10/11/13/9/15 (lv 20 ilerleme testini bozuyordu: son kilit ≤18); para ile altyapı düzenleyecek.
- Ölçüm (norm, 0-100 / azami / 100-0): Gri Atmaca 2,47 sn / 281 / 10,0 m (Kızıl Ok 2,43 / 279 / 10,0); Kum Fırtınası 2,30 / 187 / 17,7 (Kor RX 2,10 / 185); Sarı Arı 3,23 / 200 / 18,4 (Mavi Yıldız 3,38 / 199); Panda 2,82 / 196 / 16,1 (Beyaz Kurt 2,60 / 223); Turuncu Ejder 2,62 / 375 / 16,0 (Gece Mavisi 2,22 / 331).
- Kendi türünde (enIyiTur, ilk araca göre): Gri Atmaca gp2 +0,7%, gp4 +1,2%; Kum Fırtınası rx2 +3,3%, rx4 −3,0% (turbo: sıkı pistte geri, uzunda önde); Sarı Arı rl2 −0,3%, rl4 +0,6%; hepsi kendi hedefini geçer; Panda drift puanı dp3 −12%, dp5 −5% (başlangıç aracı); Turuncu Ejder 1/8 mil 6,22 (Gece 5,88), 1/4 9,05 (8,92), 1 mil 21,68 (23,03).
- Denenip bırakılan: Sarı Arı'da tb 0,25 ve ön tutuş 1,03 (rl2'de %6-8 yavaş, toprakta yanal tutuş Kor RX'in altına düştü).
- Uyum testi artık türün bütün araçlarını başka türlerin araçlarıyla karşılaştırır (`tests/birim/uyum.test.ts`); ölçümde ☆ sonradan gelen tür aracı.
- Açık: botun sürüşü Gri Atmaca'nın yüksek tavanını tam kullanamıyor (insan sürüşünde fark belli olur); garaj çubuk değerleri (a100, lat, b100, t90) mevcut ölçekle tahmin, ölçülen değer değil. Yıldız eşikleri ilk araçla ölçülü; yeni araçlar için değişmedi.
