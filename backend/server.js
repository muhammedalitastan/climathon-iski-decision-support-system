/**
 * Express Server - İSKİ Karar Destek Sistemi Backend API
 * SCADA anomali analizi ve saha müdahale teyidi endpoint'leri
 * MongoDB + JSON hybrid audit log system
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const os = require('os');
const ip = require('ip');

// Auth middleware
const { validateApiKey, optionalApiKey } = require('./middleware/auth');

// MongoDB opsiyonel bağlantı (MONGODB_URL environment variable ile aktif)
let mongoClient = null;
let mongoCollection = null;
const MONGODB_URL = process.env.MONGODB_URL || null;

if (MONGODB_URL) {
    const { MongoClient } = require('mongodb');
    MongoClient.connect(MONGODB_URL)
        .then(client => {
            mongoClient = client;
            mongoCollection = client.db('iski_audit').collection('incidents');
            console.log('✓ MongoDB bağlantısı başarılı');
        })
        .catch(err => {
            console.warn('⚠ MongoDB bağlantısı başarısız, JSON fallback kullanılacak:', err.message);
        });
} else {
    console.log('ℹ MongoDB_URL tanımlı değil, JSON audit log kullanılacak');
}

// Servisleri içe aktar
const { detectAnomalies } = require('./services/anomalyService');
const { generateLocalRecipe } = require('./services/ragService');

const app = express();
const PORT = 5000;

// uploads klasörünü oluştur
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('✓ uploads/ klasörü oluşturuldu');
}

// Static file serving for uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// data klasörünü oluştur
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✓ data/ klasörü oluşturuldu');
}

// Audit log dosya yolu (JSON fallback)
const AUDIT_LOGS_PATH = path.join(__dirname, 'audit_logs.json');

// Rate Limiting Konfigürasyonu (DDoS koruması)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 200, // Her IP için maksimum 200 istek (artırıldı)
    message: {
        success: false,
        error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware'ler
app.use(cors({
    origin: '*', // MVP aşamasında tüm kaynaklara izin (production'da domain whitelist)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-API-KEY']
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(limiter); // Rate limiting'i tüm endpoint'lere uygula

// Multer konfigürasyonu (fotoğraf yükleme)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Benzersiz dosya adı oluştur
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'incident-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    },
    fileFilter: (req, file, cb) => {
        // Sadece resim dosyalarına izin ver
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Sadece resim dosyaları (jpeg, jpg, png, gif) yüklenebilir.'));
    }
});

// Multer konfigürasyonu (veri dosyası yükleme - SCADA ve Catalog)
const dataStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DATA_DIR);
    },
    filename: (req, file, cb) => {
        // Dosya adını koru
        cb(null, file.originalname);
    }
});

const dataUpload = multer({
    storage: dataStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    }
});

// Audit Log (basit JSON dosya tabanlı)
const AUDIT_LOG_PATH = path.join(__dirname, 'audit_logs.json');

/**
 * Audit log'u okur (MongoDB veya JSON fallback)
 */
async function getAuditLogs() {
    try {
        if (mongoCollection) {
            // MongoDB kullan
            const logs = await mongoCollection.find({}).sort({ created_at: -1 }).toArray();
            return logs;
        } else {
            // JSON fallback
            if (fs.existsSync(AUDIT_LOG_PATH)) {
                const data = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
                return JSON.parse(data);
            }
            return [];
        }
    } catch (error) {
        console.error('Audit log okuma hatası:', error.message);
        return [];
    }
}

/**
 * Audit log'a yazar (MongoDB veya JSON fallback)
 */
async function saveAuditLog(log) {
    try {
        if (mongoCollection) {
            // MongoDB kullan
            await mongoCollection.insertOne(log);
        } else {
            // JSON fallback
            const logs = await getAuditLogs();
            logs.push(log);
            fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
        }
    } catch (error) {
        console.error('Audit log yazma hatası:', error.message);
    }
}

/**
 * Audit log günceller (MongoDB veya JSON fallback)
 */
async function updateAuditLog(incidentId, updates) {
    try {
        if (mongoCollection) {
            // MongoDB kullan
            await mongoCollection.updateOne(
                { incident_id: incidentId },
                { $set: updates }
            );
        } else {
            // JSON fallback
            const logs = await getAuditLogs();
            const index = logs.findIndex(log => log.incident_id === incidentId);
            if (index !== -1) {
                logs[index] = { ...logs[index], ...updates };
                fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
            }
        }
    } catch (error) {
        console.error('Audit log güncelleme hatası:', error.message);
    }
}

