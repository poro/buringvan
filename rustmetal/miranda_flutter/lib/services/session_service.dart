import 'dart:async';
import 'rust_bridge_service.dart';
import 'screen_capture_service.dart';
import 'file_service.dart';

class SessionService {
  static final SessionService _instance = SessionService._internal();
  factory SessionService() => _instance;
  SessionService._internal();

  final RustBridgeService _rustBridge = RustBridgeService();
  final ScreenCaptureService _screenCapture = ScreenCaptureService();
  final FileService _fileService = FileService();
  
  String? _currentSessionId;
  DateTime? _sessionStartTime;
  bool _isSessionActive = false;
  bool _isInitialized = false;
  String? _sessionDirectory;
  StreamSubscription? _captureSubscription;
  List<Map<String, dynamic>> _sessionData = [];
  Timer? _screenshotSyncTimer;

  // Initialize session service
  Future<bool> initialize({required String sessionDirectory}) async {
    try {
      _sessionDirectory = sessionDirectory;
      final rustInitialized = await _rustBridge.initialize(sessionDirectory: sessionDirectory);
      if (!rustInitialized) {
        print('Failed to initialize Rust bridge');
        return false;
      }

      _isInitialized = true;
      print('Session service initialized successfully');
      return true;
    } catch (e) {
      print('Failed to initialize session service: $e');
      return false;
    }
  }

  // Start new session
  Future<bool> startSession() async {
    if (_isSessionActive) {
      print('Session already active');
      return false;
    }

    try {
      // Create session ID and add to Rust backend
      final sessionId = 'session_${DateTime.now().millisecondsSinceEpoch}';
      _sessionStartTime = DateTime.now();
      
      // Add session to Rust backend storage
      await _rustBridge.addSession(sessionId, _sessionStartTime!);
      
      // Use the same session ID consistently
      _currentSessionId = sessionId;
      
      // Start session in Rust backend (but use our session ID)
      final rustSessionId = await _rustBridge.startSession();
      print('Created session: $sessionId, Rust backend returned: $rustSessionId');

      _isSessionActive = true;
      _sessionData.clear();

      print('Session started: $_currentSessionId');

      // Start screen capture
      final captureStarted = await _screenCapture.startCapture(intervalSeconds: 5);
      if (!captureStarted) {
        print('Warning: Screen capture failed to start');
      }

      // Listen to screen captures
      _captureSubscription = _screenCapture.captureStream?.listen((captureData) {
        _onScreenCaptured(captureData);
      });
      
      // Start periodic screenshot sync
      _startScreenshotSync();

      return true;
    } catch (e) {
      print('Failed to start session: $e');
      return false;
    }
  }

  // End current session
  Future<bool> endSession() async {
    if (!_isSessionActive) {
      print('No active session to end');
      return true;
    }

    try {
      // Stop screen capture
      await _screenCapture.stopCapture();
      await _captureSubscription?.cancel();
      _captureSubscription = null;
      
      // Final screenshot sync before ending session
      await syncScreenshotsWithSession();

      // End session in Rust backend storage
      if (_currentSessionId != null && _sessionStartTime != null) {
        final endTime = DateTime.now();
        
        print('=== SESSION ENDING DEBUG ===');
        print('Session ID: $_currentSessionId');
        print('Session start time: $_sessionStartTime');
        print('Session end time: $endTime');
        print('Local session data count: ${_sessionData.length}');
        
        // Get the actual screenshot count from storage
        final sessionDetails = await _rustBridge.getSessionDetails(_currentSessionId!);
        print('Session details from storage: $sessionDetails');
        
        final actualScreenshotCount = (sessionDetails?['screenshots'] as List?)?.length ?? 0;
        print('Actual screenshot count from storage: $actualScreenshotCount');
        
        final storageEnded = await _rustBridge.endSession(_currentSessionId!, endTime, actualScreenshotCount);
        print('Storage endSession result: $storageEnded');
        
        if (!storageEnded) {
          print('ERROR: Failed to properly end session in storage');
        } else {
          print('SUCCESS: Session ended in storage');
        }
        print('=== END SESSION DEBUG ===');
      }
      
      // End session in Rust backend
      final ended = await _rustBridge.endCurrentSession();
      if (!ended) {
        print('Warning: Failed to properly end session in Rust backend');
      }

      final duration = _sessionStartTime != null 
          ? DateTime.now().difference(_sessionStartTime!).inSeconds
          : 0;

      print('Session ended: $_currentSessionId (duration: ${duration}s, captures: ${_sessionData.length})');

      _currentSessionId = null;
      _sessionStartTime = null;
      _isSessionActive = false;
      _sessionData.clear();
      
      // Stop screenshot sync timer
      _screenshotSyncTimer?.cancel();
      _screenshotSyncTimer = null;

      return true;
    } catch (e) {
      print('Failed to end session: $e');
      return false;
    }
  }

