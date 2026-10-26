# Mobil Uygulama - Dashboard Senkronizasyon Hatası

## Özet
Dashboard web arayüzünden iş emri oluşturulduğunda, mobil uygulama (QR ile okutulan telefon uygulaması) bu iş emrini göremiyor. Bu, saha teknisyenlerinin dashboard'dan oluşturulan iş emirlerini mobil cihazlarında alamamasına neden oluyor.

## Sorun Detayı

### Beklenen Davranış
1. Dashboard'dan "İş Emri Oluştur" butonuna tıklandığında
2. İş emri başarıyla oluşturulur (Backend: `POST /api/incidents/create`)
3. Mobil uygulama (QR ile eşleşmiş cihaz) otomatik olarak bu iş emrini almalı
4. Saha teknisyeni mobil uygulamada yeni iş emrini görmeli

### Gerçek Davranış
1. Dashboard'dan iş emri oluşturuluyor (Backend log: `✓ İş emri oluşturuldu: INC-20261025-XXX`)
2. Audit log'a kaydediliyor (`backend/audit_logs.json`)
3. Mobil uygulamada iş emri **görünmüyor**
4. Saha teknisyeni manuel olarak yenileme yapsa bile iş emri gelmiyor

## Teknik Analiz

### Backend Endpoint'leri
- **Dashboard İş Emri Oluşturma:** `POST /api/incidents/create`
  - Senaryo ID, segment ID, location name, priority, description alıyor
  - Audit log'a kaydediyor
  - Response: `{ success: true, incident: { incident_id, ... } }`

- **Audit Log Listeleme:** `GET /api/audit/logs`
  - Tüm audit logları döndürüyor
  - Dashboard'da kullanılıyor

### Olası Senkronizasyon Sorunları

#### 1. Mobil Uygulama Endpoint Farklılığı
Mobil uygulama muhtemelen farklı bir endpoint kullanıyor olabilir:
- Dashboard: `/api/incidents/create` (iş emri oluşturma)
- Mobil: Belki `/api/mobile/incidents` veya `/api/field/incidents` (iş emri çekme)

**Öneri:** Mobil uygulama ile dashboard aynı audit log endpoint'ini kullanmalı.

#### 2. Real-Time Sync Eksikliği
Şu an sistemde real-time senkronizasyon mekanizması yok:
- WebSocket yok
- Server-Sent Events (SSE) yok
- Mobil uygulama polling yapmıyor olabilir

**Öneri:** Real-time sync mekanizması eklenmeli:
- WebSocket ile dashboard'dan mobil uygulamaya push notification
- Veya mobil uygulama 30 saniyede bir polling ile `/api/audit/logs` endpoint'ini çağırmalı

#### 3. Audit Log Filtreleme
Mobil uygulama muhtemelen sadece kendi cihazına ait iş emirlerini görmeli:
- QR eşleşme ile device ID veya technician ID atanmalı
- Audit log endpoint'i device ID'ye göre filtreleme yapmalı

**Öneri:** `GET /api/audit/logs?device_id=XXX` endpoint'i eklenmeli.

#### 4. Mobil Uygulama API Entegrasyonu
Mobil uygulamanın hangi endpoint'leri kullandığı bilinmiyor:
- İş emri listeleme endpoint'i belki farklı
- Authentication mekanizması farklı olabilir

**Öneri:** Mobil uygulama API dokümantasyonu kontrol edilmeli.

## Önerilen Çözümler

### Çözüm 1: Unified Audit Log Endpoint (Öncelikli)
Mobil uygulama ile dashboard aynı endpoint'i kullanmalı:

```javascript
// Backend - GET /api/audit/logs
// Query parametreleri ile filtreleme
app.get('/api/audit/logs', optionalApiKey, (req, res) => {
    const { device_id, technician_id, limit = 50 } = req.query;
    
    let logs = auditLogs;
    
    // Device ID'ye göre filtrele
    if (device_id) {
        logs = logs.filter(log => log.device_id === device_id);
    }
    
    // Technician ID'ye göre filtrele
    if (technician_id) {
        logs = logs.filter(log => log.technician_id === technician_id);
    }
    
    // Son N log'u döndür
    logs = logs.slice(-limit);
    
    res.json({ success: true, logs });
});
```

