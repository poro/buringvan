import 'package:flutter/material.dart';
import '../../services/session_service.dart';
import '../../ui/theme/asu_theme.dart';
import 'session_summary_screen.dart';

class SessionsListScreen extends StatefulWidget {
  const SessionsListScreen({super.key});

  @override
  State<SessionsListScreen> createState() => _SessionsListScreenState();
}

class _SessionsListScreenState extends State<SessionsListScreen> {
  final SessionService _sessionService = SessionService();
  List<Map<String, dynamic>> _sessions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }
  
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Refresh sessions when returning to this screen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _loadSessions();
      }
    });
  }

  Future<void> _loadSessions() async {
    setState(() => _isLoading = true);
    
    try {
      final sessions = await _sessionService.getAllSessions();
      
      // Force update screenshot counts for each session
      for (int i = 0; i < sessions.length; i++) {
        final sessionId = sessions[i]['id'];
        if (sessionId != null) {
          final details = await _sessionService.getSessionDetails(sessionId);
          if (details != null) {
            sessions[i]['screenshots_count'] = (details['screenshots'] as List?)?.length ?? 0;
            sessions[i]['duration'] = details['duration'] ?? 0;
            sessions[i]['end_time'] = details['end_time'];
            sessions[i]['status'] = details['status'];
          }
        }
      }
      
      setState(() {
        _sessions = sessions;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading sessions: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteSession(String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Session'),
        content: const Text('Are you sure you want to delete this session? This action cannot be undone.'),
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
      final success = await _sessionService.deleteSession(sessionId);
      if (success) {
        await _loadSessions(); // Refresh the list
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Session deleted successfully')),
          );
        }
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to delete session')),
          );
        }
      }
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
      final now = DateTime.now();
      final difference = now.difference(dateTime);
      
      if (difference.inDays > 0) {
        return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''} ago';
      } else {
        return 'Just now';
      }
    } catch (e) {
      return dateTimeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Session History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSessions,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _sessions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.history,
                        size: 64,
                        color: ASUColors.gray3,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No sessions yet',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: ASUColors.gray3,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Start a session to see it here',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadSessions,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _sessions.length,
                    itemBuilder: (context, index) {
                      final session = _sessions[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: CircleAvatar(
                            backgroundColor: ASUColors.maroon,
                            child: Text(
                              '${index + 1}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          title: Text(
                            'Session ${session['id']}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.timer, size: 16, color: ASUColors.gray3),
                                  const SizedBox(width: 4),
                                  Text(_formatDuration(session['duration'] ?? 0)),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  Icon(Icons.camera_alt, size: 16, color: ASUColors.gray3),
                                  const SizedBox(width: 4),
                                  Text('${session['screenshots_count'] ?? 0} screenshots'),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  Icon(Icons.access_time, size: 16, color: ASUColors.gray3),
                                  const SizedBox(width: 4),
                                  Text(_formatDateTime(session['start_time'] ?? '')),
                                ],
                              ),
                            ],
                          ),
                          trailing: PopupMenuButton<String>(
                            onSelected: (value) {
                              if (value == 'delete') {
                                _deleteSession(session['id']);
                              }
                            },
                            itemBuilder: (context) => [
                              const PopupMenuItem(
                                value: 'delete',
                                child: Row(
                                  children: [
                                    Icon(Icons.delete, color: ASUColors.pink),
                                    SizedBox(width: 8),
                                    Text('Delete'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          onTap: () async {
                            // Navigate to session details and refresh when returning
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => SessionSummaryScreen(
                                  sessionId: session['id'],
                                ),
                              ),
                            );
                            // Refresh the list when returning from session details
                            if (mounted) {
                              _loadSessions();
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}