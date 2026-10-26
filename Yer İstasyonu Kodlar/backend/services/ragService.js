/**
 * RAG (Retrieval-Augmented Generation) Service
 * Boru kataloğunu okuyup Ollama LLM ile müdahale reçetesi üretir
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Boru kataloğu dosya yolu (dinamik - en son dosyayı okur)
function getCatalogPath() {
    const dataDir = path.join(__dirname, '../data');
    
    // Data klasöründeki tüm .txt dosyalarını bul
    const txtFiles = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('.txt') && file.includes('katalog'))
        .map(file => ({
            name: file,
            path: path.join(dataDir, file),
            mtime: fs.statSync(path.join(dataDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // En son değişen dosya
    
    if (txtFiles.length === 0) {
        return path.join(__dirname, '../data/boru_altyapi_katalogu.txt');
    }
    
    return txtFiles[0].path;
}

// Ollama API konfigürasyonu
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2';

/**
 * Boru kataloğunu okur ve segment bazlı context çıkarır
 * 
 * @param {string} segmentId - Segment kodu (örn: KD-402-A)
 * @returns {string} Katalog context metni
 */
function parsePipeCatalog(segmentId) {
    try {
        const catalogPath = getCatalogPath();
        const content = fs.readFileSync(catalogPath, 'utf8');
        
        // Segment bazlı ayrıştırma - [SEGMENT_ID: SEG-KADIKOY-MODA-88] formatı
        const segmentPattern = new RegExp(`\\[SEGMENT_ID:\\s*${segmentId}\\]([\\s\\S]*?)(?=\\[SEGMENT_ID:|$)`, 'i');
        const match = content.match(segmentPattern);
        
        if (match) {
            console.log(`[RAGService] Segment ${segmentId} katalogda bulundu.`);
            return match[1].trim();
        }
        
        // Segment bulunamazsa tüm içeriği döndür
        console.log(`Uyarı: Segment ${segmentId} katalogda bulunamadı. Tüm katalog kullanılıyor.`);
        return content;
        
    } catch (error) {
        console.error('Hata: Katalog okunamadı -', error.message);
        return '';
    }
}

/**
 * Ollama API'sine istek atarak LLM'den yanıt alır (streaming)
 * 
 * @param {string} systemPrompt - Sistem talimatı
 * @param {string} userPrompt - Kullanıcı sorusu
 * @returns {Promise<string|null>} LLM yanıtı veya null (hata durumunda)
 */
async function callOllamaLLM(systemPrompt, userPrompt) {
    try {
        const payload = {
            model: OLLAMA_MODEL,
            prompt: userPrompt,
            system: systemPrompt,
            stream: false,
            format: 'json'
        };
        
        const response = await axios.post(OLLAMA_API_URL, payload, {
            timeout: 180000 // 3 dakika timeout
        });
        
        if (response.data && response.data.response) {
            return response.data.response;
        }
        
        return null;
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Hata: Ollama servisine bağlanılamadı. http://localhost:11434 adresini kontrol edin.');
        } else if (error.code === 'ECONNABORTED') {
            console.error('Hata: Ollama isteği zaman aşımına uğradı.');
        } else {
            console.error('Hata: Ollama API çağrısı başarısız -', error.message);
        }
        return null;
    }
}

/**
 * Fallback varsayılan reçete üretir
 * Ollama yanıt vermezse kullanılır
 * Senaryo bazlı dinamik reçete üretir
 * 
 * @param {Object} anomalyData - Anomali verileri
 * @returns {Object} Varsayılan JSON reçetesi
 */
