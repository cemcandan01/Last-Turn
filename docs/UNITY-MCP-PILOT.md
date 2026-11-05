# Unity AI destekleri: kurulum ve pilot — 6 Kasım 2026

## Güncel kurulum sonucu — Cem'in açık onayı sonrası

Cem “gerekli kurulumları yap” dedi. **Coplay kuruldu; ana projeye geçiş kabulü henüz tamamlanmadı.** Tek ajan Codex; yeni model oturumu, API anahtarı veya ücretli servis açılmadı. Claude Code abonelik kapasitesi bilinmiyor.

| Destek | Durum ve kullanım |
|---|---|
| Coplay Unity MCP | Ayrı `Unity/Logs/McpEditorPilot` projesinde kurulu. Gerçek MCP protokolüyle 48 araç listelendi; doğru proje/sürüm, sahne ağacı, Console, Play/Stop ve mevcut Garaj test menüsü çağrıldı. |
| Context7 | Bağlı araç üzerinden Unity Manual kitaplığı çözümlendi. Belge bulma desteği; yeni kurulum gerekmedi. Claude CLI de mevcut Context7 kaydını listeliyor. |
| Görsel üretim | Bu Codex ortamında yerleşik araç mevcut. Bu görevde üretim çağrısı yapılmadı; harici servis/anahtar eklenmedi. |
| 3B / ses / Blender / ML-Agents | Kurulmadı. MCP listesindeki üretim araçları, sağlayıcı erişimi veya çalışan üretim kanıtı değildir. Somut varlık ihtiyacı, lisans ve bütçeyle ayrıca seçilecek. |

**Doğrulanan sınırlar:** `get_visual_tree` mevcut `Arayüz (F)` nesnesini bulamadı. v10.3.0 `GameObjectLookup.GetAllSceneObjects` yalnız aktif sahneyi tarıyor; bizim UI kökü `DontDestroyOnLoad` sahnesinde. Play `render_ui` yakalamayı kuyruğa aldı, sonraki çağrı `capture_in_progress` verdi; batch `WaitForEndOfFrame` yakalaması tamamlanmadı. Başarılı UI ağacı veya MCP ekran görüntüsü iddia edilmez. Oyun sunum mimarisi bu araca uymak için değiştirilmedi. Asıl Unity manifest/lock ve genel istemci ayarları korunuyor.

Kurulum makbuzu:

- Kaynak: `https://github.com/CoplayDev/unity-mcp.git`, **v10.3.0**, checkout **`aa5fc638d623f56178d50329d9ad8c541a57fe66`** (annotated tag nesnesi farklıdır). Konum `tests/cikti/unity-mcp-pilot/source`; kaynak değiştirilmedi. Resmî GitHub public advisory sorgusu boş döndü; bu kapsamlı güvenlik denetimi değildir.
- Python **3.12.4**, izole **uv 0.13.7**, Windows wheel SHA256 `2835e2ab397d0db86323b9975dce75ecd76aa9cfa0d6a2aea84734aae7f8c9b3`. `pip --isolated --require-hashes --no-deps --target .../bootstrap` kullanıldı; PATH/global Python değişmedi.
- `uv sync --locked --no-dev` ile kaynak `Server/uv.lock` üzerinden **75 bağımlılık**; ortam `tests/cikti/unity-mcp-pilot/server-venv`. Unity paketi yerel sabit checkout'a `file:` bağımlılığıyla bağlandı ve derlendi. Unity 6000.3.9f1 resolver'ı test-framework'ü **1.6.0** olarak çözdü; ana proje 1.4.5 talebi değişmedi, sürüm düşürülmedi. Newtonsoft **3.2.2** çözüldü.
- Telemetri için `UNITY_MCP_DISABLE_TELEMETRY=1`, `MCP_DISABLE_TELEMETRY=1`, `DISABLE_TELEMETRY=1`; stdio sunucu + Editor'ın `127.0.0.1:6400` köprüsü. Uzak HTTP/LAN kurulmadı. `McpCiBoot.StartStdioForCi` yalnız oturum transport tercihini sabitler.
- Pilot company/product adı ayrı; gerçek oyuncu profilleri, Firebase oturumları ve `_Recovery` kopyalanmadı. Venv/Library/loglar gitignored konumda; repoya üçüncü taraf ikilileri eklenmedi.
- Ham yerel kanıt: `tests/cikti/unity-mcp-pilot/{instances,tool-schemas,pilot-results,ui-name-failure,capture-failure}.json`, `Unity/Logs/unity-mcp-pilot-editor.log`. İlk yardımcı menü import edilmeden çağrıldığında bulunamadı; refresh sonrası çalıştı. Domain reload sırasında geçici bağlantı kaybı da gözlendi; hazır olmadan sorgu gönderilmemeli.
- MCP `execute_menu_item` üzerinden başlatılan mevcut Garaj kısa Play testi **29/29 geçti**: `Unity/Logs/McpEditorPilot/Logs/p7-garage-play.json`, UTC `2026-11-05T22:12:52Z` (yerel 6 Kasım). Gerçek disk yeniden yükleme ve oyuncu dosyası hash koruması dahil. Bu testin kendi panel render yöntemi çalışır; MCP yakalamasıyla karıştırılmamalı. Test bitince Editor normal olarak çıktı; başlatıcıyla yeniden açıldı.

