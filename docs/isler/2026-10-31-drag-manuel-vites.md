# Drag manuel vites — ayrı görev (açık, başlanmadı) — 31 Ekim 2026

Cem kararı (UNITY-GECIS): manuel vites **yalnız drag** yarışında; diğer türlere yayılmaz. Drag şu an TS'deki gibi otomatik şanzımanla oynanır (`RaceTest`, dg_1–dg_8 gerçek fizikle bitiyor, tuzak hızı 100–323 km/sa).

## Kabul ölçütü önerisi (başlamadan Cem onayı)

1. Yalnız `dg` etkinliğinde vites yükselt/düşür girdisi; diğer türlerde girdi yok sayılır, otomatik kalır.
2. Motor torku `PowertrainParameters.TorqueCurve`, devir, çekiş ve vites oranları mevcut fizikten; vites geçiş süresi (`ShiftTimer`) aynı. Yapay “mükemmel vites” hız/tork bonusu yok.
3. Aynı araçla: kusursuz manuel (en iyi devirde) ile otomatik arasındaki süre farkı ölçülür ve raporlanır; manuel yalnız fizikten avantaj/dezavantaj getirir.
4. Rev sınırında (`MaxRpm`) kesici; geç vites hız kaybı fizikten.
5. .NET: otomatik drag sonuçları değişmez (bit düzeyinde); manuel kip için sabit girdi izleriyle tekrar edilebilirlik; Unity Play kısa doğrulama.

## Açık soru

Kalkış (launch) ve kavrama modeli TS'de yok; eklenecekse ayrı tasarım.
