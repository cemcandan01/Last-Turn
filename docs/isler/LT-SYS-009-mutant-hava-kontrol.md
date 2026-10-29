# LT-SYS-009 — MUTANT: bekleme süreli skill'ler, havada 360° burun kontrolü, basılı Volt, köşe/hava kancası, şehir çeşitliliği

**İstek (Cem, 2026-10-29, mesaj "2."):** Şehir birbirinin aynısı sokak/binayla tekinsiz. Skill'ler enerjiyle değil bekleme süresiyle çalışsın (sinerji/kombo; bir skill'den sonra ötekine enerji kalmaması kötü). Volt basılı tuttukça yukarı **ve ileri** götürsün, en çok 3 sn. Araç havadayken (her zaman, yalnız Volt'ta değil) kamera sürükleme alanı aracın burnunu 360° çevirsin (aşağı kaydır → burun kalkar, yukarı → iner, sağ/sol → yön; kaydırma oranıyla). Volt bitince düşerken de burun ayarlanır; havada nitro ivme verir. Kanca: ilk dokunuş atar ve çekmeye başlar, ikinci dokunuş bırakır; her skill seviyesi +1 kanca hakkı (beklemeye girmeden). Kanca atılabilirken tuş ve hedef parlar. Yerde yalnız köşe (virajı dönerken/girmeden az önce; atınca virajda hız + tutuş) ya da rakip; ikisi yoksa atılamaz. Havada binaya, duvara çarpmadan ilerleyip düzgün inilebilsin; havada kancayla köşe dönülebilsin.

**Sahip:** Claude. **Dal:** `claude/mutant-hava-kontrol`, taban `gelistirme` 9b8d96b.

## Kabul ölçütleri
1. Etkin skill'ler (Kanca, Dutchman, Volt) enerji harcamaz; yalnız bekleme süresiyle. Üç skill art arda kullanılabilir. Nitro enerjiyle kalır (enerji perkleri nitroyu besler).
2. Kanca Sv1/2/3'te 1/2/3 hak; her hak kendi beklemesiyle dolar. Birinci dokunuş tutunur, ikinci bırakır. Yerde: köşe yoksa ve rakip yoksa "HEDEF YOK"; köşede sarkaç aracı virajda çevirir, hız ve tutuş verir, takla yok. Havada (şehir): sokak üstüne asılır, bina duvarına çarpmadan savrulur; burun yönüne göre yan sokağa dönülebilir. Atılabilirken tuş ve hedef noktası parlar.
3. Volt: basılı tuttukça yükselir ve ileri gider, en çok 3 sn; bırakınca/sürede biter, süzülerek iner (düşüş hızı sınırlı).
4. MUTANT'ta araç havadayken sürükleme burnu çevirir (aşağı → burun yukarı, yukarı → aşağı, yanlara yön); parmak yokken duruş korunur, yere yakınken araç kendini düzeltir. Havada nitro burun yönünde ivme verir. Kariyer/serbest fizik değişmez (`cx.ucus` yokken birebir aynı).
5. Kule Şehri semtlere ayrılır (cam kuleler, tuğla eski şehir, konut, sanayi): farklı cephe dokuları/renkler, kademeli kuleler, çatı detayları, cadde ağaçları ve lambalar, yaya geçitleri; sokak rotaları/çarpışma düzeni bozulmaz.

## Denge notu (DENGE.md §9)
- Rol: MUTANT skill'leri; hedef sinerji. Performans bütçesi: skill'ler enerji kısıtını kaybeder, kısıt bekleme süresi. Bekleme süreleri tahmin (Kanca hak dolumu 6/5,5/5 sn, Dutchman 10/9/8, Volt 9/8/7). Nitro enerjisi değişmez. Başarı eşiği/boss hedefi yeniden ölçülmedi (skill'ler boss ölçümüne girmiyor). Kayıt uyumu: koşu kaydı alanları geriye uyumlu.

## Yapılanlar
- Skill'ler enerjisiz (`cekirdek/beceri.ts`): `maliyet` ve skill mekanik tanımı kaldırıldı; `sarj` hakkı (Kanca 1/2/3, her hak 6/5,5/5 sn'de dolar), `birak` (aç/kapa), `hedefNokta` (parlama). Nitro enerjide kalır; HUD yuvası HAZIR / ×hak / bekleme gösterir.
- Kanca: rakip → havada sokak üstü (`gokBaglantisi`, ip yan bina cephesine çizilir, tepede kendiliğinden bırakır) → yerde köşe (`sehirKosesi` kavşak köşesi, yarışta `pistKosesi` viraj merkezi). Köşe sarkacı: ip yalnız kısalır, merkezcil ivme + burun yörüngeye (`ucus.yalpa`), tutuş ×1,3, ipin taşıyamayacağı hızı frenler (126 km/sa ile giren araç ~90 km/sa ile döner, binaya değmez), 1,6 rad dönünce bırakır. Köşe ve rakip yoksa "HEDEF YOK". Atılabilirken tuş (`parla`) ve hedef (nabız halka + ışık sütunu) parlar.
- Volt: basılı tuttukça kalkış + burun yönünde itki, en çok 3 sn; sonra süzülme (düşüş ≤ 8 m/s). Fizik `cx.ucus.ileri/inis/yalpa/hava`.
- Hava kontrolü: MUTANT koşusunda her adım `cx.ucus`; havadayken (teker boşta, ≥ 1,3 m) kamera sürüklemesi burnu çevirir (`suruklemeKancasi`; aşağı → burun yukarı, yana → yalpa, yatış kendiliğinden düzelir), parmak yokken duruş korunur, yere yakın düşerken dikleşir. Havada nitro +14 m/s² burun yönünde.
- Şehir: 5 semt (cam kuleler, tuğla eski şehir + tenteler, sıvalı konut, sanayi depoları, taş), kademeli kuleler (iki çarpışma kutusu), çatı süsleri (su deposu, anten, klima, baca), semt tonlu kaldırım, yaya geçitleri, cadde ağaçları (çarpışmalı), lambalar, ağaçlı meydanlar. Sokak/rota düzeni aynı.

## Doğrulama
- Yerel: `npm run kontrol` temiz (2 eski uyarı); `npm test` 465/465 (+ sonrasında değişen sehir/beceri/beceri-his dosyaları ayrı koşuldu: 9/9, 25/25, 9/9); `npm run alan -- mutant` 25/26, kalan tek senaryo test aralığı hatasıydı, düzeltilip `mutant-sehir, beceri, beceri-his` yeniden koşuldu: hepsi geçti. Kariyer imza testi geçti (kariyer fiziği aynı).
- Görüntüler: `tests/cikti/mutant-sehir.png`, `-kose.png`, `-ucus.png`, `-sarkac.png`.

## Açık
- Denge tahmin: bekleme süreleri, köşe hızı, Volt itkisi, havada nitro. "Her level +1 kanca" skill seviyesi olarak yorumlandı (oyuncu seviyesi istendiyse değişir).
- iPhone 13'te şehir çizim maliyeti (5 cephe + donatı, ~+10 çizim çağrısı, ~600 ağaç) ölçülmedi. Çorak açık dünyasında köşe tanımı yok (kanca orada yalnız rakibe).
- Sahip: Claude · dal `claude/mutant-hava-kontrol` · sonraki adım: Cem /dev/ 0.8.18'de şehirde kavşakta kanca, basılı Volt + sürükleyerek burun, havada kanca denesin.
