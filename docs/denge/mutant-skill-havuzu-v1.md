# MUTANT — aktif/pasif skill havuzu v1 (tasarım)

Amaç: pasif stat artışından çok sürüş tarzını değiştiren saldırı, savunma, hız ve kontrol yetenekleri. **Bu belge uygulama veya denge testi değildir.** Sayılar ilk prototip varsayımlarıdır.

## Çekirdek sözleşme
- Skill: id, seviye, tür (aktif/pasif), etiketler, tetik, hedefleme, süre, cooldown, enerji, karşı-oyun, görsel telemetri, nadirlik.
- Tek kaynak olayı aynı fiziksel eylem için tekrar tekrar ödül veremez (drift açı eşiği, takip mesafesi, near-miss cooldown). PvP/PvE hasarı sınırlı, dost/öz-hasar politikası açık.
- Her aktif yetenek açık karşı-oyuna sahip; AI aynı kuralları kullanır. Boss'a özel bağışıklıklar önceden gösterilir.
- Drift kaporasına tüm **skill** envanteri dahil olabilir; otomatik rastgele seçilip etkinliğe kilitlenir; kayıp sinerjiyi de keser. Stat parçaları skill sayılmaz.

## İmza skiller
1. **Grappling Hook** [aktif; kontrol/hız]. Ön konide hedef araç varsa oyuncuya çekiş ivmesi, hedefe fren kuvveti uygular; ikisi de kütleye ve bağıl hıza göre sınırlandırılır. Hedef yoksa ancak pistte işaretli sabit ankora tutunup ileri çekilir; boşluğa keyfi teleport yok. Duvar/engel görüş hattı keser; cooldown ve hız/mesafe sınırı var. Seviye: menzil → çekiş verimi → kısa zincir fırsatı. Karşı oyun: yan açıya çıkmak, mesafe koparmak, kancayı kesen savunma.
2. **Flying Dutchman** [aktif; savunma/kontrol]. Kısa süreli faz modu: araç teması ve mermi hasarını engeller; yol tutuş kaybını ve spini bastırır; kontrol oyuncuda kalır. Duvar dışına/harita dışına çıkma, checkpoint atlama, tur atlama yok. Bitişte güvenli konum doğrulaması; faz içindeyken saldırı kapalı (iki tarafı keskin kılıç). Seviye: süre → çıkış stabilitesi → ilk temasta kısa koruma. Karşı oyun: bitiş anını kollamak, pozisyon almak.
3. **Risk Taker** [pasif; risk/hız/saldırı]. Barı kontrollü ≥20° drift (hız eşiği, spin yok), yakın takip (gerçek rakip, kısa mesafe, cooldown), near-miss (tekil rakip/engel, hız eşiği) doldurur. Bar dolunca otomatik dönüşüm: hızlanma/azami hız/tutuş artışı, alev izi ve çarpışma bonus hasarı; hasar vermek süreyi sınırlı uzatır. Alev izi aynı rakibi sürekli tick ile farm etmez, temas başına cooldown vardır. Dönüşüm bitince kısa yorgunluk/ısı bedeli; etkinlik dışı güvenli alanda boşuna farm önlenir. Seviye: bar verimi → dönüşüm gücü → uzatma tavanı.

## Önerilen diğer skill aileleri (isim ve tasarım hipotezi)
| Skill | Tür | Etki | Bedel / karşı oyun |
|---|---|---|---|
| Piston Gatling | Saldırı | 15 m yakın rakibe 5 sn boyunca 5 hasar/sn (Lv1 örneği) | Hedef görüşü, sınırlı toplam hasar, cooldown |
| Spike Strip | Tuzak | Arkaya kısa ömürlü çivi şeridi | Rakip görüp kaçabilir; konum önemli |
| EMP Pulse | Kontrol | Yakın rakibin aktif skill'ini kısa süre keser | Kısa menzil, yüksek enerji |
| Ricochet Shield | Savunma | İlk mermiyi geri sektirir | Tek kullanım; araç çarpışmasını durdurmaz |
| Slipstream Engine | Hız | Rakip arkasında ivme depolar, çıkınca boost | Yakın takip riski; tek başına çalışmaz |
| Handbrake Reversal | Kontrol | Kontrollü drift çıkışında kısa yönlendirme bonusu | Yanlış açı hız kaybettirir |
| Overheat Cannon | Saldırı | Yüksek ısıda güçlü atış | Kendi motor verimini düşürür |
| Salvage Plating | Savunma | Başarılı savunmadan sonra sınırlı zırh | Hasar farmı önlenir |
| Nitro Leech | Hız/kontrol | Yakın geçişte rakip nitrosunun bir kısmını çalar | Yakın geçmek gerekir, hedef cooldown |
| Last Stand | Risk/savunma | Düşük gövdede tek seferlik savunma ve hız | Onarım pahalı; bilinçli hasar exploit'i yok |

## İlk etkileşim matrisi
- Grappling Hook + Risk Taker: yakın mesafe ve pozisyon → risk birikimi → alev izi; tek eylemden birden fazla near-miss ödülü verilmez.
- Flying Dutchman + Risk Taker: güvenli risk farmı **yasak**; fazdayken near-miss/takip riski üretimi durur, dönüşüm sürer ama faz içinde alev hasarı verilmez.
- Grappling Hook + Spike Strip: rakibi şeride çekmek mümkün; hasar/sersemletme zincirine bağışıklık penceresi.
- Slipstream Engine + Nitro Leech: takip oyunu; rakibin önünde değil arkasında kalmanın ödülü.
- EMP Pulse + Piston Gatling: savunmayı kesip saldırma; AI da bu kombinasyonu kullanabilir.
- Overheat Cannon + Flying Dutchman: saldırı fazdayken kapalı; iki aktifin aynı anda sınırsız güvenli hasar vermesi engellenir.

## Kabul testleri
- Aynı seed, aynı input → aynı skill hedefi ve sonucu.
- 30/60/120 FPS'te eşdeğer süre, enerji, hasar ve bar dolumu.
- Düşman yokken hook yalnızca işaretli ankora çalışır; ankor yoksa enerji harcanmaz.
- Hayaletlikte checkpoint/duvar exploit'i yok, faz içi hasar verilemez.
- Risk barı AFK, durduğu yerde drift, aynı near-miss tekrarı, hayaletlik ile doldurulamaz.
- Alev ve Gatling'in aynı hedefe verdiği hasar tick sınırı içinde; sonsuz dönüşüm uzaması yok.
- En az üç farklı build aynı pist havuzunda yaşayabilir; her türün güçlü/zayıf olduğu yarışlar var.
