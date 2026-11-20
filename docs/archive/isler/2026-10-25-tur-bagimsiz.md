# Pist türünden bağımsız araç ve puan

- İstek (aynen): nasıl yani puanlar direkt aracın özellikleri olsun. pist türünden veya lastikten bağımsız. her bir aracı her türlü yarışa sıkabiliriz. sadece gerekli modifiyeleri ve lastikleri takmazsak o yarışı tamamlamak zor olacak. bundan dolayı yarış türlerine özel bir araç optimizasyonu varsa kaldır. asfalt pistiyle drift pistinin tüm özellikleri aynı olsun. asfaltın ve toprağın sürtünme sabiti sabit kalsın.
- Sahip: Claude; dal: `tur-bagimsiz` (temel `79b16ec`, gelistirme 0.6.4).
- Kabul: fizikte pist türüne göre tutuş/güç çarpanı yok (`uz`, `uzg`, `uzT`, `TUR_UYUMU` kaldırıldı; `yolTuru` fizikte okunmaz).
- Kabul: aynı araç aynı zeminde yarış, drift ve drag pistinde; rallikros ve ralli toprağında birebir aynı tutuş (`tests/birim/uyum.test.ts`, 5 tür aracı).
- Kabul: `SURF` asfalt 30, toprak 26 sabit (aynı test).
- Kabul: puan/sınıf pist türünden ve takılı lastikten bağımsız; hiçbir lastik parçası puanı değiştirmez (`denge.test.ts`, 15 araç × 6 lastik). Stok puanlar değişmedi (stok değer sabit; parça etkisi sabit "Karışık" lastikle ölçülen oran: `PUAN_LASTIGI`).
- Yan etki: tür araçları kendi pistlerinde yavaşladı (rx başlangıç aracı ilk pistte %17, ralli %7, asfalt %2). Yıldız eşikleri pilot ölçümünün eski/yeni oranıyla gevşetildi (gp, rx, rl; drag değişmedi; hiçbiri sıkılaşmadı); 1. pistlerde başlangıç aracının oranı da hesaba katıldı. Drift eşikleri ölçülmedi (tutuş düşüşü drifti zorlaştırmaz).
- Test: kontrol temiz; `npm test` 282/285 — kalan 3'ü temelde de kalıyor (Kor RX toprakta kayma, modifiye drift paketi güç, tarayıcı "gazla araç ilerliyor" Serçe 2 sn'de 8 m); bu işten değil. `alan fizik,pist,modifiye`: tarayıcı bölümleri geçti (surus hariç, temelde de kalıyor).
- Cem'in yanıtı: "lastiksiz araba olmaz zaten türüne uygun lastik otomatik takılsın" → otomatik yarış lastiği kalır, kararlara yazıldı. İş tamam.
