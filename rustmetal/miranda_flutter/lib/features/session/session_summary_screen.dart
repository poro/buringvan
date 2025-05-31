import 'package:flutter/material.dart';
import 'dart:io';
import '../../services/session_service.dart';
import '../../services/file_service.dart';
import '../../ui/theme/asu_theme.dart';
import '../../main.dart';

class SessionSummaryScreen extends StatefulWidget {
  final String sessionId;
  
  const SessionSummaryScreen({
    super.key,
    required this.sessionId,
  });

  @override
  State<SessionSummaryScreen> createState() => _SessionSummaryScreenState();
}

class _SessionSummaryScreenState extends State<SessionSummaryScreen> {
  final SessionService _sessionService = SessionService();
  final FileService _fileService = FileService();
  Map<String, dynamic>? _sessionDetails;
  List<File> _sessionScreenshots = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSessionDetails();
  }

  Future<void> _loadSessionDetails() async {
    setState(() => _isLoading = true);
    
    try {
      final details = await _sessionService.getSessionDetails(widget.sessionId);
      
      // Load real screenshot files for this session
      await _fileService.initialize();
      final allScreenshots = await _fileService.getAllScreenshots();
      
      // Filter screenshots that match this session ID or were created during session time
      List<File> sessionScreenshots = [];
      
      if (details != null) {
        final sessionStartTime = DateTime.tryParse(details['start_time'] ?? '');
        final sessionEndTime = DateTime.tryParse(details['end_time'] ?? '') ?? DateTime.now();
        
        if (sessionStartTime != null) {
          sessionScreenshots = allScreenshots.where((file) {
            final stat = file.statSync();
            return stat.modified.isAfter(sessionStartTime) && 
                   stat.modified.isBefore(sessionEndTime.add(const Duration(minutes: 1)));
          }).toList();
        }
      }
      
      // If still no screenshots found, check by filename
      if (sessionScreenshots.isEmpty) {
        sessionScreenshots = allScreenshots.where((file) {
          final filename = file.path.split('/').last;
          return filename.contains(widget.sessionId);
        }).toList();
      }
      
      // If no session-specific screenshots found, show all recent screenshots as fallback
      final screenshotsToShow = sessionScreenshots.isNotEmpty 
          ? sessionScreenshots 
          : allScreenshots; // Show all screenshots as fallback
      
      setState(() {
        _sessionDetails = details;
        _sessionScreenshots = screenshotsToShow;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading session details: $e');
      setState(() => _isLoading = false);
    }
  }

  String _formatDuration(int seconds) {
    final duration = Duration(seconds: seconds);
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    final secs = duration.inSeconds % 60;
    
    if (hours > 0) {
      return '${hours}h ${minutes}m ${secs}s';
    } else if (minutes > 0) {
      return '${minutes}m ${secs}s';
    } else {
      return '${secs}s';
    }
  }

  String _formatDateTime(String dateTimeStr) {
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTimeStr;
    }
  }

  Widget _buildScreenshotCard(Map<String, dynamic> screenshot, int index) {
    final analysis = screenshot['analysis'] as Map<String, dynamic>?;
    final skills = analysis?['skills'] as List<dynamic>? ?? [];
    final confidence = analysis?['confidence'] as double? ?? 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: ASUColors.blue,
          child: Text(
            '${index + 1}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          'Screenshot ${index + 1}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        subtitle: Text(
          _formatDateTime(screenshot['timestamp'] ?? ''),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Show placeholder for mock data screenshots
                Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    color: ASUColors.gray5,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: ASUColors.gray4),
                  ),
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.analytics,
                          size: 48,
                          color: ASUColors.gray3,
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Analysis Data Only',
                          style: TextStyle(color: ASUColors.gray3),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Analysis section
                if (analysis != null) ...[
                  Text(
                    'AI Analysis',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: ASUColors.maroon,
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  // Confidence indicator
                  Row(
                    children: [
                      const Text('Confidence: '),
                      Expanded(
                        child: LinearProgressIndicator(
                          value: confidence,
                          backgroundColor: ASUColors.gray4,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            confidence > 0.7 ? ASUColors.green : 
                            confidence > 0.4 ? ASUColors.orange : ASUColors.pink,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('${(confidence * 100).toInt()}%'),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Skills detected
                  if (skills.isNotEmpty) ...[
                    Text(
                      'Skills Detected:',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: skills.map((skill) {
                        return Chip(
                          label: Text(skill.toString()),
                          backgroundColor: ASUColors.blue.withOpacity(0.1),
                          labelStyle: const TextStyle(
                            color: ASUColors.blue,
                            fontWeight: FontWeight.w500,
                          ),
                        );
                      }).toList(),
                    ),
                  ] else ...[
                    const Text(
                      'No skills detected in this screenshot',
                      style: TextStyle(color: ASUColors.gray3),
                    ),
                  ],
                ] else ...[
                  const Text(
                    'No analysis available for this screenshot',
                    style: TextStyle(color: ASUColors.gray3),
                  ),
                ],
                
                const SizedBox(height: 16),
                
                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        // TODO: Open full-size screenshot
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('View screenshot functionality coming soon')),
                        );
                      },
                      icon: const Icon(Icons.fullscreen, size: 18),
                      label: const Text('View Full'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ASUColors.blue,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        // TODO: Share screenshot
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Share functionality coming soon')),
                        );
                      },
                      icon: const Icon(Icons.share, size: 18),
                      label: const Text('Share'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ASUColors.green,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRealScreenshotCard(File screenshotFile, int index) {
    final stats = _fileService.getScreenshotMetadata(screenshotFile);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: ASUColors.green,
          child: Text(
            '${index + 1}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          stats['filename'],
          style: Theme.of(context).textTheme.titleMedium,
        ),
        subtitle: Text(
          '${(stats['size'] / 1024).toStringAsFixed(1)} KB • ${DateTime.parse(stats['created']).toString().substring(11, 19)}',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Real screenshot display
                Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: ASUColors.gray4),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Hero(
                      tag: screenshotFile.path,
                      child: Image.file(
                        screenshotFile,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: ASUColors.gray5,
                            child: const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.broken_image,
                                    size: 48,
                                    color: ASUColors.gray3,
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Failed to load image',
                                    style: TextStyle(color: ASUColors.gray3),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // File info
                Text(
                  'Screenshot Details',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: ASUColors.maroon,
                  ),
                ),
                const SizedBox(height: 8),
                Text('File: ${stats['filename']}'),
                Text('Size: ${(stats['size'] / 1024).toStringAsFixed(1)} KB'),
                Text('Created: ${stats['created']}'),
                
                const SizedBox(height: 16),
                
                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => ScreenshotViewerScreen(
                              imageFile: screenshotFile,
                              title: stats['filename'],
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.fullscreen, size: 18),
                      label: const Text('View Full'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ASUColors.blue,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Path: ${stats['path']}')),
                        );
                      },
                      icon: const Icon(Icons.info, size: 18),
                      label: const Text('Info'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ASUColors.green,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Session ${widget.sessionId}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSessionDetails,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _sessionDetails == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 64,
                        color: ASUColors.gray3,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Session not found',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: ASUColors.gray3,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'This session may have been deleted',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Session summary card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Session Summary',
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: ASUColors.maroon,
                                ),
                              ),
                              const SizedBox(height: 12),
                              
                              Row(
                                children: [
                                  const Icon(Icons.timer, color: ASUColors.gray3),
                                  const SizedBox(width: 8),
                                  Text('Duration: ${_formatDuration(_sessionDetails!['duration'] ?? 0)}'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              
                              Row(
                                children: [
                                  const Icon(Icons.camera_alt, color: ASUColors.gray3),
                                  const SizedBox(width: 8),
                                  Text('Screenshots: ${(_sessionDetails!['screenshots'] as List?)?.length ?? 0}'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              
                              Row(
                                children: [
                                  const Icon(Icons.schedule, color: ASUColors.gray3),
                                  const SizedBox(width: 8),
                                  Text('Started: ${_formatDateTime(_sessionDetails!['start_time'] ?? '')}'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              
                              Row(
                                children: [
                                  const Icon(Icons.schedule, color: ASUColors.gray3),
                                  const SizedBox(width: 8),
                                  Text('Ended: ${_formatDateTime(_sessionDetails!['end_time'] ?? '')}'),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Screenshots section
                      Text(
                        'Screenshots',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: ASUColors.maroon,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // Show real screenshots first (from actual files)
                      if (_sessionScreenshots.isNotEmpty) ...[
                        Text(
                          'Real Screenshots (${_sessionScreenshots.length})',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: ASUColors.green,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ..._sessionScreenshots.asMap().entries.map(
                          (entry) => _buildRealScreenshotCard(entry.value, entry.key),
                        ),
                        const SizedBox(height: 16),
                      ],
                      
                      // Show analysis data screenshots (mock data)
                      if ((_sessionDetails!['screenshots'] as List?)?.isNotEmpty ?? false) ...[
                        Text(
                          'Analysis Data (${(_sessionDetails!['screenshots'] as List).length})',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: ASUColors.blue,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...(_sessionDetails!['screenshots'] as List).asMap().entries.map(
                          (entry) => _buildScreenshotCard(entry.value, entry.key),
                        ),
                      ],
                      
                      // Show message if no screenshots at all
                      if (_sessionScreenshots.isEmpty && ((_sessionDetails!['screenshots'] as List?)?.isEmpty ?? true)) ...[
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Center(
                              child: Column(
                                children: [
                                  const Icon(
                                    Icons.camera_alt,
                                    size: 48,
                                    color: ASUColors.gray3,
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'No screenshots found',
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: ASUColors.gray3,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Start a session to capture screenshots',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}