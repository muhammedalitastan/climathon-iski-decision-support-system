import React, { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

/**
 * QR Code Pairing Modal Component
 * Mobil uygulama ile yer istasyonu eşleştirmesi için QR kod gösterir
 */
const QRPairingModal = ({ isOpen, onClose }) => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo();
    }
  }, [isOpen]);

  const fetchNetworkInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/system/network-info');
      if (response.data.success) {
        setNetworkInfo(response.data);
      } else {
        setError('Network bilgisi alınamadı');
      }
    } catch (err) {
      setError('API bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const qrData = networkInfo
    ? JSON.stringify({
        server_url: networkInfo.server_url,
        api_key: networkInfo.api_key
      })
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-iski-accent to-iski-warning p-2 rounded-lg">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Mobil Cihaz Eşleştir
              </h2>
              <p className="text-sm text-gray-600">
                QR kod ile saha uygulamasını bağlayın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iski-accent mb-4"></div>
            <p className="text-gray-600">Network bilgisi yükleniyor...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Hata</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchNetworkInfo}
              className="mt-3 text-sm text-red-700 font-semibold hover:text-red-800"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* QR Code Display */}
        {!loading && !error && networkInfo && (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
              <QRCodeSVG
                value={qrData}
                size={200}
                level="H"
                includeMargin={true}
                className="rounded-lg"
              />
            </div>

            {/* Network Info */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sunucu URL:</span>
                <span className="text-sm font-mono font-semibold text-iski-blue">
                  {networkInfo.server_url}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Hostname:</span>
                <span className="text-sm font-mono text-gray-800">
                  {networkInfo.hostname}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Eşleştirme Adımları:</p>
                  <ol className="list-decimal list-inside space-y-1 text-green-700">
                    <li>Mobil uygulamayı açın</li>
                    <li>Sağ üst köşedeki QR ikonuna tıklayın</li>
                    <li>Bu QR kodu okutun</li>
                    <li>Bağlantı otomatik kurulacaktır</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchNetworkInfo}
              className="w-full bg-iski-blue text-white py-3 rounded-xl font-semibold hover:bg-iski-dark transition-colors"
            >
              QR Kodu Yenile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRPairingModal;
