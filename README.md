# Su Şebekesi Akıllı Karar Destek Sistemi - Kapsamlı Kurulum Rehberi

## 📋 İçindekiler

1. [Proje Özeti](#proje-özeti)
2. [Sistem Gereksinimleri](#sistem-gereksinimleri)
3. [Proje Yapısı](#proje-yapısı)
4. [Yer İstasyonu Kurulumu](#yer-istasyonu-kurulumu)
5. [Mobile App Kurulumu](#mobile-app-kurulumu)
6. [Ollama ve LLM Kurulumu](#ollama-ve-llm-kurulumu)
7. [Veri Dosyaları Hazırlama](#veri-dosyaları-hazırlama)
8. [Sistem Çalıştırma](#sistem-çalıştırma)
9. [API Dokümantasyonu](#api-dokümantasyonu)
10. [Sorun Giderme](#sorun-giderme)
11. [Geliştirme Notları](#geliştirme-notları)

---

## 🎯 Proje Özeti

**Proje Adı:** Su Şebekesi Akıllı Karar Destek Sistemi (Decision Support System)

**Açıklama:** Su şebekesindeki kılcal sızıntıları erken tespit etmek, yapay zekâ destekli müdahale reçeteleri üretmek ve saha teknisyenlerinin doğrulama süreçlerini dijitalleştiren entegre bir sistem.

**Sistem Bileşenleri:**
- **Yer İstasyonu (Web/Desktop):** SCADA veri analizi, AI reçetesi üretimi, dashboard görüntüleme
- **Mobile App (Flutter):** Saha teknisyenleri için iş emri yönetimi, fotoğraf teyidi, QR kod ile bağlantı
- **AI Servisi (Ollama):** Yerel LLM ile müdahale reçetesi üretimi

---

## 💻 Sistem Gereksinimleri

### Minimum Donanım Gereksinimleri

**Yer İstasyonu İçin:**
- CPU: 4 çekirdekli işlemci (Intel i5 veya üzeri / AMD Ryzen 5 veya üzeri)
- RAM: 8 GB (önerilen: 16 GB)
- Depolama: 20 GB boş alan
- İşletim Sistemi: Windows 10/11, macOS 10.15+, veya Linux (Ubuntu 20.04+)

**Mobile App Geliştirme İçin:**
- CPU: 4 çekirdekli işlemci
- RAM: 8 GB (önerilen: 16 GB)
- Depolama: 10 GB boş alan
- İşletim Sistemi: Windows 10/11, macOS 10.15+, veya Linux

**Ollama LLM İçin (Yer İstasyonunda):**
- CPU: 6 çekirdekli işlemci (önerilen: 8+ çekirdek)
- RAM: 16 GB (önerilen: 32 GB)
- GPU: NVIDIA GPU 6GB+ VRAM (opsiyonel ama önerilen)
- Depolama: 30 GB boş alan (model dosyaları için)

### Yazılım Gereksinimleri

**Tüm Sistemler İçin Ortak:**
- [Node.js](https://nodejs.org/) v18.0.0 veya üzeri (v22.14.0 önerilir)
- [npm](https://www.npmjs.com/) (Node.js ile birlikte gelir)
- [Git](https://git-scm.com/) (versiyon kontrolü için)

**Yer İstasyonu İçin Ek:**
- [Ollama](https://ollama.com/) (LLM çalıştırmak için)
- [MongoDB](https://www.mongodb.com/) v6.0+ (opsiyonel, production için)

**Mobile App Geliştirme İçin Ek:**
- [Flutter SDK](https://flutter.dev/docs/get-started/install) v3.0.0 veya üzeri
- [Android Studio](https://developer.android.com/studio) (Android geliştirme için)
- [Xcode](https://developer.apple.com/xcode/) (iOS geliştirme için, sadece macOS)
- [Visual Studio Code](https://code.visualstudio.com/) (önerilen IDE)

---

## 📁 Proje Yapısı

```
Climathon Yarışma/
├── Yer İstasyonu Kodlar/              # Yer İstasyonu (Web/Desktop)
│   ├── backend/                      # Node.js Backend
│   │   ├── data/                     # SCADA ve katalog verileri
│   │   │   ├── scada_data.json       # SCADA zaman serisi verileri
│   │   │   └── boru_altyapi_katalogu.txt  # Boru teknik kataloğu
│   │   ├── services/                 # Backend servisleri
│   │   │   ├── anomalyService.js     # Anomali tespit servisi
│   │   │   └── ragService.js         # RAG + LLM reçete servisi
│   │   ├── middleware/               # Middleware'ler
│   │   │   └── auth.js               # API key doğrulama
│   │   ├── uploads/                  # Yüklenen fotoğraflar
│   │   ├── audit_logs.json           # Audit log veritabanı (JSON fallback)
│   │   ├── server.js                 # Express sunucusu
│   │   └── package.json              # Backend bağımlılıkları
│   ├── frontend/                     # React Frontend
│   │   ├── src/
│   │   │   ├── App.jsx               # Ana React bileşeni
│   │   │   ├── components/           # React bileşenleri
│   │   │   │   └── QRPairingModal.jsx  # QR kod eşleştirme modalı
│   │   │   ├── index.css             # Tailwind CSS + Leaflet CSS
│   │   │   └── main.jsx              # React entry point
│   │   ├── package.json              # Frontend bağımlılıkları
│   │   ├── vite.config.js            # Vite konfigürasyonu
│   │   └── tailwind.config.js        # Tailwind CSS konfigürasyonu
│   └── PROJE_RAPORU.md               # Proje detaylı raporu
│
└── Mobile App Kodlar/                # Mobile App (Flutter)
    ├── backend/                      # Mobile App Backend (Ayrı Node.js server)
    │   ├── uploads/                  # Yüklenen fotoğraflar
    │   ├── server.js                 # Express sunucusu
    │   ├── start_server.bat          # Windows başlatma scripti
    │   └── package.json              # Backend bağımlılıkları
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
    └── README.md                     (mevcut, güncellenecek)
```

---

## 🖥️ Yer İstasyonu Kurulumu

### Adım 1: Node.js Kurulumu

1. [Node.js resmi web sitesinden](https://nodejs.org/) LTS sürümünü indirin (v22.14.0 önerilir)
2. Kurulum dosyasını çalıştırın
3. Kurulum sırasında "Add to PATH" seçeneğini işaretleyin
4. Kurulumun tamamlandığını doğrulayın:

```bash
node --version
npm --version
```

**Beklenen Çıktı:**
```
v22.14.0
10.x.x
```

### Adım 2: Proje Dizinine Gitme

```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Yer İstasyonu Kodlar"
```

### Adım 3: Backend Kurulumu

```bash
cd backend
npm install
```

**Bu komut şunları yapar:**
- `package.json` dosyasındaki tüm bağımlılıkları indirir
- `node_modules` klasörünü oluşturur
- Backend'in çalışması için gerekli paketleri yükler:

  ```
  - express: Web framework
  - cors: Cross-Origin Resource Sharing
  - multer: Dosya yükleme middleware'i
  - axios: HTTP client
  - express-rate-limit: Rate limiting
  - ip: IP adresi işlemleri
  - nodemon: Geliştirme için otomatik yeniden başlatma (dev dependency)
  ```

**Kurulum Başarılı mı? Kontrol:**
```bash
npm list --depth=0
```

### Adım 4: Frontend Kurulumu

```bash
cd ../frontend
npm install
```

**Bu komut şunları yapar:**
- React, Vite ve tüm frontend bağımlılıklarını indirir
- `node_modules` klasörünü oluşturur
- Frontend'in çalışması için gerekli paketleri yükler:

  ```
  - react: UI framework
  - react-dom: React DOM işlemleri
  - vite: Build tool ve dev server
  - tailwindcss: CSS framework
  - leaflet: Harita kütüphanesi
  - react-leaflet: React için Leaflet wrapper
  - recharts: Grafik kütüphanesi
  - lucide-react: İkon kütüphanesi
  - axios: HTTP client
  - qrcode.react: QR kod oluşturma
  ```

**Kurulum Başarılı mı? Kontrol:**
```bash
npm list --depth=0
```

### Adım 5: Environment Variables (Opsiyonel)

Production ortamı için `.env` dosyası oluşturun:

```bash
cd ../backend
# .env dosyası oluştur (notepad ile)
notepad .env
```

**.env dosyası içeriği:**
```env
PORT=5000
MOBILE_API_KEY=iski_field_mobile_secret_2026
MONGODB_URL=mongodb://localhost:27017/iski_audit
```

**Not:** Development ortamında bu dosya gerekli değildir. Backend varsayılan değerleri kullanır.

---

## 📱 Mobile App Kurulumu

### Adım 1: Flutter SDK Kurulumu

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

### Adım 2: Android Studio Kurulumu

1. [Android Studio'yu indirin ve kurun](https://developer.android.com/studio)
2. Android Studio'yu açın ve "SDK Manager"dan şunları yükleyin:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android Emulator
3. Flutter dependencies kontrolü:

```bash
flutter doctor
```

**Tüm öğelerin yeşil ✓ işareti olduğundan emin olun.**

### Adım 3: Mobile App Projesine Gitme

```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar"
```

### Adım 4: Mobile App Backend Kurulumu

Mobile App'in kendi ayrı bir backend'i var:

```bash
cd backend
npm install
```

**Bağımlılıklar:**
```
- express: Web framework
- cors: Cross-Origin Resource Sharing
- multer: Dosya yükleme
- body-parser: Request body parsing
- qrcode: QR kod oluşturma
- ip: IP adresi işlemleri
```

### Adım 5: Flutter Bağımlılıklarını Yükleme

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

### Adım 6: Environment Configuration

`.env.example` dosyasını kopyalayın:

```bash
copy .env.example .env
```

**.env dosyasını düzenleyin:**
```env
API_BASE_URL=http://192.168.1.100:5000
API_KEY=iski_field_mobile_secret_2026
```

**Not:** `API_BASE_URL`'yi yer istasyonunuzun IP adresi ile değiştirin.

---

## 🤖 Ollama ve LLM Kurulumu

Yer istasyonunda AI reçetesi üretmek için Ollama kurulumu gerekli.

### Adım 1: Ollama Kurulumu

**Windows için:**
1. [Ollama resmi web sitesinden](https://ollama.com/download) Windows installer'ı indirin
2. Kurulum dosyasını çalıştırın
3. Kurulum tamamlandıktan sonra komut satırını açın

**Kurulum Doğrulama:**
```bash
ollama --version
```

### Adım 2: Llama 3.2 Modelini İndirme

Proje llama3.2 modelini kullanıyor:

```bash
ollama pull llama3.2
```

**Bu komut şunları yapar:**
- Llama 3.2 model dosyalarını indirir (~4GB)
- Modeli Ollama veritabanına kaydeder
- İndirme süresi internet hızınıza bağlıdır (5-30 dakika)

**Alternatif Modeller:**
Daha hızlı yanıt için daha küçük modeller kullanabilirsiniz:
```bash
ollama pull llama3.2:3b       # Daha küçük ve hızlı
ollama pull qwen2.5:14b      # Daha büyük ve akıllı (raporda belirtilmiş)
```

**Not:** `ragService.js` dosyasında model adını değiştirmeniz gerekir:
```javascript
const OLLAMA_MODEL = 'llama3.2';  // Burayı kullanılan modelle değiştirin
```

### Adım 3: Ollama Servisini Başlatma

Ollama arka planda çalışmalıdır:

**Windows için:**
```bash
# Yeni bir terminal açın
ollama serve
```

**Veya Windows Service olarak çalıştırın:**
- Ollama kurulumunda otomatik olarak Windows service olarak kurulur
- Task Manager'da "ollama" servisinin çalıştığını doğrulayın

**Servis Doğrulama:**
```bash
curl http://localhost:11434/api/tags
```

**Beklenen Çıktı:**
```json
{
  "models": [
    {
      "name": "llama3.2",
      "modified_at": "2024-XX-XX",
      "size": 4000000000
    }
  ]
}
```

### Adım 4: Model Testi

Modelin doğru çalıştığını test edin:

```bash
ollama run llama3.2 "Merhaba, İSKİ su şebekesi hakkında ne biliyorsun?"
```

---

## 📊 Veri Dosyaları Hazırlama

### SCADA Veri Dosyası

**Dosya Yeri:** `Yer İstasyonu Kodlar/backend/data/scada_data.json`

**Format Örneği:**
```json
{
  "scenarios": [
    {
      "scenario_id": "SCENARIO-001",
      "scenario_name": "Kadıköy Moda Sızıntı",
      "segment_id": "KD-402-A",
      "location_name": "Moda Caddesi Kesişimi",
      "coordinates": {
        "lat": 40.9855,
        "lng": 29.0270
      },
      "time_series": [
        {
          "timestamp": "2024-01-15T01:00:00Z",
          "debi_m3h": 85.5,
          "basinc_bar": 3.5
        },
        {
          "timestamp": "2024-01-15T02:30:00Z",
          "debi_m3h": 130.0,
          "basinc_bar": 1.2
        }
      ],
      "description": "Gece saatlerinde anomali tespiti"
    }
  ]
}
```

**Veri Yükleme (Opsiyonel):**
Eğer SCADA verisi mobil uygulamadan yüklenecekse:
1. Backend'i başlatın
2. Frontend'den `/api/upload/scada` endpoint'ini kullanın

### Boru Altyapı Kataloğu

**Dosya Yeri:** `Yer İstasyonu Kodlar/backend/data/boru_altyapi_katalogu.txt`

**Format Örneği:**
```
[SEGMENT_ID: KD-402-A]
İmalat / Döşeme Yılı: 1988
Boru Malzemesi: Döküm Demir
Boru Çapı (DN): DN300
Boru Tipi: Kılcal Boru
Vana Numarası: VANA-12
Koordinatlar: 40.9855° N, 29.0270° E
Özel Notlar: Kırılgan yapı, koç darbesi riski yüksek

[SEGMENT_ID: KD-403-B]
İmalat / Döşeme Yılı: 2005
Boru Malzemesi: HD-PE
Boru Çapı (DN): DN250
Boru Tipi: Basınç Borusu
Vana Numarası: VANA-15
Koordinatlar: 40.9900° N, 29.0300° E
Özel Notlar: Esnek yapı, basınç şoklarına dayanıklı
```

**Not:** RAG servisi bu katalogu segment bazlı arar ve AI reçetesi üretir.

---

## 🚀 Sistem Çalıştırma

### Yer İstasyonu Çalıştırma

**Yöntem 1: Ayrı Terminallerde Çalıştırma (Development)**

**Terminal 1 - Backend:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Yer İstasyonu Kodlar\backend"
npm start
```

**Beklenen Çıktı:**
```
✓ uploads/ klasörü oluşturuldu
✓ data/ klasörü oluşturuldu
ℹ MongoDB_URL tanımlı değil, JSON audit log kullanılacak
Server running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Yer İstasyonu Kodlar\frontend"
npm run dev
```

**Beklenen Çıktı:**
```
  VITE v5.0.8  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.100:3000/
```

**Terminal 3 - Ollama (Eğer otomatik başlamadıysa):**
```bash
ollama serve
```

**Yöntem 2: Development Mode (Otomatik Yeniden Başlatma)**

Backend için `nodemon` kullanın:
```bash
cd backend
npm run dev
```

### Mobile App Çalıştırma

**Yöntem 1: Emulator ile Çalıştırma**

**Terminal 1 - Mobile App Backend:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar\backend"
npm start
```

**Terminal 2 - Flutter Emulator:**
```bash
cd "C:\Climathon Yarışma\Yer İstasyonu Kodlar\Mobile App Kodlar"
flutter emulators
flutter emulators --launch <emulator_id>
flutter run
```

**Yöntem 2: Fiziksel Cihaz ile Çalıştırma**

1. Android cihazı USB ile bağlayın
2. USB Debugging'i aktif edin (Developer Options)
3. Cihazı tanıma:

```bash
flutter devices
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

### Sistem Akses Testi

**Yer İstasyonu Testi:**
1. Tarayıcıda `http://localhost:3000` açın
2. Dashboard yüklenmeli
3. SCADA analizi butonuna tıklayın
4. AI reçetesi üretilmeli

**Mobile App Testi:**
1. Mobil uygulama açın
2. QR kod tarayıcı ile yer istasyonu QR kodunu taratın
3. İş emri görünmeli
4. Fotoğraf çekip teyit edin

---

## 📡 API Dokümantasyonu

### Yer İstasyonu Backend API (Port 5000)

#### SCADA Anomali Analizi
```
GET /api/scada/analysis?scenario=<scenario_id>
```

**Response:**
```json
{
  "success": true,
  "anomaly_detected": true,
  "incident_id": "INC-20240115-001",
  "anomaly_data": {
    "segment_id": "KD-402-A",
    "debi_m3h": 130.0,
    "basinc_bar": 1.2,
    "risk_skoru": 88
  },
  "recipe": {
    "segment_id": "KD-402-A",
    "risk_skoru": "%88",
    "anomali_ozeti": "...",
    "boru_kunyesi": "1988 İmalat Yılı / Döküm Demir (DN300)",
    "gerekce": "...",
    "eylem_recetesi": "...",
    "saha_talimati": "..."
  }
}
```

#### Saha Fotoğraf Teyidi
```
POST /api/scada/confirm
Headers: X-API-KEY: <mobile_api_key>
Content-Type: multipart/form-data

Body:
- incident_id: string
- technician_note: string
- photo: file (image/jpeg, image/png)
```

**Response:**
```json
{
  "success": true,
  "message": "Saha müdahalesi başarıyla teyit edildi",
  "incident_id": "INC-20240115-001",
  "image_path": "/uploads/incident-1234567890.jpg"
}
```

#### Audit Log Listesi
```
GET /api/audit/logs
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "incident_id": "INC-20240115-001",
      "created_at": "2024-01-15T02:30:00Z",
      "status": "VERIFIED_AND_CLOSED",
      "image_path": "/uploads/incident-1234567890.jpg"
    }
  ]
}
```

#### Network Info (QR Kod için)
```
GET /api/system/network-info
```

**Response:**
```json
{
  "success": true,
  "server_url": "http://192.168.1.100:5000",
  "api_key": "iski_field_mobile_secret_2026",
  "hostname": "DESKTOP-XXXX",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Mobile App Backend API (Port 5000 - Ayrı)

#### Aktif İş Emri Getir
```
GET /api/scada/analysis
Headers: X-Device-ID: <device_id>
```

#### İş Emri Teyidi
```
POST /api/scada/confirm
Headers: X-API-KEY: <api_key>
Content-Type: multipart/form-data

Body:
- incident_id: string
- technician_note: string
- photo: file
```

#### QR Kod
```
GET /api/qr
Response: PNG image
```

---

## 🔧 Sorun Giderme

### Yer İstasyonu Sorunları

**Sorun: "Port 3000 already in use"**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Veya farklı port kullan
cd frontend
npm run dev -- --port 3001
```

**Sorun: "Ollama connection refused"**
```bash
# Ollama servisini başlatın
ollama serve

# Veya Windows service olarak kontrol edin
services.msc  # Ollama servisini başlatın
```

**Sorun: "Module not found"**
```bash
cd backend
npm install

cd ../frontend
npm install
```

**Sorun: "MongoDB connection failed"**
- MongoDB opsiyoneldir, JSON fallback kullanır
- MongoDB kullanmak istiyorsanız:
  ```bash
  # MongoDB'yi kurun ve başlatın
  # .env dosyasına ekleyin:
  MONGODB_URL=mongodb://localhost:27017/iski_audit
  ```

**Sorun: "AI reçetesi üretilmiyor"**
- Ollama servisinin çalıştığını doğrulayın
- Modelin indirildiğini kontrol edin:
  ```bash
  ollama list
  ```
- `ragService.js`'de model adını kontrol edin

### Mobile App Sorunları

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

**Sorun: "Network connection failed"**
- `.env` dosyasındaki `API_BASE_URL`'yi kontrol edin
- Yer istasyonu backend'inin çalıştığını doğrulayın
- Aynı Wi-Fi ağındaysanız IP adresini kullanın

**Sorun: "Camera permission denied"**
- Android: `AndroidManifest.xml`'de izinleri kontrol edin
- iOS: `Info.plist`'de izinleri kontrol edin
- Cihaz ayarlarından kamera izni verin

### Ollama Sorunları

**Sorun: "Model not found"**
```bash
ollama pull llama3.2
```

**Sorun: "Out of memory"**
- Daha küçük model kullanın:
  ```bash
  ollama pull llama3.2:3b
  ```
- Diğer uygulamaları kapatın
- RAM artırın

**Sorun: "Slow response"**
- GPU desteği için NVIDIA GPU kurulumu
- Küçük model kullanın
- Ollama konfigürasyonunu optimize edin

---

## 📝 Geliştirme Notları

### Code Style

**JavaScript/Node.js:**
- 2 space indentation
- Single quotes
- Async/await kullanın
- JSDoc comments ekleyin

**Flutter/Dart:**
- 2 space indentation
- CamelCase for variables
- PascalCase for classes
- Comments for complex logic

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

**Frontend Test:**
```bash
cd frontend
npm test  # Jest veya Vitest ile
```

**Flutter Test:**
```bash
flutter test
```

### Production Build

**Frontend Build:**
```bash
cd frontend
npm run build
# dist/ klasörüne deploy edin
```

**Flutter APK Build:**
```bash
flutter build apk --release
# build/app/outputs/flutter-apk/app-release.apk
```

**Flutter iOS Build (macOS only):**
```bash
flutter build ios --release
```

### Environment Variables Checklist

**Yer İstasyonu Backend (.env):**
```env
PORT=5000
MOBILE_API_KEY=iski_field_mobile_secret_2026
MONGODB_URL=mongodb://localhost:27017/iski_audit
```

**Mobile App (.env):**
```env
API_BASE_URL=http://192.168.1.100:5000
API_KEY=iski_field_mobile_secret_2026
```

### Security Notes

1. **API Keys:** Production'da güçlü API keys kullanın
2. **CORS:** Production'da domain whitelist kullanın
3. **Rate Limiting:** DDoS koruması aktif
4. **File Upload:** Sadece resim dosyalarına izin ver
5. **MongoDB:** Authentication aktif edin

### Performance Optimization

1. **Ollama:** GPU acceleration kullanın
2. **Frontend:** Lazy loading implement edin
3. **Backend:** Caching kullanın
4. **Database:** Index'leri optimize edin

---

## 📞 İletişim ve Destek

**Geliştirme Ekibi:** Climathon Yarışma Takımı

**Versiyon:** v1.0.0

**Son Güncelleme:** Ekim 2026

**Sorun Bildirme:** GitHub Issues veya proje yöneticisine e-posta

---

## 📄 Lisans

Bu proje Climathon Yarışması kapsamında geliştirilmiştir. Tüm hakları saklıdır.

---

## 🙏 Teşekkürler

Bu proje su şebekesi yönetimine katkıda bulunmak amacıyla geliştirilmiştir. Open-source teknolojiler (React, Flutter, Ollama) kullanılarak topluluk yararına bir çözüm sunulmuştur.

---

**Son Güncelleme:** 2026-10-26
**Belge Versiyonu:** 1.0.0
