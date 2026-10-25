# Firebase: çevrimiçi hesap ve bulut kaydı

Oyun ilerlemesi (XP, seviye, yıldızlar, para, satın alınan araçlar, kişisel rekorlar) Firebase'de saklanır; aynı hesapla
başka cihazda (ileride Unity sürümünde de) açılır. Firebase ayarlanmadan oyun bugünkü gibi yalnız telefonda kayıtla
çalışır. Aşağıdaki adımlar bir kez yapılır (~15 dk). Hepsi tarayıcıdan, kod gerekmez.

## 1. Proje aç

1. https://console.firebase.google.com adresine Google hesabınla gir.
2. **Proje oluştur** (Create a project) → ad: `last-turn` → devam.
3. Google Analytics sorusunda **kapalı** seç (gerekmez) → **Proje oluştur**.

## 2. Web uygulaması ekle ve ayarları gönder

1. Proje ana sayfasında **</>** (Web) simgesine bas.
2. Takma ad: `Last Turn`. "Firebase Hosting" kutusunu **işaretleme** → **Uygulamayı kaydet**.
3. Ekranda `const firebaseConfig = { apiKey: "...", authDomain: "...", ... }` görünür. Bu kutunun tamamını kopyala ve
   **yönetmen sohbetine yapıştır**. Gerisini biz yaparız (değerler `src/bulut/ayar.ts` dosyasına girer).
   Bu değerler gizli değildir, paylaşmak güvenlidir; korumayı 5. adımdaki kurallar yapar.
   Kaçırırsan: sol üstte dişli → **Proje ayarları** → aşağıda "Uygulamalarınız" → `Last Turn` → "SDK kurulumu ve
   yapılandırması" → **Config**.

## 3. Giriş yollarını aç

1. Sol menü → **Derleme (Build) → Authentication** → **Başlayın**.
2. **Oturum açma yöntemi** (Sign-in method) sekmesi:
   - **Anonim** (Anonymous) → Etkinleştir → Kaydet. (İlk açılışta sessiz hesap; oyuncu hiçbir şey yapmaz.)
   - **Google** → Etkinleştir → "Proje destek e-postası" olarak kendi e-postanı seç → Kaydet.
   - **E-posta/Şifre** (Email/Password) → yalnız ilk anahtarı etkinleştir ("E-posta bağlantısı" kapalı kalsın) → Kaydet.
3. **Ayarlar** (Settings) sekmesi → **Yetkili alan adları** (Authorized domains) → **Alan adı ekle** →
   `cemcandan01.github.io` → Ekle.

## 4. Veritabanını aç

1. Sol menü → **Derleme → Firestore Database** → **Veritabanı oluştur**.
2. Sürüm sorulursa **Standard**. Konum: **eur3 (Europe)**. (Sonradan değişmez.)
3. **Üretim modunda başlat** (Start in production mode) → Oluştur.

## 5. Güvenlik kurallarını yayınla

1. Firestore Database → **Kurallar** (Rules) sekmesi.
2. Oradaki metnin tamamını sil.
3. https://github.com/cemcandan01/Last-Turn/blob/gelistirme/firestore.rules adresini aç → sağ üstte **Raw** →
   hepsini kopyala → Firebase'deki kutuya yapıştır → **Yayınla** (Publish).

Kurallar: her oyuncu yalnız kendi kaydını okur ve yazar; alanlar ve sayılar sınırlı; XP ve kazanılan para azalmaz,
satın alma silinmez. Kurallar değişirse bu adım yeniden yapılır (yönetmen haber verir).

**Modifiye (0.5.21):** takılı parçalar da hesaba kaydedilir (belgede `parca` alanı). Bunun için 5. adımı bir kez daha
yap (kuralların yeni hâlini yapıştır → Yayınla). Yayınlanana kadar oyun bozulmaz: bulut parça alanını reddederse kayıt
onsuz gider, takılı parçalar yalnız o cihazda kalır; yayınlandıktan sonra oyunu bir kez açınca buluta da yazılır.

## 6. iPhone'da kurulu uygulamada Google girişi için (bir kez)

**GitHub Pages notu (0.5.27):** uzantısız `__/auth/iframe` ve `handler` dosyaları bu sunucuda
`application/octet-stream` olarak geliyor (iframe: 439 bayt). iPhone bunları sayfa yerine indirilen dosya
olarak açabiliyor. Yalnız dosyanın var olması yetmez: oyun her iki HTML uç noktasının `text/html` türünde,
attachment başlığı olmadan sunulduğunu kontrol eder. Uygun değilse Firebase'in kendi alan adını ve popup
yolunu kullanır; indirilen dosyaya dönüşen yerel iframe seçilmez. SDK çözücüsü, eski redirect/link kayıtlarında
argument-error oluşmaması için korunur. Yerel kayıt silinmez.

