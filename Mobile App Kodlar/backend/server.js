const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const ip = require('ip');

const app = express();
const PORT = process.env.PORT || 5000;

// API Key Configuration - Should be set via environment variable
const API_KEY = process.env.API_KEY || '';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Key Validation Middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        console.log('[SECURITY] Missing API Key');
        return res.status(401).json({
            success: false,
            error: 'API Key eksik'
        });
    }
    
    if (apiKey !== API_KEY) {
        console.log('[SECURITY] Invalid API Key:', apiKey);
        return res.status(401).json({
            success: false,
            error: 'Geçersiz API Key'
        });
    }
    
    console.log('[SECURITY] API Key validated');
    next();
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'incident-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Sample work order data
let activeIncident = {
    incident_id: 'INC-2024-001',
    location: 'KD-402-A - Moda Caddesi Kesişimi',
    coordinates: {
        latitude: 40.9855,
        longitude: 29.0270
    },
    anomaly_type: 'Yüksek debi ve düşük basınç',
    severity: 'CRITICAL',
    timestamp: new Date().toISOString(),
    pipe_material: '1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)',
    ai_recipe: [
        'Boru Malzemesi: 1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)',
        'Adım 1: Moda Caddesi kesişimindeki VANA-12 konumuna ulaşın.',
        'Adım 2 (Kritik YZ Talimatı): VANA-12\'yi %20 kademeli adımlarla (her adımda 5 dk bekleyerek) kapatın. Ani kapatma yapmayın!'
    ],
    device_id: null // Belirli bir cihaza atanmamış (tüm cihazlar görebilir)
};

// Audit log storage
let auditLogs = [];

// GET /api/scada/analysis - Get active incident
app.get('/api/scada/analysis', (req, res) => {
    const deviceId = req.headers['x-device-id'];
    console.log('[GET] /api/scada/analysis - Fetching active incident');
    console.log('[GET] Device ID:', deviceId || 'None');
    
    if (activeIncident) {
        // Device ID kontrolü: device_id null ise tüm cihazlar görebilir
        // device_id varsa sadece eşleşen cihaz görebilir
        if (activeIncident.device_id === null || activeIncident.device_id === deviceId) {
            console.log('[GET] Active incident found:', activeIncident.incident_id);
            res.json({
                success: true,
                data: activeIncident
            });
        } else {
            console.log('[GET] Incident assigned to different device');
            res.status(404).json({
                success: false,
                message: 'Şu an atanmış aktif iş emri bulunmamaktadır'
            });
        }
    } else {
        console.log('[GET] No active incident');
        res.status(404).json({
            success: false,
            message: 'Şu an atanmış aktif iş emri bulunmamaktadır'
        });
    }
});

// POST /api/scada/confirm - Confirm incident with photo
app.post('/api/scada/confirm', validateApiKey, upload.single('photo'), (req, res) => {
    console.log('[POST] /api/scada/confirm - Incident confirmation request');
    console.log('[POST] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[POST] Body:', JSON.stringify(req.body, null, 2));
    console.log('[POST] File:', req.file ? req.file.filename : 'No file');
    
    if (!req.file) {
        console.log('[POST] Error: No photo uploaded');
        return res.status(400).json({
            success: false,
            message: 'Fotoğraf yüklenmedi'
        });
    }
    
    const { incident_id, technician_note } = req.body;
    
    console.log('[POST] Incident ID:', incident_id);
    console.log('[POST] Technician Note:', technician_note);
    console.log('[POST] Photo saved:', req.file.filename);
    
    // Create audit log entry
    const auditLog = {
        incident_id: incident_id,
        technician_note: technician_note,
        photo_path: req.file.filename,
        confirmed_at: new Date().toISOString(),
        status: 'CONFIRMED'
    };
    
    auditLogs.push(auditLog);
    
    // Clear active incident after confirmation
    activeIncident = null;
    
    console.log('[POST] Incident confirmed and audit log created');
    console.log('[POST] Sending response:', JSON.stringify({
        success: true,
        message: 'İş emri fotoğrafla teyit edildi ve audit log veritabanına kaydedildi',
        audit_log: auditLog
    }, null, 2));
    
    res.json({
        success: true,
        message: 'İş emri fotoğrafla teyit edildi ve audit log veritabanına kaydedildi',
        audit_log: auditLog
    });
});

