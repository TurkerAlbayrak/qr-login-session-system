# QR Login Session System (QR Kod ile Gerçek Zamanlı Giriş)

Bu proje, WhatsApp Web, Discord veya Binance gibi platformlarda kullanılan **"QR Kod ile Hızlı Giriş" (QR Code Authentication)** mimarisinin sıfırdan, production-ready (canlı ortama yakın) mantıkla geliştirilmiş bir kopyasıdır. 

Sistem; masaüstü tarayıcısında (web) oluşturulan boş bir oturum kimliğinin, mobil cihaz tarafından yetkilendirilmesiyle web tarafının anında (gerçek zamanlı) sisteme giriş yapmasını sağlar.

---

## Özellikler

- **Gerçek Zamanlı İletişim:** Socket.IO kullanılarak mobil cihazdan onay verildiği an web sayfası sayfayı yenilemeden direkt içeri girer.
- **Dinamik QR Kodlar:** QR kodların içerisine sadece bir UUID (token) değil, direkt onaylama sayfasının tam URL'i yerleştirilmiştir. Kodu okutan cihaz anında onay ekranına gider.
- **Güvenli Token Yönetimi:** Her oluşturulan QR token sadece 60 saniye geçerlidir. Süresi dolan tokenlar otomatik geçersiz olur ve tek kullanımlıktır (is_used kontrolü).
- **Sıfır Kurulum (Zero-Config) Veritabanı:** Altyapı, kuruluma gerek kalmaması için MySQL yerine **SQLite** kullanacak şekilde tasarlandı. Tablolar sunucu başlatıldığında otomatik oluşur.

---

## Kullanılan Teknolojiler

- **Backend:** Node.js, Express.js
- **Real-Time (WebSockets):** Socket.IO
- **Veritabanı:** SQLite (sqlite, sqlite3 kütüphaneleri)
- **Yardımcı Araçlar:** `qrcode` (QR base64 üretimi), `uuid` (Tahmin edilemez token üretimi), `cors`.
- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (Eklentisiz, saf kod)

---

## Proje Klasör Yapısı

```text
c:\qrsessionsystem\
 ┣ 📂public/
 ┃ ┣ 📜index.html       # Web tarafı login ekranı ve QR kodun gösterildiği yer
 ┃ ┣ 📜mobile.html      # QR kod telefondan okutulduğunda açılan onaylama ekranı
 ┃ ┗ 📜dashboard.html   # Giriş başarılı olduktan sonra yönlendirilen özel sayfa
 ┣ 📜server.js          # REST API'ler, Socket.IO odaları ve genel sunucu mantığı
 ┣ 📜db.js              # SQLite veritabanı bağlantısı ve otomatik tablo kurulumu
 ┣ 📜database.sql       # (Yedek/Referans) MySQL için eski tablo oluşturma şeması
 ┣ 📜package.json       # Node.js bağımlılıkları
 ┗ 📜.env               # Port ve konfigürasyon (Çevresel değişkenler)
```

---

## Kurulum ve Çalıştırma

Projenin bilgisayarınızda çalışması için Node.js'in kurulu olması gerekir.

1. **Bağımlılıkları Yükleyin:**
   Terminali açın ve projenin olduğu klasörde şu komutu çalıştırın:
   ```bash
   npm install
   ```

2. **Sunucuyu Başlatın:**
   ```bash
   npm start
   ```
   > *Sunucu başladığında `database.sqlite` dosyası otomatik oluşturulur ve "testuser" (Şifre: 123456) otomatik olarak veritabanına eklenir.*

---

## Sistemi Nasıl Test Edebilirsiniz?

### Yöntem 1: Aynı Bilgisayarda Sekmelerle (Simülasyon)
1. Tarayıcınızda `http://localhost:3000` adresini açın.
2. QR kodun göründüğünden emin olun.
3. Yeni bir sekmede (telefonu simüle etmek için) `http://localhost:3000/mobile.html` adresini açın.
4. İlk sekmedeki QR kod ekranda yenilendiğinde URL'e düşen tokeni almak yerine, ilk sekmede sayfayı yenileyin. Backend konsolunda basılan veya Network sekmesinde göreceğiniz `qrToken` değerini kopyalayıp mobile.html içindeki gizli inputu görünür yaparak yapıştırabilirsiniz. (Daha kolayı Yöntem 2'dir).

### Yöntem 2: Gerçek Bir Akıllı Telefon İle (Gerçek Deneyim)
1. Sunucuyu başlattığınız bilgisayar ile telefonunuz **aynı WiFi (yerel ağ)** üzerinde olmalıdır.
2. Bilgisayarınızın yerel IP adresini bulun (Örn: `192.168.1.15`).
3. Bilgisayar tarayıcısından `http://192.168.1.15:3000` adresine girin.
4. Telefonunuzun normal kamera uygulamasını açın ve bilgisayar ekranındaki QR koda tutun.
5. Ekrana düşen linke (Örn: http://192.168.1.15:3000/mobile.html?token=...) tıklayın.
6. Telefonda açılan ekranda "Girişi Onayla" tuşuna basın.
7. Bilgisayar ekranınızın kendi kendine saniyeler içinde "Dashboard" paneline geçtiğini göreceksiniz.

---

## Sistemin Arka Plan Mantığı (Nasıl Çalışıyor?)

1. **İstek (Web):** `index.html` açıldığında backend'den bir token ister.
2. **Üretim (Backend):** Backend rastgele bir `uuid` üretir, 60 saniyelik ömür biçer ve veritabanına `user_id = null` olarak kaydeder.
3. **Bekleyiş (Web):** Web sayfası kendine özel bu token (oda) ismiyle bir Socket.IO kanalına abone olur ve beklemeye başlar.
4. **Okutma (Mobil):** Kullanıcı mobil cihazıyla kodu okutur. Mobil cihaz `/api/auth/qr-verify` adresine şifre ve token ile POST isteği atar.
5. **Doğrulama ve Eşleştirme (Backend):** Backend kullanıcının şifresini doğrular. Sonra tokenin süresinin geçip geçmediğine bakar. Her şey doğruysa tokenin `user_id` kısmına bu kullanıcının ID'sini yazar.
6. **Gerçek Zamanlı Tetikleme (Socket.IO):** Backend, bu token (oda) kanalına dinleyen web sayfasına `login-success` sinyali ve kullanıcı bilgilerini iletir. Web sayfası yönlenir.

---

## Geliştirme Önerileri (Production'a Çıkmadan Önce)

Eğer bu sistemi gerçek bir canlı sunucuya kurmak isterseniz:
1. `mobile.html` dosyasındaki `<input type="text" value="testuser">` kısmındaki `value` değerlerini silin. Kullanıcılar kendi şifrelerini elle girmelidir.
2. Gerçek bir sistemde, mobil uygulamada/mobil sitede kullanıcının zaten aktif bir oturumu (Session/JWT) olur. Bu nedenle QR okutulduğunda kullanıcıdan şifre girmesi istenmez, sistem kimin okuttuğunu arkadan anlar ve sadece "Onaylıyor musunuz? (Evet/Hayır)" ekranı çıkartılır.
3. Veritabanındaki `password_hash` kısmı, mutlaka `bcryptjs` gibi bir kütüphane ile hash'lenerek şifrelenmeli ve düz metin olarak tutulmamalıdır.
4. HTTPS (SSL Sertifikası) zorunlu tutulmalıdır ki, ağdaki token verileri dinlenemesin.
