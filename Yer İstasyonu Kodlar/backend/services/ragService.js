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
            stream: true,
            format: 'json'
        };
        
        const response = await axios.post(OLLAMA_API_URL, payload, {
            timeout: 180000, // 3 dakika timeout
            responseType: 'stream'
        });
        
        let fullResponse = '';
        
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                try {
                    const lines = chunk.toString().split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const json = JSON.parse(line);
                        if (json.response) {
                            fullResponse += json.response;
                        }
                        if (json.done) {
                            resolve(fullResponse);
                        }
                    }
                } catch (e) {
                    // Streaming chunk parse hatası - yoksay
                }
            });
            
            response.data.on('end', () => {
                resolve(fullResponse);
            });
            
            response.data.on('error', (err) => {
                reject(err);
            });
        });
        
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
                    console.log('Hata: LLM yanıtı eksik alanlar içeriyor.');
                    return null;
                }
            } catch (parseError) {
                console.log('Hata: LLM yanıtı geçerli JSON değil.');
                return null;
            }
        }
    } catch (error) {
        console.error('LLM çağrısı başarısız:', error.message);
        return null;
    }
    
    return null;
}

module.exports = {
    generateLocalRecipe
};