### Çözüm 2: Real-Time Sync (WebSocket)
Dashboard'dan mobil uygulamaya anlık bildirim:

```javascript
// Backend - WebSocket server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5001 });

// Dashboard'da iş emri oluşturulduğunda
wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: 'new_incident',
            incident: newIncident
        }));
    }
});

// Mobil uygulama WebSocket bağlantısı
const ws = new WebSocket('ws://localhost:5001');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_incident') {
        // Yeni iş emrini göster
    }
};
```

### Çözüm 3: Polling (En Basit)
Mobil uygulama periyodik olarak audit logları çekmeli:

```javascript
// Mobil uygulama - 30 saniyede bir polling
setInterval(async () => {
    const response = await fetch('http://localhost:5000/api/audit/logs?device_id=MY_DEVICE_ID');
    const data = await response.json();
    
    // Yeni iş emirlerini kontrol et
    const newIncidents = data.logs.filter(log => 
        log.type === 'incident_created' && 
        !seenIncidents.includes(log.incident_id)
    );
    
    if (newIncidents.length > 0) {
        // Bildirim göster
    }
}, 30000);
```

### Çözüm 4: QR Eşleşme ile Device ID Atama
İş emri oluşturulurken device_id atanmalı:

```javascript
// Backend - POST /api/incidents/create
app.post('/api/incidents/create', optionalApiKey, (req, res) => {
    const { scenario_id, segment_id, location_name, priority, description, device_id } = req.body;
    
    const incident = {
        incident_id: `INC-${Date.now()}`,
        scenario_id,
        segment_id,
        location_name,
        priority,
        description,
        device_id: device_id || null, // Belirli bir cihaza atanabilir
        created_at: new Date().toISOString()
    };
    
    // Audit log'a kaydet
    auditLogs.push({
        type: 'incident_created',
        incident,
        timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, incident });
});
```

## Test Senaryoları

### Senaryo 1: Dashboard'dan İş Emri Oluşturma
1. Dashboard'da senaryo seç
2. "İş Emri Oluştur" butonuna tıkla
3. Mobil uygulamada iş emrini kontrol et
4. **Beklenen:** İş emri mobil uygulamada görünmeli
5. **Gerçek:** İş emri görünmüyor

### Senaryo 2: Mobil Uygulama Polling
1. Mobil uygulama açık
2. Dashboard'dan iş emri oluştur
3. 30 saniye bekle
4. Mobil uygulamayı yenile
5. **Beklenen:** İş emri görünmeli
6. **Gerçek:** İş emri görünmüyor

### Senaryo 3: Audit Log Endpoint Test
1. `curl http://localhost:5000/api/audit/logs` çalıştır
2. İş emri oluşturulduktan sonra tekrar çalıştır
3. **Beklenen:** Audit log'da yeni iş emri görünmeli
4. **Gerçek:** Audit log'da iş emri var (backend log'da görülüyor)

## Acil Eylem Planı

1. **Mobil uygulama API endpoint'lerini kontrol et**
   - Mobil uygulamanın hangi endpoint'leri kullandığını öğren
   - Dashboard ile aynı endpoint'i kullandığından emin ol

2. **Device ID mekanizması ekle**
   - QR eşleşme ile device_id ata
   - İş emri oluştururken device_id parametresi ekle
   - Audit log endpoint'inde device_id filtreleme ekle

3. **Real-time sync ekle (WebSocket veya polling)**
   - En basit çözüm: Mobil uygulama polling yapmalı
   - Uzun vadeli çözüm: WebSocket ile real-time sync

4. **Test et**
   - Dashboard'dan iş emri oluştur
   - Mobil uygulamada görünür mü kontrol et
   - Farklı device_id'ler ile test et

## İletişim Bilgileri
- Backend API: http://localhost:5000
- Dashboard: http://localhost:3000
- Mobil Uygulama: (QR ile eşleşmiş cihaz)
- Audit Log Dosyası: `backend/audit_logs.json`

## Ek Notlar
- Backend log'larında iş emri başarıyla oluşturuluyor
- Audit log'a kaydediliyor
- Sorun mobil uygulama ile backend arasındaki senkronizasyonda
- Real-time mekanizma eksik
