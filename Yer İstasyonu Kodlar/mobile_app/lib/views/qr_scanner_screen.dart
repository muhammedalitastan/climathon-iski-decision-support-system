import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:iski_field_app/services/api_service.dart';

/// QR Scanner Screen
/// Yer istasyonundaki QR kodu okutarak mobil cihazı eşleştirir
class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  bool _isScanning = true;
  bool _isProcessing = false;
  String? _scannedData;
  String? _errorMessage;

  @override
  void dispose() {
    _isScanning = false;
    super.dispose();
  }

  Future<void> _processQRCode(String qrData) async {
    if (_isProcessing) return;
    
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      // QR verisini JSON olarak parse et
      final Map<String, dynamic> data = jsonDecode(qrData);
      
      final String? serverUrl = data['server_url'];
      final String? apiKey = data['api_key'];

      if (serverUrl == null || apiKey == null) {
        throw Exception('Geçersiz QR kod formatı');
      }

      // SharedPreferences'a kaydet
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('server_url', serverUrl);
      await prefs.setString('api_key', apiKey);

      // API servisini güncelle
      ApiService.instance.updateServerUrl(serverUrl);
      ApiService.instance.updateApiKey(apiKey);

      // Bağlantıyı test et
      final isConnected = await ApiService.instance.testConnection();

      if (isConnected) {
        if (mounted) {
          // Başarılı bağlantı mesajı göster
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Yer İstasyonuna Başarıyla Bağlandı! (IP: ${Uri.parse(serverUrl).host})',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );

          // Ana ekrana dön
          Navigator.pop(context, true);
        }
      } else {
        throw Exception('Bağlantı testi başarısız');
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'QR kod işleme hatası: ${e.toString()}';
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bağlantı hatası: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Kod Okut'),
        backgroundColor: const Color(0xFF1E88E5),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Scanner Area
          Expanded(
            child: _isScanning
                ? MobileScanner(
                    onDetect: (capture) {
                      if (!_isProcessing) {
                        final barcode = capture.barcodes.first;
                        if (barcode.rawValue != null) {
                          _scannedData = barcode.rawValue;
                          _isScanning = false;
                          _processQRCode(barcode.rawValue!);
                        }
                      }
                    },
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_isProcessing)
                          const CircularProgressIndicator()
                        else if (_errorMessage != null)
                          Column(
                            children: [
                              const Icon(Icons.error, size: 64, color: Colors.red),
                              const SizedBox(height: 16),
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 16),
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton.icon(
                                onPressed: () {
                                  setState(() {
                                    _isScanning = true;
                                    _errorMessage = null;
                                  });
                                },
                                icon: const Icon(Icons.refresh),
                                label: const Text('Tekrar Dene'),
                              ),
                            ],
                          )
                        else
                          const Icon(Icons.check_circle, size: 64, color: Colors.green),
                      ],
                    ),
                  ),
          ),

          // Instructions
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.grey[100],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Eşleştirme Adımları:',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                _buildStep('1', 'Yer istasyonundaki Web Dashboard\'u açın'),
                _buildStep('2', 'Üst bardan "Mobil Cihaz Eşleştir" butonuna tıklayın'),
                _buildStep('3', 'Ekranda çıkan QR kodu bu kameraya okutun'),
                _buildStep('4', 'Bağlantı otomatik kurulacaktır'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFF1E88E5),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
