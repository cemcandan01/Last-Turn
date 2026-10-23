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

## 6. iPhone'da kurulu uygulamada Google girişi için (bir kez)

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

## Oyunda nasıl görünür

- İlk açılışta hesap sessizce açılır (Misafir). İlerleme buluta yazılır.
- **Profil** ekranında "Hesap" satırı: durum (Misafir / Google / E-posta · Bulutta / Eşitleniyor / İnternet gelince
  gönderilecek) ve düğmeler: **Google ile bağlan**, **E-posta ile**, bağlıysa **Çıkış**.
- Başka cihazda: oyunu aç → Profil → aynı Google hesabıyla (ya da aynı e-posta ve şifreyle) bağlan → ilerleme gelir.
  İki cihazın ilerlemesi birleşir: XP, yıldız ve kazanılan paranın büyüğü, satın alınanların hepsi; rekorların iyisi.
- İnternet yokken oyun normal çalışır; değişiklik internet gelince gönderilir.
- Çıkış: bu cihazdaki ilerleme kalır, oyun yeni bir misafir hesapla sürer.
- **Yeni oyuncu olarak başla** (Profil, iki dokunuşla onaylı): bu cihazda her şey sıfırlanır (XP, yıldız, para, araçlar,
  rekorlar, profil sayaçları; ayarlar kalır), oyun yeniden açılır ve yeni misafir hesapla sıfırdan başlar. Google ya da
  e-postaya bağlı hesabın ilerlemesi bulutta kalır (sonra yeniden bağlanınca gelir); misafir hesabınki kaybolur.
  Sıfırdan başladıktan sonra **başka bir Google hesabıyla** bağlanırsan o hesap da sıfırdan açılır.

## Geliştirici notu

- Yapılandırma: `src/bulut/ayar.ts` (`FIREBASE_AYAR`; proje `last-turn-35ca0`). Otomatik tarayıcı testlerinde
  (`navigator.webdriver`) bulut bağlanmaz. Boşken Firebase kodu derlemede ayrı parçadır ve önbelleğe
  alınmaz, hiç indirilmez; ağ isteği yok, hesap satırı görünmez.
- Kod: `src/bulut/hesap.ts` (arayüz API'si, tembel yükleme), `esitleme.ts` (birleştirme, gecikmeli yazma, kuyruk),
  `firebase.ts` (Auth + Firestore Lite), arayüz `src/arayuz/hesap-ui.ts`. Belge: `users/{uid}`.
- Google girişi yardımcısı (`__/auth/*`) derlemede projenin `firebaseapp.com` adresinden indirilir (`vite.config.ts →
  firebaseYardimci`, GitHub Actions'ta). Varsa `authDomain` oyunun kendi adresi olur; kurulu iPhone uygulamasında
  yönlendirme (redirect), başka yerde açılır pencere (popup) kullanılır.
- Kuralları değiştirince 5. adım tekrarlanır (Actions ile yayın için hizmet hesabı anahtarı gerekir; şimdilik elle).
