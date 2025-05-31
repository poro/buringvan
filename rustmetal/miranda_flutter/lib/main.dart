import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:window_manager/window_manager.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'dart:async';

import 'services/session_service.dart';
import 'services/screen_capture_service.dart';
import 'services/file_service.dart';
import 'ui/theme/asu_theme.dart';
import 'features/session/sessions_list_screen.dart';
import 'features/settings/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    print('Could not load .env file: $e');
    // On mobile platforms, we might need to use a different approach
  }

  // Initialize window manager (desktop only)
  if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
    await windowManager.ensureInitialized();
    await windowManager.waitUntilReadyToShow();
    
    await windowManager.setTitle('Miranda - AI-Powered Gameplay Analysis');
    await windowManager.setSize(const Size(1200, 800));
    await windowManager.setMinimumSize(const Size(800, 600));
    await windowManager.center();
    await windowManager.show();
    await windowManager.focus();
  }

  // Initialize Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL'] ?? '',
    anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '',
  );

  // Get platform-specific storage directory
  String sessionDirectory;
  // Get platform-appropriate session directory
  sessionDirectory = await _getSessionDirectory();
  
  // Create session directory if it doesn't exist
  final dir = Directory(sessionDirectory);
  if (!await dir.exists()) {
    await dir.create(recursive: true);
  }
  
  // Initialize session service
  final sessionService = SessionService();
  final initialized = await sessionService.initialize(sessionDirectory: sessionDirectory);
  if (!initialized) {
    print('Warning: Failed to initialize session service');
  }

  runApp(
    ProviderScope(
      child: const MirandaApp(),
    ),
  );
}

/// Platform-independent session directory resolver
Future<String> _getSessionDirectory() async {
  // Check for custom path from environment
  String? customPath = dotenv.env['LOCAL_SESSION_DATA'];
  if (customPath != null && customPath.isNotEmpty) {
    return customPath;
  }
  
  // Use platform-specific defaults
  if (Platform.isAndroid || Platform.isIOS) {
    // Mobile platforms - use app documents directory
    final directory = await getApplicationDocumentsDirectory();
    return '${directory.path}/miranda_sessions';
  } else {
    // Desktop platforms - handle Windows, macOS, Linux
    String homeDir;
    if (Platform.isWindows) {
      homeDir = Platform.environment['USERPROFILE'] ?? 
                Platform.environment['HOMEPATH'] ?? '';
    } else {
      // macOS and Linux
      homeDir = Platform.environment['HOME'] ?? '';
    }
    
    if (homeDir.isEmpty) {
      throw Exception('Cannot determine home directory for ${Platform.operatingSystem}');
    }
    
    return '$homeDir/.miranda/session_data';
  }
}

class MirandaApp extends ConsumerWidget {
  const MirandaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'Miranda - AI-Powered Gameplay Analysis',
      theme: ASUTheme.lightTheme,
      darkTheme: ASUTheme.darkTheme,
      home: const ControlWindow(),
      builder: (context, child) {
        // Ensure the app can handle orientation changes properly
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: const TextScaler.linear(1.0),
          ),
          child: child!,
        );
      },
    );
  }
}

class ControlWindow extends StatefulWidget {
  const ControlWindow({super.key});

  @override
  State<ControlWindow> createState() => _ControlWindowState();
}

class _ControlWindowState extends State<ControlWindow> {
  final SessionService _sessionService = SessionService();
  final ScreenCaptureService _screenCapture = ScreenCaptureService();
  
  bool isSessionActive = false;
  bool isAnalyzing = false;
  bool hasScreenPermission = false;
  String statusMessage = 'Ready to start session';
  String? currentSessionId;
  int captureCount = 0;
  Timer? _statusTimer;
  
  @override
  void initState() {
    super.initState();
    // Set the main app to portrait only (screenshot viewer will override this)
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    _checkInitialStatus();
  }

  
  @override
  void dispose() {
    _statusTimer?.cancel();
    super.dispose();
  }
  
