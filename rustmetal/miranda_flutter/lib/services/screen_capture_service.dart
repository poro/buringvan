import 'dart:async';
import 'package:flutter/services.dart';

class ScreenCaptureService {
  static final ScreenCaptureService _instance = ScreenCaptureService._internal();
  factory ScreenCaptureService() => _instance;
  ScreenCaptureService._internal();

  static const MethodChannel _channel = MethodChannel('screen_capture');
  
  bool _isCapturing = false;
  bool _hasPermission = false;
  Timer? _captureTimer;
  StreamController<Map<String, dynamic>>? _captureController;

  // Enable real screen capture (request MediaProjection permission)
  Future<bool> enableRealScreenCapture() async {
    if (_hasPermission) {
      print('Screen capture permission already granted');
      return true;
    }

    try {
      print('Requesting screen capture permission...');
      final result = await _channel.invokeMethod('requestScreenCapture');
      _hasPermission = result == true;
      
      if (_hasPermission) {
        print('Screen capture permission granted');
      } else {
        print('Screen capture permission denied');
      }
      
      return _hasPermission;
    } catch (e) {
      print('Error requesting screen capture permission: $e');
      return false;
    }
  }

  // Start continuous screen capture
  Future<bool> startCapture({int intervalSeconds = 5}) async {
    if (_isCapturing) {
      print('Screen capture already running');
      return true;
    }

    if (!_hasPermission && !await enableRealScreenCapture()) {
      print('Cannot start capture without permission');
      return false;
    }

    try {
      _isCapturing = true;
      _captureController = StreamController<Map<String, dynamic>>.broadcast();
      
      print('Starting screen capture with ${intervalSeconds}s interval');
      
      _captureTimer = Timer.periodic(Duration(seconds: intervalSeconds), (timer) async {
        await _captureScreen();
      });
      
      // Take first screenshot immediately
      await _captureScreen();
      
      return true;
    } catch (e) {
      print('Error starting screen capture: $e');
      _isCapturing = false;
      return false;
    }
  }

  // Stop screen capture
  Future<bool> stopCapture() async {
    if (!_isCapturing) {
      print('Screen capture not running');
      return true;
    }

    try {
      _captureTimer?.cancel();
      _captureTimer = null;
      _isCapturing = false;
      
      await _captureController?.close();
      _captureController = null;
      
      print('Screen capture stopped');
      return true;
    } catch (e) {
      print('Error stopping screen capture: $e');
      return false;
    }
  }

  // Capture single screenshot
  Future<Map<String, dynamic>?> captureScreenshot() async {
    if (!_hasPermission && !await enableRealScreenCapture()) {
      print('Cannot capture screenshot without permission');
      return null;
    }

    return await _captureScreen();
  }

  // Internal screen capture method
  Future<Map<String, dynamic>?> _captureScreen() async {
    try {
      final result = await _channel.invokeMethod('captureScreen');
      
      if (result != null) {
        final captureData = Map<String, dynamic>.from(result);
        captureData['timestamp'] = DateTime.now().toIso8601String();
        
        print('Screen captured: ${captureData['width']}x${captureData['height']}');
        
        // Broadcast to listeners
        _captureController?.add(captureData);
        
        return captureData;
      } else {
        print('Screen capture returned null');
        return null;
      }
    } catch (e) {
      print('Error capturing screen: $e');
      return null;
    }
  }

  // Get capture stream
  Stream<Map<String, dynamic>>? get captureStream => _captureController?.stream;

  // Status getters
  bool get isCapturing => _isCapturing;
  bool get hasPermission => _hasPermission;
  
  // Mock capture for testing (when permission not available)
  Future<Map<String, dynamic>> getMockCapture() async {
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'width': 1080,
      'height': 2400,
      'format': 'RGB_565',
      'data': 'mock_screen_data',
      'is_mock': true,
    };
  }
}