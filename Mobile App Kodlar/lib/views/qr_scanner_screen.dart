import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  bool _isScanning = true;
  String? _scannedUrl;
  bool _isProcessing = false;

  @override
  void dispose() {
    _isScanning = false;
    super.dispose();
  }

  String _generateDeviceId() {
    final random = Random();
    final bytes = List<int>.generate(16, (index) => random.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_isScanning || _isProcessing) return;

    final barcode = capture.barcodes.first;
    if (barcode.rawValue == null) return;

    final code = barcode.rawValue!;
    print('[QR] Scanned: $code');

    setState(() {
      _isProcessing = true;
      _scannedUrl = code;
    });

    _processScannedCode(code);
  }

  Future<void> _processScannedCode(String code) async {
    try {
      // JSON formatında beklenen: {"server_url": "http://192.168.1.105:5000"}
      // Veya doğrudan URL: "http://192.168.1.105:5000"
      
      String serverUrl = '';
      
      if (code.startsWith('{')) {
        // JSON format
        final jsonData = jsonDecode(code);
        serverUrl = jsonData['server_url']?.toString() ?? '';
      } else {
        // Doğrudan URL
        serverUrl = code;
      }

      // URL validasyonu
      if (serverUrl.isEmpty || !serverUrl.startsWith('http')) {
        _showError('Geçersiz QR kod formatı');
        setState(() {
          _isProcessing = false;
          _scannedUrl = null;
        });
        return;
      }

      // URL'i kaydet
      await ApiService.setBaseUrl(serverUrl);
      ApiService.clearCache();

      // Device ID oluştur ve kaydet
      final deviceId = await ApiService.getDeviceId();
      if (deviceId == null || deviceId.isEmpty) {
        final newDeviceId = _generateDeviceId();
        await ApiService.setDeviceId(newDeviceId);
        print('[QR] New Device ID: $newDeviceId');
      } else {
        print('[QR] Existing Device ID: $deviceId');
      }

      if (mounted) {
        _showSuccess(serverUrl);
      }
    } catch (e) {
      print('[QR] Error processing code: $e');
      _showError('QR kod işlenirken hata oluştu');
      setState(() {
        _isProcessing = false;
        _scannedUrl = null;
      });
    }
  }

  void _showSuccess(String url) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 28),
            SizedBox(width: 8),
            Text('Bağlantı Başarılı'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sunucu URL\'i başarıyla kaydedildi:',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 8),
            Text(
              url,
              style: const TextStyle(
                color: Colors.green,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context, true); // QR scanner'ı kapat ve true döndür
            },
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _showError(String message) {
    if (!mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _resetScanner() {
    setState(() {
      _isProcessing = false;
      _scannedUrl = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Sunucu Bağlantısı'),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  onDetect: _onDetect,
                ),
                if (_isProcessing)
                  Container(
                    color: Colors.black54,
                    child: const Center(
                      child: CircularProgressIndicator(color: Colors.green),
                    ),
                  ),
              ],
            ),
          ),
          if (_scannedUrl != null)
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF020617),
              child: Column(
                children: [
                  Text(
                    'Taranan URL: $_scannedUrl',
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _resetScanner,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Yeniden Tara'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(24),
              color: const Color(0xFF020617),
              child: Column(
                children: [
                  const Icon(
                    Icons.qr_code_scanner,
                    size: 48,
                    color: Colors.green,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Sunucunun QR kodunu kameraya tutun',
                    style: TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Beklenen format: {"server_url": "http://IP:PORT"}',
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
