# Unity MCP salt okunur pilot değerlendirmesi — 6 Kasım 2026

Öneri: **önce yalnız CoplayDev/unity-mcp, ayrı test kopyasında ve yerel bağlantıyla**. Bu oturumda hiçbir MCP paketi, sunucu veya istemci ayarı kurulmadı/değiştirilmedi; üçüncü taraf kod çalıştırılmadı. Çalışan bağlantı/pilot başarısı iddia edilmez.

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
