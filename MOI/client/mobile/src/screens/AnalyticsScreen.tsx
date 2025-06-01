import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface AnalyticsData {
  totalEngagement: number;
  totalReach: number;
  totalPosts: number;
  platformStats: {
    [key: string]: {
      engagement: number;
      reach: number;
      posts: number;
      growth: number;
    };
  };
  timeSeriesData: {
    date: string;
    engagement: number;
    reach: number;
  }[];
}

const AnalyticsScreen = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3000/api/analytics?timeRange=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin':
        return 'linkedin';
      case 'twitter':
        return 'twitter';
      case 'instagram':
        return 'instagram';
      case 'tiktok':
        return 'music-note';
      case 'youtube':
        return 'youtube';
      default:
        return 'share';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const chartData = {
    labels: analytics?.timeSeriesData.map(d => d.date) || [],
    datasets: [
      {
        data: analytics?.timeSeriesData.map(d => d.engagement) || [],
        color: () => '#007AFF',
        strokeWidth: 2,
      },
      {
        data: analytics?.timeSeriesData.map(d => d.reach) || [],
        color: () => '#4CAF50',
        strokeWidth: 2,
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '7d' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('7d')}
        >
          <Text style={[styles.timeRangeText, timeRange === '7d' && styles.timeRangeTextActive]}>
            7D
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '30d' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('30d')}
        >
          <Text style={[styles.timeRangeText, timeRange === '30d' && styles.timeRangeTextActive]}>
            30D
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '90d' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('90d')}
        >
          <Text style={[styles.timeRangeText, timeRange === '90d' && styles.timeRangeTextActive]}>
            90D
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Stats */}
      <View style={styles.overviewContainer}>
        <View style={styles.statCard}>
          <Icon name="chart-line" size={24} color="#007AFF" />
          <Text style={styles.statValue}>{analytics?.totalEngagement.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Engagement</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="eye" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{analytics?.totalReach.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Reach</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="post" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{analytics?.totalPosts.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Posts</Text>
        </View>
      </View>

      {/* Performance Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Performance Trend</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={styles.chart}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Engagement</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Reach</Text>
          </View>
        </View>
      </View>

      {/* Platform Performance */}
      <View style={styles.platformsContainer}>
        <Text style={styles.sectionTitle}>Platform Performance</Text>
        {analytics?.platformStats &&
          Object.entries(analytics.platformStats).map(([platform, stats]) => (
            <View key={platform} style={styles.platformCard}>
              <View style={styles.platformHeader}>
                <Icon name={getPlatformIcon(platform)} size={24} color="#007AFF" />
                <Text style={styles.platformName}>{platform}</Text>
                <View style={styles.growthContainer}>
                  <Icon
                    name={stats.growth >= 0 ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={stats.growth >= 0 ? '#4CAF50' : '#FF3B30'}
                  />
                  <Text
                    style={[
                      styles.growthText,
                      { color: stats.growth >= 0 ? '#4CAF50' : '#FF3B30' },
                    ]}
                  >
                    {Math.abs(stats.growth)}%
                  </Text>
                </View>
              </View>
              <View style={styles.platformStats}>
                <View style={styles.platformStat}>
                  <Text style={styles.platformStatValue}>
                    {stats.engagement.toLocaleString()}
                  </Text>
                  <Text style={styles.platformStatLabel}>Engagement</Text>
                </View>
                <View style={styles.platformStat}>
                  <Text style={styles.platformStatValue}>
                    {stats.reach.toLocaleString()}
                  </Text>
                  <Text style={styles.platformStatLabel}>Reach</Text>
                </View>
                <View style={styles.platformStat}>
                  <Text style={styles.platformStatValue}>
                    {stats.posts.toLocaleString()}
                  </Text>
                  <Text style={styles.platformStatLabel}>Posts</Text>
                </View>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666666',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overviewContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  chartContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  platformsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  platformCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#1A1A1A',
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  growthText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  platformStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  platformStat: {
    alignItems: 'center',
  },
  platformStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  platformStatLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
});

export default AnalyticsScreen; 