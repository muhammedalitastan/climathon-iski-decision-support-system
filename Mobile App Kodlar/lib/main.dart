import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'services/api_service.dart';
import 'views/qr_scanner_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'İSKİ Saha Tekniker Modülü',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF020617),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Color(0xFFF59E0B),
          error: Color(0xFFEF4444),
          surface: Color(0xFF1E293B),
        ),
        cardColor: const Color(0xFF1E293B),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0F172A),
          foregroundColor: Colors.white,
        ),
      ),
      home: const TechnicianDashboard(),
    );
  }
}

class TechnicianDashboard extends StatefulWidget {
  const TechnicianDashboard({super.key});

  @override
  State<TechnicianDashboard> createState() => _TechnicianDashboardState();
}

class _TechnicianDashboardState extends State<TechnicianDashboard> {
  // State variables
  Map<String, dynamic>? incidentData;
  bool isLoading = false;
  bool isSubmitting = false;
  File? selectedImage;
  final TextEditingController _noteController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  
  // Checklist state
  final List<bool> _checklistStates = List.generate(5, (index) => false);
  
  // Polling timer
  Timer? _pollingTimer;
  
  @override
  void initState() {
    super.initState();
    _fetchIncidentData();
    // 30 saniyede bir otomatik polling
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _noteController.dispose();
    super.dispose();
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _fetchIncidentData();
    });
  }

  Future<void> _fetchIncidentData() async {
    setState(() {
      isLoading = true;
    });

    try {
      final data = await ApiService.getActiveIncident();
      setState(() {
        incidentData = data;
        isLoading = false;
      });
    } catch (e) {
      print('[ERROR] Fetch incident: $e');
      setState(() {
        incidentData = null;
        isLoading = false;
      });
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          selectedImage = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kamera hatası: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _launchGoogleMaps() async {
    const latitude = 40.9855;
    const longitude = 29.0270;
    
    // Simple Google Maps URL
    final url = 'https://maps.google.com/?q=$latitude,$longitude';
    
    try {
      final launched = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
      
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Google Maps açılamadı'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Google Maps hatası: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _submitIncident() async {
    if (selectedImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen önce müdahale fotoğrafı çekin!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      isSubmitting = true;
    });

    try {
      final result = await ApiService.sendFieldConfirmation(
        incidentId: incidentData?['incident_id']?.toString() ?? '',
        technicianNote: _noteController.text.trim(),
        imageFile: selectedImage!,
      );

      if (result['success'] == true) {
        setState(() {
          isSubmitting = false;
          selectedImage = null;
          _noteController.clear();
          incidentData = null;
          _checklistStates.fillRange(0, _checklistStates.length, false);
        });

        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              title: const Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 28),
                  SizedBox(width: 8),
                  Text('İşlem Başarılı'),
                ],
              ),
              content: const Text(
                '✅ İş Emri Fotoğrafla Teyit Edildi ve Audit Log Veritabanına Kaydedildi',
                style: TextStyle(color: Colors.white),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _fetchIncidentData();
                  },
                  child: const Text('Tamam'),
                ),
              ],
            ),
          );
        }
      } else {
        throw Exception(result['error'] ?? 'Gönderim başarısız');
      }
    } catch (e) {
      print('[DEBUG] Error: $e');
      setState(() {
        isSubmitting = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gönderim hatası: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // A. Üst Mobil Header & Canlı Bağlantı Rozeti
              _buildHeader(),
              const SizedBox(height: 16),

              // Loading indicator
              if (isLoading)
                const Center(
                  child: CircularProgressIndicator(),
                )
              else if (incidentData != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // B. Acil İş Emri Uyarı Kartı
                    _buildAlertBanner(),
                    const SizedBox(height: 16),

                    // C. İş Emri ve AI Eylem Reçetesi Kartı
                    _buildIncidentCard(),
                    const SizedBox(height: 16),

                    // D. Kamera & Fotoğraflı Saha Teyit Modülü
                    _buildAuditTrailModule(),
                  ],
                )
              else
                _buildNoIncidentScreen(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '📱 İSKİ Saha Tekniker Modülü',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Ahmet Yılmaz (Saha Ekip #4)',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  IconButton(
                    onPressed: () async {
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const QRScannerScreen(),
                        ),
                      );
                      if (result == true) {
                        _fetchIncidentData();
                      }
                    },
                    icon: const Icon(Icons.qr_code_scanner, color: Color(0xFF10B981)),
                    tooltip: 'Sunucu Bağlantısı',
                  ),
                  IconButton(
                    onPressed: _fetchIncidentData,
                    icon: const Icon(Icons.refresh, color: Color(0xFF10B981)),
                    tooltip: 'Veri Tazele',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF064E3B),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF10B981)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.circle, color: Colors.green, size: 8),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Yer İstasyonu Senkronize',
                    style: const TextStyle(
                      color: Colors.green,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFFEA580C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFDC2626).withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning, color: Colors.white, size: 24),
              SizedBox(width: 8),
              Text(
                '🚨 ACİL İŞ EMRİ ATANDI',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            'Kadıköy/Moda bölgesinde yüksek debi ve düşük basınç anomalisi tespit edildi.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIncidentCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📍 Görev Konumu',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            incidentData?['location'] ?? 'KD-402-A - Moda Caddesi Kesişimi',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          
          // Navigasyon Butonu
          ElevatedButton.icon(
            onPressed: _launchGoogleMaps,
            icon: const Icon(Icons.map, color: Colors.white),
            label: const Text('🗺️ Navigasyonu Başlat'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          const Text(
            '📋 Adım Adım Kontrol Listesi',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 8),
          
          // Checklist Items
          _buildChecklistItem(
            0,
            'Boru Malzemesi: 1988 Döküm Demir (Gevrek Yapı - Koç Darbesi Riski Yüksek)',
          ),
          _buildChecklistItem(
            1,
            'Adım 1: Moda Caddesi kesişimindeki VANA-12 konumuna ulaşın.',
          ),
          _buildChecklistItem(
            2,
            'Adım 2 (Kritik YZ Talimatı): VANA-12\'yi %20 kademeli adımlarla (her adımda 5 dk bekleyerek) kapatın. Ani kapatma yapmayın!',
            isCritical: true,
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistItem(int index, String text, {bool isCritical = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Checkbox(
            value: _checklistStates[index],
            onChanged: (value) {
              setState(() {
                _checklistStates[index] = value ?? false;
              });
            },
            activeColor: isCritical ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
          ),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: isCritical ? const Color(0xFFF59E0B) : Colors.white,
                fontWeight: isCritical ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAuditTrailModule() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📸 Fotoğraflı Saha Teyit Modülü',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 12),
          
          // Kamera Butonu
          ElevatedButton.icon(
            onPressed: _pickImage,
            icon: const Icon(Icons.camera_alt, color: Colors.white),
            label: const Text('Fotoğraf Çek'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 12),
          
          // Fotoğraf Önizleme
          if (selectedImage != null)
            Container(
              height: 160,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(
                  selectedImage!,
                  fit: BoxFit.cover,
                ),
              ),
            )
          else
            Container(
              height: 160,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.add_photo_alternate,
                      size: 48,
                      color: Color(0xFF475569),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Henüz fotoğraf çekilmedi',
                      style: TextStyle(
                        color: Color(0xFF475569),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),
          
          // Teknisyen Notu
          const Text(
            '📝 Teknisyen Notu',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _noteController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Örn: VANA-12 %20 kademeli adımlarla kapatıldı, sızıntı kesildi.',
              hintStyle: const TextStyle(color: Color(0xFF475569)),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF334155)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF334155)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF10B981)),
              ),
            ),
            style: const TextStyle(color: Colors.white),
          ),
          const SizedBox(height: 16),
          
          // Gönder Butonu
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: isSubmitting ? null : _submitIncident,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFF065F46),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: isSubmitting
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      '📸 Müdahale Fotoğrafını Gönder ve İş Emrini Kapat',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoIncidentScreen() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: const Column(
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 80,
            color: Color(0xFF10B981),
          ),
          SizedBox(height: 16),
          Text(
            '✅ Şu An Atanmış Acil İş Emri Bulunmamaktadır',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 8),
          Text(
            'Sistem senkronize ediliyor, yeni iş emirleri otomatik olarak bildirilecektir.',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF94A3B8),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
