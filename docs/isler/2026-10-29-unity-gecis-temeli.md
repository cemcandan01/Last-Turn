# Unity geçiş temeli

## İstenen

Last Turn TypeScript sürümünü korurken Unity 6.3 LTS C# geçişi için paralel Codex ve Claude Code çalışma düzeni, güvenli dallar/PR kontrolleri ve ilk artımlı temel kurulacak.

## Sahip ve temel

- Sahip: Codex
- Konu dalı: `codex/unity-foundation`
- Temel: `origin/gelistirme` @ `df3549e709469f0b519ebfbeaa9f63c1040fee05`
- Claude ayrımı: `claude/unity-driving-prototype`; temel birleşmeden Unity varlıklarını değiştirmez.

## Kabul ölçütleri

1. TypeScript kökü, yayın ve mevcut deneme akışı değişmeden kalır.
2. `Unity/` Unity 6.3 LTS (`6000.3.9f1`) proje meta verisi ve motor bağımsız C# çekirdeği içerir.
3. Unity C# çekirdeği yerelde ve PR CI'da derlenip doğrulanır.
4. Unity değişiklikleri için PR şablonu, açık sahiplik ve test kanıtı zorunluluğu bulunur.
5. `master`a doğrudan gönderim yerine koruma ayarı için uygulanabilir sahip adımı belgelenir.

## Kanıt

- Yerel: `node Unity/Validation/validate-project.mjs`
- Yerel: `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release`
- CI: `Unity doğrulama / Unity C# çekirdek` (dal gönderimi/PR sonrası)

## Açık sonraki adım

Unity Editor ile boş proje açılışını doğrula, ardından birinci sürülebilir test pisti için ayrı kart aç. EditMode CI lisansı ancak GitHub secret olarak sağlandığında etkinleştirilecek.
