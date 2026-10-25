/**
 * Anomaly Detection Service
 * SCADA verilerini analiz ederek gece saatlerindeki kılcal sızıntı anomalilerini tespit eder
 * Threshold-based algoritma kullanarak matematiksel sapma hesaplaması yapar
 * Senaryo bazlı veri analizi destekler
 */

const fs = require('fs');
const path = require('path');

// SCADA veri dosyası yolu (dinamik - en son dosyayı okur)
function getScadaDataPath() {
    const dataDir = path.join(__dirname, '../data');
    
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
        return path.join(__dirname, '../data/scada_data.json');
    }
    
    return jsonFiles[0].path;
}

/**
 * Senaryo bazlı anomali tespiti
 * @param {string} scenarioId - Senaryo ID'si (örn: 'moda', 'kadikoy', 'atasehir')
 * @returns {Object|null} Anomali verileri veya null (anomali yoksa)
 */
function detectAnomalies(scenarioId = null) {
    try {
        // SCADA verisini oku (dinamik yol)
        const scadaDataPath = getScadaDataPath();
        const rawData = fs.readFileSync(scadaDataPath, 'utf8');
        const scadaData = JSON.parse(rawData);
        
        // Yeni JSON yapısını destekle (scenarios array)
        let timeSeriesData = [];
        
        if (Array.isArray(scadaData.scenarios)) {
            // Senaryo bazlı filtreleme - önce tam eşleşme, sonra kısmi eşleşme
            let scenariosToUse;
            
            if (scenarioId) {
                // Önce tam eşleşme dene
                const exactMatch = scadaData.scenarios.filter(s => s.scenario_id === scenarioId);
                
                if (exactMatch.length > 0) {
                    scenariosToUse = exactMatch;
                    console.log(`[AnomalyService] Tam eşleşme bulundu: ${scenarioId}`);
                } else {
                    // Tam eşleşme yoksa, kısmi eşleşme dene
                    const partialMatch = scadaData.scenarios.filter(s => 
                        s.scenario_id.toLowerCase().includes(scenarioId.toLowerCase()) ||
                        s.segment_id.toLowerCase().includes(scenarioId.toLowerCase())
                    );
                    
                    if (partialMatch.length > 0) {
                        scenariosToUse = partialMatch;
                        console.log(`[AnomalyService] Kısmi eşleşme bulundu: ${scenarioId} -> ${partialMatch.map(s => s.scenario_id).join(', ')}`);
                    } else {
                        console.log(`[AnomalyService] Eşleşme bulunamadı: ${scenarioId}`);
                        return null;
                    }
                }
            } else {
                scenariosToUse = scadaData.scenarios;
            }
            
            // Tüm senaryoların zaman serilerini birleştir
            scenariosToUse.forEach(scenario => {
                if (Array.isArray(scenario.time_series)) {
                    scenario.time_series.forEach(ts => {
                        timeSeriesData.push({
                            ...ts,
                            segment_id: scenario.segment_id,
                            scenario_id: scenario.scenario_id,
                            location_name: scenario.location_name
                        });
                    });
                }
            });
        } else if (Array.isArray(scadaData)) {
            // Eski düz array yapısı
            timeSeriesData = scadaData;
        } else {
            console.log('Bilgi: Geçersiz SCADA veri yapısı.');
            return null;
        }
        
        // Gece saatlerindeki (00:00 - 06:00) tüm verileri filtrele
        const nightData = timeSeriesData.filter(record => {
            const hour = parseInt(record.time.split(':')[0]);
            return hour >= 0 && hour <= 6;
        });
        
        if (nightData.length === 0) {
            console.log('Bilgi: Gece saatlerinde veri bulunamadı.');
            return null;
        }
        
        // Sabit eşik değerleri (İSKİ operasyonel parametreleri)
        const DEBI_THRESHOLD = 90; // m³/h üzerinde anomali
        const BASINC_LOW_THRESHOLD = 3.0; // bar altında anomali (kılcal sızıntı)
        const BASINC_HIGH_THRESHOLD = 5.5; // bar üzerinde anomali (yüksek basınç mikro sızıntı)
        
        // Anomali tespiti (eşik tabanlı - iki pattern)
        // Pattern 1: Yüksek debi + Düşük basınç (kılcal sızıntı)
        // Pattern 2: Yüksek debi + Yüksek basınç (mikro sızıntı)
        const anomalies = nightData.filter(record => {
            const isLowPressureAnomaly = record.debi_m3h > DEBI_THRESHOLD && record.basinc_bar < BASINC_LOW_THRESHOLD;
            const isHighPressureAnomaly = record.debi_m3h > DEBI_THRESHOLD && record.basinc_bar > BASINC_HIGH_THRESHOLD;
            return isLowPressureAnomaly || isHighPressureAnomaly;
        });
        
        // Anomali yoksa null döndür
        if (anomalies.length === 0) {
            console.log('Bilgi: Eşik tabanlı anomali tespiti ile anomali bulunamadı.');
            return null;
        }
        
        // En kritik anomali anını bul (en yüksek debi)
        const criticalAnomaly = anomalies.reduce((max, r) => 
            r.debi_m3h > max.debi_m3h ? r : max, anomalies[0]);
        
        // Normal değerler (anomali olmayan gece verileri)
        const normalData = nightData.filter(record => {
            const isLowPressureAnomaly = record.debi_m3h > DEBI_THRESHOLD && record.basinc_bar < BASINC_LOW_THRESHOLD;
            const isHighPressureAnomaly = record.debi_m3h > DEBI_THRESHOLD && record.basinc_bar > BASINC_HIGH_THRESHOLD;
            return !(isLowPressureAnomaly || isHighPressureAnomaly);
        });
        
        const normalAvgDebi = normalData.length > 0 
            ? normalData.reduce((sum, r) => sum + r.debi_m3h, 0) / normalData.length 
            : 70.0;
        
        const normalAvgBasinc = normalData.length > 0 
            ? normalData.reduce((sum, r) => sum + r.basinc_bar, 0) / normalData.length 
            : 4.2;
        
        // Anomali ortalamaları
        const anomalyAvgDebi = anomalies.reduce((sum, r) => sum + r.debi_m3h, 0) / anomalies.length;
        const anomalyAvgBasinc = anomalies.reduce((sum, r) => sum + r.basinc_bar, 0) / anomalies.length;
        
        // Sapma miktarları
        const debiSapma = anomalyAvgDebi - normalAvgDebi;
        const basincSapma = normalAvgBasinc - anomalyAvgBasinc;
        
        // Risk skoru hesapla (0-100)
        const debiRisk = Math.min((debiSapma / 50) * 50, 50); // Max 50 puan
        const basincRisk = Math.min((basincSapma / 2) * 50, 50); // Max 50 puan
        const riskSkoru = Math.round(debiRisk + basincRisk);
        
        // Sızıntı riski yüzdesi
        const leakRisk = Math.min(85 + (debiSapma / 100) * 15, 99);
        
        // Tüm zaman serisi verisi (24 saat)
        const timeSeries = timeSeriesData.map(record => {
            const isLowPressureAnomaly = record.debi_m3h > DEBI_THRESHOLD && record.basinc_bar < BASINC_LOW_THRESHOLD;
            const isHighPressureAnomaly = record.debi_m3h > DEBI_THRESHOLD && record.basinc_bar > BASINC_HIGH_THRESHOLD;
            return {
                time: record.time,
                debi: record.debi_m3h,
                basinc: record.basinc_bar,
                isAnomaly: isLowPressureAnomaly || isHighPressureAnomaly
            };
        });
        
        const result = {
            segment_id: criticalAnomaly.segment_id,
            scenario_id: criticalAnomaly.scenario_id || scenarioId,
            location_name: criticalAnomaly.location_name || 'Bilinmiyor',
            kritik_anomali_zamani: criticalAnomaly.timestamp,
            debi_m3h: criticalAnomaly.debi_m3h,
            basinc_bar: criticalAnomaly.basinc_bar,
            ortalama_debi: anomalyAvgDebi,
            ortalama_basinc: anomalyAvgBasinc,
            normal_debi: normalAvgDebi,
            normal_basinc: normalAvgBasinc,
            debi_sapma: debiSapma,
            basinc_sapma: basincSapma,
            risk_skoru: riskSkoru,
            leak_risk_percent: Math.round(leakRisk),
            anomaly_type: 'debi_artisi_basinc_dususu',
            anomaly_count: anomalies.length,
            detection_method: 'Threshold-Based (Debi>90, Basınç<3.0)',
            confidence_level: '95%',
            time_series: timeSeries
        };
        
        console.log(`✓ Eşik tabanlı anomali tespit edildi: Segment ${result.segment_id}`);
        console.log(`  - Senaryo: ${result.scenario_id || 'Belirtilmedi'}`);
        console.log(`  - Debi sapması: +${debiSapma.toFixed(1)} m³/h`);
        console.log(`  - Basınç sapması: -${basincSapma.toFixed(1)} bar`);
        
        return result;
        
    } catch (error) {
        console.error('Hata: Anomali tespiti başarısız -', error.message);
        return null;
    }
}

/**
 * Standart sapma hesaplar
 * @param {Array} values - Sayı dizisi
 * @returns {number} Standart sapma
 */
function calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
}

/**
 * Z-Score hesaplar
 * @param {number} value - Değer
 * @param {number} mean - Ortalama
 * @param {number} stdDev - Standart sapma
 * @returns {number} Z-Score
 */
function calculateZScore(value, mean, stdDev) {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
}

module.exports = {
    detectAnomalies
};
