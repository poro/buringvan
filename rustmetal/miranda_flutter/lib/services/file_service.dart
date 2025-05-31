import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';

class FileService {
  static final FileService _instance = FileService._internal();
  factory FileService() => _instance;
  FileService._internal();

  String? _baseDirectory;

  // Initialize file service
  Future<bool> initialize() async {
    try {
      if (Platform.isAndroid) {
        // Use the same path as native Android code: getExternalFilesDir(null)
        // This should match: /storage/emulated/0/Android/data/com.example.miranda_flutter/files/
        try {
          final directory = await getExternalStorageDirectory();
          if (directory != null) {
            // Navigate to the external files directory
            final externalFilesPath = '/storage/emulated/0/Android/data/com.example.miranda_flutter/files';
            _baseDirectory = '$externalFilesPath/miranda_sessions';
          } else {
            // Fallback to documents directory
            final fallbackDir = await getApplicationDocumentsDirectory();
            _baseDirectory = '${fallbackDir.path}/miranda_sessions';
          }
        } catch (e) {
          print('Error getting external storage, using documents directory: $e');
          final fallbackDir = await getApplicationDocumentsDirectory();
          _baseDirectory = '${fallbackDir.path}/miranda_sessions';
        }
      } else if (Platform.isIOS) {
        final directory = await getApplicationDocumentsDirectory();
        _baseDirectory = '${directory.path}/miranda_sessions';
      } else {
        final directory = await getApplicationDocumentsDirectory();
        _baseDirectory = '${directory.path}/miranda_sessions';
      }
      
      // Create base directory
      final dir = Directory(_baseDirectory!);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Create subdirectories
      await _createSubDirectories();
      
      print('File service initialized: $_baseDirectory');
      return true;
    } catch (e) {
      print('Failed to initialize file service: $e');
      return false;
    }
  }

  Future<void> _createSubDirectories() async {
    final subdirs = ['screenshots', 'sessions', 'exports'];
    for (final subdir in subdirs) {
      final dir = Directory('$_baseDirectory/$subdir');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
    }
  }

  // Get all screenshot files
  Future<List<File>> getAllScreenshots() async {
    try {
      final screenshotsDir = Directory('$_baseDirectory/screenshots');
      if (!await screenshotsDir.exists()) {
        return [];
      }

      final files = await screenshotsDir.list().toList();
      final imageFiles = files
          .where((file) => file is File && file.path.toLowerCase().endsWith('.png'))
          .cast<File>()
          .toList();
      
      // Sort by modification date (newest first)
      imageFiles.sort((a, b) => b.lastModifiedSync().compareTo(a.lastModifiedSync()));
      
      return imageFiles;
    } catch (e) {
      print('Error getting screenshots: $e');
      return [];
    }
  }

  // Get screenshots for a specific session
  Future<List<File>> getSessionScreenshots(String sessionId) async {
    try {
      final screenshots = await getAllScreenshots();
      return screenshots.where((file) {
        final filename = file.path.split('/').last;
        return filename.contains(sessionId);
      }).toList();
    } catch (e) {
      print('Error getting session screenshots: $e');
      return [];
    }
  }

  // Save screenshot data to file
  Future<String?> saveScreenshot(Uint8List data, {String? sessionId}) async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final sessionPrefix = sessionId != null ? '${sessionId}_' : '';
      final filename = 'screenshot_$sessionPrefix$timestamp.png';
      
      final screenshotsDir = Directory('$_baseDirectory/screenshots');
      await screenshotsDir.create(recursive: true);
      
      final file = File('${screenshotsDir.path}/$filename');
      await file.writeAsBytes(data);
      