// GET /api/scada/audit - Get all audit logs (for testing)
app.get('/api/scada/audit', (req, res) => {
    console.log('[GET] /api/scada/audit - Fetching audit logs');
    res.json({
        success: true,
        count: auditLogs.length,
        logs: auditLogs
    });
});

// POST /api/scada/simulate - Simulate new incident (for testing)
app.post('/api/scada/simulate', (req, res) => {
    console.log('[POST] /api/scada/simulate - Creating new incident');
    
    activeIncident = {
        incident_id: 'INC-2024-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
        location: 'KD-402-A - Moda Caddesi Kesişimi',
        coordinates: {
            latitude: 40.9855,
            longitude: 29.0270
        },
        anomaly_type: 'Yüksek debi ve düşük basınç',
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
        pipe_material: '1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)',
        ai_recipe: [
            'Boru Malzemesi: 1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)',
            'Adım 1: Moda Caddesi kesişimindeki VANA-12 konumuna ulaşın.',
            'Adım 2 (Kritik YZ Talimatı): VANA-12\'yi %20 kademeli adımlarla (her adımda 5 dk bekleyerek) kapatın. Ani kapatma yapmayın!'
        ]
    };
    
    console.log('[POST] New incident created:', activeIncident.incident_id);
    
    res.json({
        success: true,
        message: 'Yeni iş emri simüle edildi',
        incident: activeIncident
    });
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend çalışıyor',
        timestamp: new Date().toISOString()
    });
});

// GET /api/qr - Get QR code as image
app.get('/api/qr', async (req, res) => {
    try {
        const localIP = ip.address();
        const serverUrl = `http://${localIP}:${PORT}`;
        const qrData = JSON.stringify({ server_url: serverUrl });
        
        // Generate QR code as PNG
        const qrCodeBuffer = await QRCode.toBuffer(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.send(qrCodeBuffer);
    } catch (err) {
        console.error('[ERROR] QR Code generation failed:', err);
        res.status(500).json({
            success: false,
            error: 'QR kod oluşturma hatası'
        });
    }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('[ERROR]', error.message);
    res.status(500).json({
        success: false,
        message: error.message || 'Sunucu hatası'
    });
});

// Start server
app.listen(PORT, async () => {
    const localIP = ip.address();
    const serverUrl = `http://${localIP}:${PORT}`;
    const qrData = JSON.stringify({ server_url: serverUrl });
    
    console.log('='.repeat(50));
    console.log('İSKİ Saha Tekniker Backend Server');
    console.log('='.repeat(50));
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Local Network URL: ${serverUrl}`);
    console.log('='.repeat(50));
    console.log('API Endpoints:');
    console.log('  GET  /api/scada/analysis  - Aktif iş emrini getir');
    console.log('  POST /api/scada/confirm  - İş emrini fotoğrafla teyit et');
    console.log('  GET  /api/scada/audit    - Audit logları getir');
    console.log('  POST /api/scada/simulate - Yeni iş emri simüle et');
    console.log('  GET  /api/health         - Sağlık kontrolü');
    console.log('  GET  /api/qr             - QR kodunu getir');
    console.log('='.repeat(50));
    
    // Generate QR Code
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        console.log('\n📱 MOBİL UYGULAMA İÇİN QR KOD:');
        console.log('='.repeat(50));
        console.log('QR Code Data URL (Base64):');
        console.log(qrCodeDataUrl);
        console.log('\nQR Code JSON Data:');
        console.log(qrData);
        console.log('='.repeat(50));
        console.log('💡 İpucu: Bu QR kodu mobil uygulama ile taratın');
        console.log('💡 Veya: http://localhost:5000/api/qr adresinden QR kodu görüntüleyin');
        console.log('='.repeat(50));
    } catch (err) {
        console.error('[ERROR] QR Code generation failed:', err);
    }
    
    console.log(`Initial active incident: ${activeIncident ? activeIncident.incident_id : 'None'}`);
    console.log('='.repeat(50));
});
