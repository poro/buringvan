import 'package:flutter/material.dart';
import 'dart:io';
import '../../services/session_service.dart';
import '../../services/file_service.dart';
import '../../services/rust_bridge_service.dart';
import '../../ui/theme/asu_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final SessionService _sessionService = SessionService();
  final FileService _fileService = FileService();
  final RustBridgeService _rustBridge = RustBridgeService();
  
  bool _isLoading = false;
  Map<String, dynamic> _storageStats = {};
  List<Map<String, dynamic>> _sessions = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      // Load storage statistics
      await _fileService.initialize();
      final stats = await _fileService.getStorageStats();
      
      // Load sessions
      final sessions = await _sessionService.getAllSessions();
      
      setState(() {
        _storageStats = stats;
        _sessions = sessions;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading settings data: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteAllSessions() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete All Sessions'),
        content: const Text(
          'Are you sure you want to delete ALL sessions and their screenshots? '
          'This action cannot be undone and will free up storage space.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: ASUColors.pink),
            child: const Text('Delete All'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      
      try {
        int deletedSessions = _sessions.length;
        int deletedScreenshots = 0;
        
        // Delete all sessions from Rust backend
        for (final session in _sessions) {
          await _sessionService.deleteSession(session['id']);
        }
        
        // Clear all sessions from storage
        await _rustBridge.clearAllSessions();
        
        // Clean up all screenshot files
        final screenshots = await _fileService.getAllScreenshots();
        for (final screenshot in screenshots) {
          try {
            await screenshot.delete();
            deletedScreenshots++;
          } catch (e) {
            print('Error deleting screenshot: $e');
          }
        }
        
        // Reload data
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Deleted $deletedSessions sessions and $deletedScreenshots screenshots',
              ),
              backgroundColor: ASUColors.green,
            ),
          );
        }
      } catch (e) {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error deleting sessions: $e'),
              backgroundColor: ASUColors.pink,
            ),
          );
        }
      }
    }
  }

  Future<void> _cleanOldScreenshots() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clean Old Screenshots'),
        content: const Text(
          'This will keep only the most recent 100 screenshots '
          'and delete older ones to free up storage space.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: ASUColors.orange),
            child: const Text('Clean Up'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      
      try {
        final deletedCount = await _fileService.cleanOldScreenshots(keepCount: 100);
        
        // Reload data
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cleaned up $deletedCount old screenshots'),
              backgroundColor: ASUColors.green,
            ),
          );
        }
      } catch (e) {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error cleaning screenshots: $e'),
              backgroundColor: ASUColors.pink,
            ),
          );
        }
      }
    }
  }
  
  Future<void> _deleteAllScreenshots() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete ALL Screenshots'),
        content: const Text(
          'Are you sure you want to delete ALL screenshots? '
          'This action cannot be undone and will completely clear your screenshot storage.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete Everything'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      
      try {
        // Delete all screenshots
        final deletedCount = await _fileService.deleteAllScreenshots();
        
        // Clear all sessions
        await _rustBridge.clearAllSessions();
        
        // Reload data
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Deleted all $deletedCount screenshots and cleared all session data',
              ),
              backgroundColor: ASUColors.green,
            ),
          );
        }
      } catch (e) {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error deleting screenshots: $e'),
              backgroundColor: ASUColors.pink,
            ),
          );
        }
      }
    }
  }

  Future<void> _exportAllScreenshots() async {
    setState(() => _isLoading = true);
    
    try {
      final screenshots = await _fileService.getAllScreenshots();
      
      if (screenshots.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No screenshots to export')),
        );
        setState(() => _isLoading = false);
        return;
      }
      
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final exportPath = await _fileService.exportScreenshots(
        screenshots, 
        timestamp.toString(),
      );
      
      setState(() => _isLoading = false);
      
      if (exportPath != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Exported ${screenshots.length} screenshots to:\n$exportPath',
            ),
            duration: const Duration(seconds: 4),
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Export failed'),
            backgroundColor: ASUColors.pink,
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Export error: $e'),
            backgroundColor: ASUColors.pink,
          ),
        );
      }
    }
  }

  Widget _buildStorageCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Storage Usage',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: ASUColors.maroon,
              ),
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                const Icon(Icons.photo_library, color: ASUColors.gray3),
                const SizedBox(width: 8),
                Text('Screenshots: ${_storageStats['screenshot_count'] ?? 0}'),
              ],
            ),
            const SizedBox(height: 8),
            
            Row(
              children: [
                const Icon(Icons.storage, color: ASUColors.gray3),
                const SizedBox(width: 8),
                Text('Total Size: ${_storageStats['total_size_mb'] ?? '0.00'} MB'),
              ],
            ),
            const SizedBox(height: 8),
            
            Row(
              children: [
                const Icon(Icons.folder, color: ASUColors.gray3),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Path: ${_storageStats['base_directory'] ?? 'Unknown'}',
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteIndividualSession(String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Session'),
        content: Text(
          'Are you sure you want to delete session "$sessionId" and its associated data? '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: ASUColors.pink),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      
      try {
        // Delete the session
        final success = await _sessionService.deleteSession(sessionId);
        
        if (success) {
          // Also delete any associated screenshot files
          final screenshots = await _fileService.getAllScreenshots();
          int deletedScreenshots = 0;
          
          for (final screenshot in screenshots) {
            final filename = screenshot.path.split('/').last;
            if (filename.contains(sessionId)) {
              try {
                await screenshot.delete();
                deletedScreenshots++;
              } catch (e) {
                print('Error deleting screenshot: $e');
              }
            }
          }
          
          // Reload data
          await _loadData();
          
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Deleted session "$sessionId" and $deletedScreenshots associated screenshots',
                ),
                backgroundColor: ASUColors.green,
              ),
            );
          }
        } else {
          setState(() => _isLoading = false);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to delete session "$sessionId"'),
                backgroundColor: ASUColors.pink,
              ),
            );
          }
        }
      } catch (e) {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error deleting session: $e'),
              backgroundColor: ASUColors.pink,
            ),
          );
        }
      }
    }
  }

  Widget _buildSessionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Session Management',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: ASUColors.maroon,
              ),
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                const Icon(Icons.history, color: ASUColors.gray3),
                const SizedBox(width: 8),
                Text('Total Sessions: ${_sessions.length}'),
              ],
            ),
            const SizedBox(height: 16),
            
            // Bulk action buttons
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton.icon(
                  onPressed: _sessions.isNotEmpty ? _deleteAllSessions : null,
                  icon: const Icon(Icons.delete_forever, size: 18),
                  label: const Text('Delete All Sessions'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ASUColors.pink,
                    foregroundColor: Colors.white,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _cleanOldScreenshots,
                  icon: const Icon(Icons.cleaning_services, size: 18),
                  label: const Text('Clean Old Screenshots'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ASUColors.orange,
                    foregroundColor: Colors.white,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _deleteAllScreenshots,
                  icon: const Icon(Icons.delete_sweep, size: 18),
                  label: const Text('Delete ALL Screenshots'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
                if (Platform.isAndroid)
                  ElevatedButton.icon(
                    onPressed: _exportAllScreenshots,
                    icon: const Icon(Icons.file_download, size: 18),
                    label: const Text('Export Screenshots'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ASUColors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
              ],
            ),
            
            // Individual sessions list
            if (_sessions.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'Individual Sessions',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: ASUColors.maroon,
                ),
              ),
              const SizedBox(height: 8),
              
              // Show up to 10 most recent sessions
              ...(_sessions.take(10).toList().asMap().entries.map((entry) {
                final index = entry.key;
                final session = entry.value;
                final sessionId = session['id'] ?? 'Unknown';
                final duration = session['duration'] ?? 0;
                final screenshots = session['screenshots_count'] ?? 0;
                
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: ASUColors.blue,
                      radius: 16,
                      child: Text(
                        '${index + 1}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      'Session $sessionId',
                      style: const TextStyle(fontSize: 14),
                    ),
                    subtitle: Text(
                      '${duration}s duration • $screenshots screenshots',
                      style: const TextStyle(fontSize: 12),
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete, color: ASUColors.pink, size: 20),
                      onPressed: () => _deleteIndividualSession(sessionId),
                      tooltip: 'Delete this session',
                    ),
                    dense: true,
                  ),
                );
              })),
              
              if (_sessions.length > 10) ...[
                const SizedBox(height: 8),
                Text(
                  'Showing 10 of ${_sessions.length} sessions',
                  style: TextStyle(
                    fontSize: 12,
                    color: ASUColors.gray3,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Storage usage card
                  _buildStorageCard(),
                  
                  const SizedBox(height: 16),
                  
                  // Session management card
                  _buildSessionsCard(),
                  
                  const SizedBox(height: 16),
                  
                  // App info card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'App Information',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: ASUColors.maroon,
                            ),
                          ),
                          const SizedBox(height: 12),
                          
                          Row(
                            children: [
                              const Icon(Icons.info, color: ASUColors.gray3),
                              const SizedBox(width: 8),
                              const Text('Version: 1.0.0'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          
                          Row(
                            children: [
                              const Icon(Icons.phone_android, color: ASUColors.gray3),
                              const SizedBox(width: 8),
                              Text('Platform: ${Platform.operatingSystem}'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          
                          Row(
                            children: [
                              const Icon(Icons.memory, color: ASUColors.gray3),
                              const SizedBox(width: 8),
                              const Text('Miranda Core: Rust + Flutter'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}