      print('Screenshot saved: ${file.path}');
      return file.path;
    } catch (e) {
      print('Error saving screenshot: $e');
      return null;
    }
  }

  // Get screenshot file by path
  Future<File?> getScreenshotFile(String filepath) async {
    try {
      final file = File(filepath);
      if (await file.exists()) {
        return file;
      }
      return null;
    } catch (e) {
      print('Error getting screenshot file: $e');
      return null;
    }
  }

  // Delete screenshot file
  Future<bool> deleteScreenshot(String filepath) async {
    try {
      final file = File(filepath);
      if (await file.exists()) {
        await file.delete();
        print('Screenshot deleted: $filepath');
        return true;
      }
      return false;
    } catch (e) {
      print('Error deleting screenshot: $e');
      return false;
    }
  }

  // Get screenshot metadata
  Map<String, dynamic> getScreenshotMetadata(File file) {
    final filename = file.path.split('/').last;
    final stats = file.statSync();
    
    return {
      'filename': filename,
      'path': file.path,
      'size': stats.size,
      'created': stats.modified.toIso8601String(),
      'modified': stats.modified.toIso8601String(),
    };
  }

  // Clean old screenshots (keep only last N screenshots)
  Future<int> cleanOldScreenshots({int keepCount = 100}) async {
    try {
      final screenshots = await getAllScreenshots();
      if (screenshots.length <= keepCount) {
        return 0;
      }

      final toDelete = screenshots.skip(keepCount).toList();
      int deletedCount = 0;
      
      for (final file in toDelete) {
        try {
          await file.delete();
          deletedCount++;
        } catch (e) {
          print('Error deleting old screenshot ${file.path}: $e');
        }
      }
      
      print('Cleaned $deletedCount old screenshots');
      return deletedCount;
    } catch (e) {
      print('Error cleaning old screenshots: $e');
      return 0;
    }
  }
  
  // Delete ALL screenshots (complete cleanup)
  Future<int> deleteAllScreenshots() async {
    try {
      final screenshots = await getAllScreenshots();
      int deletedCount = 0;
      
      for (final file in screenshots) {
        try {
          await file.delete();
          deletedCount++;
        } catch (e) {
          print('Error deleting screenshot ${file.path}: $e');
        }
      }
      
      print('Deleted all $deletedCount screenshots');
      return deletedCount;
    } catch (e) {
      print('Error deleting all screenshots: $e');
      return 0;
    }
  }

  // Get storage usage statistics
  Future<Map<String, dynamic>> getStorageStats() async {
    try {
      final screenshots = await getAllScreenshots();
      int totalSize = 0;
      
      for (final file in screenshots) {
        final stats = await file.stat();
        totalSize += stats.size;
      }
      
      return {
        'screenshot_count': screenshots.length,
        'total_size_bytes': totalSize,
        'total_size_mb': (totalSize / (1024 * 1024)).toStringAsFixed(2),
        'base_directory': _baseDirectory,
      };
    } catch (e) {
      print('Error getting storage stats: $e');
      return {
        'screenshot_count': 0,
        'total_size_bytes': 0,
        'total_size_mb': '0.00',
        'base_directory': _baseDirectory,
      };
    }
  }

  // Export screenshots to external directory
  Future<String?> exportScreenshots(List<File> screenshots, String exportDirName) async {
    try {
      final externalDir = await getExternalStorageDirectory();
      if (externalDir == null) {
        return null;
      }
      
      final exportDir = Directory('${externalDir.path}/Miranda_Export_$exportDirName');
      await exportDir.create(recursive: true);
      
      for (final screenshot in screenshots) {
        final filename = screenshot.path.split('/').last;
        final exportFile = File('${exportDir.path}/$filename');
        await screenshot.copy(exportFile.path);
      }
      
      print('Exported ${screenshots.length} screenshots to: ${exportDir.path}');
      return exportDir.path;
    } catch (e) {
      print('Error exporting screenshots: $e');
      return null;
    }
  }

  // Getters
  String? get baseDirectory => _baseDirectory;
  String? get screenshotsDirectory => _baseDirectory != null ? '$_baseDirectory/screenshots' : null;
}