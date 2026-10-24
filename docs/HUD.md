# HUD standardı

Oyun içi göstergeler ve dokunmatik tuşlar için kurallar. HUD'a dokunan her değişiklik bu kurallara uyar;
bir kural bozulacaksa önce kullanıcıya sorulur ve bu dosya güncellenir.

Dayanaklar: Forza Horizon'un köşe göstergeleri (büyük beyaz hız rakamı, küçük vites, yarı saydam zemin),
Apple'ın oyun düzeni önerileri (güvenli alan kılavuzdur, kenar boşluğu değil; denetimler yuvarlak köşelerden,
ana ekran çubuğundan ve çentikten uzak), Roblox'un mobil düzen belgesi (alt köşeler başparmak bölgesi, oraya
bilgi konmaz), Steven Hoober'ın başparmak bölgeleri ve oyuncuların "HUD ekranın üçte birini kaplıyor"
şikâyetleri (Forza forumları).

## 1. Ekran bölgeleri (iPhone 13 yatay, 844 × 390)

```
┌──────────────────────────────────────────────────────────────┐
│ [yarış bilgisi]        [drift / kombo]      [tuşlar] [harita]│  üst şerit: bilgi
│                                                              │
│                      YOL VE UFUK (boş)                       │  orta: oyun
│                                                     [hız]    │
│ [◀] [▶]                 ARAÇ (boş)            [FREN] [GAZ]   │  alt köşeler: başparmak
└──────────────────────────────────────────────────────────────┘
```