function generateFallbackRecipe(anomalyData) {
    const segmentId = anomalyData.segment_id || 'Bilinmiyor';
    const locationName = anomalyData.location_name || 'Bilinmiyor';
    const riskScore = anomalyData.risk_skoru || 50;
    const debiSapma = anomalyData.debi_sapma || 0;
    const basincSapma = anomalyData.basinc_sapma || 0;
    const debi = anomalyData.debi_m3h || 0;
    const basinc = anomalyData.basinc_bar || 0;
    const ortalamaDebi = anomalyData.ortalama_debi || 0;
    const ortalamaBasinc = anomalyData.ortalama_basinc || 0;
    
    // Katalogdan segment bilgilerini al
    const catalogContext = parsePipeCatalog(segmentId);
    
    // Katalogdan boru bilgilerini çıkar
    let year = 'Bilinmiyor';
    let material = 'Bilinmiyor';
    let diameter = 'Bilinmiyor';
    let vana = 'VANA-GENEL';
    
    const yearMatch = catalogContext.match(/İmalat \/ Döşeme Yılı:\s*(.+)/i);
    const materialMatch = catalogContext.match(/Boru Malzemesi\s*:\s*(.+)/i);
    const diameterMatch = catalogContext.match(/Boru Çapı \(DN\)\s*:\s*(.+)/i);
    
    if (yearMatch) year = yearMatch[1].trim();
    if (materialMatch) material = materialMatch[1].trim();
    if (diameterMatch) diameter = diameterMatch[1].trim();
    
    // Vana numarasını segment ID'den türet
    const vanaNum = segmentId.split('-').pop() || '12';
    vana = `VANA-${vanaNum}`;
    
    // Malzemeye göre gerekçe ve eylem
    let reason = '';
    let action = '';
    
    if (material.toLowerCase().includes('döküm') || material.toLowerCase().includes('cast iron')) {
        reason = 'Boru döküm demir olduğundan kırılgan yapıdadır. Ani vana kapatması yüksek basınç şokuna (koç darbesine) ve borunun patlamasına yol açabilir.';
        action = `${vana}'yi %20 kademeli adımlarla, her adımda en az 15 dakika bekleyerek kapatın. Ani kapatma yapmayın.`;
    } else if (material.toLowerCase().includes('polietilen') || material.toLowerCase().includes('hd-pe')) {
        reason = 'Boru HD-PE olduğundan esnek yapıdadır. Basınç şoklarına karşı dayanıklıdır ancak hızlı kapatma kaynaklı su çarpması riski vardır.';
        action = `${vana}'i %30 kademeli adımlarla, her adımda 3 dakika bekleyerek kapatın. Esnek yapıya rağmen ani kapatma yapmayın.`;
    } else if (material.toLowerCase().includes('çelik') || material.toLowerCase().includes('steel')) {
        reason = 'Boru çelik olduğundan dayanıklı yapıdadır. Ancak korozyon riski nedeniyle ani basınç değişimlerinden kaçınılmalıdır.';
        action = `${vana}'i %25 kademeli adımlarla, her adımda 4 dakika bekleyerek kapatın. Korozyon riski nedeniyle ani kapatma yapmayın.`;
    } else {
        reason = 'Boru yapısına göre ani vana kapatması basınç şoklarına neden olabilir.';
        action = `${vana}'yi %20 kademeli adımlarla, her adımda 5 dakika bekleyerek kapatın. Ani kapatma yapmayın.`;
    }
    
    return {
        segment_id: segmentId,
        risk_skoru: `%${riskScore}`,
        anomali_ozeti: `Debi ${debi.toFixed(1)} m³/h (Ortalama: ${ortalamaDebi.toFixed(1)} m³/h, Sapma: +${debiSapma.toFixed(1)} m³/h) ve basınç ${basinc.toFixed(2)} bar (Ortalama: ${ortalamaBasinc.toFixed(2)} bar, Sapma: -${basincSapma.toFixed(1)} bar) ile debi artışı ve basınç düşüşü gözlemlenmiştir.`,
        boru_kunyesi: `${year} İmalat Yılı / ${material} (${diameter})`,
        gerekce: reason,
        eylem_recetesi: action,
        saha_talimati: `Saha teknisyeni ${locationName} konumuna yönlendirilmeli, müdahale sonrası ${vana} durum fotoğrafı mobil uygulamadan teyit olarak yüklenmelidir.`
    };
}

/**
 * Anomali verisine göre AI destekli müdahale reçetesi üretir
 * Ollama LLM kullanarak boru kataloğunu çapraz analiz eder
 * 
 * @param {Object} anomalyData - Anomali verileri
 * @returns {Promise<Object>} JSON formatında eylem reçetesi
 */
