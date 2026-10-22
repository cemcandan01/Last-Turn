# Last Turn mimarisi

## Katmanlar

```
                ┌──────────────────────────── main.ts (kurulum sırası) ────────────────────────────┐
                │                                                                                   │
   arayuz/  (DOM: menü, ayarlar, garaj, HUD, dokunmatik kontroller)                                 │
      │ okur/çağırır                                                                                │
   oyun/   (akış: durum, kurulum, girdi, sürüş, yarışlar, sinematik, ANA DÖNGÜ)                    │
      │                     │                                                                       │
      │ her sabit adımda    │ her karede                                                            │
      ▼                     ▼                                                                       │
   fizik/  (SAF)         cizim/  (three.js: sahne, araç modeli, kokpit, ortam, kamera)             │
      ▲                     ▲                                                                       │
      │ DunyaSorgusu        │ kurulan görsel gruplar                                                │
   dunya/  (pistler, bölgeler, yükseklik ve zemin fonksiyonları, dekor kurucusu)                   │
      ▲                                                                                             │
   cekirdek/ (SAF: matematik, tohumlu rastgele, depo, ekran, performans)  ◄─────────────────────────┘
```

- **Saf katmanlar** (`cekirdek`, `fizik`): three.js, DOM ve oyun durumu bilmez. Node'da milisaniyeler içinde test edilir.
- **Fizik** dünyayı yalnız `DunyaSorgusu` (yükseklik, zemin, yakın çarpışma nesneleri, sınır, hava tutuşu) üzerinden görür, olayları `FizikOlaylari` ile bildirir (spin, toz). Böylece aynı fizik oyunda, testte ve ileride rakip araçlarda/hayalet araçta çalışır.
- **Araçlar:** her araç bir `AracOrnegi` (`fizik/arac-ornegi.ts`): kendi `Simulasyon`'u, tohumlu rng'si, bağlamı (dünya sorgusu, kurulum, olaylar) ve girdi kaydı. Oyunda bir **yerel araç** vardır (`oyun/surus.ts → yerel`, `sim = yerel.sim`); kamera, ses, HUD ve yarış ona bakar. **Uzak araçlar** (`oyun/uzak.ts`) fizik çalıştırmaz: `AracAnlik` görüntüleri (düz sayı alanları, `fizik/anlik.ts`) bir tampona girer, araç biraz geriden ara değerle (görüntü gecikirse sınırlı ileri tahminle) çizilir (`cizim/uzak-arac-modeli.ts`). Ağ katmanı ileride `uzakAracEkle` + `uzakAnlikEkle` ile bağlanır. Araçlar arası çarpışma yok. Geliştirici hayaleti (deneme sürümünde Ayarlar → Mekanikler): yerel aracın görüntüleri 15 Hz ve 2 sn gecikmeyle bir uzak araca verilir.
- **dunya** hem saf fonksiyonlar (pist geometrisi, `H`, `surf`) hem de görsel kurulum (`build`) içerir; kurulum three.js nesnelerini ve çarpışma nesnelerini birlikte üretir.

## Döngü (oyun/dongu.ts)

```
her kare (requestAnimationFrame):
  dt = kare süresi (en çok 0,1 sn)
  birikim += dt
  while birikim >= ADIM (1/60 sn):          ← sabit adım: kare hızından bağımsız
      surusAdimi():  girdi → fizik adımı → tur sayacı → yarış mantığı
      birikim -= ADIM
  al = birikim / ADIM                        ← iki fizik adımı arasında nerede
  araç çizim konumu = önceki + (şimdiki − önceki) × al   (ara değer: akıcı çizim)
  kamera, gövde eğimi, kokpit, HUD, mini harita
  çizim → performans kaydı
```

- Ekran 60 Hz'de her karede bir adım; 120 Hz ekranda iki karede bir adım (ara değerle akıcı); kare düşerse karede birden çok adım (oyun ağırlaşmaz).
- Fizik modeli 1/60 sn'lik adımı içeride 8 ara adıma böler (480 Hz).

## Fizik motoru

