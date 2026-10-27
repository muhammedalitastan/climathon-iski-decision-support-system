# Saha Tekniker Mobil Uygulaması - Kapsamlı Kurulum Rehberi

## APK İndirme Linki:
https://drive.google.com/file/d/1H3LeasOwtvzdOSNOH3cQJkipT7BWhqq0/view?usp=sharing
## 📋 İçindekiler

1. [Proje Özeti](#proje-özeti)
2. [Sistem Gereksinimleri](#sistem-gereksinimleri)
3. [Proje Yapısı](#proje-yapısı)
4. [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
5. [Backend Kurulumu](#backend-kurulumu)
6. [Flutter Mobil Uygulama Kurulumu](#flutter-mobil-uygulama-kurulumu)
7. [Konfigürasyon](#konfigürasyon)
8. [Sistem Çalıştırma](#sistem-çalıştırma)
9. [Kullanım Rehberi](#kullanım-rehberi)
10. [API Dokümantasyonu](#api-dokümantasyonu)
11. [Deployment](#deployment)
12. [Sorun Giderme](#sorun-giderme)
13. [Geliştirme Notları](#geliştirme-notları)

---

## 🎯 Proje Özeti

**Proje Adı:** Saha Tekniker Mobil Uygulaması

**Açıklama:** Flutter tabanlı mobil uygulama ve Node.js backend ile saha teknisyenleri için iş emri yönetim sistemi. QR kod ile dinamik sunucu bağlantısı, fotoğraf ile saha teyidi ve gerçek zamanlı iş emri takibi sağlar.

**Temel Özellikler:**
- ✅ QR kod ile dinamik sunucu bağlantısı
- ✅ İş emri görüntüleme ve yönetme
- ✅ Fotoğraf ile saha teyidi
- ✅ 30 saniyede bir otomatik polling
- ✅ Device ID ile cihaz takibi
- ✅ API key güvenliği
- ✅ Google Maps navigasyon entegrasyonu
- ✅ Adım adım kontrol listesi
- ✅ Dark mode UI

**Teknoloji Stack:**
- **Frontend:** Flutter (Dart)
- **Backend:** Node.js + Express
- **Database:** JSON file-based (opsiyonel MongoDB)
- **Deploys:** Android APK, iOS IPA

---

## 💻 Sistem Gereksinimleri

### Geliştirme Ortamı Gereksinimleri

**İşletim Sistemi:**
- Windows 10/11 (Android geliştirme için)
- macOS 10.15+ (Android + iOS geliştirme için)
- Linux (Ubuntu 20.04+) (Android geliştirme için)

**Donanım:**
- CPU: 4 çekirdekli işlemci (önerilen: 8+ çekirdek)
- RAM: 8 GB (önerilen: 16 GB)
- Depolama: 15 GB boş alan
- USB portu (fiziksel cihaz test için)

**Yazılım:**
- [Node.js](https://nodejs.org/) v18.0.0 veya üzeri (v22.14.0 önerilir)
- [npm](https://www.npmjs.com/) (Node.js ile birlikte gelir)
- [Flutter SDK](https://flutter.dev/docs/get-started/install) v3.0.0 veya üzeri
- [Android Studio](https://developer.android.com/studio) (Android geliştirme için)
- [Xcode](https://developer.apple.com/xcode/) (iOS geliştirme için, sadece macOS)
- [Git](https://git-scm.com/) (opsiyonel, versiyon kontrolü için)

### Mobil Cihaz Gereksinimleri (Kullanıcılar İçin)

**Android:**
- Android 5.0 (Lollipop) veya üzeri
- Kamera izni
- İnternet bağlantısı
- Depolama izni (fotoğraf için)

**iOS:**
- iOS 12.0 veya üzeri
- Kamera izni
- İnternet bağlantısı
- Depolama izni

---

## 📁 Proje Yapısı

```
Mobile App Kodlar/
├── backend/                       # Node.js Backend
│   ├── uploads/                   # Yüklenen fotoğraflar
│   ├── server.js                  # Express sunucusu
│   ├── start_server.bat          # Windows başlatma scripti
│   ├── package.json              # Backend bağımlılıkları
│   └── DEPLOYMENT_README.md      # Deployment rehberi
├── lib/                          # Flutter kaynak kodları
│   ├── main.dart                 # Ana Flutter uygulaması
│   ├── services/
│   │   └── api_service.dart      # API servisleri
│   └── views/
│       └── qr_scanner_screen.dart  # QR tarayıcı ekranı
├── android/                      # Android native kodları
│   └── app/
│       ├── build.gradle           # Android build konfigürasyonu
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── kotlin/.../MainActivity.kt
├── ios/                          # iOS native kodları (sadece macOS)
│   └── Runner/
│       └── Info.plist
├── pubspec.yaml                  # Flutter bağımlılıkları
├── .env.example                  # Environment variable örneği
└── README.md                     # Bu dosya
```

---

## 🔧 Geliştirme Ortamı Kurulumu

### Adım 1: Node.js Kurulumu

1. [Node.js resmi web sitesinden](https://nodejs.org/) LTS sürümünü indirin (v22.14.0 önerilir)
2. Kurulum dosyasını çalıştırın
3. Kurulum sırasında "Add to PATH" seçeneğini işaretleyin
4. Kurulumu doğrulayın:

```bash
node --version
npm --version
```

**Beklenen Çıktı:**
```
v22.14.0
10.x.x
```

### Adım 2: Flutter SDK Kurulumu

**Windows için:**
1. [Flutter resmi web sitesinden](https://flutter.dev/docs/get-started/install/windows) Flutter SDK'yı indirin
2. Zip dosyasını bir klasöre çıkarın (örn: `C:\flutter`)
3. Flutter'ı PATH'e ekleyin:
   - Sistem ortam değişkenlerine gidin
   - PATH'e `C:\flutter\bin` ekleyin
4. Kurulumu doğrulayın:

```bash
flutter --version
```

**Beklenen Çıktı:**
```
Flutter 3.27.0 • channel stable
Dart 3.6.0
```

### Adım 3: Android Studio Kurulumu

1. [Android Studio'yu indirin ve kurun](https://developer.android.com/studio)
2. Android Studio'yu açın ve setup wizard'ı tamamlayın
3. "SDK Manager"dan şunları yükleyin:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools (34.0.0 veya üzeri)
   - Android Emulator
   - Android SDK Platform 34 (veya en son sürüm)
4. Flutter dependencies kontrolü:

```bash
flutter doctor
```

**Tüm öğelerin yeşil ✓ işareti olduğundan emin olun.**

**Sorun varsa:**
- "Android toolchain" kırmızıysa: Android SDK'yı doğru kurun
- "Android licenses" kırmızıysa: `flutter doctor --android-licenses` çalıştırın
- "Connected device" kırmızıysa: Emulator başlatın veya fiziksel cihaz bağlayın

### Adım 4: Git Kurulumu (Opsiyonel)

```bash
# Git kurulumunu doğrulayın
git --version
```

### Adım 5: Proje Dizinine Gitme

```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar"
```

---

## 🖥️ Backend Kurulumu

### Adım 1: Backend Bağımlılıklarını Yükleme

```bash
cd backend
npm install
```

**Bu komut şunları yükler:**
```
- express: Web framework
- cors: Cross-Origin Resource Sharing
- multer: Dosya yükleme middleware'i
- body-parser: Request body parsing
- qrcode: QR kod oluşturma
- ip: IP adresi işlemleri
- nodemon: Geliştirme için otomatik yeniden başlatma (dev dependency)
```

**Kurulum Başarılı mı? Kontrol:**
```bash
npm list --depth=0
```

### Adım 2: Environment Configuration

`.env.example` dosyasını kopyalayın:

```bash
copy .env.example .env
```

**.env dosyasını düzenleyin:**
```env
PORT=5000
API_KEY=iski_field_mobile_secret_2026
```

**Not:** Production ortamında güçlü bir API key kullanın.

### Adım 3: uploads Klasörünü Oluşturma

Backend otomatik olarak oluşturur, ancak manuel olarak da oluşturabilirsiniz:

```bash
mkdir uploads
```

### Adım 4: Backend'i Test Etme

```bash
npm start
```

**Beklenen Çıktı:**
```
==================================================
İSKİ Saha Tekniker Backend Server
==================================================
Server running on http://localhost:5000
Local Network URL: http://192.168.1.XXX:5000
==================================================
API Endpoints:
  GET  /api/scada/analysis  - Aktif iş emrini getir
  POST /api/scada/confirm  - İş emrini fotoğrafla teyit et
  GET  /api/scada/audit    - Audit logları getir
  POST /api/scada/simulate - Yeni iş emri simüle et
  GET  /api/health         - Sağlık kontrolü
  GET  /api/qr             - QR kodunu getir
==================================================
```

Backend çalışıyorsa, `http://localhost:5000/api/health` adresinden yanıt almalısınız.

---

## 📱 Flutter Mobil Uygulama Kurulumu

### Adım 1: Flutter Bağımlılıklarını Yükleme

```bash
cd ..
flutter pub get
```

**Bu komut şunları yükler:**
```
- flutter: Flutter SDK
- http: HTTP istekleri
- image_picker: Kamera/galeri entegrasyonu
- url_launcher: URL/Maps açma
- mobile_scanner: QR kod tarama
- shared_preferences: Local storage
```

**Kurulum Başarılı mı? Kontrol:**
```bash
flutter pub deps
```

### Adım 2: Android Permissions

Android için kamera ve depolama izinleri zaten `AndroidManifest.xml`'de tanımlı. Kontrol edin:

**Dosya:** `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

### Adım 3: iOS Permissions (Sadece macOS)

**Dosya:** `ios/Runner/Info.plist`

```xml
<key>NSCameraUsageDescription</key>
<string>Kamera erişimi iş emri fotoğrafı çekmek için gereklidir</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Fotoğraf galerisi erişimi iş emri fotoğrafı seçmek için gereklidir</string>
```

### Adım 4: API Service Konfigürasyonu

**Dosya:** `lib/services/api_service.dart`

API base URL ve API key'i düzenleyin:

```dart
class ApiService {
  static String baseUrl = '';  // QR kod ile otomatik doldurulur
  static String apiKey = '';  // API key (QR kod ile otomatik doldurulur)

  // ... diğer kodlar
}
```

**Not:** Base URL ve API key QR kod ile otomatik doldurulur. Manuel olarak girmeyin.

---

## ⚙️ Konfigürasyon

### Backend Konfigürasyonu

**.env dosyası:**
```env
PORT=5000
API_KEY=iski_field_mobile_secret_2026
```

**server.js içinde:**
```javascript
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.API_KEY || '';
```

### Mobile App Konfigürasyonu

**lib/services/api_service.dart:**
```dart
static String baseUrl = '';  // QR kod ile otomatik doldurulur
static String apiKey = '';  // QR kod ile otomatik doldurulur
```

**Network Configuration:**
- Base URL ve API key QR kod ile otomatik doldurulur
- Manuel olarak girmeyin
- Backend çalıştırın ve QR kodu taratın

---

## 🚀 Sistem Çalıştırma

### Yöntem 1: Emulator ile Çalıştırma

**Terminal 1 - Backend:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar\backend"
npm start
```

**Terminal 2 - Flutter Emulator:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar"

# Mevcut emülatörleri listele
flutter emulators

# Emülatör başlat
flutter emulators --launch <emulator_id>

# Uygulamayı çalıştır
flutter run
```

**Yöntem 2: Fiziksel Cihaz ile Çalıştırma**

1. Android cihazı USB ile bağlayın
2. USB Debugging'i aktif edin:
   - Ayarlar > Hakkında > Yazılım Bilgisi (7 kez tıklayın)
   - Geliştirici Seçenekleri > USB Hata Ayıklama
3. Cihazı tanıma:

```bash
flutter devices
```

**Beklenen Çıktı:**
```
1 device found:
SM-G991B • samsung • android-arm64  • Android 13 (API 33)
```

4. Uygulamayı çalıştırın:

```bash
flutter run
```

**Yöntem 3: Windows Script ile Başlatma**

Mobile App backend için hazır script:

```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar\backend"
start_server.bat
```

**Hot Reload:**
Flutter uygulaması çalışırken değişiklikler otomatik olarak yüklenir:
- Terminalde `r` tuşuna basın: Hot reload
- Terminalde `R` tuşuna basın: Hot restart
- Terminalde `q` tuşuna basın: Quit

---

## 📖 Kullanım Rehberi

### 1. Backend'i Başlatma

```bash
cd backend
npm start
```

Backend başladığında terminal'de QR kod ve network bilgileri görünecek:

```
📱 MOBİL UYGULAMA İÇİN QR KOD:
==================================================
QR Code Data URL (Base64):
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...

QR Code JSON Data:
{"server_url":"http://192.168.1.XXX:5000"}
==================================================
💡 İpucu: Bu QR kodu mobil uygulama ile taratın
💡 Veya: http://localhost:5000/api/qr adresinden QR kodu görüntüleyin
==================================================
```

### 2. Mobil Uygulamayı Bağlama

**Yöntem 1: QR Kod ile Bağlantı**
1. Mobil uygulamayı açın
2. Sağ üstteki QR ikonuna basın (📷)
3. Backend terminal'deki QR kodu taratın
4. Bağlantı kurulacak

**Yöntem 2: Manuel Konfigürasyon**
1. `lib/services/api_service.dart` dosyasını düzenleyin
2. `baseUrl` ve `apiKey` değerlerini girin
3. Uygulamayı yeniden başlatın

### 3. İş Emri Oluşturma

**Backend'de Simülasyon:**
```bash
curl -X POST http://localhost:5000/api/scada/simulate
```

**Response:**
```json
{
  "success": true,
  "message": "Yeni iş emri simüle edildi",
  "incident": {
    "incident_id": "INC-2024-123",
    "location": "KD-402-A - Moda Caddesi Kesişimi",
    "anomaly_type": "Yüksek debi ve düşük basınç",
    "severity": "CRITICAL"
  }
}
```

### 4. Mobil Uygulama ile İş Emrini Görüntüleme

Mobil uygulama 30 saniyede bir otomatik olarak iş emirlerini kontrol eder. Manuel refresh de kullanılabilir (sağ üstteki 🔄 ikonu).

**Ekran Bileşenleri:**
- **Header:** Teknisyer bilgisi ve bağlantı durumu
- **Alert Banner:** Acil iş emri uyarısı
- **Incident Card:** İş emri detayları ve AI reçetesi
- **Checklist:** Adım adım kontrol listesi
- **Audit Trail Module:** Fotoğraf teyidi ve not

### 5. Fotoğraf ile Saha Teyidi

1. "Fotoğraf Çek" butonuna basın
2. Kamera açılır
3. Fotoğraf çekin
4. Teknisyen notunu girin
5. "Gönder" butonuna basın

**Response:**
```json
{
  "success": true,
  "message": "İş emri fotoğrafla teyit edildi ve audit log veritabanına kaydedildi",
  "audit_log": {
    "incident_id": "INC-2024-123",
    "photo_path": "incident-1234567890.jpg",
    "confirmed_at": "2024-01-15T10:30:00Z"
  }
}
```

### 6. Google Maps Navigasyon

"Navigasyonu Başlat" butonuna basın, Google Maps otomatik olarak açılır ve konuma yönlendirir.

---

## 📡 API Dokümantasyonu

### Backend API Endpoints

#### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Backend çalışıyor",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

#### Aktif İş Emri Getir
```
GET /api/scada/analysis
Headers: X-Device-ID: <device_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incident_id": "INC-2024-001",
    "location": "KD-402-A - Moda Caddesi Kesişimi",
    "coordinates": {
      "latitude": 40.9855,
      "longitude": 29.0270
    },
    "anomaly_type": "Yüksek debi ve düşük basınç",
    "severity": "CRITICAL",
    "timestamp": "2024-01-15T02:30:00Z",
    "pipe_material": "1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)",
    "ai_recipe": [
      "Boru Malzemesi: 1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)",
      "Adım 1: Moda Caddesi kesişimindeki VANA-12 konumuna ulaşın.",
      "Adım 2 (Kritik YZ Talimatı): VANA-12'yi %20 kademeli adımlarla (her adımda 5 dk bekleyerek) kapatın. Ani kapatma yapmayın!"
    ]
  }
}
```

#### İş Emri Teyidi
```
POST /api/scada/confirm
Headers:
  X-API-KEY: <api_key>
Content-Type: multipart/form-data

Body:
  incident_id: string
  technician_note: string
  photo: file (image/jpeg, image/png)
```

**Response:**
```json
{
  "success": true,
  "message": "İş emri fotoğrafla teyit edildi ve audit log veritabanına kaydedildi",
  "audit_log": {
    "incident_id": "INC-2024-001",
    "technician_note": "VANA-12 %20 kademeli adımlarla kapatıldı",
    "photo_path": "incident-1234567890.jpg",
    "confirmed_at": "2024-01-15T10:30:00Z",
    "status": "CONFIRMED"
  }
}
```

#### Audit Logları Getir
```
GET /api/scada/audit
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "logs": [
    {
      "incident_id": "INC-2024-001",
      "technician_note": "VANA-12 kapatıldı",
      "photo_path": "incident-1234567890.jpg",
      "confirmed_at": "2024-01-15T10:30:00Z",
      "status": "CONFIRMED"
    }
  ]
}
```

#### Yeni İş Emri Simüle Et
```
POST /api/scada/simulate
```

**Response:**
```json
{
  "success": true,
  "message": "Yeni iş emri simüle edildi",
  "incident": {
    "incident_id": "INC-2024-123",
    "location": "KD-402-A - Moda Caddesi Kesişimi",
    "anomaly_type": "Yüksek debi ve düşük basınç",
    "severity": "CRITICAL"
  }
}
```

#### QR Kod
```
GET /api/qr
Response: PNG image
```

### Mobile App API Service

**lib/services/api_service.dart**

```dart
class ApiService {
  static String baseUrl = 'http://192.168.1.100:5000';
  static String apiKey = 'iski_field_mobile_secret_2026';

  // Aktif iş emrini getir
  static Future<Map<String, dynamic>> getActiveIncident() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/scada/analysis'),
      headers: {'X-Device-ID': 'device-123'},
    );
    return json.decode(response.body);
  }

  // İş emrini teyit et
  static Future<Map<String, dynamic>> sendFieldConfirmation({
    required String incidentId,
    required String technicianNote,
    required File imageFile,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/scada/confirm'),
    );
    request.headers['X-API-KEY'] = apiKey;
    request.fields['incident_id'] = incidentId;
    request.fields['technician_note'] = technicianNote;
    request.files.add(await http.MultipartFile.fromPath('photo', imageFile.path));

    final response = await request.send();
    final responseData = await response.stream.bytesToString();
    return json.decode(responseData);
  }
}
```

---

## 🚀 Deployment

### Yer İstasyonu Deployment

Backend'i yer istasyonuna taşımak için:

**Adım 1: Dosyaları Kopyalama**
```bash
# Tüm backend klasörünü kopyalayın
xcopy backend "C:\YerIstasyonu\backend" /E /I
```

**Adım 2: Node.js Kurulumu**
1. Yer istasyonuna Node.js kurun
2. Kurulumu doğrulayın: `node --version`

**Adım 3: Bağımlılıkları Yükleme**
```bash
cd C:\YerIstasyonu\backend
npm install
```

**Adım 4: Konfigürasyon**
```bash
# .env dosyası oluştur
notepad .env
```

**.env içeriği:**
```env
PORT=5000
API_KEY=production_secure_api_key_here
```

**Adım 5: Otomatik Başlatma**

**Windows Service olarak:**
1. [NSSM (Non-Sucking Service Manager)](https://nssm.cc/) indirin
2. Service oluştur:
   ```bash
   nssm install ISKIMobileBackend
   nssm set ISKIMobileBackend Application C:\Program Files\nodejs\node.exe
   nssm set ISKIMobileBackend AppDirectory C:\YerIstasyonu\backend
   nssm set ISKIMobileBackend AppParameters server.js
   nssm start ISKIMobileBackend
   ```

**Veya Task Scheduler ile:**
1. Task Scheduler'ı açın
2. "Create Basic Task" seçin
3. Trigger: "At startup"
4. Action: "Start a program"
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\YerIstasyonu\backend\server.js`
   - Start in: `C:\YerIstasyonu\backend`

**Detaylı bilgi için `backend/DEPLOYMENT_README.md` dosyasına bakın.**

### Mobil Uygulama Deployment

#### Android APK Build

**Release APK:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar"
flutter build apk --release
```

**APK Konumu:**
```
build/app/outputs/flutter-apk/app-release.apk
```

**App Bundle (Google Play için):**
```bash
flutter build appbundle --release
```

**App Bundle Konumu:**
```
build/app/outputs/bundle/release/app-release.aab
```

#### iOS IPA Build (macOS only)

**Release IPA:**
```bash
flutter build ios --release
```

**Xcode ile:**
1. `ios/Runner.xcworkspace` dosyasını Xcode ile açın
2. Signing & Capabilities'da provisioning profile seçin
3. Product > Archive
4. Distribute App seçin

#### TestFlight / Google Play Store

**Google Play Store:**
1. [Google Play Console](https://play.google.com/console)'da uygulama oluştur
2. App Bundle'ı yükleyin
3. Store listing'i tamamlayın
4. Review'a gönderin

**TestFlight:**
1. Xcode ile Archive oluştur
2. Distribute App > TestFlight
3. TestFlight'a yükleyin
4. Testers'a davet gönderin

---

## 🔧 Sorun Giderme

### Backend Sorunları

**Sorun: "Port 5000 already in use"**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Veya farklı port kullan
set PORT=5001
npm start
```

**Sorun: "Cannot find module 'express'"**
```bash
cd backend
npm install
```

**Sorun: "API Key invalid"**
- `.env` dosyasındaki `API_KEY`'i kontrol edin
- Mobil uygulama `api_service.dart`'daki `apiKey` ile eşleştiğinden emin olun

**Sorun: "File upload failed"**
- `uploads/` klasörünün varlığını kontrol edin
- Dosya boyutu 10MB'ı geçmiyor
- Dosya formatı resim (jpeg, jpg, png, gif)

### Flutter Sorunları

**Sorun: "Flutter command not found"**
```bash
# Flutter'ı PATH'e ekleyin
# Sistem ortam değişkenlerine gidin
# PATH'e C:\flutter\bin ekleyin
```

**Sorun: "No connected devices"**
```bash
flutter devices
# Emulator başlatın veya fiziksel cihaz bağlayın
flutter emulators --launch <emulator_id>
```

**Sorun: "Build failed"**
```bash
flutter clean
flutter pub get
flutter run
```

**Sorun: "Camera permission denied"**
- Android: `AndroidManifest.xml`'de izinleri kontrol edin
- Cihaz ayarlarından kamera izni verin
- iOS: `Info.plist`'de izinleri kontrol edin

**Sorun: "Network connection failed"**
- `api_service.dart`'daki `baseUrl`'i kontrol edin
- Backend'in çalıştığını doğrulayın
- Aynı Wi-Fi ağındaysanız IP adresini kullanın
- Firewall'da port 5000'i açın

**Sorun: "Hot reload not working"**
- Terminalde `r` tuşuna basın
- Veya uygulamayı yeniden başlatın: `flutter run`

### Diğer Sorunlar

**Sorun: "QR code not scanning"**
- `mobile_scanner` paketinin kurulu olduğunu kontrol edin
- Kamera izni verildiğinden emin olun
- Işıklandırma yeterli mi?
- QR kod net mi?

**Sorun: "Google Maps not opening"**
- `url_launcher` paketinin kurulu olduğunu kontrol edin
- İnternet bağlantısı var mı?
- Google Maps uygulaması yüklü mü?

---

## 📝 Geliştirme Notları

### Code Style

**Dart/Flutter:**
- 2 space indentation
- CamelCase for variables
- PascalCase for classes
- Comments for complex logic
- Prefer const for widgets

**JavaScript/Node.js:**
- 2 space indentation
- Single quotes
- Async/await kullanın
- JSDoc comments ekleyin

### Git Workflow

```bash
# Branch oluştur
git checkout -b feature/yeni-ozellik

# Değişiklikleri yap
git add .
git commit -m "Yeni özellik eklendi"

# Push et
git push origin feature/yeni-ozellik
```

### Testing

**Backend Test:**
```bash
cd backend
npm test  # Test dosyaları yoksa oluşturun
```

**Flutter Test:**
```bash
flutter test
```

**Integration Test:**
```bash
flutter drive --target=test_driver/app.dart
```

### Debugging

**Flutter Debug:**
```bash
flutter run --debug
# Terminalde 'd' tuşuna basın: Debug console açılır
```

**Backend Debug:**
```bash
cd backend
npm run dev  # nodemon ile otomatik yeniden başlatma
```

### Performance Optimization

1. **Flutter:**
   - `const` widget kullanın
   - ListView.builder kullanın
   - Images optimize edin (webp formatı)

2. **Backend:**
   - Rate limiting kullanın
   - Caching implement edin
   - Upload limitleri ayarlayın

---

## 🔒 Security Notes

1. **API Keys:** Production'da güçlü API keys kullanın
2. **HTTPS:** Production'da SSL sertifikası kullanın
3. **Authentication:** JWT veya OAuth implement edin
4. **Rate Limiting:** DDoS koruması aktif
5. **File Upload:** Sadece resim dosyalarına izin ver
6. **Data Encryption:** Hassas verileri şifreleyin

---

## 📞 İletişim ve Destek

**Geliştirme Ekibi:** Climathon Yarışma Takımı

**Versiyon:** v1.0.0

**Son Güncelleme:** Ekim 2026

**Sorun Bildirme:** GitHub Issues veya proje yöneticisine e-posta

---

## 📄 Lisans

MIT License

---

## 🙏 Teşekkürler

Bu proje saha teknisyenleri için iş emri yönetimini dijitalleştirmek amacıyla geliştirilmiştir. Flutter ve Node.js teknolojileri kullanılarak modern ve kullanıcı dostu bir mobil uygulama sunulmuştur.

---

**Son Güncelleme:** 2026-10-26
**Belge Versiyonu:** 2.0.0
