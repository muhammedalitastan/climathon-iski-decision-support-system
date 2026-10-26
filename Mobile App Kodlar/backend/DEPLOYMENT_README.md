# İSKİ Saha Tekniker Backend - Yer İstasyonu Kurulumu

## Gereksinimler

1. **Node.js** (v18+)
   - İndir: https://nodejs.org/
   - LTS sürümünü indirin ve kurun
   - Kurulum sonrası terminal'de `node --version` kontrol edin

2. **Windows 10/11** (Yer istasyonu işletim sistemi)

## Kurulum Adımları

### 1. Paketi Yer İstasyonuna Kopyalayın
- `backend` klasörünü USB veya ağ üzerinden yer istasyonuna kopyalayın
- Örnek: `C:\ISKI\Backend\`

### 2. Node.js Kurulumu
1. https://nodejs.org/ adresinden LTS sürümünü indirin
2. Kurulumu çalıştırın (Next > Next > Install)
3. Kurulum bitince Command Prompt açın ve test edin:
   ```cmd
   node --version
   npm --version
   ```

### 3. Bağımlılıkları Yükleyin
1. Command Prompt'u açın
2. Backend klasörüne gidin:
   ```cmd
   cd C:\ISKI\Backend
   ```
3. Paketleri yükleyin:
   ```cmd
   npm install
   ```

### 4. Server'ı Başlatın
**Otomatik Başlatma (Önerilen):**
```cmd
start_server.bat
```

**Manuel Başlatma:**
```cmd
node server.js
```

### 5. QR Kodunu Alın
Server başladığında terminal'de QR kod ve JSON data görünecektir:
```
📱 MOBİL UYGULAMA İÇİN QR KOD:
QR Code JSON Data: {"server_url":"http://192.168.1.XX:5000"}
```

Bu QR kodu mobil uygulama ile taratın.

## Otomatik Başlatma (Windows Startup)

Server'ın Windows başladığında otomatik çalışması için:

1. `start_server.bat` dosyasının kısayolunu oluşturun
2. Kısayolu şu klasöre taşıyın:
   ```
   C:\Users\<Kullanıcı>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
   ```
3. Windows yeniden başladığında server otomatik çalışır

## Firewall Ayarları

Eğer mobil uygulama bağlanamazsa:
1. Windows Firewall > Gelişmiş Ayarlar
2. Gelen Kurallar > Yeni Kural
3. Port > TCP > 5000
4. İzin Ver

## Port Değiştirme (Gerekirse)

Eğer 5000 portu kullanımdaysa:
1. `server.js` dosyasını açın
2. `const PORT = 5000;` satırını bulun
3. İstediğiniz port'u yazın (örn: 3000)
4. Server'ı yeniden başlatın

## Sorun Giderme

**Server başlamıyor:**
- Node.js kurulu mu kontrol edin: `node --version`
- Port kullanımda mı kontrol edin: `netstat -ano | findstr :5000`
- Log'ları kontrol edin

**Mobil uygulama bağlanamıyor:**
- Yer istasyonu ve telefon aynı Wi-Fi ağında mı?
- Firewall 5000 port'unu engelliyor mu?
- Mobil uygulamada QR kodu tekrar taratın

**QR kod görünmüyor:**
- Terminal'de hata mesajı var mı kontrol edin
- `npm install` komutunu tekrar çalıştırın

## API Endpoints

- `GET http://<IP>:5000/api/scada/analysis` - Aktif iş emri
- `POST http://<IP>:5000/api/scada/confirm` - Fotoğraf gönderme
- `GET http://<IP>:5000/api/qr` - QR kod görüntüleme
- `POST http://<IP>:5000/api/scada/simulate` - Test iş emri
- `GET http://<IP>:5000/api/health` - Sağlık kontrolü

## Güvenlik

- API Key: `iski_field_mobile_secret_2026`
- Bu key'i production'da değiştirmeyi unutmayın
- `server.js` dosyasında `API_KEY` değişkenini güncelleyin

## Destek

Sorular için: [İletişim Bilgileri]
