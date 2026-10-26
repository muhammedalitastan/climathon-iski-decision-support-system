/**
 * API Key Authentication Middleware
 * Mobil uygulama ve dış API istekleri için basit doğrulama
 * IP bağımsız çalışır, header üzerinden doğrulama yapar
 */

const API_KEY = process.env.MOBILE_API_KEY || "iski_field_mobile_secret_2026";

/**
 * API Key doğrulama middleware'i
 * X-API-KEY header'ını kontrol eder
 */
const validateApiKey = (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  
  if (!clientKey) {
    return res.status(401).json({ 
      success: false,
      error: "Yetkisiz Erişim: API Key eksik." 
    });
  }
  
  if (clientKey !== API_KEY) {
    return res.status(401).json({ 
      success: false,
      error: "Yetkisiz Erişim: Geçersiz API Key." 
    });
  }
  
  // API key geçerli, devam et
  next();
};

/**
 * Opsiyonel API Key doğrulama
 * Eğer API key varsa doğrular, yoksa geçer (web dashboard için)
 */
const optionalApiKey = (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  
  if (clientKey && clientKey !== API_KEY) {
    return res.status(401).json({ 
      success: false,
      error: "Yetkisiz Erişim: Geçersiz API Key." 
    });
  }
  
  next();
};

module.exports = {
  validateApiKey,
  optionalApiKey
};
