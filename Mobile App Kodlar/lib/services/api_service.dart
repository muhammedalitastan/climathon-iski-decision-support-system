import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _baseUrlKey = 'backend_base_url';
  static const String _deviceIdKey = 'device_id';
  // API Key should be set from environment variable or config
  static String apiKey = '';

  /// SharedPreferences'ten baseUrl'i al
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_baseUrlKey);
    if (savedUrl == null || savedUrl.isEmpty) {
      throw Exception('Backend URL not configured. Please scan QR code to set server URL.');
    }
    return savedUrl;
  }

  /// SharedPreferences'e baseUrl'i kaydet
  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, url);
  }

  /// Kaydedilen baseUrl'i temizle (default'a dön)
  static Future<void> clearBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_baseUrlKey);
  }

  /// Device ID'yi al
  static Future<String?> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_deviceIdKey);
  }

  /// Device ID'yi kaydet
  static Future<void> setDeviceId(String deviceId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_deviceIdKey, deviceId);
  }

  /// Aktif baseUrl'i getir (async olmayan versiyon)
  static String? _cachedBaseUrl;

  static Future<String> _getCachedBaseUrl() async {
    if (_cachedBaseUrl == null) {
      _cachedBaseUrl = await getBaseUrl();
    }
    return _cachedBaseUrl!;
  }

  /// Cache'i temizle (yeni URL set edildiğinde çağrılmalı)
  static void clearCache() {
    _cachedBaseUrl = null;
  }

  /// Aktif iş emrini getir
  static Future<Map<String, dynamic>?> getActiveIncident() async {
    try {
      final baseUrl = await _getCachedBaseUrl();
      final deviceId = await getDeviceId();
      
      if (apiKey.isEmpty) {
        print('[API] API Key not configured');
        return null;
      }
      
      final headers = <String, String>{
        'X-API-KEY': apiKey,
      };
      
      if (deviceId != null && deviceId.isNotEmpty) {
        headers['X-Device-ID'] = deviceId;
      }
      
      // Önce yeni endpoint'i dene: /api/mobile/incidents
      try {
        final mobileResponse = await http.get(
          Uri.parse('$baseUrl/api/mobile/incidents'),
          headers: headers,
        ).timeout(
          const Duration(seconds: 10),
          onTimeout: () => throw Exception('Bağlantı zaman aşımı'),
        );

        if (mobileResponse.statusCode == 200) {
          final data = _parseJson(mobileResponse.body);
          if (data['success'] == true && data['incidents'] != null && data['incidents'].length > 0) {
            // İlk açık iş emrini al
            final incident = data['incidents'][0];
            return {
              'incident_id': incident['incident_id'],
              'location': incident['location_name'] ?? incident['location'] ?? 'Belirtilmedi',
              'coordinates': {
                'latitude': incident['latitude'] ?? 0.0,
                'longitude': incident['longitude'] ?? 0.0,
              },
              'anomaly_type': incident['anomaly_type'] ?? 'Belirtilmedi',
              'severity': incident['severity'] ?? 'HIGH',
              'timestamp': incident['created_at'] ?? incident['timestamp'] ?? new DateTime.now().toIso8601String(),
              'pipe_material': incident['pipe_material'] ?? 'Belirtilmedi',
              'ai_recipe': incident['ai_recipe'] ?? incident['recipe'] ?? [],
              'device_id': incident['device_id'],
            };
          }
        }
      } catch (e) {
        print('[API] /api/mobile/incidents failed, trying fallback: $e');
      }
      
      // Fallback: Eski endpoint /api/scada/analysis
      final response = await http.get(
        Uri.parse('$baseUrl/api/scada/analysis'),
        headers: headers,
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw Exception('Bağlantı zaman aşımı'),
      );

      if (response.statusCode == 200) {
        final data = _parseJson(response.body);
        
        // Kullanıcının backend veri yapısı: {success, anomaly_detected, incident_id, anomaly_data}
        if (data['success'] == true && data['anomaly_detected'] == true) {
          // anomaly_data'dan gerekli alanları çıkar ve standart formata çevir
          final anomalyData = data['anomaly_data'] ?? {};
          return {
            'incident_id': data['incident_id'],
            'location': anomalyData['location_name'] ?? 'Belirtilmedi',
            'coordinates': {
              'latitude': anomalyData['latitude'] ?? 0.0,
              'longitude': anomalyData['longitude'] ?? 0.0,
            },
            'anomaly_type': anomalyData['anomaly_type'] ?? 'Belirtilmedi',
            'severity': anomalyData['severity'] ?? 'HIGH',
            'timestamp': data['timestamp'] ?? new DateTime.now().toIso8601String(),
            'pipe_material': anomalyData['pipe_material'] ?? 'Belirtilmedi',
            'ai_recipe': anomalyData['ai_recipe'] ?? [],
            'device_id': null,
          };
        }
        
        // Eski backend veri yapısı: {success, data}
        if (data['success'] == true && data['data'] != null) {
          return data['data'];
        }
      }
      return null;
    } catch (e) {
      print('[API] Get incident error: $e');
      return null;
    }
  }

  /// İş emrini fotoğrafla teyit et
  static Future<Map<String, dynamic>> sendFieldConfirmation({
    required String incidentId,
    required String technicianNote,
    required File imageFile,
  }) async {
    try {
      final baseUrl = await _getCachedBaseUrl();
      print('[API] Sending to: $baseUrl/api/scada/confirm');
      
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/scada/confirm'),
      );

      // Güvenlik Header'ları
      request.headers['X-API-KEY'] = apiKey;

      // Form Verileri
      request.fields['incident_id'] = incidentId;
      request.fields['technician_note'] = technicianNote;

      // Fotoğraf Dosyası
      request.files.add(
        await http.MultipartFile.fromPath(
          'photo',
          imageFile.path,
        ),
      );

      final response = await request.send().timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw Exception('Gönderim zaman aşımı'),
      );

      final responseBody = await response.stream.bytesToString();
      final data = _parseJson(responseBody);

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('[API] Success: ${data['message']}');
        return {'success': true, 'data': data};
      } else if (response.statusCode == 401) {
        print('[API] Unauthorized: API Key geçersiz');
        return {'success': false, 'error': 'Yetkilendirme hatası'};
      } else if (response.statusCode == 429) {
        print('[API] Rate limit exceeded');
        return {'success': false, 'error': 'Çok fazla istek'};
      } else {
        print('[API] Error: ${response.statusCode} - $responseBody');
        return {'success': false, 'error': 'Sunucu hatası: ${response.statusCode}'};
      }
    } catch (e) {
      print('[API] Connection error: $e');
      return {'success': false, 'error': 'Bağlantı hatası: $e'};
    }
  }

  /// JSON parse helper
  static Map<String, dynamic> _parseJson(String jsonString) {
    try {
      // Basit JSON parse (dart:convert kullanmadan)
      final lines = jsonString.split(',');
      final Map<String, dynamic> result = {};
      
      for (var line in lines) {
        final parts = line.split(':');
        if (parts.length == 2) {
          final key = parts[0].trim().replaceAll('"', '').replaceAll('{', '').replaceAll('}', '');
          final value = parts[1].trim().replaceAll('"', '').replaceAll('{', '').replaceAll('}', '');
          result[key] = value;
        }
      }
      
      return result;
    } catch (e) {
      print('[API] JSON parse error: $e');
      return {};
    }
  }
}
