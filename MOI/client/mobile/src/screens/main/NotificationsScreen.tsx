import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  IconButton,
  Badge,
  Chip,
  Searchbar,
  FAB,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../../utils/theme';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingScreen from '../common/LoadingScreen';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  read: boolean;
  createdAt: string;
  metadata?: {
    contentId?: string;
    platform?: string;
    campaignId?: string;
  };
}

const NotificationsScreen: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, filterType]);

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by read status
    if (filterType === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filterType === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Navigate to relevant screen based on notification type
    // if (notification.metadata?.contentId) {
    //   navigation.navigate('ContentDetail', { contentId: notification.metadata.contentId });
    // }
  };

  const getNotificationIcon = (type: string, channel: string) => {
    const iconMap = {
      info: 'information',
      success: 'check-circle',
      warning: 'alert',
      error: 'alert-circle',
    };

    const channelIconMap = {
      email: 'email',
      sms: 'message-text',
      push: 'bell',
      in_app: 'application',
    };

    return iconMap[type as keyof typeof iconMap] || channelIconMap[channel as keyof typeof channelIconMap] || 'bell';
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      info: colors.primary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
    };

    return colorMap[type as keyof typeof colorMap] || colors.primary;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity onPress={() => handleNotificationPress(item)}>
      <Card style={[styles.notificationCard, !item.read && styles.unreadCard]}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.notificationHeader}>
            <Avatar.Icon
              size={40}
              icon={getNotificationIcon(item.type, item.channel)}
              style={{ backgroundColor: getNotificationColor(item.type) }}
            />
            <View style={styles.notificationInfo}>
              <Text variant="titleSmall" style={styles.notificationTitle}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={styles.notificationTime}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
            <View style={styles.notificationActions}>
              {!item.read && (
                <Badge style={styles.unreadBadge} />
              )}
              <IconButton
                icon="delete"
                size={20}
                onPress={() => deleteNotification(item.id)}
              />
            </View>
          </View>
          <Text variant="bodyMedium" style={styles.notificationMessage}>
            {item.message}
          </Text>
          <View style={styles.notificationFooter}>
            <Chip
              mode="outlined"
              compact
              icon={getNotificationIcon(item.type, item.channel)}
              style={styles.channelChip}
            >
              {item.channel.toUpperCase()}
            </Chip>
            {item.metadata?.platform && (
              <Chip
                mode="outlined"
                compact
                style={styles.platformChip}
              >
                {item.metadata.platform}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search notifications..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.filterRow}>
          <View style={styles.filterChips}>
            <Chip
              selected={filterType === 'all'}
              onPress={() => setFilterType('all')}
              style={styles.filterChip}
            >
              All
            </Chip>
            <Chip
              selected={filterType === 'unread'}
              onPress={() => setFilterType('unread')}
              style={styles.filterChip}
            >
              Unread ({unreadCount})
            </Chip>
            <Chip
              selected={filterType === 'read'}
              onPress={() => setFilterType('read')}
              style={styles.filterChip}
            >
              Read
            </Chip>
          </View>
          {unreadCount > 0 && (
            <IconButton
              icon="check-all"
              onPress={markAllAsRead}
              tooltip="Mark all as read"
            />
          )}
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-outline" size={64} color={colors.disabled} />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No notifications
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {filterType === 'unread'
                ? "You're all caught up!"
                : 'Notifications will appear here'}
            </Text>
          </View>
        }
      />

      <FAB
        icon="bell-ring"
        style={styles.fab}
        onPress={() => {
          // Navigate to notification settings
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    height: 32,
  },
  listContainer: {
    padding: spacing.md,
    flexGrow: 1,
  },
  notificationCard: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardContent: {
    padding: spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  notificationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  notificationTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  notificationTime: {
    color: colors.onSurfaceVariant,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  notificationMessage: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  channelChip: {
    height: 28,
  },
  platformChip: {
    height: 28,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.onSurfaceVariant,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default NotificationsScreen;