### Kullanım

Repo kökünden (ExecutionPolicy yalnız bu alt süreç için; sistem politikası değişmez):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/unity-mcp-pilot.ps1 Start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/unity-mcp-pilot.ps1 Status
& tests/cikti/unity-mcp-pilot/server-venv/Scripts/python.exe scripts/unity-mcp-probe.py
Set-Location Unity/Logs/McpEditorPilot
claude
```

Yalnız bu kopyanın `.mcp.json` kaydı oluşturuldu. `claude mcp get UnityMCP` bunu **Project / Pending approval** olarak doğruladı. Claude'un kendi ilk proje güven ekranı tamamlanmadı; Claude içinden bağlı olduğu iddia edilmez. MCP SDK ile gerçek bağlantı ayrıca doğrulandı. Kullanıcı Claude'u bu dizinde açtığında kaydı inceleyip güven ekranını kabul eder. Ana repo kökünden açılan Claude oturumu bu pilot kaydını kullanmaz. `Configure` yalnız pilot kaydını yeniden üretir; başka MCP girdileri varsa durur. Sabit instance kimliği bu konuma aittir; klasör taşınırsa yeniden keşif gerekir.

Geri alma: yalnız pilot Editor'ını kapat; pilot dizininde `claude mcp remove UnityMCP -s project` çalıştır. Kurulum klasörleri ihtiyaç kalmayınca kaldırılabilir; ana oyunda geri alınacak paket değişikliği yok. Yeni kopya/makinede Python ortamı yeniden kurulmalıdır, venv taşınmaz. Sonraki teknik adım: normal grafik Editor oturumunda UI ağacı/ekran kabulünü doğrulamak ve `DontDestroyOnLoad` arama eksiği için upstream düzeltmesini değerlendirmek.

---

## Kurulum öncesi değerlendirme (tarihsel kayıt)

İlk öneri: **önce yalnız CoplayDev/unity-mcp, ayrı test kopyasında ve yerel bağlantıyla**. Aşağıdaki bölüm kurulumdan önceki değerlendirmedir; güncel gerçek durum üsttedir.

| Başlık | CoplayDev/unity-mcp | IvanMurzak/Unity-MCP |
|---|---|---|
| Unity / Claude | Belgede Unity 2021.3–6.x ve Claude Code desteği; 6000.3.9f1 için aralık uyumu var, bu projede canlı bağlantı doğrulanmadı. | Claude Code destekleniyor; bu projedeki tam Unity patch sürümünde çalışması doğrulanmadı. |
| Yapı | Unity UPM paketi + Python MCP sunucusu. | Unity eklentisi + sunucu; güncel araçları RQL sorgu/değişim ve dinamik C# çalıştırmayı kapsıyor. |
| Hedef işler | Sahne/asset/Editor yönetimi ve test çalıştırma belgelenmiş. UI Toolkit ağacını semantik okuma ve panel dahil ekran yakalama ilk pilotun kabul kapısı olmalı; kamera görüntüsü tek başına yeterli değil. | Console/tests kaynakları ve Game View ekran görüntüsü aracı listelenmiş. Doğrudan UI Toolkit ağacı desteği henüz doğrulanmadı. |
| Yerel ortam | Python 3.12.4 mevcut. `uv` PATH üzerinde bulunmadı. | README proje yolunda boşluğu yasaklıyor; `D:/Last Turn/Last-Turn-Unity` bu koşulu sağlamıyor. |
| Lisans | MIT | Apache-2.0 |

Kaynaklar: [Coplay v10.3.0 README](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/README.md), [Unity paket tanımı](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/MCPForUnity/package.json), [Python sunucu bağımlılıkları](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/Server/pyproject.toml), [IvanMurzak gereksinimleri](https://github.com/IvanMurzak/Unity-MCP#installation), [araç referansı](https://github.com/IvanMurzak/Unity-MCP/blob/main/docs/default-mcp-tools.md).

Claude Code **2.1.302**, yalnız `claude --version` ile doğrulandı (ilk sandbox erişim engeli sonrasında izinli salt sürüm sorgusu); model çağrısı yapılmadı. Python **3.12.4**. Oturum/token dosyaları okunmadı. Gerçek MCP bağlantısı doğrulanmış değildir; nominal sürüm uyumu canlı pilot başarısı değildir.

## Onaylanacak somut kurulum kapsamı

1. Yalnız ayrı, atılabilir Unity proje kopyası; mevcut oyuncu profilleri ve Firebase oturum dosyaları kopyalanmaz. Asıl Assets/Packages ve genel Claude yapılandırması değiştirilmez.
2. Coplay UPM paketi için incelenmiş **v10.3.0** etiketi/çözümlenen commit sabitlenir; hareketli main/beta kurulmaz. Kurulum anında güncel güvenlik duyuruları tekrar kontrol edilir. Paket Unity modülleri, Newtonsoft JSON 3.0.2 ve test-framework 1.1.31 bildiriyor; bizde test-framework 1.4.5 var. Resolver'ın yapacağı değişiklikler kopyada diff ile denetlenir; sürüm düşürme otomatik kabul edilmez.
3. Python 3.10+ koşulu yerel 3.12.4 ile sağlanıyor. `uv` kurulması ve sunucunun izole Python ortamına httpx/FastMCP/MCP/Pydantic/FastAPI/Uvicorn/Click bağımlılıklarının indirilmesi ayrıca bu onayın kapsamıdır. İndirme ve C# Editor callback'leri üçüncü taraf kod çalıştırır.
4. Yalnız bu kopyaya ait Claude Code proje MCP kaydı; otomatik “bütün istemcileri yapılandır” kullanılmaz. HTTP loopback, LAN/uzak sunucu kapalı. Başlangıçta yalnız inceleme/Console/ekran yakalama; yazma ve keyfî C# çalıştırma çağrıları kullanılmaz. Bu çağrı politikası OS düzeyinde salt okunur sandbox değildir: eklenti Editor kullanıcısının dosya/kod yetkileriyle çalışır.

[Coplay güvenlik politikası](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/SECURITY.md) yerel loopback varsayılanını ve uzak uç için HTTPS/kimlik doğrulamasını belirtir. Ağ erişimini sınırlamak, Editor içindeki script/asset değiştirme yetkisini ortadan kaldırmaz.

## Küçük pilot ve geri alma

En çok 10 hedefli çağrı: doğru Editor/proje kimliğini oku → Garage sahnesinin GameObject ağacı → son Console hataları → F Garaj UI Toolkit panel/ağaç durumu → izin verilen mevcut kısa Garaj Play testi → 1280 ve 1920 Game View yakalama. UIDocument görünmüyorsa bu eksik açık kaydedilir; başarı diye kamera görüntüsü verilmez. Son aşamada yalnız atılabilir bir GameObject oluştur/sil denemesi için ayrı yazma izni gerekir.

Geri alma: yerel sunucuyu durdur, yalnız eklenen proje MCP girdisini kaldır, test kopyasının Packages manifest/lock değişimini başlangıç kopyasına geri döndür; asıl proje/oyuncu verilerine dokunma. `uv` yalnız bu pilot için kurulmuşsa kaldırılması ayrıca kullanıcı tercihidir.

Yazılım lisansı için ücret görünmüyor; Claude araç çağrıları mevcut abonelik kotasını tüketebilir. Bu değerlendirme kalan kota veya fatura garantisi değildir. Ücretli bulut, sponsor ürün, API anahtarı, ek kredi, Blender ve ML-Agents pilot kapsamında yoktur. **Yukarıdaki bileşenler ve izinler için Cem açık onay vermeden kurulum başlamaz.**
