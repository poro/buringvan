import '../bridge_generated.dart/lib.dart' as bridge;
import 'dart:convert';
import 'dart:io';

class RustBridgeService {
  static final RustBridgeService _instance = RustBridgeService._internal();
  factory RustBridgeService() => _instance;
  RustBridgeService._internal();

  bool _isInitialized = false;
  String? _sessionDirectory;
  
  // Real session storage
  final Map<String, Map<String, dynamic>> _sessions = {};
  final Map<String, List<Map<String, dynamic>>> _sessionScreenshots = {};

  // Initialize the Rust bridge
  Future<bool> initialize({required String sessionDirectory}) async {
    try {
      _sessionDirectory = sessionDirectory;
      
      // Test basic connectivity
      final greeting = await bridge.greet(name: "Miranda");
      print('Rust bridge test: $greeting');
      
      // Test basic math
      final sum = await bridge.addNumbers(a: 2, b: 3);
      print('Rust bridge math test: 2 + 3 = $sum');
      
      // Check if initialized
      final initialized = await bridge.isInitialized();
      print('Rust bridge initialization status: $initialized');
      
      // Load existing session data from disk
      await _loadSessionsFromDisk();
      
      _isInitialized = true;
      print('Rust bridge initialized successfully with session directory: $sessionDirectory');
      print('Loaded ${_sessions.length} existing sessions from disk');
      if (_sessions.isNotEmpty) {
        print('Existing session IDs: ${_sessions.keys.toList()}');
      }
      return true;
    } catch (e) {
      print('Failed to initialize Rust bridge: $e');
      return false;
    }
  }

  // Start a new session
  Future<String?> startSession() async {
    if (!_isInitialized) {
      print('Rust bridge not initialized');
      return null;
    }
    
    try {
      // For now, create a mock session ID
      final sessionId = 'session_${DateTime.now().millisecondsSinceEpoch}';
      print('Started session: $sessionId');
      return sessionId;
    } catch (e) {
      print('Failed to start session: $e');
      return null;
    }
  }

  // End current session (backend)
  Future<bool> endCurrentSession() async {
    if (!_isInitialized) {
      print('Rust bridge not initialized');
      return false;
    }
    
    try {
      print('Session ended successfully');
      return true;
    } catch (e) {
      print('Failed to end session: $e');
      return false;
    }
  }

  // Capture and analyze screen (Android implementation)
  Future<Map<String, dynamic>?> captureAndAnalyze() async {
    if (!_isInitialized) {
      print('Rust bridge not initialized');
      return null;
    }
    
    try {
      // Mock analysis data for now
      final analysis = {
        'timestamp': DateTime.now().toIso8601String(),
        'skills': ['Problem Solving', 'Critical Thinking'],
        'confidence': 0.85,
        'screenshot_path': 'mock_screenshot_${DateTime.now().millisecondsSinceEpoch}.png',
      };
      
      print('Screen capture and analysis completed: $analysis');
      return analysis;
    } catch (e) {
      print('Failed to capture and analyze: $e');
      return null;
    }
  }

  // Add a new session
  Future<String> addSession(String sessionId, DateTime startTime) async {
    final session = {
      'id': sessionId,
      'start_time': startTime.toIso8601String(),
      'end_time': null,
      'duration': 0,
      'screenshots_count': 0,
      'status': 'active',
    };
    
    _sessions[sessionId] = session;
    _sessionScreenshots[sessionId] = [];
    
    // Persist to disk
    await _saveSessionsToDisk();
    
    print('Added new session: $sessionId');
    return sessionId;
  }
  
  // End a session (storage)
  Future<bool> endSession(String sessionId, DateTime endTime, int captureCount) async {
    if (!_sessions.containsKey(sessionId)) {
      print('Session not found: $sessionId');
      return false;
    }
    
    final session = _sessions[sessionId]!;
    final startTime = DateTime.parse(session['start_time']);
    final duration = endTime.difference(startTime).inSeconds;
    
    session['end_time'] = endTime.toIso8601String();
    session['duration'] = duration;
    session['screenshots_count'] = captureCount;
    session['status'] = 'completed';
    
    print('Ended session: $sessionId (${duration}s, $captureCount captures)');
    
    // Persist to disk
    await _saveSessionsToDisk();
    
    return true;
  }
  
  // Add screenshot to session
  Future<void> addScreenshotToSession(String sessionId, Map<String, dynamic> screenshotData) async {
    if (!_sessionScreenshots.containsKey(sessionId)) {
      _sessionScreenshots[sessionId] = [];
    }
    
    _sessionScreenshots[sessionId]!.add(screenshotData);
    
    // Update session screenshot count
    if (_sessions.containsKey(sessionId)) {
      final newCount = _sessionScreenshots[sessionId]!.length;
      _sessions[sessionId]!['screenshots_count'] = newCount;
      print('Updated session $sessionId screenshot count to $newCount');
      
      // Persist to disk after screenshot addition
      await _saveSessionsToDisk();
    }
  }