| | |
|---|---|
| Gövde | 3 boyutlu katı cisim: frende öne, virajda yana yatar, havada döner |
| Tekerler | 4 teker, her biri zemini ışınla bulur; yay, amortisör (basma/açılma), tampon, denge çubukları |
| Lastik | kayma oranı (teker dönüşü) ve kayma açısı birlikte (sürtünme elipsi), her teker kendi zemininde. Gevşek zeminde tutuş düşük, tepe kayma açısı küçük (~13,5°), tepeden sonra kuvvet düşer, arka biraz daha gevşek |
| Teker dönüşü | her tekerin açısal hızı; örtük çözücü (ikiye bölme): patinaj, kilitlenme, ABS gerçek |
| Aktarma | tork eğrili motor, 6 ileri otomatik vites (tork kesmeli geçiş), geri vites, kalkış debriyajı, diferansiyel kilidi, dört çekerde ön/arka paylaşım ve akslar arası bağ |
| Yardımlar | kuvvet ve tork olarak: viraj desteği, denge kontrolü (aşırı dönüşü söndürür), çekiş kontrolü ve tuşla kalkış sınırı (her teker, her ara adım), ABS, drift desteği |
| Çarpışma | darbe gövdenin vurduğu noktadan: araç vuruş yerine göre döner (rastgelelik yok) |
| Adım maliyeti | ~0,5 ms (adım başına zemin eğimi bir kez, ara adımda düzlem) |

Drift penceresi (DR), drift puanı, çamur ve ıslaklık, toz ve duman `fizik/ortak.ts`'te. Tur süreleri otomatik pilotla ölçülür (`npm run olcum`); eski klasik (bisiklet) motorun süreleri karşılaştırma için ölçüm dosyasında durur. Eski motor 3.1'de kaldırıldı (git geçmişinde: `src/fizik/klasik.ts`).

## Ses (ses/)

Ses dosyası yoktur; her şey oyunda üretilir. `ses/ses.ts → sesTick` her karede oyun durumunu okur (ana döngünün sonunda).

```
fizik (sim.yeni.rpm, vitesT, S.gas, teker kaymaları) ─► motor.ts   ─┐
teker zeminleri, hız, kerb, çarpma, havada            ─► efektler.ts ┼─► araç kanalı ─► kokpit süzgeci ─┐
yarış (geri sayım, drift kombosu, bitiş), menü tıkları ─► efektler.ts ┘                     efekt kanalı ┼─► ana ─► sınırlayıcı ─► hoparlör
mod (menü, garaj, sonuç, duraklatma)                  ─► muzik.ts ─────────────────────► müzik kanalı ┘
```