- **Alt orta, aracın durduğu yer, her zaman boştur.** Hiçbir gösterge aracı ya da önündeki yolu kapatmaz.
  (3.1'deki hız paneli aracı kapatıyordu; bu kural onun için var.)
- **Alt köşeler yalnız tuşlarındır.** Bilgi, tuş grubunun ya üstüne ya yanına konur, altına ya da içine konmaz.
- **Üst şerit bilgi içindir:** sol üst yarış/tur bilgisi, üst orta anlık olay (drift, kombo, durum),
  sağ üst tuşlar ve harita.
- **Ekranın ortası (ufuk ve viraj) boştur.** Yalnız kısa ömürlü bildirimler (`#big`: geri sayım, +puan,
  SPİN) orada, %38 yükseklikte belirir ve 1,2 sn'de kaybolur.

## 2. Kenarlar ve güvenli alan

- iPhone yatayda çentik yalnız kenarın orta yüksekliğinde (yaklaşık 114-276 px); köşeler boştur.
  Bu yüzden göstergeler güvenli alanın tamamını boşluk olarak kullanmaz, kenara yanaşır:
  göstergelerde yan boşluk `--hx = max(16px, güvenli alan − 20px)`, tuşlarda `--cx` (güvenli alan − 14px),
  üst `--hy`, alt `--hb` (`stil.css`, `#app`).
- Kenara yanaşan üst öğeler 114 px'ten aşağı uzanmaz (çentiğe girmesin; harita bu yüzden 104 px). Alttaki
  tuşlar çentik hizasına uzanabildiği için kenardan çentik derinliği kadar içeridedir (`--cx`, 33 px).
- Yeni bir öğe bu değişkenlerle yerleşir; sabit piksel kenar boşluğu yazılmaz.

## 3. Bilgi önceliği

1. **Bir bakışta okunanlar:** hız, yarışın ana değeri (süre ya da toplam puan), drift kombosu. Büyük, kalın, tek renk.
2. **Göz ucuyla:** vites, tur, hedef süre, harita. Küçük, ikincil renk.
3. **Gösterilmez:** araç adı, zemin, lastik türü (ekranda zaten görünür ya da garajda seçilmiştir), devir
   çubuğu (kullanıcı kararı: hız ile devir aynı anda gösterilmez). Yalnız sürüşü değiştiren uyarılar
  (çamur %, ıslak, hava) hızın altında sarı yazıyla çıkar.

- **Her bilgi ekranda bir kez.** Aynı değer iki yerde gösterilmez. Drift yarışında kombo yalnız üst ortada,
  toplam puan yalnız sol üstte.
- Bir göstergede en çok üç satır; büyük değer, üstünde etiket, altında ikincil bilgi.
- Rakamlar `tabular-nums` ile: değişirken titremez.

## 4. Görünüm

- Paneller koyu cam: `--pan` (#0b1418, %72) + 1 px açık kenar `--panK` + bulanıklık. Köşe yarıçapı 12-16 px.
- Vurgu rengi tek: turuncu `--acc` (#ff7a3c): etiketler, vites, çarpan, kadran yayı. Uyarı sarı (#ffd27a).
  Tuşlarda ayrı renk yok (yeşil gaz / kırmızı fren uyumsuz bulundu): hepsi koyu cam, basılınca turuncu.
- Gaz ve fren pedal biçiminde (`.pd`): yatay oluklu, hafif öne yatık, basınca daha çok yatar ve oluklar
  turuncu yanar. Fren geniş ve kısa, gaz dar ve uzun. Analog pedalda gaz dolgusu turuncu, fren beyaz.
- Panelsiz ("Yazı") seçeneklerde iç boşluk korunur: yazı panelli sürümle aynı yerde durur, kenara yapışmaz.
- Yazı boyları: ana değer 22-40 px, etiket 11 px büyük harf ve harf aralıklı, ikincil 12 px. 10 px altı yok.
- Simgeler SVG çizgi simge (2,2 px çizgi), emoji kullanılmaz (her cihazda farklı görünür).
- Her yazının altında gölge var: açık gökyüzünde de karanlık yolda da okunur.

## 5. Dokunmatik tuşlar

- En küçük dokunma alanı 40 × 40 px (üst tuşlar); sürüş tuşları en az 84 × 90 px.
- Gaz ve direksiyon tuşları alt köşelerde, birbirine 10 px boşlukla. Tuşlar arası boşluk başparmağın
  yanlışlıkla iki tuşa basmasını önler.
- Kontrol türü değişince (`kontrolleriKur`) `#app[data-steer]` ve `#app[data-gas]` ayarlanır; göstergeler
  tuş grubunun yüksekliğine (`--cR`) göre yer değiştirir. Analog pedal uzun olduğu için hız onun yanına geçer.
- Basılı tuş turuncu (`.on`) olur: parmağın altında olsa da kenarından görülür.
- El freni tuşu (`#dbr`, 76 × 44 px) sağ grupta frenin (analogda pedalın) üstünde, telefonu çevirmede frenin
  solunda (`.tsut`). Tuşlarla gazda sağ grup yükselir (`--cR` 136 px), hız onun üstüne oturur.

## 6. Göstergeleri seçme

Oyuncu Ayarlar → **Göstergeler (HUD)** kartından düzenleyiciyi açar (`arayuz/hud-duzenleyici.ts`). Düzenleyici
oyunun kendi sahnesinden çekilmiş örnek görüntünün (`public/img/hud_onizleme.jpg`) üstünde gerçek HUD öğelerini,
tuşları ve örnek değerleri gösterir; seçim anında uygulanır ve kaydedilir (`gorunum`, `lt_ayar` içinde).
Seçim paneli ortada, aracın yerinde durur; göstergelere değmez. Açıkken oyun döngüsü HUD'a yazmaz.

Her gösterge ayrı seçilir (`oyun/ayarlar.ts → HUD_PARCALARI`, `#app[data-hiz|sayac|tus|harita|debriyaj]`):

| Parça | Seçenekler |
|---|---|
| Hız | Panel (sağda, gazın üstünde), Kadran (yuvarlak, hıza göre dolan yay), Üstte (ortada şerit), Yazı (panelsiz) |
| Sayaç | Panel, Yazı (panelsiz; drift kombosu da panelsiz) |
| Tuşlar | Panel, Simge (panelsiz) |
| Harita | Kare, Yuvarlak, Küçük (yarı saydam), Kapalı |
| Debriyaj | Açık (tuş görünür), Kapalı |

Hazır düzenler bunların birleşimidir (`HUDLAR`): Köşe (varsayılan), Kadran, Bant, Sade. Seçim hiçbirine
uymuyorsa "Özel" görünür.

- Drift açısı gösterilmez (kullanıcı kararı). Üst ortada yalnız drift yarışındaki kombo, patinaj ve havada.
  İleride seviye/XP gelince driftte kazanılan anlık XP buraya konur.
- Yeni seçenek eklerken: `HUD_PARCALARI`'na satır, `stil.css`'te `#app[data-…="…"]` kuralı; içerik
  `arayuz/hud.ts`'te değişmez.

## 7. Denetim

- `npm run test:e2e` her hız × harita seçeneği, panelli ve panelsiz, × kontrol türü (tuşlar, direksiyon + analog pedal, telefonu çevirme +
  otomatik gaz) için iPhone 13 güvenli alanıyla göstergelerin birbirine ve tuşlara değmediğini, ekrandan
  taşmadığını, kadran yayının dairesinden çıkmadığını, drift sayacının tek olduğunu ve düzenleyicinin
  çalıştığını denetler. Yeni bir HUD öğesi bu teste eklenir.
- `npm run test:goruntu` → `tests/cikti/hud_*.png`: her hazır düzenin drift yarışındaki görüntüsü ve düzenleyici. HUD değişikliğinden
  sonra bunlara bakılır.
- Kokpit kamerasında hız paneli gizlenir (kokpitin kendi göstergeleri var).
