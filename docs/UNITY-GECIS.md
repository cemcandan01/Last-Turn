# Unity 6.3 LTS geçişi

Bu depo iki ürünü birlikte taşır:

- Kök `src/`: yayınlanmaya devam eden TypeScript/Vite/Three.js oyunu.
- `Unity/`: Unity 6.3 LTS C# sürümü. İlk aşamada TypeScript oyununun yerine geçmez.

## Değişmez güvenlik sınırları

1. `master` canlı TypeScript sürümüdür. Ajanlar doğrudan bu dala gönderim yapmaz.
2. Özellik PR'ları `gelistirme`yi hedefler. Canlıya geçiş, mevcut regresyon akışı ve Cem'in açık onayıyla yapılır.
3. Aynı Unity sahnesi (`.unity`), prefab veya ScriptableObject aynı anda yalnız bir ajan tarafından değiştirilir.
4. Saf C# çekirdek kodu `Unity/Assets/LastTurn/Scripts/Core/` altında tutulur; Unity/arayüz bağımlılıkları üst katmanlara kalır.
5. TypeScript denge formülleri ve davranışları kaynak referanstır. Taşınan bir kuralın TypeScript testi ya da belgelenmiş ölçümü bağlanmadan davranışı yeniden tasarlamayız.

## Dallar ve çalışma alanları

| Sahip | Dal | Çalışma alanı | İlk sorumluluk |
| --- | --- | --- | --- |
| Codex | `codex/unity-foundation` | `worktrees/last-turn-codex-unity` | Proje düzeni, saf C# çekirdek, test kapısı |
| Claude Code | `claude/unity-driving-prototype` | `worktrees/last-turn-claude-unity` | Codex temeli birleştikten sonra sürülebilir prototip |

Claude dalı temel PR birleşmeden Unity dosyası değiştirmemelidir. İlk bağımsız işi yalnız araştırma veya TypeScript davranış envanteridir.

## Aşamalı teslim planı

| Aşama | Teslim | Başarı ölçütü | PR hedefi |
| --- | --- | --- | --- |
| 0 | TypeScript referans etiketi ve davranış envanteri | Kaynak SHA, test/ölçüm ve taşınacak sözleşme kaydı | `gelistirme` |
| 1 | Unity proje iskeleti + saf yarış durumları | `Unity doğrulama` CI'sı ve yerel .NET çekirdek doğrulaması geçer | `gelistirme` |
| 2 | Tek araç, kamera, giriş ve test pisti | PC'de klavye ile sürülebilir kısa tur; Editor test kanıtı | `gelistirme` |
| 3 | Asfalt/toprak, drift ve telemetri | TypeScript referans senaryolarına bağlı sayısal kabul ölçütleri | `gelistirme` |
| 4 | Kariyer, yükseltme ve roguelite sistemleri | Taşınan her kural için veri eşleme ve regresyon kanıtı | `gelistirme` |
| 5 | Android/iOS hazırlığı | Android cihaz yapısı; iOS için Mac/Cloud Build kanıtı | `gelistirme` |

## Doğrulama

Unity dosyası değiştiğinde önce şunları çalıştır:

```powershell
node Unity/Validation/validate-project.mjs
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release
```

Bu kontroller Unity Editor derlemesinin yerine geçmez. Unity lisansı GitHub Actions'a tanımlandığında EditMode test işi eklenir. Yerelde Unity 6.3 LTS ile proje açılıp Console hatası kontrol edilir; sahne ve oynanış değişikliğinde ilgili EditMode/PlayMode testi de PR'a yazılır.

## GitHub koruma ayarı

Bu bağlı GitHub entegrasyonunun yönetici izni koruma kuralını değiştirmeye yetmiyor. Depo sahibi GitHub'da `Settings → Rules → Rulesets` altında `master` için şu kuralları eklemeli:

- Pull request gerekli; doğrudan gönderim engelli.
- En az bir onay gerekli (tek geliştirici için kendi onayı zorunlu kılınmayabilir).
- `Denetim / denetim` ve Unity içeren PR'larda `Unity doğrulama / Unity C# çekirdek` başarılı olmalı.
- Force-push ve dal silme engelli.

`gelistirme` için en az `Denetim / denetim` kontrolünü gerekli tut; `master`a yalnız regresyon PR'ı aç.