async function generateLocalRecipe(anomalyData) {
    const segmentId = anomalyData.segment_id || 'KD-402-A';
    
    // Katalog context'ini al
    const catalogContext = parsePipeCatalog(segmentId);
    
    // System Prompt - İSKİ Altyapı Karar Destek Asistanı
    const systemPrompt = `Sen bir İSKİ Altyapı Karar Destek Asistanısın. SCADA anomali verisini ve boru teknik kataloğunu çapraz analiz et.
Borunun yaşı ve malzemesini dikkate alarak koç darbesini engelleyecek nokta atışı müdahale reçetesi yaz.
Yanıtını mutlaka geçerli JSON formatında döndür. JSON şu alanları içermelidir:
{
  "segment_id": "KD-402-A",
  "risk_skoru": "%88",
  "anomali_ozeti": "Gece saat 02:30'da debide +45.5 m³/h artış ve basınçta -1.8 bar düşüş tespit edildi.",
  "boru_kunyesi": "1988 İmalat Yılı / Döküm Demir (Gevrek Yapı) / DN300",
  "gerekce": "Boru 1988 yapımı döküm demir olduğundan kırılgan yapıdadır. Ani vana kapatması yüksek basınç şokuna (koç darbesine) ve borunun patlamasına yol açabilir.",
  "eylem_recetesi": "VANA-12'yi %20 kademeli adımlarla, her adımda 5 dakika bekleyerek kapatın. Ani kapatma yapmayın.",
  "saha_talimati": "Saha teknikeri Moda Caddesi Kesişimine yönlendirilmeli, müdahale sonrası vana durum fotoğrafı mobil uygulamadan teyit olarak yüklenmelidir."
}`;
    
    // User Prompt - anomali ve katalog bilgileri
    const userPrompt = `Aşağıdaki anomali ve boru kataloğu bilgilerine göre müdahale reçetesi oluştur:

SEGMENT: ${segmentId}

ANOMALİ VERİLERİ:
- Kritik Anomali Zamanı: ${anomalyData.kritik_anomali_zamani}
- Debi: ${anomalyData.debi_m3h} m³/h (Ortalama: ${anomalyData.ortalama_debi?.toFixed(1)} m³/h, Sapma: +${anomalyData.debi_sapma?.toFixed(1)} m³/h)
- Basınç: ${anomalyData.basinc_bar} bar (Ortalama: ${anomalyData.ortalama_basinc?.toFixed(1)} bar, Sapma: -${anomalyData.basinc_sapma?.toFixed(1)} bar)
- Anomali Tipi: ${anomalyData.anomaly_type}

BORU KATALOGU BİLGİLERİ:
${catalogContext}

Lütfen bu verilere göre JSON formatında müdahale reçetesi üret.`;
    
    try {
        // Ollama'dan yanıt al
        const llmResponse = await callOllamaLLM(systemPrompt, userPrompt);
        
        if (llmResponse) {
            // JSON parse et
            try {
                const recipeDict = JSON.parse(llmResponse);
                
                // Gerekli alanları kontrol et
                const requiredFields = ['segment_id', 'risk_skoru', 'anomali_ozeti', 'boru_kunyesi', 
                                       'gerekce', 'eylem_recetesi', 'saha_talimati'];
                
                if (requiredFields.every(field => field in recipeDict)) {
                    console.log('✓ LLM reçetesi başarıyla oluşturuldu');
                    return recipeDict;
                } else {
                    console.log('Uyarı: LLM yanıtı eksik alanlar içeriyor. Fallback reçete kullanılıyor.');
                }
            } catch (parseError) {
                console.log('Uyarı: LLM yanıtı geçerli JSON değil. Fallback reçete kullanılıyor.');
            }
        }
    } catch (error) {
        console.error('LLM çağrısı başarısız:', error.message);
    }
    
    // Fallback kural tabanlı reçete
    console.log('Fallback reçete kullanılıyor');
    return generateFallbackRecipe(anomalyData);
}

module.exports = {
    generateLocalRecipe
};
