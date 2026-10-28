# 2026-10-28 MUTANT rakip ve boss ölçümü (LT-SYS-007)

Koşum: `npx vitest run --config vitest.olcum.config.ts tests/olcum/mutant-rakip.test.ts` (SADECE=boss yalnız boss). Rakip MUTANT kuralıyla (önayar ya da parça lastiği, toprak dengesi), duran araçla ızgaradan, tek tohum. Pilot insan değildir; oranlar karşılaştırma içindir.

## Etkinlik rakibi (pistin kariyer hedef kurulumu; Güvenli Çaylak, Riskli/Ölümcül Deneyimli)

Oran = rakibin bitişi / seçilen risk kademesinin hedefi (1'in altı: rakip hedeften hızlı).

```
gp lv1 sev1 b1 Yeşil Vadi risk0 caylak rakip 55.3 hedef 53.8 oran 1.03 dönüş 0
gp lv1 sev1 b1 Yeşil Vadi risk1 deneyimli rakip 50.9 hedef 46.7 oran 1.09 dönüş 0
gp lv1 sev1 b1 Yeşil Vadi risk2 deneyimli rakip 50.9 hedef 43.0 oran 1.18 dönüş 0
gp lv2 sev2 b1 Kıyı Pisti risk0 caylak rakip 78.4 hedef 73.2 oran 1.07 dönüş 0
gp lv2 sev2 b1 Kıyı Pisti risk1 deneyimli rakip 73.0 hedef 63.6 oran 1.15 dönüş 0
gp lv2 sev2 b1 Kıyı Pisti risk2 deneyimli rakip 73.0 hedef 58.5 oran 1.25 dönüş 0
gp lv3 sev3 b1 Grand Prix risk0 caylak rakip 74.1 hedef 72.5 oran 1.02 dönüş 0
gp lv3 sev3 b1 Grand Prix risk1 deneyimli rakip 68.6 hedef 63.0 oran 1.09 dönüş 0
gp lv3 sev3 b1 Grand Prix risk2 deneyimli rakip 68.6 hedef 58.0 oran 1.18 dönüş 0
gp lv4 sev4 b2 Sisli Orman Pisti risk0 caylak rakip 65.0 hedef 58.2 oran 1.12 dönüş 0
gp lv4 sev4 b2 Sisli Orman Pisti risk1 deneyimli rakip 58.2 hedef 50.6 oran 1.15 dönüş 0
gp lv4 sev4 b2 Sisli Orman Pisti risk2 deneyimli rakip 58.2 hedef 46.6 oran 1.25 dönüş 0
gp lv5 sev5 b2 Şehir Pisti risk0 caylak rakip 64.2 hedef 52.1 oran 1.23 dönüş 0
gp lv5 sev5 b2 Şehir Pisti risk1 deneyimli rakip 57.5 hedef 45.2 oran 1.27 dönüş 0
gp lv5 sev5 b2 Şehir Pisti risk2 deneyimli rakip 57.5 hedef 41.6 oran 1.38 dönüş 0
gp lv6 sev6 b3 Dağ Pisti risk0 caylak rakip 66.5 hedef 69.0 oran 0.96 dönüş 0
gp lv6 sev6 b3 Dağ Pisti risk1 deneyimli rakip 68.4 hedef 60.0 oran 1.14 dönüş 0
gp lv6 sev6 b3 Dağ Pisti risk2 deneyimli rakip 68.4 hedef 55.2 oran 1.24 dönüş 0
rx lv1 sev1 b1 Toz Tepeleri risk0 caylak rakip 50.2 hedef 57.6 oran 0.87 dönüş 0
rx lv1 sev1 b1 Toz Tepeleri risk1 deneyimli rakip 46.9 hedef 50.1 oran 0.94 dönüş 0
rx lv1 sev1 b1 Toz Tepeleri risk2 deneyimli rakip 46.9 hedef 46.1 oran 1.02 dönüş 0
rx lv2 sev2 b1 Çamur Vadisi risk0 caylak rakip 53.8 hedef 65.7 oran 0.82 dönüş 0
rx lv2 sev2 b1 Çamur Vadisi risk1 deneyimli rakip 51.3 hedef 57.1 oran 0.90 dönüş 0
rx lv2 sev2 b1 Çamur Vadisi risk2 deneyimli rakip 51.3 hedef 52.5 oran 0.98 dönüş 0
rx lv3 sev3 b1 Taş Ocağı risk0 caylak rakip 51.8 hedef 54.8 oran 0.95 dönüş 0
rx lv3 sev3 b1 Taş Ocağı risk1 deneyimli rakip 47.4 hedef 47.6 oran 1.00 dönüş 0
rx lv3 sev3 b1 Taş Ocağı risk2 deneyimli rakip 47.4 hedef 43.8 oran 1.08 dönüş 0
rx lv4 sev4 b2 Orman Kros risk0 caylak rakip 51.1 hedef 53.2 oran 0.96 dönüş 0
rx lv4 sev4 b2 Orman Kros risk1 deneyimli rakip 47.3 hedef 46.3 oran 1.02 dönüş 0
rx lv4 sev4 b2 Orman Kros risk2 deneyimli rakip 47.3 hedef 42.6 oran 1.11 dönüş 0
rx lv5 sev5 b2 Sisli Tepe risk0 caylak rakip 64.2 hedef 76.0 oran 0.84 dönüş 0
rx lv5 sev5 b2 Sisli Tepe risk1 deneyimli rakip 59.4 hedef 66.1 oran 0.90 dönüş 0
rx lv5 sev5 b2 Sisli Tepe risk2 deneyimli rakip 59.4 hedef 60.8 oran 0.98 dönüş 0
rl lv1 sev1 b1 Kır Etabı risk0 caylak rakip 59.3 hedef 71.6 oran 0.83 dönüş 0
rl lv1 sev1 b1 Kır Etabı risk1 deneyimli rakip 54.8 hedef 62.3 oran 0.88 dönüş 0
rl lv1 sev1 b1 Kır Etabı risk2 deneyimli rakip 54.8 hedef 57.3 oran 0.96 dönüş 0
rl lv2 sev2 b1 Orman Etabı risk0 caylak rakip 91.9 hedef 108.0 oran 0.85 dönüş 0
rl lv2 sev2 b1 Orman Etabı risk1 deneyimli rakip 104.7 hedef 93.9 oran 1.12 dönüş 2
rl lv2 sev2 b1 Orman Etabı risk2 deneyimli rakip 104.7 hedef 86.4 oran 1.21 dönüş 2
rl lv5 sev5 b2 Kanyon Etabı risk0 caylak rakip 67.7 hedef 65.7 oran 1.03 dönüş 0
rl lv5 sev5 b2 Kanyon Etabı risk1 deneyimli rakip 65.4 hedef 57.1 oran 1.15 dönüş 0
rl lv5 sev5 b2 Kanyon Etabı risk2 deneyimli rakip 65.4 hedef 52.5 oran 1.25 dönüş 0
dg lv1 sev1 b1 Sekizde Bir Mil risk0 caylak rakip 9.2 hedef 11.1 oran 0.83 dönüş 0
dg lv1 sev1 b1 Sekizde Bir Mil risk1 deneyimli rakip 9.0 hedef 9.8 oran 0.92 dönüş 0
dg lv1 sev1 b1 Sekizde Bir Mil risk2 deneyimli rakip 9.0 hedef 9.1 oran 0.99 dönüş 0
dg lv2 sev2 b1 Bin Fit risk0 caylak rakip 11.7 hedef 14.1 oran 0.83 dönüş 0
dg lv2 sev2 b1 Bin Fit risk1 deneyimli rakip 11.6 hedef 12.4 oran 0.93 dönüş 0
dg lv2 sev2 b1 Bin Fit risk2 deneyimli rakip 11.6 hedef 11.6 oran 1.00 dönüş 0
dg lv3 sev3 b1 Çeyrek Mil risk0 caylak rakip 12.8 hedef 15.3 oran 0.84 dönüş 0
dg lv3 sev3 b1 Çeyrek Mil risk1 deneyimli rakip 12.6 hedef 13.4 oran 0.94 dönüş 0
dg lv3 sev3 b1 Çeyrek Mil risk2 deneyimli rakip 12.6 hedef 12.5 oran 1.01 dönüş 0
dg lv4 sev4 b2 Yarım Kilometre risk0 caylak rakip 11.0 hedef 12.6 oran 0.87 dönüş 0
dg lv4 sev4 b2 Yarım Kilometre risk1 deneyimli rakip 10.9 hedef 11.1 oran 0.98 dönüş 0
dg lv4 sev4 b2 Yarım Kilometre risk2 deneyimli rakip 10.9 hedef 10.4 oran 1.04 dönüş 0
dg lv5 sev5 b2 Yarım Mil risk0 caylak rakip 14.0 hedef 16.3 oran 0.86 dönüş 0
dg lv5 sev5 b2 Yarım Mil risk1 deneyimli rakip 13.9 hedef 14.4 oran 0.97 dönüş 0
dg lv5 sev5 b2 Yarım Mil risk2 deneyimli rakip 13.9 hedef 13.4 oran 1.04 dönüş 0
dg lv6 sev6 b3 Bir Mil risk0 caylak rakip 24.9 hedef 25.0 oran 1.00 dönüş 0
dg lv6 sev6 b3 Bir Mil risk1 deneyimli rakip 25.0 hedef 22.0 oran 1.13 dönüş 0
dg lv6 sev6 b3 Bir Mil risk2 deneyimli rakip 25.0 hedef 20.5 oran 1.22 dönüş 0
gp lv7 sev2 b1 Çöl Otoyolu risk0 caylak rakip 92.6 hedef 87.7 oran 1.06 dönüş 0
gp lv7 sev2 b1 Çöl Otoyolu risk1 deneyimli rakip 86.1 hedef 76.2 oran 1.13 dönüş 0
gp lv7 sev2 b1 Çöl Otoyolu risk2 deneyimli rakip 86.1 hedef 70.1 oran 1.23 dönüş 0
gp lv8 sev4 b2 Kar Dağı Pisti risk0 caylak rakip 51.6 hedef 44.9 oran 1.15 dönüş 0
gp lv8 sev4 b2 Kar Dağı Pisti risk1 deneyimli rakip 46.4 hedef 39.0 oran 1.19 dönüş 0
gp lv8 sev4 b2 Kar Dağı Pisti risk2 deneyimli rakip 46.4 hedef 35.9 oran 1.29 dönüş 0
rx lv7 sev2 b1 Plaj Kros risk0 caylak rakip 72.7 hedef 86.9 oran 0.84 dönüş 0
rx lv7 sev2 b1 Plaj Kros risk1 deneyimli rakip 68.8 hedef 75.6 oran 0.91 dönüş 0
rx lv7 sev2 b1 Plaj Kros risk2 deneyimli rakip 68.8 hedef 69.6 oran 0.99 dönüş 0
rx lv8 sev4 b2 Kar Kros risk0 caylak rakip 59.3 hedef 56.4 oran 1.05 dönüş 0
rx lv8 sev4 b2 Kar Kros risk1 deneyimli rakip 51.3 hedef 49.0 oran 1.05 dönüş 0
rx lv8 sev4 b2 Kar Kros risk2 deneyimli rakip 51.3 hedef 45.1 oran 1.14 dönüş 0
rl lv7 sev2 b1 Kıyı Etabı risk0 caylak rakip 53.2 hedef 65.9 oran 0.81 dönüş 0
rl lv7 sev2 b1 Kıyı Etabı risk1 deneyimli rakip 48.4 hedef 57.3 oran 0.85 dönüş 0
rl lv7 sev2 b1 Kıyı Etabı risk2 deneyimli rakip 48.4 hedef 52.8 oran 0.92 dönüş 0
dg lv7 sev1 b1 Çeyrek Kilometre risk0 caylak rakip 10.5 hedef 12.8 oran 0.82 dönüş 0
dg lv7 sev1 b1 Çeyrek Kilometre risk1 deneyimli rakip 10.4 hedef 11.3 oran 0.92 dönüş 0
dg lv7 sev1 b1 Çeyrek Kilometre risk2 deneyimli rakip 10.4 hedef 10.5 oran 0.99 dönüş 0
dg lv8 sev5 b2 Bir Kilometre risk0 caylak rakip 16.1 hedef 19.0 oran 0.85 dönüş 0
dg lv8 sev5 b2 Bir Kilometre risk1 deneyimli rakip 16.0 hedef 16.8 oran 0.95 dönüş 0
dg lv8 sev5 b2 Bir Kilometre risk2 deneyimli rakip 16.0 hedef 15.6 oran 1.03 dönüş 0
```

Rakipsiz (rampada takılıp bitiremedi, 8 sn piste dönüşle bile): Kanyon Kros (rx 6), Taşlı Yol (rl 3), Sisli Orman (rl 4), Tepe Etabı (rl 6), Dağ Etabı (rl 8). Rampa öncesi hız tabanı denendi, sonuç değişmedi.

## Boss rakibi (türün başlangıç aracı + bölge build'i + boss kişiliği, bütün turlar)

Oran = boss bitişi / eski boss hedefi (ölçüm pilotunun en iyi turu × tur × pay).

```
BOSS toprak-kurdu   b1 Kır Etabı            boss 53.8 eski hedef 57.8 oran 0.93 dönüş 0
BOSS toprak-kurdu   b2 Kır Etabı            boss 51.5 eski hedef 53.8 oran 0.96 dönüş 0
BOSS toprak-kurdu   b2 Kıyı Etabı           boss 44.1 eski hedef 48.2 oran 0.91 dönüş 0
BOSS toprak-kurdu   b3 Kıyı Etabı           boss 43.5 eski hedef 45.4 oran 0.96 dönüş 0
BOSS drag-canavari  b1 Sekizde Bir Mil      boss 9.0 eski hedef 9.3 oran 0.96 dönüş 0
BOSS drag-canavari  b1 Çeyrek Kilometre     boss 10.3 eski hedef 10.7 oran 0.96 dönüş 0
BOSS drag-canavari  b1 Bin Fit              boss 11.8 eski hedef 12.3 oran 0.96 dönüş 0
BOSS drag-canavari  b1 Çeyrek Mil           boss 14.2 eski hedef 14.8 oran 0.96 dönüş 0
BOSS drag-canavari  b2 Sekizde Bir Mil      boss 7.8 eski hedef 8.1 oran 0.97 dönüş 0
BOSS drag-canavari  b2 Çeyrek Kilometre     boss 9.0 eski hedef 9.4 oran 0.97 dönüş 0
BOSS drag-canavari  b2 Bin Fit              boss 10.3 eski hedef 10.7 oran 0.97 dönüş 0
BOSS drag-canavari  b2 Çeyrek Mil           boss 12.5 eski hedef 12.9 oran 0.96 dönüş 0
BOSS drag-canavari  b2 Yarım Kilometre      boss 14.6 eski hedef 15.1 oran 0.97 dönüş 0
BOSS drag-canavari  b2 Yarım Mil            boss 20.7 eski hedef 21.5 oran 0.97 dönüş 0
BOSS drag-canavari  b2 Bir Kilometre        boss 24.5 eski hedef 25.4 oran 0.97 dönüş 0
BOSS drag-canavari  b2 Bir Mil              boss 36.2 eski hedef 37.3 oran 0.97 dönüş 0
BOSS drag-canavari  b3 Sekizde Bir Mil      boss 6.8 eski hedef 7.0 oran 0.97 dönüş 0
BOSS drag-canavari  b3 Çeyrek Kilometre     boss 7.9 eski hedef 8.1 oran 0.97 dönüş 0
BOSS drag-canavari  b3 Bin Fit              boss 9.0 eski hedef 9.3 oran 0.97 dönüş 0
BOSS drag-canavari  b3 Çeyrek Mil           boss 11.0 eski hedef 11.3 oran 0.97 dönüş 0
BOSS drag-canavari  b3 Yarım Kilometre      boss 12.9 eski hedef 13.3 oran 0.97 dönüş 0
BOSS drag-canavari  b3 Yarım Mil            boss 18.8 eski hedef 19.3 oran 0.98 dönüş 0
BOSS drag-canavari  b3 Bir Kilometre        boss 22.6 eski hedef 23.0 oran 0.98 dönüş 0
BOSS drag-canavari  b3 Bir Mil              boss 34.4 eski hedef 34.8 oran 0.99 dönüş 0
BOSS gece-sahini    b1 Yeşil Vadi           boss 130.6 eski hedef 148.6 oran 0.88 dönüş 0
BOSS gece-sahini    b1 Kıyı Pisti           boss 204.2 eski hedef 197.9 oran 1.03 dönüş 0
BOSS gece-sahini    b1 Çöl Otoyolu          boss 237.3 eski hedef 236.3 oran 1.00 dönüş 0
BOSS gece-sahini    b1 Grand Prix           boss 204.6 eski hedef 205.3 oran 1.00 dönüş 0
BOSS gece-sahini    b2 Yeşil Vadi           boss 129.6 eski hedef 137.9 oran 0.94 dönüş 0
BOSS gece-sahini    b2 Kıyı Pisti           boss 196.6 eski hedef 180.9 oran 1.09 dönüş 0
BOSS gece-sahini    b2 Çöl Otoyolu          boss 230.5 eski hedef 221.1 oran 1.04 dönüş 0
BOSS gece-sahini    b2 Grand Prix           boss 197.0 eski hedef 182.0 oran 1.08 dönüş 0
BOSS gece-sahini    b2 Sisli Orman Pisti    boss 210.6 eski hedef 204.7 oran 1.03 dönüş 0
BOSS gece-sahini    b2 Kar Dağı Pisti       boss 152.4 eski hedef 142.7 oran 1.07 dönüş 0
BOSS gece-sahini    b2 Şehir Pisti          boss 199.4 eski hedef 193.5 oran 1.03 dönüş 0
BOSS gece-sahini    b2 Dağ Pisti            boss 210.1 eski hedef 212.0 oran 0.99 dönüş 0
BOSS gece-sahini    b3 Kıyı Pisti           boss 186.6 eski hedef 169.6 oran 1.10 dönüş 0
BOSS gece-sahini    b3 Sisli Orman Pisti    boss 190.9 eski hedef 187.7 oran 1.02 dönüş 0
BOSS gece-sahini    b3 Şehir Pisti          boss 187.6 eski hedef 175.8 oran 1.07 dönüş 0
BOSS camur-baronu   b1 Plaj Kros            boss 192.7 eski hedef 234.1 oran 0.82 dönüş 0
BOSS camur-baronu   b2 Plaj Kros            boss 186.4 eski hedef 212.3 oran 0.88 dönüş 0
BOSS camur-baronu   b3 Plaj Kros            boss 185.9 eski hedef 209.6 oran 0.89 dönüş 0
```

Özet: toprak/yağmur boss'ları eski hedeften %4–12, drag %3 hızlı; asfalt boss'u (Gece Şahini) bölge 1'de %0–15 hızlı, bölge 2–3'te %2–10 yavaş (pilotun asfalt viraj temposu ölçüm pilotunun optimize en iyi turunun altında). Kişiliği daha agresif yapmak (yan 14) pistten çıkmalar getirdi, geri alındı.