  void _startStatusUpdates() {
    _statusTimer?.cancel();
    _statusTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (mounted) {
        setState(() {
          // Update all status indicators
          hasScreenPermission = _sessionService.hasScreenCapturePermission;
          isSessionActive = _sessionService.isSessionActive;
          currentSessionId = _sessionService.currentSessionId;
          captureCount = _sessionService.currentSessionCaptureCount;
        });
      }
    });
  }

  Future<void> _checkInitialStatus() async {
    // Check if services are initialized
    if (!_sessionService.isInitialized) {
      setState(() {
        statusMessage = 'Services not initialized';
      });
      return;
    }
    
    // Check screen capture permission
    hasScreenPermission = await _sessionService.checkScreenCapturePermission();
    
    setState(() {
      statusMessage = hasScreenPermission 
          ? 'Ready to start session' 
          : 'Screen capture permission needed';
    });
    
    // Start periodic status updates
    _startStatusUpdates();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Miranda Control'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SessionsListScreen()),
              );
              // Refresh status when returning from sessions list
              if (mounted) {
                setState(() {});
              }
            },
            tooltip: 'View Session History',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
            tooltip: 'Settings',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Session Status',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: ASUColors.maroon,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Status indicator
                    Row(
                      children: [
                        Icon(
                          isSessionActive ? Icons.fiber_manual_record : Icons.radio_button_unchecked,
                          color: isSessionActive ? ASUColors.green : ASUColors.gray3,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(statusMessage)),
                      ],
                    ),
                    
                    if (isSessionActive) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.camera_alt, size: 16, color: ASUColors.gray3),
                          const SizedBox(width: 8),
                          Text('Captures: $captureCount'),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 16, color: ASUColors.gray3),
                          const SizedBox(width: 8),
                          Text('Session: $currentSessionId'),
                        ],
                      ),
                    ],
                    
                    if (isAnalyzing) ...[
                      const SizedBox(height: 12),
                      const LinearProgressIndicator(),
                    ],
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Permission status
            if (!hasScreenPermission) ...[
              Card(
                color: ASUColors.orange.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Icon(Icons.warning, color: ASUColors.orange),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Screen Capture Permission Required',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            const Text('Miranda needs permission to capture your screen for analysis.'),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: _requestPermission,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: ASUColors.orange,
                              ),
                              child: const Text('Grant Permission'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
            
            // Control Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: (isSessionActive || !_sessionService.isInitialized) ? null : _startSession,
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Start Session'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ASUColors.green,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: !isSessionActive ? null : _stopSession,
                    icon: const Icon(Icons.stop),
                    label: const Text('Stop Session'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ASUColors.pink,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Manual capture and other actions
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: isAnalyzing ? null : _captureAndAnalyze,
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Manual Capture'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ASUColors.blue,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const SessionsListScreen()),
                      );
                      // Refresh status when returning from sessions list
                      if (mounted) {
                        setState(() {});
                      }
                    },
                    icon: const Icon(Icons.history),
                    label: const Text('View Sessions'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ASUColors.maroon,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Quick Actions
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: ASUColors.maroon,
              ),
            ),
            const SizedBox(height: 12),
            
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.analytics, size: 18),
                  label: const Text('Test Analysis'),
                  onPressed: _testAnalysis,
                ),
                ActionChip(
                  avatar: const Icon(Icons.info, size: 18),
                  label: const Text('Show Info'),
                  onPressed: _showSystemInfo,
                ),
                if (Platform.isAndroid) ...[
                  ActionChip(
                    avatar: const Icon(Icons.camera, size: 18),
                    label: const Text('Test Capture'),
                    onPressed: _testNativeCapture,
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.photo_library, size: 18),
                    label: const Text('View Screenshots'),
                    onPressed: _viewScreenshots,
                  ),
                ],
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Status Information
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                      Text(
                        'System Status',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: ASUColors.maroon,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      _buildStatusRow('Rust Bridge', _sessionService.isInitialized),
                      _buildStatusRow('Screen Capture', hasScreenPermission),
                      _buildStatusRow('Session Service', _sessionService.isInitialized),
                      _buildStatusRow('Is Capturing', _sessionService.isCapturing),
                      
                      const SizedBox(height: 16),
                      Text(
                        'Platform: ${Platform.operatingSystem}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      Text(
                        'Session Directory: ${_sessionService.sessionDirectory ?? "Not set"}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, bool status) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            status ? Icons.check_circle : Icons.cancel,
            color: status ? ASUColors.green : ASUColors.pink,
            size: 16,
          ),
          const SizedBox(width: 8),
          Text(label),
          const Spacer(),
          Text(
            status ? 'Ready' : 'Not Available',
            style: TextStyle(
              color: status ? ASUColors.green : ASUColors.pink,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _requestPermission() async {
    final granted = await _sessionService.checkScreenCapturePermission();
    setState(() {
      hasScreenPermission = granted;
      statusMessage = granted 
          ? 'Ready to start session' 
          : 'Screen capture permission denied';
    });
    
    if (granted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Screen capture permission granted!')),
      );
    }
  }

  Future<void> _startSession() async {
    setState(() {
      isAnalyzing = true;
      statusMessage = 'Starting session...';
    });
    
    final success = await _sessionService.startSession();
    
    setState(() {
      isAnalyzing = false;
      if (success) {
        isSessionActive = true;
        currentSessionId = _sessionService.currentSessionId;
        captureCount = 0;
        statusMessage = 'Session active - monitoring screen';
      } else {
        statusMessage = 'Failed to start session';
      }
    });
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session started successfully!')),
      );
      
      // Update capture count periodically
      _updateCaptureCount();
      
      // Restart status updates
      _startStatusUpdates();
    }
  }

  Future<void> _stopSession() async {
    setState(() {
      isAnalyzing = true;
      statusMessage = 'Stopping session...';
    });
    
    final success = await _sessionService.endSession();
    
    setState(() {
      isAnalyzing = false;
      isSessionActive = false;
      currentSessionId = null;
      captureCount = 0;
      statusMessage = success ? 'Session stopped' : 'Failed to stop session';
    });
    
    // Continue status updates even after session ends
    _startStatusUpdates();
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session stopped successfully!')),
      );
    }
  }

  Future<void> _captureAndAnalyze() async {
    setState(() {
      isAnalyzing = true;
      statusMessage = 'Capturing and analyzing...';
    });
    
    final result = await _sessionService.manualCapture();
    
    setState(() {
      isAnalyzing = false;
      statusMessage = result != null 
          ? 'Manual capture completed' 
          : 'Manual capture failed';
    });
    
    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Manual capture completed!')),
      );
      if (isSessionActive) {
        setState(() {
          captureCount = _sessionService.currentSessionCaptureCount;
        });
      }
    }
  }

  Future<void> _testAnalysis() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Analysis test completed!')),
    );
  }

  void _showSystemInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('System Information'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Platform: ${Platform.operatingSystem}'),
            Text('Rust Bridge: ${_sessionService.isInitialized ? "Ready" : "Not Ready"}'),
            Text('Screen Permission: ${hasScreenPermission ? "Granted" : "Not Granted"}'),
            Text('Session Directory: ${_sessionService.sessionDirectory ?? "Not set"}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSettings() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SettingsScreen(),
      ),
    );
    // Refresh status when returning from settings
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _testNativeCapture() async {
    setState(() {
      statusMessage = 'Testing native capture...';
    });
    
    try {
      // Test the native screen capture directly
      final result = await _screenCapture.captureScreenshot();
      
      setState(() {
        statusMessage = result != null 
            ? 'Native capture successful!' 
            : 'Native capture failed';
      });
      
      if (result != null) {
        // Show capture info
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Native capture: ${result['width']}x${result['height']} (${result['data']?.length ?? 0} bytes)'),
            duration: const Duration(seconds: 2),
          ),
        );
        
        // Try to find and display the latest screenshot
        try {
          await FileService().initialize();
          final screenshots = await FileService().getAllScreenshots();
          if (screenshots.isNotEmpty && mounted) {
            // Show the latest screenshot
            final latestScreenshot = screenshots.first;
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Latest Screenshot'),
                content: SizedBox(
                  width: 300,
                  height: 400,
                  child: Image.file(
                    latestScreenshot,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey[300],
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.broken_image, size: 64, color: Colors.grey),
                            const SizedBox(height: 8),
                            Text('Error loading image:\n$error', textAlign: TextAlign.center),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ],
              ),
            );
          }
        } catch (e) {
          print('Error loading latest screenshot: $e');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Native capture failed - check permissions'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() {
        statusMessage = 'Native capture error: $e';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _viewScreenshots() async {
    setState(() {
      statusMessage = 'Loading screenshots...';
    });
    
    try {
      await FileService().initialize();
      final screenshots = await FileService().getAllScreenshots();
      
      setState(() {
        statusMessage = 'Found ${screenshots.length} screenshots';
      });
      
      if (!mounted) return;
      
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Screenshots (${screenshots.length})'),
          content: SizedBox(
            width: double.maxFinite,
            height: 400,
            child: screenshots.isEmpty
                ? const Center(child: Text('No screenshots found'))
                : ListView.builder(
                    itemCount: screenshots.length,
                    itemBuilder: (context, index) {
                      final screenshot = screenshots[index];
                      final stats = FileService().getScreenshotMetadata(screenshot);
                      return Card(
                        margin: const EdgeInsets.all(4.0),
                        child: ListTile(
                          leading: SizedBox(
                            width: 60,
                            height: 60,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Hero(
                                tag: screenshot.path,
                                child: Image.file(
                                  screenshot,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      color: Colors.grey[300],
                                      child: const Icon(
                                        Icons.broken_image,
                                        color: Colors.grey,
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                          title: Text(
                            'Screenshot ${index + 1}',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${(stats['size'] / 1024).toStringAsFixed(1)} KB',
                                style: const TextStyle(fontSize: 12),
                              ),
                              Text(
                                DateTime.parse(stats['created']).toString().substring(11, 19),
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.zoom_in, size: 20),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => ScreenshotViewerScreen(
                                        imageFile: screenshot,
                                        title: 'Screenshot ${index + 1}',
                                      ),
                                    ),
                                  );
                                },
                              ),
                              IconButton(
                                icon: const Icon(Icons.info, size: 20),
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Path: ${stats['path']}\n'
                                        'Size: ${stats['size']} bytes\n'
                                        'Created: ${stats['created']}',
                                      ),
                                      duration: const Duration(seconds: 3),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                          isThreeLine: false,
                        ),
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      setState(() {
        statusMessage = 'Error loading screenshots: $e';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _updateCaptureCount() {
    if (isSessionActive && mounted) {
      setState(() {
        captureCount = _sessionService.currentSessionCaptureCount;
        // Also refresh permission status
        hasScreenPermission = _sessionService.hasScreenCapturePermission;
      });
      
      // Update again in 2 seconds
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted && isSessionActive) {
          _updateCaptureCount();
        }
      });
    }
  }
}

// Dedicated screenshot viewer with landscape support
class ScreenshotViewerScreen extends StatefulWidget {
  final File imageFile;
  final String title;
  
  const ScreenshotViewerScreen({
    super.key,
    required this.imageFile,
    required this.title,
  });
  
  @override
  State<ScreenshotViewerScreen> createState() => _ScreenshotViewerScreenState();
}

class _ScreenshotViewerScreenState extends State<ScreenshotViewerScreen> {
  bool _isFullscreen = false;
  
  @override
  void initState() {
    super.initState();
    // Enable all orientations for this screen
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    
    // Ensure system UI adapts to orientation changes
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        systemNavigationBarColor: Colors.black,
        statusBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.light,
        statusBarIconBrightness: Brightness.light,
      ),
    );
  }
  
  @override
  void dispose() {
    // Reset to portrait when leaving the screen
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    super.dispose();
  }
  
  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
    });
    
    if (_isFullscreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final orientation = MediaQuery.of(context).orientation;
    final isLandscape = orientation == Orientation.landscape;
    
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: _isFullscreen ? null : AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(_isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen),
            onPressed: _toggleFullscreen,
            tooltip: _isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
          ),
          IconButton(
            icon: const Icon(Icons.screen_rotation),
            onPressed: () {
              // Toggle between portrait and landscape
              if (isLandscape) {
                SystemChrome.setPreferredOrientations([
                  DeviceOrientation.portraitUp,
                ]);
              } else {
                SystemChrome.setPreferredOrientations([
                  DeviceOrientation.landscapeLeft,
                  DeviceOrientation.landscapeRight,
                ]);
              }
            },
            tooltip: 'Rotate Screen',
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final availableWidth = constraints.maxWidth;
          final availableHeight = constraints.maxHeight;
          
          return GestureDetector(
            onTap: _isFullscreen ? _toggleFullscreen : null,
            child: Container(
              width: availableWidth,
              height: availableHeight,
              color: Colors.black,
              child: Hero(
                tag: widget.imageFile.path,
                child: InteractiveViewer(
                  minScale: 0.1,
                  maxScale: 10.0,
                  constrained: false,
                  boundaryMargin: const EdgeInsets.all(0),
                  child: Container(
                    width: availableWidth,
                    height: availableHeight,
                    child: FittedBox(
                      fit: BoxFit.contain,
                      child: Image.file(
                        widget.imageFile,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            width: availableWidth,
                            height: availableHeight,
                            color: Colors.black,
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.broken_image,
                                  size: 64,
                                  color: Colors.white54,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Failed to load image',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Colors.white54,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Path: ${widget.imageFile.path}',
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.white38,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
      floatingActionButton: _isFullscreen ? null : FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Image: ${widget.imageFile.path.split('/').last} • '
                'Screen: ${screenSize.width.toInt()}x${screenSize.height.toInt()} • '
                'Mode: ${isLandscape ? "Landscape" : "Portrait"}',
              ),
              backgroundColor: Colors.black87,
              duration: const Duration(seconds: 3),
            ),
          );
        },
        backgroundColor: Colors.white24,
        child: const Icon(Icons.info_outline, color: Colors.white),
      ),
    );
  }
}