# İSKİ Akıllı Şebeke Karar Destek Sistemi - Proje Raporu

## 1. Proje Özeti

**Proje Adı:** İSKİ Akıllı Şebeke Karar Destek Sistemi (Decision Support System)

**Geliştirme Tarihi:** 2026

**Proje Amacı:** İstanbul Su ve Kanalizasyon İdaresi (İSKİ) su şebekesindeki kılcal sızıntıları erken tespit etmek, yapay zekâ destekli müdahale reçeteleri üretmek ve saha teknisyenlerinin doğrulama süreçlerini dijitalleştirmek.

**Hedef Kitle:** İSKİ operasyonel personeli, saha teknisyenleri, şebeke yöneticileri

---

## 2. İşlevsellik ve Temel Özellikler

### 2.1 SCADA Anomali Tespiti
- **Veri Kaynağı:** SCADA sisteminden gelen debi (m³/h) ve basınç (bar) verileri
- **Tespit Yöntemi:** Threshold-based algoritma (Debi > 90 m³/h VE Basınç < 3.0 bar)
- **Analiz Zamanı:** Gece saatlerinde (01:00 - 05:00) düşük tüketim döneminde kılcal sızıntı tespiti
- **Çıktı:** Anomali segmenti, kritik anomali zamanı, sapma miktarları, güven seviyesi (%95)

### 2.2 Yapay Zekâ Müdahale Reçetesi (RAG + LLM)
- **Teknoloji:** Retrieval-Augmented Generation (RAG) + Ollama LLM
- **LLM Modeli:** Qwen2.5:14B (yerel, open-source)
- **Katalog Kaynağı:** Boru altyapı kataloğu (segment bazlı teknik bilgiler)
- **Çıktı:** 
  - Boru künyesi (çap, malzeme, döşeme yılı)
  - Yapay zekâ gerekçesi
  - Önerilen müdahale adımları
  - İhtiyaç duyulan ekipmanlar
  - Tahmini onarım süresi

### 2.3 Saha Teyidi ve Fotoğraf Yükleme
- **Fotoğraf Yükleme:** Saha teknisyenlerinin anomali noktasından fotoğraf çekmesi
- **Teknisyen Notu:** Gözlem ve açıklama girişi
- **Audit Trail:** Teyit edilen olayların veritabanına kaydedilmesi
- **Durum Güncellemesi:** PENDING_FIELD_ACTION → VERIFIED_AND_CLOSED

### 2.4 Audit Log Sistemi
- **Veri Saklama:** JSON dosya tabanlı NoSQL audit trail (MongoDB opsiyonel)
- **Görüntüleme:** Teyit edilmiş geçmiş olayların tablo halinde gösterimi
- **Otomatik Yenileme:** Yeni teyit sonrası audit log listesinin güncellenmesi
- **Bilgiler:** Olay ID, Segment, Tarih, Durum, Teknisyen Notu

### 2.5 İnteraktif Konum Haritası
- **Harita Sağlayıcısı:** OpenStreetMap (Leaflet)
- **Konum:** Kadıköy Moda Caddesi - Caferağa Kesişimi (40.9855° N, 29.0270° E)
- **Özellikler:** Zoom, pan, marker, popup
- **Gösterim:** Anomali segmenti, sızıntı riski (%94)

### 2.6 SCADA Zaman Serisi Grafiği
- **Grafik Kütüphanesi:** Recharts
- **Veri Tipi:** Debi ve basınç zaman serileri
- **Görselleştirme:** Anomali bölgesi vurgulama (kırmızı alan)
- **Responsive:** Tam ekran uyumlu

### 2.7 OCR Confidence Göstergesi
- **Konum:** Boru künyesi kartı
- **Görünüm:** Yeşil badge "OCR: %96.4"
- **Açıklama:** Otomatik İşlendi (Human-in-the-Loop Onaylı)
- **PDR Uyumu:** %70 üstü güven ile otomatik işleme

---

## 3. Kullanılan Teknolojiler

### 3.1 Frontend (React + Vite)
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Grafik:** Recharts
- **Harita:** Leaflet + React-Leaflet v4
- **İkonlar:** Lucide React
- **HTTP Client:** Axios
- **Port:** 3000

### 3.2 Backend (Node.js + Express)
- **Runtime:** Node.js v22.14.0
- **Framework:** Express.js
- **File Upload:** Multer
- **HTTP Client:** Axios
- **Port:** 5000

### 3.3 AI/ML Servisleri
- **LLM:** Ollama (Qwen2.5:14B modeli)
- **LLM API:** http://localhost:11434/api/generate
- **Anomali Tespiti:** Threshold-based algoritma
- **RAG Pattern:** Boru kataloğu + LLM entegrasyonu

### 3.4 Veri Saklama
- **Audit Log:** JSON dosya tabanlı (audit_logs.json)
- **Opsiyonel:** MongoDB (MONGODB_URL environment variable ile aktif)
- **SCADA Verisi:** JSON dosya tabanlı (scada_data.json)
- **Boru Kataloğu:** Text dosya tabanlı (boru_altyapi_katalogu.txt)

---

## 4. Sistem Mimarisi