  // Manual capture and analysis
  Future<Map<String, dynamic>?> manualCapture() async {
    try {
      print('Performing manual capture...');
      
      // Capture screenshot
      final captureData = await _screenCapture.captureScreenshot();
      if (captureData == null) {
        print('Manual capture failed');
        return null;
      }

      // Analyze with Rust backend
      final analysis = await _rustBridge.captureAndAnalyze();
      
      // Try to find the latest screenshot file
      String? screenshotPath;
      try {
        await _fileService.initialize();
        final screenshots = await _fileService.getAllScreenshots();
        if (screenshots.isNotEmpty) {
          screenshotPath = screenshots.first.path;
        }
      } catch (e) {
        print('Error getting screenshot path: $e');
      }
      
      final result = {
        'capture': captureData,
        'analysis': analysis,
        'timestamp': DateTime.now().toIso8601String(),
        'screenshot_path': screenshotPath,
      };

      // Add to session data if session is active
      if (_isSessionActive) {
        _sessionData.add(result);
        
        // Add screenshot to current session in Rust bridge storage
        if (_currentSessionId != null) {
          await _rustBridge.addScreenshotToSession(_currentSessionId!, result);
          print('Added screenshot to session $_currentSessionId (count now: ${_sessionData.length})');
        }
      }

      print('Manual capture completed successfully');
      return result;
    } catch (e) {
      print('Manual capture failed: $e');
      return null;
    }
  }

  // Handle screen capture events
  void _onScreenCaptured(Map<String, dynamic> captureData) async {
    try {
      print('Processing captured screen...');
      
      // Analyze with Rust backend
      final analysis = await _rustBridge.captureAndAnalyze();
      
      // Try to get the latest screenshot file
      String? screenshotPath;
      try {
        await _fileService.initialize();
        final screenshots = await _fileService.getAllScreenshots();
        if (screenshots.isNotEmpty) {
          screenshotPath = screenshots.first.path;
        }
      } catch (e) {
        print('Error getting screenshot path: $e');
      }
      
      final sessionEntry = {
        'capture': captureData,
        'analysis': analysis,
        'timestamp': DateTime.now().toIso8601String(),
        'screenshot_path': screenshotPath,
      };

      _sessionData.add(sessionEntry);
      
      // Add screenshot to current session in Rust bridge storage
      if (_currentSessionId != null) {
        await _rustBridge.addScreenshotToSession(_currentSessionId!, sessionEntry);
        print('Added screenshot to session $_currentSessionId via stream (count now: ${_sessionData.length})');
      }
      
      print('Screen capture processed (session has ${_sessionData.length} captures)');
    } catch (e) {
      print('Failed to process screen capture: $e');
    }
  }

  // Get all sessions
  Future<List<Map<String, dynamic>>> getAllSessions() async {
    return await _rustBridge.getAllSessions();
  }

  // Get session details
  Future<Map<String, dynamic>?> getSessionDetails(String sessionId) async {
    return await _rustBridge.getSessionDetails(sessionId);
  }

  // Delete session
  Future<bool> deleteSession(String sessionId) async {
    return await _rustBridge.deleteSession(sessionId);
  }

  // Check if screen capture permission is available
  Future<bool> checkScreenCapturePermission() async {
    return await _screenCapture.enableRealScreenCapture();
  }

  // Getters
  bool get isSessionActive => _isSessionActive;
  bool get isInitialized => _isInitialized;
  String? get sessionDirectory => _sessionDirectory;
  String? get currentSessionId => _currentSessionId;
  DateTime? get sessionStartTime => _sessionStartTime;
  int get currentSessionCaptureCount => _sessionData.length;
  bool get hasScreenCapturePermission => _screenCapture.hasPermission;
  bool get isCapturing => _screenCapture.isCapturing;
  
  // Sync filesystem screenshots with current session
  Future<void> syncScreenshotsWithSession() async {
    if (!_isSessionActive || _currentSessionId == null) return;
    
    try {
      await _fileService.initialize();
      final allScreenshots = await _fileService.getAllScreenshots();
      
      // Get screenshots created since session started
      final sessionScreenshots = allScreenshots.where((file) {
        final stat = file.statSync();
        return _sessionStartTime != null && 
               stat.modified.isAfter(_sessionStartTime!);
      }).toList();
      
      // Get current session screenshots from storage
      final currentSessionData = await _rustBridge.getSessionDetails(_currentSessionId!);
      final existingScreenshots = currentSessionData?['screenshots'] ?? [];
      
      // Add any new screenshots that aren't already tracked
      for (final screenshot in sessionScreenshots) {
        final screenshotPath = screenshot.path;
        final alreadyTracked = existingScreenshots.any((s) => 
            s['screenshot_path'] == screenshotPath);
        
        if (!alreadyTracked) {
          final screenshotEntry = {
            'timestamp': DateTime.now().toIso8601String(),
            'screenshot_path': screenshotPath,
            'capture': {
              'width': 0,
              'height': 0,
              'format': 'file',
              'source': 'filesystem_sync'
            },
            'analysis': {
              'timestamp': DateTime.now().toIso8601String(),
              'source': 'filesystem_sync'
            }
          };
          
          await _rustBridge.addScreenshotToSession(_currentSessionId!, screenshotEntry);
          print('Synced filesystem screenshot to session: $screenshotPath');
        }
      }
    } catch (e) {
      print('Error syncing screenshots with session: $e');
    }
  }
  
  // Start periodic screenshot synchronization
  void _startScreenshotSync() {
    _screenshotSyncTimer?.cancel();
    _screenshotSyncTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (_isSessionActive) {
        syncScreenshotsWithSession();
      } else {
        timer.cancel();
      }
    });
  }
}