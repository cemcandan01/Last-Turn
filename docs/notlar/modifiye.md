# modifiye dalı notu
- 0.5.x ilk sürüm (kullanıcı isteği "garajda modifiye sekmesi"; fizik 0.5.12 `parcalar.ts`/`performans.ts` oyuna bağlandı).
- Garaj vitrini: rozet satırında sınıf harfi + puan (`#gsnf`, SINIFLAR rengi; yarış öncesi garajda o yarışın türünün puanı). Sahip olunan araçta "Modifiye" düğmesi (`#gmod`, "Motoru dinle" ile aynı satır `.gsr`; mağazada yok).
- Modifiye ekranı (`GarajDurumu.mod`, `#gar.modifiye`, `modifiyeGoster`): solda iki sütun kategori (`#gmk`: Paketler + 12; takılıysa seviye çizgileri), sağda parçalar (`#gmp`/`#gml`: stok + parçalar; seviye çizgisi, ad, puan farkı, fiyat / Ücretsiz / Sende / Takılı). Dokununca önizleme: rozet yanında yeni sınıf/puan (`#gsnf2`), açıklama, etki satırı (`#gmo`: HIZ, 0-100, TUTUŞ, FREN; aynı zeminde karşılaştırılır). Eylem: Satın al → "Emin misin?" (3 sn) → alır ve takar; Tak; Sök; Paketler'de Stok araç = hepsini sök. Araç ortada serbest, vitrin düğmeleri gizli.
- Tuzak: global `.tk` sınıfı (menü kartı, position:absolute) var; takılı işareti `takili` sınıfı.
- Fiyat (`ekonomi.ts` PARCA_TABAN [0,400,900,1800] × kategori çarpanı, 50'ye yuvarlı): seviye 0 parçalar ücretsiz (puanı sınıf sınırına indirmek bedava). Tam paket 1700-3400. Alım araç başına: `alimlar["parca_<araç>_<parça>"]` (bulutta, kurallar değişmeden).
- Takılı parçalar `lt_parca` (`oyun/modifiye.ts`) + bulut belgesinde `parca` (0.5.21, kullanıcı: "herkes arabasını modifiye edebilmeli", hesaba bağlı). Eski kurallar alanı reddederse `esitleme.ts` alansız yeniden yazar (o açılışta yalnız cihazda; kuyruk takılmaz). Aynı hesapta yerelde parçası olmayan araç buluttan alınır; hesap geçişinde liste değişir. Kullanıcı firestore.rules'u konsolda yeniden yayınlamalı (docs/FIREBASE.md).
- Sürüş: `modifiyeUygula(araç)` applyPreset yerine (startEvent, garaj Seç, açılış): `kurulum.mod` = parçalı araç + lastik + ayar alanları, `pk` paket ağır basarsa türün önayarı. `applyPreset` mod varsa ayar/lastiği üstüne yazar (serbest sürüşte önayar değişse de parçalar kalır). `surus.ts` fizik aracını `kurulum.mod.taban === oyun.CAR` ise mod'dan alır; stokta mod null → CARS nesnesi, fizik aynı.
- Testler: `tests/birim/modifiye.test.ts`, tarayıcı bölümü `modifiye` (düzen binmesi iPhone 13 ve SE, iki dokunuş, paket, kayıt, yarışta parçalı araç); görüntüler tests/cikti/modifiye-*.png.
- 0.5.20 kanıt (kullanıcı: "istatistik ve hissiyat farkı kanıtla"; tablo `npm run olcum -- modifiye`, test `tests/birim/modifiye-his.test.ts`). Kızıl Ok stok: 0-100 2,77 sn, tepe 286, tutuş 35,6, yalpa 0,52°.
  | parça | ölçü (stoğa göre) |
  |---|---|
  | motor yarış / kısıtlayıcı | 0-100 −0,55 / +0,47 sn; asfalt tur −1,6 / +1,2 sn |
  | turbo küçük / büyük / kompresör | dolma 1,9 / 4,1 / 0 sn (gecikme hissi; ıslık fizik basıncıyla); 0-100 −0,13 / −0,12 / −0,23 |
  | şanzıman kısa / uzun | tepe −17 / +15 km/sa |
  | lastik sokak / toprak / drift | asfalt tutuş −23 / −33 / −32%; tur +5,0 / +9,6 / +6,7 sn |
  | süspansiyon ralli / yarış | yalpa +2,1° / −0,16°; tutuş(140 m) −1 / +5% |
  | diferansiyel açık / kilitli | çıkışta patinaj 1,16 / 0,40, kayma 6° / 14° |
  | fren yarış / sokak (Panda 100-0, ABS) | 16,1 → 14,3 / 17,9 m; Kızıl Ok 200-100 −9% |
  | ağırlık karbon / balast | 0-100 −0,37 / +0,20 sn |
  | aero büyük | tutuş(140 m) +21%, tepe −18 km/sa, tur −1,75 sn |
  | çekiş dört | tutuş(35 m) +20%, çıkış kayma −12° |
  | açı kiti | teker açısı +24° |
  | paketler (kendi / başka tür) | asfalt +3,0 / +8,9%; ralli +0,6% / Kızıl Ok stok bitiremez → 43,9 sn; rallikros −1,9% / bitiremez → 36,8; drift +6,5 / +11,9% puan; drag +2,2 / −0,7% |
- Düzeltilen: önizleme satırı yalnız nokta kütle değerlerini gösteriyordu (Kor RX yarış motoru HIZ ±0: son viteste devir sınırı, gerçek); artık tur süresi + fiziksel değerler (güç, ağırlık, turbo gecikmesi, çekiş, teker açısı, yay, kilit, lastik) (`parcaEtkileri`). Yükseltme parçaları yüksek araçta üst üste biniyordu (Mavi Yıldız ralli paketiyle %17 yavaştı) → `aracKur` lift/hcg. Turbo parçası sesi yoktu → `ses.ts`/`motor.ts` ek katman.
- Ölçüm notu: fren gerçekçide (ABS yok) kilitlenmeyle düzensiz; Dengeli'de ölçülür. Pilot tur süreleri ±%3 oynak.
- Açık: drag paketi Kızıl Ok'ta etkisiz (−0,7%: kısa şanzıman tepe hızı keser; fizik dalı); rallikros paketi Kor RX'te −1,9% (gürültü sınırında); 3B modelde parça görünümü yok (kanat vb.); vitrin çubukları (HIZ/İVME…) stok değerleri gösterir; mağaza/ekonomi dengesi ölçülmedi (puan/para verimi).