  // Get all sessions
  Future<List<Map<String, dynamic>>> getAllSessions() async {
    if (!_isInitialized) {
      print('Rust bridge not initialized');
      return [];
    }
    
    try {
      // Return real session data, sorted by start time (newest first)
      final sessions = _sessions.values.toList();
      sessions.sort((a, b) {
        final aTime = DateTime.parse(a['start_time']);
        final bTime = DateTime.parse(b['start_time']);
        return bTime.compareTo(aTime); // Newest first
      });
      
      print('Retrieved ${sessions.length} real sessions');
      return sessions;
    } catch (e) {
      print('Failed to get sessions: $e');
      return [];
    }
  }

  // Get session details
  Future<Map<String, dynamic>?> getSessionDetails(String sessionId) async {
    if (!_isInitialized) {
      print('Rust bridge not initialized');
      return null;
    }
    
    try {
      if (!_sessions.containsKey(sessionId)) {
        print('Session not found: $sessionId');
        return null;
      }
      
      final session = Map<String, dynamic>.from(_sessions[sessionId]!);
      final screenshots = _sessionScreenshots[sessionId] ?? [];
      
      session['screenshots'] = screenshots;
      
      print('Retrieved session details for: $sessionId (${screenshots.length} screenshots)');
      return session;
    } catch (e) {
      print('Failed to get session details: $e');
      return null;
    }
  }

  // Delete session
  Future<bool> deleteSession(String sessionId) async {
    if (!_isInitialized) {
      print('Rust bridge not initialized');
      return false;
    }
    
    try {
      if (!_sessions.containsKey(sessionId)) {
        print('Session not found: $sessionId');
        return false;
      }
      
      // Remove session and its screenshots
      _sessions.remove(sessionId);
      _sessionScreenshots.remove(sessionId);
      
      // Persist to disk
      await _saveSessionsToDisk();
      
      print('Deleted session: $sessionId');
      return true;
    } catch (e) {
      print('Failed to delete session: $e');
      return false;
    }
  }
  
  // Clear all sessions (for complete cleanup)
  Future<void> clearAllSessions() async {
    _sessions.clear();
    _sessionScreenshots.clear();
    
    // Persist to disk
    await _saveSessionsToDisk();
    
    print('Cleared all sessions');
  }

  bool get isInitialized => _isInitialized;
  String? get sessionDirectory => _sessionDirectory;
  
  // File paths for persistence
  String get _sessionsFilePath => '$_sessionDirectory/sessions.json';
  String get _screenshotsFilePath => '$_sessionDirectory/screenshots.json';
  
  // Load sessions from disk
  Future<void> _loadSessionsFromDisk() async {
    try {
      // Ensure directory exists
      final dir = Directory(_sessionDirectory!);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
        return;
      }
      
      // Load sessions
      final sessionsFile = File(_sessionsFilePath);
      if (await sessionsFile.exists()) {
        final sessionsJson = await sessionsFile.readAsString();
        final Map<String, dynamic> sessionsData = jsonDecode(sessionsJson);
        
        _sessions.clear();
        sessionsData.forEach((key, value) {
          _sessions[key] = Map<String, dynamic>.from(value);
        });
        
        print('Loaded ${_sessions.length} sessions from disk');
      }
      
      // Load screenshots
      final screenshotsFile = File(_screenshotsFilePath);
      if (await screenshotsFile.exists()) {
        final screenshotsJson = await screenshotsFile.readAsString();
        final Map<String, dynamic> screenshotsData = jsonDecode(screenshotsJson);
        
        _sessionScreenshots.clear();
        screenshotsData.forEach((key, value) {
          _sessionScreenshots[key] = List<Map<String, dynamic>>.from(
            (value as List).map((item) => Map<String, dynamic>.from(item))
          );
        });
        
        print('Loaded screenshots for ${_sessionScreenshots.length} sessions from disk');
      }
    } catch (e) {
      print('Error loading sessions from disk: $e');
      // Continue with empty sessions if loading fails
      _sessions.clear();
      _sessionScreenshots.clear();
    }
  }
  
  // Save sessions to disk
  Future<void> _saveSessionsToDisk() async {
    try {
      // Ensure directory exists
      final dir = Directory(_sessionDirectory!);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Save sessions
      final sessionsFile = File(_sessionsFilePath);
      final sessionsJson = jsonEncode(_sessions);
      await sessionsFile.writeAsString(sessionsJson);
      
      // Save screenshots
      final screenshotsFile = File(_screenshotsFilePath);
      final screenshotsJson = jsonEncode(_sessionScreenshots);
      await screenshotsFile.writeAsString(screenshotsJson);
      
      print('Saved ${_sessions.length} sessions to disk (${_sessionsFilePath})');
    } catch (e) {
      print('Error saving sessions to disk: $e');
    }
  }
}