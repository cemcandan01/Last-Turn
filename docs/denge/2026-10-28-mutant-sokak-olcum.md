# 2026-10-28 MUTANT sokak yarışı ölçümü (LT-SYS-008)

Koşum: `SADECE=sokak npx vitest run --config vitest.olcum.config.ts tests/olcum/mutant-rakip.test.ts`. Rakip YZ Kule Şehri rotalarında, pistin asfalt kariyer kurulumuyla (kariyerKurulumu("gp", sev)), MUTANT lastik kuralıyla, ızgaradan, tek tohum. Tur sayısı rota uzunluğundan (yarış ~2,4 km).

```
SOKAK alt-sehir tur sev2 caylak uzunluk 2339 m bitiş 112.5 ort hız 20.8 m/s dönüş 0
SOKAK alt-sehir tur sev2 deneyimli uzunluk 2339 m bitiş 107.3 ort hız 21.8 m/s dönüş 0
SOKAK park-cevresi tur sev3 caylak uzunluk 1950 m bitiş 77.0 ort hız 25.3 m/s dönüş 0
SOKAK park-cevresi tur sev3 deneyimli uzunluk 1950 m bitiş 73.6 ort hız 26.5 m/s dönüş 0
SOKAK dogu-blogu tur sev4 caylak uzunluk 1785 m bitiş 64.7 ort hız 27.6 m/s dönüş 0
SOKAK dogu-blogu tur sev4 deneyimli uzunluk 1785 m bitiş 58.4 ort hız 30.5 m/s dönüş 0
SOKAK kuzey-kosusu ab sev2 caylak uzunluk 2152 m bitiş 86.5 ort hız 24.9 m/s dönüş 0
SOKAK kuzey-kosusu ab sev2 deneyimli uzunluk 2152 m bitiş 83.4 ort hız 25.8 m/s dönüş 0
SOKAK guneyden-kuzeye ab sev3 caylak uzunluk 2142 m bitiş 82.5 ort hız 26.0 m/s dönüş 0
SOKAK guneyden-kuzeye ab sev3 deneyimli uzunluk 2142 m bitiş 79.4 ort hız 27.0 m/s dönüş 0
SOKAK capraz ab sev4 caylak uzunluk 2166 m bitiş 66.3 ort hız 32.7 m/s dönüş 0
SOKAK capraz ab sev4 deneyimli uzunluk 2166 m bitiş 60.7 ort hız 35.7 m/s dönüş 0
SOKAK kovala-bati kovala sev2 caylak uzunluk 2651 m bitiş 124.2 ort hız 21.4 m/s dönüş 0
SOKAK kovala-bati kovala sev2 deneyimli uzunluk 2651 m bitiş 119.2 ort hız 22.2 m/s dönüş 0
SOKAK kovala-park kovala sev3 caylak uzunluk 1730 m bitiş 70.2 ort hız 24.7 m/s dönüş 0
SOKAK kovala-park kovala sev3 deneyimli uzunluk 1730 m bitiş 67.1 ort hız 25.8 m/s dönüş 0
SOKAK kovala-dogu kovala sev4 caylak uzunluk 1962 m bitiş 61.4 ort hız 31.9 m/s dönüş 0
SOKAK kovala-dogu kovala sev4 deneyimli uzunluk 1962 m bitiş 56.0 ort hız 35.1 m/s dönüş 0
```

Sonuç: 9 rotanın hepsi iki kişilikle bitti, piste dönüş 0. Bu süreler `SOKAK_ROTALARI[].olcum` olarak saklı; yıldızlar: 1★ Çaylak +%8, 2★ Deneyimli, 3★ Deneyimli −%8 (`sokakYildizlari`).
