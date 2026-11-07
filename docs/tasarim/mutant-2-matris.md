# Mutant 2.0 — M0 mekanik kataloğu ve etkileşim matrisi

7 Kasım 2026. `python Unity/Validation/audit-mutant-m0.py` ile gerçek katalogdan üretilir.
Kaynak SHA-256: `fc821513a9735d6cff501bbf4ccaae720b7e9514ca469d9fdb15adcdec7d1a18`.

Metinler katalog tanımıdır; her açıklama çalışma zamanı davranışının kanıtı değildir. Uygulama sınırları ve tasarım kararları [M0 sözleşmesinde](mutant-2-m0.md).

## 31 pasif

| Kimlik / ad | Sonuç / dönüştürme | Tetik / kaynak | Sınır / etkileşim |
|---|---|---|---|
| `guc` / Motor ayarı | Güç +%10 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":3} |
| `hafif` / Hafifletme | Ağırlık −%6 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":3} |
| `asfalt` / Asfalt tutuşu | Asfaltta tutuş +%7 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":3} |
| `toprak` / Toprak tutuşu | Toprakta tutuş +%10 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":3} |
| `fren` / Sert fren | Fren gücü +%15 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `aci` / Açı kiti | Direksiyon açısı +0,08 rad (drift) | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `ogrenci` / Hızlı öğrenen | XP +%25 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `tuccar` / Pazarlıkçı | Para +%25, atölye %10 ucuz | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `zaman` / Zaman bükücü | Hedefi geçtiğin her etkinlik boss'a +20 sn | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `zirh` / Zırh | Çarpma ve spin hasarı −%35 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `tamirci` / Seyyar tamirci | Her etkinlik sonunda gövde +12 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `adrenalin` / Adrenalin | Gövde %50'nin altındayken güç +%15 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":2} |
| `camtop` / Cam top | Güç +%25, ama her hasar iki kat | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1} |
| `hurdaci` / Hurdacı | Her hasarda para; tamirinden fazlası değil | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1} |
| `kumarbaz` / Kumarbaz | Ölümcül ödül ×5, ama kaçırınca süre cezası iki kat | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1} |
| `sonnefes` / Son nefes | Her bölgede süre bitince bir kez +90 sn; boss hedefi %3 sıkılaşır | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1} |
| `nitro-kalkani` / Nitro kalkanı | Nitro açıkken hasar yarıya iner | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1} |
| `drift-harvester` / Drift Hasadı | Bilinçli driftte saniyede 6 enerji | DriftTickQualified | {"en":1,"m":{"id":"drift-harvester","versiyon":1,"kategori":"passive","tetik":"DriftTickQualified","kosul":{"enAzHiz":11,"enAzAci":0.2},"maliyet":0,"beklemeAdimi":0,"kazanc":6,"kazancBirimi":"saniye"}} |
| `temiz-cikis` / Temiz Çıkış | En az 1,5 sn süren drifti spinsiz bitirince +10 enerji | DriftEnded | {"en":1,"m":{"id":"temiz-cikis","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":10,"kazancBirimi":"olay","tetik":"DriftEnded","kosul":{"spinsiz":true,"enAzSure":1.5}}} |
| `kayma-hafizasi` / Kayma Hafızası | Temiz bir driftten sonra 3 sn içinde yeni drifte girince +8 enerji | DriftStarted | {"en":1,"m":{"id":"kayma-hafizasi","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":8,"kazancBirimi":"olay","tetik":"DriftStarted","kosul":{"zincirAdim":180}}} |
| `hiz-dinamosu` / Hız Dinamosu | Yerde 100 km/sa üstünde saniyede 3 enerji | SurusTick | {"en":1,"m":{"id":"hiz-dinamosu","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":3,"kazancBirimi":"saniye","tetik":"SurusTick","kosul":{"yerde":true,"enAzHiz":28}}} |
| `carpisma-pili` / Çarpışma Pili | Her hasarda +12 enerji: çarpmak nitro doldurur | HasarAlindi | {"en":1,"m":{"id":"carpisma-pili","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":12,"kazancBirimi":"olay","tetik":"HasarAlindi"}} |
| `risk-kondansatoru` / Risk Kondansatörü | Riskli ya da ölümcül etkinlik başlarken +40 enerji | RiskBasladi | {"en":1,"m":{"id":"risk-kondansatoru","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":40,"kazancBirimi":"olay","tetik":"RiskBasladi","kosul":{"enAzRisk":1}}} |
| `hasar-bataryasi` / Hasar Bataryası | Rakibe verdiğin her hasarın yarısı kadar enerji (0,25 sn'de bir) | HasarVerildi | {"en":1,"m":{"id":"hasar-bataryasi","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":15,"kazanc":0.5,"kazancBirimi":"miktar","tetik":"HasarVerildi"}} |
| `kalkan-bataryasi` / Kalkan Bataryası | Korumanın engellediği her hasar kadar enerji | KorumaEngelledi | {"en":1,"m":{"id":"kalkan-bataryasi","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":1,"kazancBirimi":"miktar","tetik":"KorumaEngelledi"}} |
| `takip-dinamosu` / Takip Dinamosu | Yarışta rakibi yakından takip ederken saniyede 5 enerji | YakinTakip | {"en":1,"m":{"id":"takip-dinamosu","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":5,"kazancBirimi":"saniye","tetik":"YakinTakip"}} |
| `genis-tup` / Geniş Tüp | Enerji kapasitesi +50 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"genis-tup","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"kapasite":50}}} |
| `verimli-nitro` / Verimli Nitro | Nitro %30 daha az enerji harcar | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"verimli-nitro","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"maliyet":0.7}}} |
| `uzun-nitro` / Uzun Nitro | Nitro %40 daha uzun sürer | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"uzun-nitro","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"sure":1.4}}} |
| `sert-nitro` / Sert Nitro | Nitro gücü +%15, ama maliyet %30 fazla | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"sert-nitro","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"guc":0.15,"maliyet":1.3}}} |
| `sigorta` / Sigorta | Spin atınca driftte kazanılan enerjinin yalnız %40'ı yanar | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"sigorta","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"yakma":0.4}}} |

## 6 sandık eklentisi

| Kimlik / ad | Sonuç / dönüştürme | Tetik / kaynak | Sınır / etkileşim |
|---|---|---|---|
| `ek-yedek-tup` / Yedek tüp | Enerji kapasitesi +30; alınca depo 30 dolar | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"ek-yedek-tup","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"kapasite":30}},"eski_nadir":false} |
| `ek-kizgin-egzoz` / Kızgın egzoz | Her drift başında +4 enerji (1,5 sn'de bir) | DriftStarted | {"en":1,"m":{"id":"ek-kizgin-egzoz","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":90,"kazanc":4,"kazancBirimi":"olay","tetik":"DriftStarted"},"eski_nadir":false} |
| `ek-turbo-kartusu` / Turbo kartuşu | Nitro gücü +%20 | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"ek-turbo-kartusu","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"guc":0.2}},"eski_nadir":true} |
| `ek-cift-atesleme` / Çift ateşleme | Nitro %40 daha az enerji harcar | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"m":{"id":"ek-cift-atesleme","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":0,"kazancBirimi":"olay","degistir":{"maliyet":0.6}},"eski_nadir":true} |
| `ek-hasar-donusturucu` / Hasar dönüştürücü | Her hasarda +15 enerji | HasarAlindi | {"en":1,"m":{"id":"ek-hasar-donusturucu","versiyon":1,"kategori":"passive","maliyet":0,"beklemeAdimi":0,"kazanc":15,"kazancBirimi":"olay","tetik":"HasarAlindi"},"eski_nadir":true} |
| `ek-takviye-tampon` / Takviye tampon | Çarpma hasarı −%40 (spin değil) | Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici | {"en":1,"eski_nadir":false} |

## 5 skill, 15 seviye ve 5 evrim

| Kimlik / tür / etiket | Sonuç / etkileşim | Kaynak ve sınırlar (seviye 1/2/3) | Evrim |
|---|---|---|---|
| `grappling-hook` / aktif / hareket,kontrol,konum | Dokun: kanca atılır ve çeker, yeniden dokun: bırakır. Öndeki rakibe atılırsa ona çekilirsin, o yavaşlar. Yerde köşeye atılır: köşenin çevresinde hızla ve tutuşla dönersin. Havada sokağın üstüne asılıp savrulursun; burnunu yan sokağa çevirip köşe dönebilirsin. Köşe ya da rakip yoksa atılamaz. Her seviye bir hak daha verir. | [{"menzil":35,"cekis":7,"fren":3,"sarj":1,"bekleme":6},{"menzil":45,"cekis":8.5,"fren":3.5,"sarj":2,"bekleme":5.5},{"menzil":55,"cekis":10,"fren":4,"sarj":3,"bekleme":5}] | [{"id":"ters-kanca","ad":"Ters Kanca","d":"Kanca arkadaki rakibe atılır ve onu iki kat sert frenler; sen çekilmezsin. Köşeye ve binaya tutunmaz."}] |
| `flying-dutchman` / aktif / savunma,hareket | Kısa hayalet fazı: tam dokunulmazsın, hiç hasar almaz, ağaç ve kaya gibi engellerin içinden geçersin; tutuş artar. Duvarlar ve pist kesme cezası geçerli. Faz boyunca hasar veremez, saldırı ve kanca kullanamazsın. | [{"sure":2.5,"tutus":1.12,"bekleme":10},{"sure":3,"tutus":1.15,"bekleme":9},{"sure":3.5,"tutus":1.18,"bekleme":8}] | [{"id":"lanetli-gecis","ad":"Lanetli Geçiş","d":"Faz boyunca 4 m içinden geçtiğin her rakibe bir kez 1,5 sn elektrik bırakırsın."}] |
| `risk-taker` / tetikli / risk,hasar,hareket | 20° üstü kontrollü drift (açık dünyada da), yarışta yakın takip ve kıl payı geçiş risk barını doldurur. Bar dolunca dönüşürsün: güç ve tutuş artar, arkanda yakan alev izi kalır; rakibe hasar vermek dönüşümü biraz uzatır. | [{"kazanc":1,"sure":5,"guc":1.25,"tutus":1.1,"alev":4,"uzatmaUst":2,"bekleme":4},{"kazanc":1.2,"sure":6,"guc":1.3,"tutus":1.12,"alev":5,"uzatmaUst":2.5,"bekleme":4},{"kazanc":1.4,"sure":7,"guc":1.35,"tutus":1.15,"alev":6,"uzatmaUst":3,"bekleme":4}] | [{"id":"kivilcim-izi","ad":"Kıvılcım İzi","d":"İz yakmak yerine elektrik bırakır: hasar vermez, değen rakibi 1 sn frenler."}] |
| `slipstream-engine` / tetikli / hareket | Rakibin arkasında yakın takipte kaldıkça hız depolar; takipten çıkınca depoladığın süre kadar güç artışı alırsın. | [{"enCok":2,"guc":1.2,"bekleme":3},{"enCok":2.5,"guc":1.25,"bekleme":3},{"enCok":3,"guc":1.3,"bekleme":2.5}] | [{"id":"ruzgar-kirici","ad":"Rüzgâr Kırıcı","d":"Kıl payı geçişler de depoya 0,5 sn ekler; boşalırken tutuş da artar."}] |
| `volt-kanat` / aktif / hareket | Basılı tuttukça araç yükselir ve ileri atılır (en çok 3 sn); bırakınca süzülerek iner. Havada ekranı kaydırarak burnu çevirirsin. Çatılara inebilirsin. | [{"sure":3,"kalkis":12,"tirmanis":13,"itki":9,"bekleme":9},{"sure":3,"kalkis":14,"tirmanis":15,"itki":10.5,"bekleme":8},{"sure":3,"kalkis":16,"tirmanis":17,"itki":12,"bekleme":7}] | [{"id":"firtina-kanadi","ad":"Fırtına Kanadı","d":"Uçarken 8 m içinden geçtiğin her rakibe bir kez 1,5 sn elektrik bırakırsın."}] |

Skill kaynağı enerji değildir: aktifler süre/bekleme veya kanca şarjı; tetikliler risk/takip barı kullanır. Yuva 3, seviye 3, eklenti 2; pasif en sayısı skill seviyesi değildir.

## 2 skill eklentisi

| Kimlik | Tetik | Sonuç | Uyumluluk / sınır |
|---|---|---|---|
| sok-bobini | KonumEtkisi | Takıldığı skill bir hedefin konumunu değiştirdiğinde hedefe 1,2 sn elektrik verir | konum; 1.2 sn; kaynak skill başına en çok 2 farklı eklenti |
| kor-cekirdegi | HasarVerildi | Takıldığı skill hasar verdiğinde hedef 2 sn yanar | hasar; 2 sn; kaynak skill başına en çok 2 farklı eklenti |

## 42 mekanik parça (atölye)

Bütün parçalar aşağıda; stok yalnız sv>0, sahip olunmayan ve motor-degisim olmayanları alır. Parça etkisi katalog e alanı; uygulanışı VehicleCatalog/MutantVehicle. sv nadirlik değildir.

| Kimlik / ad | Kategori / basamak | Etki |
|---|---|---|
| motor-kisitli /  | motor / 0 | {"carp":{"hp":0.85}} |
| motor-sokak /  | motor / 1 | {"carp":{"hp":1.08}} |
| motor-spor /  | motor / 2 | {"carp":{"hp":1.16}} |
| motor-yaris /  | motor / 3 | {"carp":{"hp":1.28}} |
| motor-degisim /  | motor / 3 | {"motorHp":350,"carp":{"kg":1.05}} |
| turbo-kucuk /  | turbo / 2 | {"turbo":{"guc":1.12,"tbs":0.45,"tbu":0.5}} |
| turbo-buyuk /  | turbo / 3 | {"turbo":{"guc":1.7,"tbs":1.1,"tbu":0.72}} |
| kompresor /  | turbo / 2 | {"turbo":{"guc":1.1}} |
| sanziman-kisa /  | sanziman / 2 | {"carp":{"top":0.93}} |
| sanziman-uzun /  | sanziman / 2 | {"carp":{"top":1.07}} |
| lastik-sokak /  | lastik / 1 | {"lastik":4} |
| lastik-spor /  | lastik / 2 | {"lastik":5} |
| lastik-yaris /  | lastik / 3 | {"lastik":0} |
| lastik-toprak /  | lastik / 2 | {"lastik":1} |
| lastik-karisik /  | lastik / 2 | {"lastik":2} |
| lastik-drift /  | lastik / 2 | {"lastik":3} |
| lastik-drag /  | lastik / 2 | {"lastik":6} |
| suspansiyon-sokak /  | suspansiyon / 0 | {"fq":1.8,"ayar":{"susp":1.15},"ekle":{"hcg":0.03},"gr":[1,0.95]} |
| suspansiyon-spor /  | suspansiyon / 2 | {"fq":2.2,"ayar":{"susp":0.85},"ekle":{"lift":-0.02,"hcg":-0.02},"gr":[0.97,1.02]} |
| suspansiyon-yaris /  | suspansiyon / 3 | {"fq":2.4,"ayar":{"susp":0.7},"ekle":{"lift":-0.04,"hcg":-0.04},"gr":[0.9,1.04]} |
| suspansiyon-ralli /  | suspansiyon / 2 | {"fq":1.6,"ayar":{"susp":1.4},"ekle":{"lift":0.06,"hcg":0.03},"gr":[1.06,0.95]} |
| suspansiyon-rallikros /  | suspansiyon / 2 | {"fq":1.9,"ayar":{"susp":1.15},"ekle":{"lift":0.03},"gr":[1.04,0.98]} |
| suspansiyon-drift /  | suspansiyon / 2 | {"fq":2.1,"ayar":{"susp":1.2,"tpr":1.18,"bal":0.92}} |
| suspansiyon-drag /  | suspansiyon / 2 | {"fq":2.2,"ayar":{"susp":1,"tpf":1.1,"tpr":0.9,"bal":1.1},"ekle":{"lift":0.02}} |
| diferansiyel-acik /  | diferansiyel / 0 | {"ayar":{"diff":0.2},"dk":8} |
| diferansiyel-lsd /  | diferansiyel / 2 | {"ayar":{"diff":0.5},"dk":35} |
| diferansiyel-ralli /  | diferansiyel / 2 | {"ayar":{"diff":0.75},"dk":90} |
| diferansiyel-kilitli /  | diferansiyel / 2 | {"ayar":{"diff":1.15},"dk":260} |
| fren-sokak /  | fren / 0 | {"carp":{"brk":0.85}} |
| fren-spor /  | fren / 2 | {"carp":{"brk":1.12}} |
| fren-yaris /  | fren / 3 | {"carp":{"brk":1.25}} |
| agirlik-balast /  | agirlik / 0 | {"carp":{"kg":1.08}} |
| agirlik-1 /  | agirlik / 1 | {"carp":{"kg":0.95}} |
| agirlik-2 /  | agirlik / 2 | {"carp":{"kg":0.9}} |
| agirlik-3 /  | agirlik / 3 | {"carp":{"kg":0.85},"ekle":{"hcg":-0.02}} |
| aero-dusuk /  | aero / 1 | {"carp":{"ae":0.5,"top":1.02}} |
| aero-yaris /  | aero / 2 | {"carp":{"ae":1.4,"top":0.98}} |
| aero-buyuk /  | aero / 3 | {"carp":{"ae":1.9,"top":0.95}} |
| cekis-arka /  | cekis / 2 | {"awd":0} |
| cekis-dort /  | cekis / 2 | {"awd":0.45} |
| aci-kiti /  | direksiyon / 2 | {"ayar":{"lock":0.95},"dmax":1} |
| koruma /  | koruma / 2 | {"carp":{"kg":1.025},"ekle":{"lift":0.02}} |

## Olay bağlantı matrisi (uygulanmış / sınır / boşluk)

| Üretici | Ortak olay / değer | Tüketici | Durum ve sınır |
|---|---|---|---|
| Bilinçli drift | DriftTickQualified | Temel enerji + drift-harvester + risk-taker | Çalışıyor; eşikler farklı; skill risk barı enerji değildir |
| Drift sonu/başlangıcı | DriftEnded / DriftStarted | temiz-cikis / kayma-hafizasi / ek-kizgin-egzoz | Çalışıyor; temiz süre, 180 adım zincir, 90 adım bekleme |
| Yerde hızlı sürüş | SurusTick | hiz-dinamosu | Çalışıyor; >=28 m/sn, yerde |
| Yarışta yakın takip | YakinTakip / NearMiss | takip-dinamosu / risk-taker / slipstream-engine | Çalışıyor; hedef başına 4 sn kredi, dışarıda .25/sn dolar; NearMiss 180 adım |
| Gerçek hasar | HasarAlindi | carpisma-pili / ek-hasar-donusturucu / hurdaci | Enerji ve para farklı katmanlarda; hurdacı tamirinden az iade |
| Hayaletin engellediği hasar | KorumaEngelledi | kalkan-bataryasi | Çalışıyor; aynı çarpışmayı tekrar göndermemek Session görevi |
| Riskli etkinlik başlangıcı | RiskBasladi | risk-kondansatoru | Çalışıyor; >=1; serbest tekrar ile bedava 40 riski adaptör girişinde denetlenmeli |
| Kanca | KonumEtkisi | sok-bobini → elektrik → rakip fren | Çalışıyor; konum etiketli skill; kancanın rakip hedefi |
| Risk alev izi | HasarVerildi | kor-cekirdegi → ates → hasar-bataryasi | Çalışıyor; 10 hasar/hedef/adım, vuruş aralığı, 15 adım enerji beklemesi |
| Skill/durum çıktısı | bekleyenBeceri | Sonraki sabit adımın enerji mekanikleri | Çalışıyor; çerçeveler arasında tam kök/nedensellik zarfı yok |
| Enerji üretimi | EnergyGained | Veri tanımı ile eklenebilir | Üretim var, mevcut katalogda dinleyici YOK; kendine dönüş + adım başına bir tetik, derinlik3/işlem64 |
| Enerji | AbilityActivated(nitro) | nitro → güç | Çalışıyor; 40 maliyet, 2.5 sn etki, ardından4 sn; değiştiriciler ayrı |
| Nitro | güç / aktif durum | nitro-kalkani → hasar yarıya | Çalışıyor; nitro → tutuş olayı katalogda yok |
| Tutuş / güç / uçuş | Araç kurulumu / fizik girdisi | Sonraki fizik → drift / yakınlık | Dolaylı fizik döngüsü var; tutuş değişti olayı ve genel kaynak dönüşüm grafiği yok |
| Yarış / boss / sandık | Run komutları | para/XP/seçim/pasif/parça | Tekrar ödül önlemleri var; genel ödül metadata/rarity API yok |

## Boss matrisi — metin ile gerçek AI ayrı

| Boss / tür | Katalog vaadi / zayıflığı | Gerçek altyapı | Taktik değerlendirme (ölçüm değil) |
|---|---|---|---|
| Toprak Kurdu / rl | ['Toprakta çok hızlı', 'Çamurda yavaşlamaz'] / Toprak tutuşu, dört çeker, süspansiyon kazandırır | Ortak boss pilotu; araç 12; bölgeye göre 3 kurulum; hava=normal; gece=False | Toprak kontrolü/çizgi; tek skill zorunlu değil |
| Drift Kraliçesi / dp | ['Uzun kombolar', 'Çarpanı hiç düşmez'] / Açı kiti, güç, kombo pasifleri kazandırır | Drift: puan hedefi; fiziksel boss rakibi yok | Kontrollü uzun drift; uçuş her zaman avantaj değil |
| Drag Canavarı / dg | ['Kalkışta patinaj yapmaz', 'Son metrede nitro'] / Motor, turbo, hafiflik kazandırır | Ortak boss pilotu; araç 14; bölgeye göre 3 kurulum; hava=normal; gece=False | Kalkış/çekiş ve doğru nitro; özgün son metre nitro AI henüz yok |
| Gece Şahini / gp | ['Karanlıkta virajı ezbere bilir', 'Frene geç basar'] / Fren, asfalt tutuşu kazandırır | Ortak boss pilotu; araç 10; bölgeye göre 3 kurulum; hava=normal; gece=True | Fren noktası ve viraj çizgisi; elektrik/kanca rakibi etkileyebilir |
| Çamur Baronu / rx | ['Islakta tutunur', 'Su birikintisinde yavaşlamaz'] / Toprak tutuşu, fren, dört çeker kazandırır | Ortak boss pilotu; araç 11; bölgeye göre 3 kurulum; hava=rain; gece=False | Islak karışık zemin/çekiş; ortak tutuş fiziği geçerli |

Boss açıklamaları özel davranış ağacı değildir. Boss'a göre skill karşılıkları/reaksiyon politikası yok; ortak OpponentPilot çizgi/hız/kişilik ve MutantOpponentLink etkileri kullanılır.
