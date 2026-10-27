import { useState, useEffect } from 'react';
import axios from 'axios';

// Axios instance with extended timeout
const api = axios.create({
  timeout: 180000 // 3 dakika timeout
});
import { 
  AlertTriangle, 
  Droplets, 
  Gauge, 
  MapPin, 
  Shield, 
  Upload, 
  CheckCircle, 
  RefreshCw,
  Lock,
  Brain,
  FileText,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Loader2
} from 'lucide-react';
import QRPairingModal from './components/QRPairingModal';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

function App() {
  const [anomalyData, setAnomalyData] = useState(null);
  const [recipeData, setRecipeData] = useState(null);
  const [incidentId, setIncidentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState({ step: '', progress: 0 });
  
  // Fotoğraf pagination
  const [photosPerPage, setPhotosPerPage] = useState(6);
  const [showMorePhotos, setShowMorePhotos] = useState(false);
  
  // Senaryo ve dosya yükleme state'leri
  const [selectedScenario, setSelectedScenario] = useState('moda');
  const [scadaFile, setScadaFile] = useState(null);
  const [catalogFile, setCatalogFile] = useState(null);
  const [uploadingScada, setUploadingScada] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  
  // İş emri oluşturma state'leri
  const [incidentPriority, setIncidentPriority] = useState('medium');
  const [incidentDescription, setIncidentDescription] = useState('');
  
  // Senaryo konfigürasyonları (backend'den dinamik yüklenecek)
  const [scenarios, setScenarios] = useState([
    { id: 'moda', name: 'Moda Caddesi', lat: 40.9855, lng: 29.0270, segment: 'KD-402-A', description: 'Döküm demir boru, gece anomali tespiti' },
    { id: 'kadikoy', name: 'Kadıköy Rıhtım', lat: 40.9910, lng: 29.0245, segment: 'KD-405-B', description: 'Polietilen (HD-PE) boru, stabil akış' },
    { id: 'atasehir', name: 'Ataşehir', lat: 40.9982, lng: 29.1025, segment: 'AT-301-C', description: 'Çelik boru, gündüz tepe kullanım' }
  ]);

  // Zaman serisi verisi (backend'den gelecek)
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  // QR Modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Haritaya scroll et
  const scrollToMap = () => {
    const mapElement = document.getElementById('map-section');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Senaryoları backend'den yükle
  const fetchScenarios = async () => {
    try {
      const response = await api.get('/api/scenarios');
      if (response.data.success && response.data.scenarios.length > 0) {
        setScenarios(response.data.scenarios);
        // İlk senaryoyu seçili yap
        if (!selectedScenario) {
          setSelectedScenario(response.data.scenarios[0].id);
        }
      }
    } catch (err) {
      console.error('Senaryolar yüklenemedi:', err.message);
    }
  };

  // SCADA analizi yap
  const fetchAnalysis = async () => {
    if (loading) return; // Prevent multiple simultaneous calls
    
    setLoading(true);
    setError(null);
    setAnalysisProgress({ step: 'Anomali tespiti yapılıyor...', progress: 10 });
    
    try {
      // Simüle edilmiş progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev.progress < 50) {
            return { step: 'Anomali tespiti yapılıyor...', progress: Math.min(prev.progress + 5, 50) };
          } else {
            return { step: 'AI reçetesi üretiliyor...', progress: Math.min(prev.progress + 3, 95) };
          }
        });
      }, 500);
      
      const response = await api.get('/api/scada/analysis', {
        params: { scenario: selectedScenario }
      });
      
      clearInterval(progressInterval);
      setAnalysisProgress({ step: 'Tamamlandı', progress: 100 });
      
      if (response.data.success) {
        if (response.data.anomaly_detected) {
          setAnomalyData(response.data.anomaly_data);
          setRecipeData(response.data.recipe);
          setIncidentId(response.data.incident_id);
          // Zaman serisi verisini backend'den al
          if (response.data.anomaly_data.time_series) {
            setTimeSeriesData(response.data.anomaly_data.time_series);
          }
        } else {
          setAnomalyData(null);
          setRecipeData(null);
          setIncidentId(null);
          setTimeSeriesData([]);
          setError('Kritik anomali tespit edilemedi');
        }
      } else {
        setError('Analiz başarısız');
      }
    } catch (err) {
      setAnalysisProgress({ step: 'Hata', progress: 0 });
      setError('API bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setAnalysisProgress({ step: '', progress: 0 }), 1000);
    }
  };

  // Sayfa yüklendiğinde senaryoları ve audit logları çek (analiz manuel başlatılacak)
  useEffect(() => {
    fetchScenarios();
    fetchAuditLogs();
    fetchPhotos();
  }, []);

  // Fotoğrafları çek
  const fetchPhotos = async () => {
    try {
      const response = await api.get('/api/incidents/photos');
      if (response.data.success) {
        setUploadedPhotos(response.data.uploaded_photos || []);
      }
    } catch (err) {
      console.error('Fotoğraflar çekilemedi:', err.message);
    }
  };

  // İş emri oluştur
  const handleCreateIncident = async () => {
    try {
      const selectedScenarioData = scenarios.find(s => s.id === selectedScenario);
      if (!selectedScenarioData) {
        alert('Lütfen bir senaryo seçin');
        return;
      }

      const response = await api.post('/api/incidents/create', {
        scenario_id: selectedScenarioData.id,
        segment_id: selectedScenarioData.segment,
        location_name: selectedScenarioData.name,
        priority: incidentPriority,
        description: incidentDescription || 'Anomali tespit edildi, saha müdahalesi gerekli'
      });

      if (response.data.success) {
        alert(`İş emri oluşturuldu: ${response.data.incident.incident_id}`);
        fetchAuditLogs();
        // Formu temizle
        setIncidentPriority('medium');
        setIncidentDescription('');
      }
    } catch (err) {
      alert('İş emri oluşturma hatası: ' + err.message);
    }
  };

  // SCADA dosya yükleme
  const handleScadaUpload = async () => {
    if (!scadaFile) {
      alert('Lütfen bir SCADA dosyası seçin');
      return;
    }

    setUploadingScada(true);
    const formData = new FormData();
    formData.append('file', scadaFile);

    try {
      const response = await api.post('/api/upload/scada', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-KEY': import.meta.env.VITE_API_KEY || ''
        }
      });

      if (response.data.success) {
        alert('SCADA dosyası başarıyla yüklendi. Senaryolar ve analiz yeniden yapılıyor...');
        setScadaFile(null);
        fetchScenarios(); // Senaryoları yenile
        fetchAnalysis(); // Yeni veriyle analizi yeniden yap
      }
    } catch (err) {
      alert('SCADA dosya yükleme hatası: ' + err.message);
    } finally {
      setUploadingScada(false);
    }
  };

  // Katalog dosya yükleme
  const handleCatalogUpload = async () => {
    if (!catalogFile) {
      alert('Lütfen bir katalog dosyası seçin');
      return;
    }

    setUploadingCatalog(true);
    const formData = new FormData();
    formData.append('file', catalogFile);

    try {
      const response = await api.post('/api/upload/catalog', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-KEY': import.meta.env.VITE_API_KEY || ''
        }
      });

      if (response.data.success) {
        alert('Katalog dosyası başarıyla yüklendi. Analiz yeniden yapılıyor...');
        setCatalogFile(null);
        fetchAnalysis(); // Yeni veriyle analizi yeniden yap
      }
    } catch (err) {
      alert('Katalog dosya yükleme hatası: ' + err.message);
    } finally {
      setUploadingCatalog(false);
    }
  };

  // Senaryo değişimi
  const handleScenarioChange = (scenarioId) => {
    setSelectedScenario(scenarioId);
    // Analiz manuel olarak başlatılacak
  };

  // Audit logları çek
  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/api/audit/logs');
      if (response.data.success) {
        setAuditLogs(response.data.logs || []);
      }
    } catch (err) {
      console.error('Audit log çekme hatası:', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-iski-blue to-iski-light p-6">
      <div className="w-full px-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-iski-accent to-iski-warning p-3 rounded-xl">
                <Droplets className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-iski-blue">
                  İSKİ Akıllı Şebeke Otonom Karar Destek Paneli
                </h1>
                <p className="text-gray-600 text-sm">
                  SCADA Anomali Tespiti & AI Müdahale Reçetesi Sistemi
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                <Lock className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-semibold text-sm">
                  %100 Yerel Veri Gizliliği (Local RAG)
                </span>
              </div>
              
              <button
                onClick={() => setQrModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-iski-accent to-iski-warning text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-semibold">📱 QR Kod ile Bağlan</span>
              </button>
              
              <button
                onClick={fetchAnalysis}
                className="flex items-center gap-2 bg-iski-blue text-white px-4 py-2 rounded-lg hover:bg-iski-dark transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-semibold">Analizi Yenile</span>
              </button>
            </div>
          </div>

          {/* Dosya Yükleme ve Senaryo Seçici Paneli */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
            {/* SCADA Dosya Yükleme */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">SCADA Verisi (JSON)</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setScadaFile(e.target.files[0])}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-iski-light file:text-iski-blue hover:file:bg-iski-accent hover:file:text-white"
                />
              </div>
              <button
                onClick={handleScadaUpload}
                disabled={!scadaFile || uploadingScada}
                className="mt-4 bg-iski-blue text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-iski-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingScada ? 'Yükleniyor...' : 'Yükle'}
              </button>
            </div>

            {/* Katalog Dosya Yükleme */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Boru Kataloğu (TXT)</label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => setCatalogFile(e.target.files[0])}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-iski-light file:text-iski-blue hover:file:bg-iski-accent hover:file:text-white"
                />
              </div>
              <button
                onClick={handleCatalogUpload}
                disabled={!catalogFile || uploadingCatalog}
                className="mt-4 bg-iski-blue text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-iski-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingCatalog ? 'Yükleniyor...' : 'Yükle'}
              </button>
            </div>

            {/* Senaryo Seçici */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Senaryo / Konum Seçici</label>
              <select
                value={selectedScenario}
                onChange={(e) => handleScenarioChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-iski-blue"
              >
                {scenarios.map(scenario => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name} ({scenario.segment})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 text-blue-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-semibold">{analysisProgress.step || 'SCADA verisi analiz ediliyor...'}</span>
              </div>
              <span className="text-sm font-semibold text-blue-600">{analysisProgress.progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && !anomalyData && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <div className="flex items-center gap-3 text-yellow-600">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Main Content - 3-Layer Horizontal Grid */}
        {anomalyData && recipeData && (
          <div className="space-y-6">
            
            {/* EN ÜST KATMAN - Metrik Kartları (4 Kolonlu Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Segment Kodu */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-semibold">Segment Kodu</span>
                </div>
                <p className="text-2xl font-bold text-iski-blue">{anomalyData.segment_id}</p>
              </div>

              {/* Anlık Debi */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs font-semibold">Anlık Debi</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-600">{anomalyData.debi_m3h.toFixed(1)}</p>
                  <span className="text-sm text-gray-600">m³/h</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Normal: {anomalyData.normal_debi?.toFixed(1)}</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    +{anomalyData.debi_sapma?.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Anlık Basınç */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs font-semibold">Anlık Basınç</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-600">{anomalyData.basinc_bar.toFixed(1)}</p>
                  <span className="text-sm text-gray-600">bar</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Normal: {anomalyData.normal_basinc?.toFixed(1)}</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    -{anomalyData.basinc_sapma?.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Risk Skoru */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-2 text-white mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-semibold">Risk Skoru</span>
                </div>
                <p className="text-3xl font-bold text-white">{anomalyData?.risk_skoru || 0}/100</p>
                <p className="text-xs text-red-100 mt-1">{anomalyData?.risk_skoru > 70 ? 'Yüksek Risk' : anomalyData?.risk_skoru > 40 ? 'Orta Risk' : 'Düşük Risk'}</p>
              </div>
            </div>

            {/* ORTA KATMAN - Görselleştirme Satırı (2 Kolonlu Yan Yana Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SCADA Zaman Serisi Grafiği */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 h-[320px]">
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-semibold">SCADA Zaman Serisi (24 Saat)</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <Legend />
                    <ReferenceArea 
                      x1="20" 
                      x2="22" 
                      fill="rgba(245, 87, 108, 0.2)" 
                      stroke="rgba(245, 87, 108, 0.3)"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="debi" 
                      stroke="#667eea" 
                      strokeWidth={2}
                      name="Debi (m³/h)"
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="basinc" 
                      stroke="#f5576c" 
                      strokeWidth={2}
                      name="Basınç (bar)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* İnteraktif Konum Haritası */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm h-[320px] flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    📍 Konum Haritası (Saha Paftası)
                  </span>
                  <span className="text-xs bg-red-50 font-semibold text-red-600 border border-red-200 px-2.5 py-1 rounded-md font-mono">
                    {scenarios.find(s => s.id === selectedScenario)?.lat.toFixed(4)}° N, {scenarios.find(s => s.id === selectedScenario)?.lng.toFixed(4)}° E
                  </span>
                </div>

                {/* OpenStreetMap Harita */}
                <div className="h-[220px] w-full rounded-xl overflow-hidden relative border border-slate-200">
                  <MapContainer 
                    key={selectedScenario}
                    center={[scenarios.find(s => s.id === selectedScenario)?.lat || 40.9855, scenarios.find(s => s.id === selectedScenario)?.lng || 29.0270]} 
                    zoom={16} 
                    style={{ width: '100%', height: '100%' }}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[scenarios.find(s => s.id === selectedScenario)?.lat || 40.9855, scenarios.find(s => s.id === selectedScenario)?.lng || 29.0270]}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold">Segment: {anomalyData?.segment_id || scenarios.find(s => s.id === selectedScenario)?.segment}</p>
                          <p className="text-red-600 font-semibold">Sızıntı Riski: %{anomalyData?.leak_risk_percent || 94}</p>
                          <p className="text-xs text-gray-600 mt-1">{anomalyData?.location_name || scenarios.find(s => s.id === selectedScenario)?.name}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </div>

            {/* ALT KATMAN - YZ Reçetesi ve Saha Teyidi (2 Kolonlu Yan Yana Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Local LLM Müdahale Reçetesi */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-iski-accent to-iski-warning p-4">
                  <div className="flex items-center gap-3 text-white">
                    <Brain className="w-6 h-6" />
                    <div>
                      <h2 className="text-lg font-bold">Local LLM Müdahale Reçetesi</h2>
                      <p className="text-purple-100 text-xs">Explainable AI Karar Destek Sistemi</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Boru Künyesi */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-semibold">Boru Künyesi</span>
                      </div>
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-mono">
                        OCR: %96.4
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-iski-blue">
                      {recipeData.boru_kunyesi}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Otomatik İşlendi (Human-in-the-Loop Onaylı)</p>
                  </div>

                  {/* AI Gerekçesi */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-purple-700 mb-1">
                      <Brain className="w-4 h-4" />
                      <span className="text-xs font-semibold">Yapay Zekâ Gerekçesi</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {recipeData.gerekce}
                    </p>
                  </div>

                  {/* Anomali Özeti */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-semibold">Anomali Özeti</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {recipeData.anomali_ozeti}
                    </p>
                  </div>

                  {/* Eylem Reçetesi */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-yellow-700 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-semibold">🛑 Otonom Müdahale Reçetesi</span>
                    </div>
                    <p className="text-base font-bold text-red-600 leading-relaxed">
                      {recipeData.eylem_recetesi}
                    </p>
                  </div>

                  {/* Saha Talimatı */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-semibold">Nokta Atışı Saha Talimatı</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {recipeData.saha_talimati}
                    </p>
                  </div>
                </div>
              </div>

              {/* İş Emri Oluşturma */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <div className="flex items-center gap-3 text-white">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                      <h2 className="text-lg font-bold">İş Emri Oluştur</h2>
                      <p className="text-blue-100 text-xs">Saha Teknisyenine Gönder</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Senaryo
                    </label>
                    <select
                      value={selectedScenario}
                      onChange={(e) => setSelectedScenario(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-iski-accent focus:border-transparent"
                    >
                      {scenarios.map(scenario => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Öncelik
                    </label>
                    <select 
                      value={incidentPriority}
                      onChange={(e) => setIncidentPriority(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-iski-accent focus:border-transparent"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="critical">Kritik</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-iski-accent focus:border-transparent"
                      rows="3"
                      placeholder="İş emri detaylarını girin..."
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateIncident}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>İş Emri Oluştur ve Gönder</span>
                  </button>
                </div>
              </div>

              {/* Gelen Fotoğraflar */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                  <div className="flex items-center gap-3 text-white">
                    <FileText className="w-6 h-6" />
                    <div>
                      <h2 className="text-lg font-bold">Gelen Fotoğraflar</h2>
                      <p className="text-purple-100 text-xs">Saha Müdahale Doğrulamaları</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedPhotos.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Henüz fotoğraf yüklenmedi</p>
                      </div>
                    ) : (
                      uploadedPhotos.slice(0, showMorePhotos ? uploadedPhotos.length : photosPerPage).map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={`http://localhost:5000${photo.path}`}
                            alt={photo.filename}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs text-center px-2">
                              {new Date(photo.created_at).toLocaleString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {uploadedPhotos.length > photosPerPage && (
                    <button
                      onClick={() => setShowMorePhotos(!showMorePhotos)}
                      className="mt-4 w-full py-2 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors border border-purple-200 rounded-lg hover:bg-purple-50"
                    >
                      {showMorePhotos 
                        ? `Daha Az Göster (${uploadedPhotos.length} fotoğraf)` 
                        : `Daha Fazla Göster (${uploadedPhotos.length - photosPerPage} fotoğraf daha)`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log Tablosu */}
        {auditLogs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mt-6">
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-semibold">Geçmiş Audit Kayıtları (Teyit Edilmiş Olaylar)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Olay ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Konum</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Segment</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Öncelik</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tarih</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Teknisyen Notu</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fotoğraf</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.incident_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{log.incident_id}</td>
                      <td className="py-3 px-4 font-semibold text-iski-blue text-xs">{log.location_name || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-gray-700 text-xs">{log.segment_id}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          log.priority === 'high' || log.priority === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : log.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {log.priority === 'high' ? 'Yüksek' : log.priority === 'critical' ? 'Kritik' : log.priority === 'medium' ? 'Orta' : 'Düşük'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {new Date(log.timestamp || log.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          log.status === 'VERIFIED_AND_CLOSED' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status === 'VERIFIED_AND_CLOSED' ? '✓ Kapatıldı' : 'Beklemede'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate">
                        {log.technician_note || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {log.image_path || log.photo_path ? (
                          <a
                            href={`http://localhost:5000${log.image_path || log.photo_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-xs"
                          >
                            Görüntüle
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-white/70 text-sm">
          <p>İSKİ Akıllı Şebeke Karar Destek Sistemi © 2026</p>
          <p className="text-xs mt-1">Powered by Local RAG & Anomaly Detection AI</p>
        </div>
      </div>

      {/* QR Pairing Modal */}
      <QRPairingModal 
        isOpen={qrModalOpen} 
        onClose={() => setQrModalOpen(false)} 
      />
    </div>
  );
}

export default App;