/**
 * Benzersiz incident ID üretir
 */
async function generateIncidentId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const logs = await getAuditLogs();
    const count = logs.filter(log => log.incident_id && log.incident_id.startsWith(`INC-${dateStr}`)).length;
    const sequenceNum = count + 1;
    return `INC-${dateStr}-${String(sequenceNum).padStart(3, '0')}`;
}

// ==================== ENDPOINTS ====================

/**
 * GET /api/scada/analysis
 * SCADA anomali tespiti ve AI reçetesi üretimi
 * Opsiyonel API Key (web dashboard için zorunlu değil)
 */
app.get('/api/scada/analysis', optionalApiKey, async (req, res) => {
    try {
        console.log('\n[GET /api/scada/analysis] İstek alındı');
        
        // Senaryo parametresini al
        const scenarioId = req.query.scenario || null;
        console.log(`  - Senaryo: ${scenarioId || 'Belirtilmedi'}`);
        
        // Adım 1: Anomali tespiti
        console.log('[1/2] Anomali tespiti yapılıyor...');
        const anomalyData = detectAnomalies(scenarioId);
        
        if (!anomalyData) {
            return res.json({
                success: true,
                anomaly_detected: false,
                message: 'Kritik anomali tespit edilemedi'
            });
        }
        
        // Adım 2: AI reçetesi üretimi
        console.log('[2/2] AI reçetesi üretiliyor...');
        const recipe = await generateLocalRecipe(anomalyData);
        
        // Audit log'a kaydet
        const incidentId = await generateIncidentId();
        const auditLog = {
            incident_id: incidentId,
            created_at: new Date().toISOString(),
            status: 'PENDING_FIELD_ACTION',
            anomaly_data: anomalyData,
            recipe: recipe
        };
        
        await saveAuditLog(auditLog);
        
        console.log(`✓ İşlem tamamlandı: ${incidentId}`);
        
        res.json({
            success: true,
            anomaly_detected: true,
            incident_id: incidentId,
            anomaly_data: anomalyData,
            recipe: recipe
        });
        
    } catch (error) {
        console.error('Hata:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/scada/confirm
 * Saha fotoğraf teyidi ve audit log güncellemesi
 * Zorunlu API Key (mobil uygulama için)
 */
app.post('/api/scada/confirm', validateApiKey, upload.single('photo'), async (req, res) => {
    try {
        console.log('\n[POST /api/scada/confirm] İstek alındı');
        
        const { incident_id, technician_note } = req.body;
        
        if (!incident_id) {
            return res.status(400).json({
                success: false,
                error: 'incident_id gerekli'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Fotoğraf yüklenmedi'
            });
        }
        
        console.log(`  - Incident ID: ${incident_id}`);
        console.log(`  - Fotoğraf: ${req.file.filename}`);
        
        // Audit log'u güncelle (MongoDB veya JSON fallback)
        const updates = {
            status: 'VERIFIED_AND_CLOSED',
            image_path: `/uploads/${req.file.filename}`,
            technician_note: technician_note || '',
            resolved_at: new Date().toISOString()
        };
        
        await updateAuditLog(incident_id, updates);
        
        console.log('✓ Audit log güncellendi');
        
        res.json({
            success: true,
            message: 'Saha müdahalesi başarıyla teyit edildi',
            incident_id: incident_id,
            image_path: updates.image_path
        });
        
    } catch (error) {
        console.error('Hata:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit/logs
 * Tüm audit loglarını getir
 * Opsiyonel API Key (web dashboard için zorunlu değil)
 */
app.get('/api/audit/logs', optionalApiKey, async (req, res) => {
    try {
        const logs = await getAuditLogs();
        
        res.json({
            success: true,
            logs: logs
        });
    } catch (error) {
        console.error('Hata:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/system/network-info
 * Sunucunun yerel IP adresini döner
 * QR kod eşleştirme için kullanılır
 */
app.get('/api/system/network-info', optionalApiKey, (req, res) => {
    try {
        // Yerel IP adresini al
        const localIP = ip.address();
        const port = process.env.PORT || 5000;
        const serverUrl = `http://${localIP}:${port}`;
        
        // API key (environment variable veya default)
        const apiKey = process.env.MOBILE_API_KEY || 'iski_field_mobile_secret_2026';
        
        res.json({
            success: true,
            server_url: serverUrl,
            api_key: apiKey,
            hostname: os.hostname(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Network info hatası:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/scenarios
 * SCADA verisinden senaryoları döner
 * Frontend senaryo seçici için kullanılır
 * Data klasöründeki en son SCADA dosyasını okur
 */
app.get('/api/scenarios', optionalApiKey, (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        
        // Data klasöründeki tüm .json dosyalarını bul
        const jsonFiles = fs.readdirSync(dataDir)
            .filter(file => file.endsWith('.json') && file.includes('scada'))
            .map(file => ({
                name: file,
                path: path.join(dataDir, file),
                mtime: fs.statSync(path.join(dataDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime); // En son değişen dosya
        
        if (jsonFiles.length === 0) {
            return res.json({
                success: true,
                scenarios: []
            });
        }
        
        // En son dosyayı oku
        const scadaDataPath = jsonFiles[0].path;
        const rawData = fs.readFileSync(scadaDataPath, 'utf8');
        const scadaData = JSON.parse(rawData);
        
        let scenarios = [];
        
        if (Array.isArray(scadaData.scenarios)) {
            // Yeni JSON yapısı
            scenarios = scadaData.scenarios.map(s => ({
                id: s.scenario_id,
                name: s.scenario_name || s.location_name || s.segment_id,
                lat: s.coordinates?.lat || 0,
                lng: s.coordinates?.lng || 0,
                segment: s.segment_id,
                description: s.description || ''
            }));
        } else if (Array.isArray(scadaData)) {
            // Eski düz array yapısı
            scenarios = scadaData.map(s => ({
                id: s.scenario_id || s.segment_id,
                name: s.scenario_name || s.location_name || s.segment_id,
                lat: s.coordinates?.lat || 0,
                lng: s.coordinates?.lng || 0,
                segment: s.segment_id,
                description: s.description || ''
            }));
        }
        
        res.json({
            success: true,
            scenarios: scenarios
        });
    } catch (error) {
        console.error('Senaryolar hatası:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/upload/scada
 * SCADA zaman serisi dosyası yükleme
 * Zorunlu API Key (mobil uygulama için)
 */
app.post('/api/upload/scada', validateApiKey, dataUpload.single('file'), (req, res) => {
    try {
        console.log('\n[POST /api/upload/scada] İstek alındı');
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Dosya yüklenmedi'
            });
        }
        
        console.log(`  - Dosya: ${req.file.originalname}`);
        console.log(`  - Boyut: ${req.file.size} bytes`);
        console.log(`  - Kayıt yolu: ${req.file.path}`);
        
        res.json({
            success: true,
            message: 'SCADA dosyası başarıyla yüklendi',
            filename: req.file.originalname,
            path: req.file.path
        });
        
    } catch (error) {
        console.error('Hata:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/upload/catalog
 * Boru altyapı kataloğu dosyası yükleme
 * Zorunlu API Key (mobil uygulama için)
 */
app.post('/api/upload/catalog', validateApiKey, dataUpload.single('file'), (req, res) => {
    try {
        console.log('\n[POST /api/upload/catalog] İstek alındı');
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Dosya yüklenmedi'
            });
        }
        
        console.log(`  - Dosya: ${req.file.originalname}`);
        console.log(`  - Boyut: ${req.file.size} bytes`);
        console.log(`  - Kayıt yolu: ${req.file.path}`);
        
        res.json({
            success: true,
            message: 'Katalog dosyası başarıyla yüklendi',
            filename: req.file.originalname,
            path: req.file.path
        });
        
    } catch (error) {
        console.error('Hata:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/incidents/create
 * Yeni iş emri oluşturur
 */
app.post('/api/incidents/create', optionalApiKey, (req, res) => {
    try {
        const { scenario_id, segment_id, location_name, priority, description } = req.body;
        
        if (!scenario_id || !segment_id) {
            return res.status(400).json({
                success: false,
                error: 'scenario_id ve segment_id zorunludur'
            });
        }
        
        // İş emri ID oluştur
        const incidentId = `INC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        const incident = {
            incident_id: incidentId,
            scenario_id,
            segment_id,
            location_name: location_name || 'Bilinmiyor',
            priority: priority || 'medium',
            description: description || '',
            status: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Audit log'a kaydet
        if (mongoCollection) {
            mongoCollection.insertOne(incident).catch(err => {
                console.warn('MongoDB kayıt hatası:', err.message);
            });
        }
        
        // JSON audit log'a da kaydet
        const auditLogPath = path.join(__dirname, 'audit_logs.json');
        let auditLogs = [];
        if (fs.existsSync(auditLogPath)) {
            auditLogs = JSON.parse(fs.readFileSync(auditLogPath, 'utf8'));
        }
        auditLogs.unshift(incident);
        fs.writeFileSync(auditLogPath, JSON.stringify(auditLogs, null, 2));
        
        console.log(`[POST /api/incidents/create] İş emri oluşturuldu: ${incidentId}`);
        
        res.json({
            success: true,
            incident: incident
        });
    } catch (error) {
        console.error('İş emri oluşturma hatası:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mobile/incidents
 * Mobil uygulama için açık iş emirlerini listeler
 */
app.get('/api/mobile/incidents', optionalApiKey, (req, res) => {
    try {
        const auditLogPath = path.join(__dirname, 'audit_logs.json');
        
        if (!fs.existsSync(auditLogPath)) {
            return res.json({
                success: true,
                incidents: []
            });
        }
        
        const auditLogs = JSON.parse(fs.readFileSync(auditLogPath, 'utf8'));
        
        // Sadece açık iş emirlerini filtrele
        const openIncidents = auditLogs.filter(inc => 
            inc.status === 'open' || inc.status === 'PENDING_FIELD_ACTION'
        );
        
        res.json({
            success: true,
            incidents: openIncidents
        });
    } catch (error) {
        console.error('Mobil iş emirleri çekme hatası:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/incidents/photos
 * Tüm iş emirlerini ve fotoğrafları listeler
 */
app.get('/api/incidents/photos', optionalApiKey, (req, res) => {
    try {
        const auditLogPath = path.join(__dirname, 'audit_logs.json');
        
        if (!fs.existsSync(auditLogPath)) {
            return res.json({
                success: true,
                incidents: []
            });
        }
        
        const auditLogs = JSON.parse(fs.readFileSync(auditLogPath, 'utf8'));
        
        // Fotoğraflı iş emirlerini filtrele
        const incidentsWithPhotos = auditLogs.filter(inc => 
            inc.photo_path || inc.verification_photo
        );
        
        // Uploads klasöründeki fotoğrafları listele
        const uploadsDir = path.join(__dirname, 'uploads');
        let uploadedPhotos = [];
        
        if (fs.existsSync(uploadsDir)) {
            uploadedPhotos = fs.readdirSync(uploadsDir)
                .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
                .map(file => ({
                    filename: file,
                    path: `/uploads/${file}`,
                    created_at: fs.statSync(path.join(uploadsDir, file)).mtime.toISOString()
                }));
        }
        
        res.json({
            success: true,
            incidents: incidentsWithPhotos,
            uploaded_photos: uploadedPhotos
        });
    } catch (error) {
        console.error('Fotoğrafları listeleme hatası:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Sunucu hatası:', err.message);
    res.status(500).json({
        success: false,
        error: err.message
    });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('İSKİ KARAR DESTEK SİSTEMİ - BACKEND API');
    console.log('='.repeat(60));
    console.log(`✓ Sunucu çalışıyor: http://localhost:${PORT}`);
    console.log(`✓ API Endpoints:`);
    console.log(`  - GET  /api/scada/analysis`);
    console.log(`  - POST /api/scada/confirm`);
    console.log(`  - GET  /api/audit/logs`);
    console.log(`  - GET  /api/health`);
    console.log(`  - POST /api/upload/scada`);
    console.log(`  - POST /api/upload/catalog`);
    console.log(`  - POST /api/incidents/create`);
    console.log(`  - GET  /api/mobile/incidents`);
    console.log(`  - GET  /api/incidents/photos`);
    console.log(`  - GET  /api/scenarios`);
    console.log(`  - GET  /api/system/network-info`);
    console.log('='.repeat(60) + '\n');
});