Aşağıdaki aynı kökenli yönlendirme adımları **ancak yardımcıları doğru HTML türüyle sunabilen hosting'de**
geçerlidir. Google Cloud URI ayarı tek başına GitHub Pages'in MIME türünü değiştirmez. Kurulu iPhone'da popup
Google girişi ayrıca gerçek cihazda denenmelidir; e-posta girişi aynı kalır.

Ana ekrana kurulu uygulamada Google girişi, giriş sayfasının oyunun kendi adresinde olmasını ister (Safari
kısıtlaması). Bunun için Google'a o adresi tanıtmak gerekir:

1. https://console.cloud.google.com/apis/credentials adresini aç; üstteki proje seçiciden `last-turn` projesini seç.
2. **OAuth 2.0 İstemci Kimlikleri** altında **Web client (auto created by Google Service)** → aç.
3. **Yetkili JavaScript kaynakları** → URI ekle: `https://cemcandan01.github.io`
4. **Yetkili yönlendirme URI'leri** → iki URI ekle:
   - `https://cemcandan01.github.io/Last-Turn/__/auth/handler`
   - `https://cemcandan01.github.io/Last-Turn/dev/__/auth/handler`
5. **Kaydet**. (Etkisi birkaç dakika sürebilir.)

Bu adım yapılmazsa Google girişi bilgisayarda/Safari sekmesinde çalışır, kurulu uygulamada "E-posta ile" bağlanmak
her zaman çalışır.

## 7. Admin yap (her şey açık hesap)

Admin yetkisi oyunda değil Firebase'de verilir; oyundan kimse kendini admin yapamaz.

1. Oyunda admin olacak hesapla gir (ör. Google ile bağlan). **Profil** → "Hesap kimliği" satırı → **Kopyala**.
2. https://console.firebase.google.com → `last-turn` projesi → **Firestore Database** → **Veriler** (Data) sekmesi.
3. **Koleksiyon başlat** (Start collection) → Koleksiyon kimliği: `admins` → İleri.
4. **Belge kimliği** (Document ID): kopyaladığın hesap kimliğini yapıştır (otomatik kimlik düğmesine basma).
5. Alan ekle: Alan `admin`, tür **boolean**, değer **true** → **Kaydet**.
   (İkinci admin eklemek için `admins` koleksiyonunda **Belge ekle** ile aynı adımlar.)
6. **5. adımı yeniden yap**: kurallar admin için güncellendi; `firestore.rules`'un yeni hâlini yapıştırıp **Yayınla**.
7. Oyunu kapatıp aç → Profil'de hesap satırında **Admin** yazar ve kesikli çerçeveli **Admin** paneli görünür.

Admin panelinde: **Her şey açık** (bütün pist ve araçlar açık görünür; kaydı değiştirmez, "Kapalı" yapınca normal
oyuncunun gördüğünü görürsün), **+1000 / +10000 para**, **+100 / +1000 XP**, **Seviyeyi ayarla**, bir araç ya da pist
seç → **Aç / Kilitle**, **İlerlemeyi sıfırla** (iki dokunuşla; XP, yıldız, para, alımlar ve rekorlar sıfırlanır,
hesap kalır). Admin yalnız kendi kaydını değiştirir; başka oyuncunun kaydına dokunamaz. Adminliği kaldırmak için
`admins` koleksiyonundaki belgeyi sil.

## 8. Sıfır seviye test hesabı ve hesap değiştirme

Yeni oyuncunun ne gördüğünü denemek için ayrı bir hesap (bir kez):

1. Profil → **Hesap değiştir** → **+ Başka hesap** → **E-posta ile giriş** → **Hesabım yok → Yeni hesap**: e-posta
   olarak Gmail adresinin **+test** eklenmiş hâlini yaz (ör. `adın+test@gmail.com`; posta aynı gelen kutusuna düşer,
   Firebase ayrı hesap sayar) → şifre (en az 6) → şifre tekrar → **Hesap oluştur**. Bu hesap Seviye 1, 0 parayla
   sıfırdan başlar; asıl hesabın ilerlemesi bulutta kalır. iPhone şifreyi kaydetmeyi önerir: kabul et.