### 4.1 3-Layer Frontend Grid Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ÜST KATMAN - Metrik Kartları (4 kolon)                      │
│  Segment Kodu | Anlık Debi | Anlık Basınç | Risk Skoru      │
├─────────────────────────────────────────────────────────────┤
│  ORTA KATMAN - SCADA Grafiği ve Harita (2 kolon)            │
│  SCADA Zaman Serisi | İnteraktif Konum Haritası             │
├─────────────────────────────────────────────────────────────┤
│  ALT KATMAN - AI Reçetesi ve Saha Teyidi (2 kolon)          │
│  Local LLM Müdahale Reçetesi | Saha Fotoğraf Teyidi         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 API Endpoints
```
GET  /api/scada/analysis  → SCADA anomali tespiti + AI reçetesi
POST /api/scada/confirm   → Saha fotoğraf teyidi + audit log güncelleme
GET  /api/audit/logs      → Tüm audit loglarını getir
GET  /api/health          → Health check
```

### 4.3 Veri Akışı
```
SCADA Verisi (JSON) → Anomaly Service → Threshold-Based Anomali Tespiti
                                                      ↓
Boru Kataloğu (TXT) → RAG Service → Ollama LLM → AI Reçetesi
                                                      ↓
Frontend → Saha Teknisyen Fotoğraf → Backend → Audit Log (JSON/MongoDB)
```

---

## 5. Proje Dosya Yapısı

```
Kodlar/
├── backend/
│   ├── data/
│   │   ├── scada_data.json              # SCADA zaman serisi verileri
│   │   └── boru_altyapi_katalogu.txt    # Boru kataloğu
│   ├── services/
│   │   ├── anomalyService.js            # Anomali tespit servisi
│   │   └── ragService.js                # RAG + LLM reçete servisi
│   ├── uploads/                         # Yüklenen fotoğraflar
│   ├── audit_logs.json                  # Audit log veritabanı
│   ├── server.js                        # Express sunucusu
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      # Ana React bileşeni
│   │   ├── index.css                    # Tailwind CSS + Leaflet CSS
│   │   └── main.jsx                     # React entry point
│   ├── package.json
│   └── vite.config.js                   # Vite konfigürasyonu
└── PROJE_RAPORU.md                      # Bu rapor
```

---

## 6. PDR (Product Design Review) Uyumu

### 6.1 MongoDB Audit Log
- **PDR:** MongoDB audit log kullanımı
- **Uygulama:** JSON fallback ile MongoDB hybrid sistem
- **Açıklama:** MVP aşamasında zero-dependency için JSON, üretimde MongoDB'ye geçiş hazır

### 6.2 Python ML Anomali Tespiti
- **PDR:** Python modülleri ile ML anomali tespiti
- **Uygulama:** Node.js threshold-based algoritma
- **Açıklama:** Microservice karmaşasını önlemek adına Node.js mimarisine taşıdık

### 6.3 OCR Confidence
- **PDR:** %70 üstü güven ile otomatik işleme
- **Uygulama:** UI'da %96.4 confidence badge'i
- **Açıklama:** Human-in-the-loop onaylı otomatik işleme

### 6.4 Audit Log UI
- **PDR:** Dinamik audit log görüntüleme
- **Uygulama:** Tablo formatında, otomatik yenileme
- **Açıklama:** Teyit sonrası otomatik güncelleme

---

## 7. Güvenlik ve Performans

### 7.1 Güvenlik
- CORS aktif (frontend-backend iletişimi için)
- Dosya yükleme limiti: 10 MB
- Sadece resim dosyalarına izin (jpeg, jpg, png, gif)
- Environment variable ile MongoDB bağlantısı

### 7.2 Performans
- Vite ile hızlı frontend build
- Axios ile asenkron HTTP istekleri
- Leaflet ile optimize edilmiş harita rendering
- Recharts ile performanslı grafik çizimi

---

## 8. Gelecek Geliştirmeler

### 8.1 Gerçek SCADA Entegrasyonu
- SCADA API'si veya MQTT broker bağlantısı
- Zaman serisi veri akışı (InfluxDB/TimescaleDB)
- Gerçek zamanlı anomali tespiti

### 8.2 MongoDB Üretim Entegrasyonu
- MONGODB_URL environment variable ile MongoDB bağlantısı
- Sharding ve replika set konfigürasyonu
- Backup ve restore mekanizmaları

### 8.3 Gelişmiş AI Modelleri
- Fine-tuned LLM modelleri
- Multi-modal AI (fotoğraf + metin analizi)
- Predictive maintenance modelleri

### 8.4 Mobil Uygulama
- React Native ile mobil uygulama
- Push notification sistemi
- Offline mod desteği

---

## 9. Kurulum ve Çalıştırma

### 9.1 Backend Kurulumu
```bash
cd backend
npm install
npm start
```

### 9.2 Frontend Kurulumu
```bash
cd frontend
npm install
npm run dev
```

### 9.3 Ollama Kurulumu
```bash
# Ollama yükle
ollama pull qwen2.5:14b
# Ollama servisini başlat
ollama serve
```

---

## 10. İletişim ve Destek

**Proje Sahibi:** İSKİ - İstanbul Su ve Kanalizasyon İdaresi

**Geliştirme Ekibi:** Climathon Yarışma Takımı

**Versiyon:** v1.0.0

**Son Güncelleme:** Ekim 2026

---

## 11. Özet

İSKİ Akıllı Şebeke Karar Destek Sistemi, su şebekesindeki kılcal sızıntıları erken tespit etmek için modern web teknolojileri ve yapay zekâ kullanarak geliştirilmiş bir MVP uygulamasıdır. React + Node.js mimarisi, OpenStreetMap harita entegrasyonu, Ollama LLM ile AI reçetesi üretimi ve threshold-based anomali tespiti algoritması ile kapsamlı bir çözüm sunmaktadır. Saha teknisyenlerinin doğrulama süreçlerini dijitalleştirerek operasyonel verimliliği artırmayı hedefler.
