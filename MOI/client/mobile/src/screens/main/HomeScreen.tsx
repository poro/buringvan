import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  IconButton,
  FAB,
} from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { contentAPI, analyticsAPI, socialAPI } from '../../services/api';
import { colors } from '../../utils/theme';

const { width: screenWidth } = Dimensions.get('window');

// Add interfaces for the data
interface ContentItem {
  id: string;
  title?: string;
  text?: string;
  status: string;
  createdAt: string;
}
interface ContentData {
  total: number;
  items: ContentItem[];
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
}

const HomeScreen = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [socialData, setSocialData] = useState<SocialAccount[] | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setContentLoading(true);
      const contentResponse = await contentAPI.getContent({ limit: 5, sort: '-createdAt' });
      setContentData(contentResponse.data);

      setAnalyticsLoading(true);
      const analyticsResponse = await analyticsAPI.getMetrics({ timeRange: '30d' });
      setAnalyticsData(analyticsResponse.data);

      setSocialLoading(true);
      const socialResponse = await socialAPI.getAccounts();
      setSocialData(socialResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
      setContentLoading(false);
      setAnalyticsLoading(false);
      setSocialLoading(false);
    }
  };

  // Mock data for charts
  const engagementData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 67],
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const platformData = {
    labels: ['LinkedIn', 'Twitter', 'Instagram', 'TikTok'],
    datasets: [
      {
        data: [45, 32, 28, 15],
      },
    ],
  };

  const pieData = [
    {
      name: 'Published',
      population: 45,
      color: colors.success,
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Scheduled',
      population: 25,
      color: colors.warning,
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Draft',
      population: 20,
      color: colors.info,
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Pending',
      population: 10,
      color: colors.error,
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
  ];

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  const isLoading = contentLoading || analyticsLoading || socialLoading;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.name?.split(' ')[0]}!
          </Text>
          <Text style={styles.subtitleText}>
            Here's what's happening with your social media today.
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="file-document" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>
                {contentData ? contentData.total : 0}
              </Text>
              <Text style={styles.statLabel}>Total Content</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="calendar-check" size={24} color={colors.success} />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="trending-up" size={24} color={colors.warning} />
              <Text style={styles.statNumber}>85%</Text>
              <Text style={styles.statLabel}>Engagement</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="account-group" size={24} color={colors.info} />
              <Text style={styles.statNumber}>
                {socialData ? socialData.length : 0}
              </Text>
              <Text style={styles.statLabel}>Accounts</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionCard}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                icon="auto-fix"
                style={styles.actionButton}
                onPress={() => {}}
              >
                Generate AI Content
              </Button>
              <Button
                mode="outlined"
                icon="calendar-plus"
                style={styles.actionButton}
                onPress={() => {}}
              >
                Schedule Post
              </Button>
              <Button
                mode="outlined"
                icon="chart-line"
                style={styles.actionButton}
                onPress={() => {}}
              >
                View Analytics
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Engagement Chart */}
        <Card style={styles.chartCard}>
          <Card.Title title="Weekly Engagement" />
          <Card.Content>
            <LineChart
              data={engagementData}
              width={screenWidth - 80}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Platform Performance */}
        <Card style={styles.chartCard}>
          <Card.Title title="Platform Performance" />
          <Card.Content>
            <BarChart
              data={platformData}
              width={screenWidth - 80}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </Card.Content>
        </Card>

        {/* Content Status */}
        <Card style={styles.chartCard}>
          <Card.Title title="Content Status" />
          <Card.Content>
            <PieChart
              data={pieData}
              width={screenWidth - 80}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Recent Content */}
        {contentData && contentData.items && contentData.items.length > 0 && (
          <Card style={styles.contentCard}>
            <Card.Title title="Recent Content" />
            <Card.Content>
              {contentData.items.slice(0, 3).map((content: ContentItem) => (
                <View key={content.id} style={styles.contentItem}>
                  <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle} numberOfLines={2}>
                      {content.title || (content.text ? content.text.substring(0, 50) + '...' : '')}
                    </Text>
                    <View style={styles.contentMeta}>
                      <Chip
                        textStyle={styles.chipText}
                        style={[
                          styles.statusChip,
                          { backgroundColor: getStatusColor(content.status) },
                        ]}
                      >
                        {content.status}
                      </Chip>
                      <Text style={styles.contentDate}>
                        {new Date(content.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    onPress={() => {}}
                  />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Notifications */}
        {unreadCount > 0 && (
          <Card style={styles.notificationCard}>
            <Card.Content>
              <View style={styles.notificationContent}>
                <Icon name="bell" size={24} color={colors.warning} />
                <Text style={styles.notificationText}>
                  You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Text>
                <Button mode="text" onPress={() => {}}>
                  View
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {}}
        label="Create"
      />
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'published':
      return colors.success + '20';
    case 'scheduled':
      return colors.warning + '20';
    case 'draft':
      return colors.info + '20';
    case 'pending':
      return colors.error + '20';
    default:
      return colors.primary + '20';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: (screenWidth - 48) / 2,
    marginBottom: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionCard: {
    marginBottom: 20,
    elevation: 2,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
  chartCard: {
    marginBottom: 20,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  contentCard: {
    marginBottom: 20,
    elevation: 2,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusChip: {
    height: 24,
  },
  chipText: {
    fontSize: 12,
  },
  contentDate: {
    fontSize: 12,
    color: '#666',
  },
  notificationCard: {
    marginBottom: 20,
    backgroundColor: colors.warning + '10',
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default HomeScreen;
