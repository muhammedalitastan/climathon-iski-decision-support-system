import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// API Service
/// Dinamik server URL ve API key ile backend ile iletişim kurar
class ApiService {
  static ApiService? _instance;
  
  late Dio _dio;
  String _serverUrl = 'http://localhost:5000';
  String _apiKey = 'iski_field_mobile_secret_2026';

  // Singleton pattern
  static ApiService get instance {
    _instance ??= ApiService._internal();
    return _instance!;
  }

  ApiService._internal() {
    _dio = Dio();
    _initializeFromPreferences();
    _configureDio();
  }

  /// SharedPreferences'tan kayıtlı ayarları yükle
  Future<void> _initializeFromPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    _serverUrl = prefs.getString('server_url') ?? 'http://localhost:5000';
    _apiKey = prefs.getString('api_key') ?? 'iski_field_mobile_secret_2026';
    _configureDio();
  }

  /// Dio konfigürasyonu
  void _configureDio() {
    _dio = Dio(BaseOptions(
      baseUrl: _serverUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': _apiKey,
      },
    ));

    // Interceptor for logging
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          print('📡 API Request: ${options.method} ${options.uri}');
          print('   Headers: ${options.headers}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          print('✅ API Response: ${response.statusCode} ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (error, handler) {
          print('❌ API Error: ${error.message}');
          print('   Status: ${error.response?.statusCode}');
          return handler.next(error);
        },
      ),
    );
  }

  /// Server URL güncelle
  void updateServerUrl(String url) {
    _serverUrl = url;
    _configureDio();
  }

  /// API Key güncelle
  void updateApiKey(String key) {
    _apiKey = key;
    _configureDio();
  }

  /// Mevcut server URL'i döndür
  String get serverUrl => _serverUrl;

  /// Mevcut API key'i döndür
  String get apiKey => _apiKey;

  /// Bağlantı testi
  Future<bool> testConnection() async {
    try {
      final response = await _dio.get('/api/health');
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      print('Connection test failed: $e');
      return false;
    }
  }

  /// SCADA analizi getir
  Future<Map<String, dynamic>> getScadaAnalysis({String? scenario}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (scenario != null) {
        queryParams['scenario'] = scenario;
      }

      final response = await _dio.get(
        '/api/scada/analysis',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Analiz başarısız: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('SCADA analizi hatası: $e');
    }
  }

  /// Saha teyidi gönder
  Future<Map<String, dynamic>> submitFieldVerification({
    required String incidentId,
    required String photoPath,
    required String technicianNote,
  }) async {
    try {
      final formData = FormData.fromMap({
        'incident_id': incidentId,
        'photo': await MultipartFile.fromFile(photoPath),
        'technician_note': technicianNote,
      });

      final response = await _dio.post(
        '/api/scada/confirm',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Teyit başarısız: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Saha teyidi hatası: $e');
    }
  }

  /// Audit logları getir
  Future<Map<String, dynamic>> getAuditLogs() async {
    try {
      final response = await _dio.get('/api/audit/logs');
      
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Audit logları alınamadı: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Audit log hatası: $e');
    }
  }

  /// SCADA dosyası yükle
  Future<Map<String, dynamic>> uploadScadaFile(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });

      final response = await _dio.post(
        '/api/upload/scada',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('SCADA yükleme başarısız: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('SCADA yükleme hatası: $e');
    }
  }

  /// Katalog dosyası yükle
  Future<Map<String, dynamic>> uploadCatalogFile(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });

      final response = await _dio.post(
        '/api/upload/catalog',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Katalog yükleme başarısız: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Katalog yükleme hatası: $e');
    }
  }

  /// Network bilgisi getir (QR kod için)
  Future<Map<String, dynamic>> getNetworkInfo() async {
    try {
      final response = await _dio.get('/api/system/network-info');
      
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Network bilgisi alınamadı: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network info hatası: $e');
    }
  }
}