Sonra iki hesap arasında geçiş (2-3 dokunuş): Profil → **Hesap değiştir** → listede hesaba dokun.
- Google hesabı: Google hesap seçicisi açılır, hesabı seç.
- E-posta hesabı: e-posta dolu gelir, şifre alanında iPhone'un önerdiği şifreye dokun → **Giriş yap**.

Geçişte önce şu anki hesabın son ilerlemesi buluta gönderilir, sonra bu cihazdaki ilerleme seçilen hesabınkiyle
**değiştirilir**: iki hesabın ilerlemesi hiçbir zaman birleşmez. Admin hesabına geçince admin paneli ve "her şey açık"
kipi açılır, test hesabına geçince kapanır. İnternet yokken ya da giriş olmazsa (yanlış şifre, seçici kapatıldı) geçiş
yapılmaz; hangi hesapta kalındığı yazar. Listede **✕** hesabı yalnız bu cihazın listesinden kaldırır (hesap ve
ilerlemesi bulutta kalır). Listede şifre ya da giriş belirteci saklanmaz; yalnız e-posta, tür, seviye ve admin rozeti.

## Oyunda nasıl görünür

- İlk açılışta hesap sessizce açılır (Misafir). İlerleme buluta yazılır.
- **Profil** ekranında "Hesap" satırı: durum (Misafir / Google / E-posta · Bulutta / Eşitleniyor / İnternet gelince
  gönderilecek) ve düğmeler: misafirken **Google ile bağlan**, **E-posta ile**; her zaman **Hesap değiştir**.
- **E-posta ile:** ilk kez bağlanırken **Yeni hesap oluştur** (e-posta, şifre, şifre tekrar; en az 6 karakter). Başka
  cihazda ya da Hesap değiştir → **+ Başka hesap** → **E-posta ile giriş**; şifre unutulursa **Şifremi unuttum** sıfırlama
  e-postası gönderir. Sonuç hesap satırının altında yazar ("Bağlandı: … · İlerlemen bulutta" ya da hata ve kodu).
- Başka cihazda: oyunu aç → Profil → aynı Google hesabıyla (ya da aynı e-posta ve şifreyle) gir → hesabın ilerlemesi
  gelir (o cihazda misafirken oynananlar yerine). Aynı hesapla iki cihazda oynanınca ikisinin ilerlemesi birleşir:
  XP, yıldız ve kazanılan paranın büyüğü, satın alınanların hepsi; rekorların iyisi.
- Birleşme yalnız iki durumda: aynı hesabın iki cihazı ve misafirken **yeni** bir hesap açmak (misafirin ilerlemesi
  yeni hesaba geçer). Var olan başka bir hesaba girmek hep o hesabın kaydını yükler.
- İnternet yokken oyun normal çalışır; değişiklik internet gelince gönderilir.
- **Hesap değiştir → Misafir olarak devam (yeni)** (iki dokunuşla onaylı): bu cihazda her şey sıfırlanır (XP, yıldız, para, araçlar,
  rekorlar, profil sayaçları; ayarlar kalır), oyun yeniden açılır ve yeni misafir hesapla sıfırdan başlar. Google ya da
  e-postaya bağlı hesabın ilerlemesi bulutta kalır (sonra yeniden bağlanınca gelir); misafir hesabınki kaybolur.

## Geliştirici notu

- Yapılandırma: `src/bulut/ayar.ts` (`FIREBASE_AYAR`; proje `last-turn-35ca0`). Otomatik tarayıcı testlerinde
  (`navigator.webdriver`) bulut bağlanmaz. Boşken Firebase kodu derlemede ayrı parçadır ve önbelleğe
  alınmaz, hiç indirilmez; ağ isteği yok, hesap satırı görünmez.
- Kod: `src/bulut/hesap.ts` (arayüz API'si, tembel yükleme), `esitleme.ts` (birleştirme, gecikmeli yazma, kuyruk),
  `firebase.ts` (Auth + Firestore Lite), arayüz `src/arayuz/hesap-ui.ts`. Belge: `users/{uid}`.
- Google girişi yardımcısı (`__/auth/*`) derlemede projenin `firebaseapp.com` adresinden indirilir (`vite.config.ts →
  firebaseYardimci`, GitHub Actions'ta). İki HTML uç noktası doğru türde sunuluyorsa `authDomain` oyunun kendi adresi olur; kurulu iPhone uygulamasında
  yönlendirme (redirect), başka yerde açılır pencere (popup) kullanılır.
- Kuralları değiştirince 5. adım tekrarlanır (Actions ile yayın için hizmet hesabı anahtarı gerekir; şimdilik elle).
