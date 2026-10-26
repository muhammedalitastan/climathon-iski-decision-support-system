# İSKİ Saha Tekniker Mobil Uygulaması

Flutter tabanlı mobil uygulama ve Node.js backend ile saha teknisyenleri için iş emri yönetim sistemi.

## Özellikler

- ✅ QR kod ile dinamik sunucu bağlantısı
- ✅ İş emri görüntüleme ve yönetme
- ✅ Fotoğraf ile saha teyidi
- ✅ 30 saniyede bir otomatik polling
- ✅ Device ID ile cihaz takibi
- ✅ API key güvenliği

## Kurulum

### Mobil Uygulama (Flutter)

```bash
# Bağımlılıkları yükleyin
flutter pub get

# APK build
flutter build apk --release

# Emülatörde çalıştırma
flutter run
```

### Backend (Node.js)

```bash
# Bağımlılıkları yükleyin
cd backend
npm install

# .env dosyası oluşturun
cp .env.example .env
# .env dosyasını düzenleyin ve API_KEY girin

# Server'ı başlatın
npm start
```

## Yapılandırma

### Backend (.env)

```env
PORT=5000
API_KEY=your_secure_api_key_here
```

### Mobil Uygulama

Mobil uygulama QR kod taramadan önce API key'i ayarlamalı:

```dart
// lib/services/api_service.dart
ApiService.apiKey = 'your_api_key_here';
```

**Önemli:** API key'i production'da güvenli bir şekilde saklayın (environment variable, secure storage, vb.)

## Kullanım

### 1. Backend'i Başlatın

```bash
cd backend
node server.js
```

Backend başladığında QR kod terminal'de görünecek.

### 2. Mobil Uygulamayı Bağlayın

1. Mobil uygulamayı açın
2. Sağ üstteki QR ikonuna basın
3. Backend terminal'deki QR kodu taratın
4. Bağlantı kurulacak

### 3. İş Emri Oluşturma

Backend'de veya dashboard'dan iş emri oluşturun:
```bash
POST /api/incidents/create
```

### 4. Mobil Uygulama ile İş Emrini Görüntüleme

Mobil uygulama 30 saniyede bir otomatik olarak iş emirlerini kontrol eder. Manuel refresh de kullanılabilir.

## API Endpoints

### Backend

- `GET /api/scada/analysis` - Aktif iş emrini getir
- `GET /api/mobile/incidents` - Açık iş emirlerini getir
- `POST /api/scada/confirm` - İş emrini fotoğrafla teyit et
- `GET /api/qr` - QR kod görüntüle
- `POST /api/incidents/create` - İş emri oluştur

## Güvenlik

- API key ile endpoint koruması
- Device ID ile cihaz takibi
- CORS enabled
- Environment variable kullanımı

## Deployment

### Yer İstasyonu Deployment

Backend'i yer istasyonuna taşımak için:

1. `backend/` klasörünü kopyalayın
2. Node.js kurun
3. `npm install` çalıştırın
4. `.env` dosyası oluşturun
5. `start_server.bat` ile başlatın

Detaylı bilgi için `backend/DEPLOYMENT_README.md` dosyasına bakın.

## Lisans

MIT License