- **Motor:** `sentez.ts` her araç için 5 devirde, gazda ve gaz kapalıyken 1 sn'lik kesintisiz döngüler üretir: silindirlerin ateşleme darbeleri (dizilime göre aralık ve egzoz kolu), boru yankısı (tarak süzgeci), susturucu, gövde gümbürtüsü, doygunluk. Oyunda katmanlar devire göre çapraz geçişle ve hızlandırılarak çalınır. Üstüne turbo ıslığı, üfleme valfi, kompresör, düz dişli, devir kesici, gaz kesince patlamalar.
- **Araçlar:** her motor esinlenilen gerçek aracın diziliminde: Kızıl Ok atmosferik V6 (VTEC'te sertleşir), Kor RX ve Beyaz Kurt turbolu sıra 4, Mavi Yıldız turbolu boxer, Gece Mavisi kompresörlü çapraz krank V8. Her ateşlemenin ardından egzoz türbülansı (`govde`) ve susturucu odası sesi dolgunlaştırır.
- **Garajda dinleme:** garaj motoru kendiliğinden çalıştırmaz. Garajdaki düğme `lt:motor-dinle` olayını (`detail.arac`) yayınlar; ses katmanı incelenen aracın motorunu 5 sn çalar (`motor.ts → dinleGaz`) ve bitince `lt:motor-dinle-bitti` yayınlar.
- **Tık sesi:** yalnız `click` olayında (dokunup bırakınca), tıklanabilir öğede (düğme, açılır başlık, `onclick` bağlı öğe); sürüş tuşlarında yok.
- **iOS:** bağlam ilk dokunuşta kurulur (`baglam.ts`); arka plana geçince askıya alınır.
- **Kayıt:** `kayit.ts` aynı sesleri çevrimdışı bağlamda senaryoyla çalar; `npm run ses` dosyaya yazar (dinlemek, spektrumuna bakmak için).

## Belirlenimcilik

- Fizik `Math.random` kullanmaz: savrulma gibi rastgelelik `Simulasyon.rng` (tohumlu). Toz gibi yalnız görsel rastgelelik ayrı (`gorselRng`).
- Dünya dekoru her bölgede kendi tohumuyla kurulur: ağaçlar ve kayalar (ve çarpışma nesneleri) her açılışta aynı yerde.
- Sonuç: aynı başlangıç + aynı girişler = aynı sürüş. Tekrar izleme ve hayalet araç için yalnız girişleri kaydetmek yeter.
- **Girdi kaydı** (`fizik/girdi-kaydi.ts`): her araç her sıfırlamadan sonra adım başına girdisini 8 baytla kaydeder (16 bit nicemlenmiş; fiziğe de nicemlenmiş girdi gider, böylece oynatma birebir). `sifirla` rng'yi ve drift durumunu da sıfırlar: kayıt = tohum + başlangıç durumu + girdiler. `kaydiOynat` aynı son durumu verir (`tests/birim/cok-arac.test.ts`); `kaydiSerilestir`/`kaydiCoz` metne çevirir. Araç dışarıdan kaldırılınca (açık dünyada "yeniden doğ") kayıt `kesik` işaretlenir. Kurulum (önayar) kayıt boyunca değişmemelidir.

## Testler

| Katman | Araç | Ne denetler |
|---|---|---|
| Fizik | Vitest (Node) | Kararlılık ve temel değerler; gerçekçide otomatik pilotla spin yok; toprakta tam gaz + tam direksiyon yola tutunmaz; drift dengesi (usta dengede kalır, abartan spin atar); drift yarışında turun %80'i tek kombo; asfaltta titreşim yok; belirlenimcilik |
| Oyun | Playwright (başsız Chromium) | Derlenmiş oyun hatasız açılır; menüler, 30 yarış, açık dünyalar, garaj, sürüş, sürüm kalıbı |
| Görüntü | Playwright | Menü, garaj, yarış, kokpit ve 30 pistin ekran görüntüleri (`tests/cikti/`) |
| Kod | TypeScript, ESLint, Prettier | Tip hataları, şüpheli kod, biçim |

GitHub Actions her gönderimde hepsini çalıştırır; `master` ve `gelistirme` yalnız testler geçerse yayınlanır.

## Yayın akışı

```
sohbet ──push──► konu dalı (hud, fizik, …) ──Actions: test
                    ├─merge──► gelistirme ──Actions: test + derle──► /Last-Turn/dev/   (deneme, ortak)
                    └─merge (onaylanınca)──► master ──Actions: test + derle──► /Last-Turn/ (telefondaki oyun)
```

- Service worker derlemede dosya listesiyle üretilir (`src/pwa/sw-sablon.js` → `dist/sw.js`). Özetli dosyalar (`assets/…-abc123.js`) önbellekten, `index.html` ağdan gelir.
- Kurulu uygulama `index.html`'deki `APP_VERSION='…'` kalıbıyla yeni sürümü fark eder.

## Bilgisayara geçiş (yerel geliştirme)

1. Node 22+ kur, depoyu klonla: `git clone https://github.com/cemcandan01/Last-Turn`
2. `npm ci`
3. `npm run dev -- --host` → bilgisayarda ve aynı ağdaki iPhone'da `http://<bilgisayar-ip>:5173` (anında yenileme)
4. Editör: VS Code + ESLint + Prettier eklentileri (ayarlar depoda: `.editorconfig`, `.prettierrc.json`, `eslint.config.js`)
5. Gönderim ve yayın aynı: konu dalında çalış, `gelistirme` / `master`'a birleştirip push (`docs/SUREC.md`).
