import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';

interface AnalyticsSummary {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  platformStats: {
    [key: string]: {
      posts: number;
      engagement: number;
      reach: number;
    };
  };
}

interface RecentPost {
  id: string;
  text: string;
  platform: string;
  status: 'scheduled' | 'published' | 'failed';
  scheduledFor?: Date;
  publishedAt?: Date;
  engagement: number;
}

const HomeScreen = () => {
  const { token } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, postsRes] = await Promise.all([
        axios.get('http://localhost:3000/api/analytics/summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3000/api/content/recent', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setAnalytics(analyticsRes.data);
      setRecentPosts(postsRes.data);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#4CAF50';
      case 'scheduled':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Analytics Overview */}
      <View style={styles.analyticsContainer}>
        <Text style={styles.sectionTitle}>Analytics Overview</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Icon name="post" size={24} color="#007AFF" />
            <Text style={styles.analyticsValue}>{analytics?.totalPosts || 0}</Text>
            <Text style={styles.analyticsLabel}>Total Posts</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Icon name="chart-line" size={24} color="#4CAF50" />
            <Text style={styles.analyticsValue}>{analytics?.totalEngagement || 0}</Text>
            <Text style={styles.analyticsLabel}>Engagement</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Icon name="eye" size={24} color="#FF9800" />
            <Text style={styles.analyticsValue}>{analytics?.totalReach || 0}</Text>
            <Text style={styles.analyticsLabel}>Total Reach</Text>
          </View>
        </View>
      </View>

      {/* Platform Stats */}
      <View style={styles.platformStatsContainer}>
        <Text style={styles.sectionTitle}>Platform Performance</Text>
        {analytics?.platformStats && Object.entries(analytics.platformStats).map(([platform, stats]) => (
          <View key={platform} style={styles.platformCard}>
            <View style={styles.platformHeader}>
              <Icon name={getPlatformIcon(platform)} size={24} color="#007AFF" />
              <Text style={styles.platformName}>{platform}</Text>
            </View>
            <View style={styles.platformStats}>
              <View style={styles.platformStat}>
                <Text style={styles.platformStatValue}>{stats.posts}</Text>
                <Text style={styles.platformStatLabel}>Posts</Text>
              </View>
              <View style={styles.platformStat}>
                <Text style={styles.platformStatValue}>{stats.engagement}</Text>
                <Text style={styles.platformStatLabel}>Engagement</Text>
              </View>
              <View style={styles.platformStat}>
                <Text style={styles.platformStatValue}>{stats.reach}</Text>
                <Text style={styles.platformStatLabel}>Reach</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Posts */}
      <View style={styles.recentPostsContainer}>
        <Text style={styles.sectionTitle}>Recent Posts</Text>
        {recentPosts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Icon name={getPlatformIcon(post.platform)} size={20} color="#007AFF" />
              <Text style={styles.postPlatform}>{post.platform}</Text>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(post.status) }]} />
            </View>
            <Text style={styles.postText} numberOfLines={2}>
              {post.text}
            </Text>
            <View style={styles.postFooter}>
              <Text style={styles.postDate}>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString()
                  : new Date(post.scheduledFor!).toLocaleDateString()}
              </Text>
              <Text style={styles.postEngagement}>
                {post.engagement} engagements
              </Text>
            </View>
          </TouchableOpacity>
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
  analyticsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1A1A1A',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  platformStatsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
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
  platformStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  platformStat: {
    alignItems: 'center',
  },
  platformStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  platformStatLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  recentPostsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  postCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postPlatform: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#1A1A1A',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  postText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postDate: {
    fontSize: 12,
    color: '#666666',
  },
  postEngagement: {
    fontSize: 12,
    color: '#007AFF',
  },
});

export default HomeScreen; 