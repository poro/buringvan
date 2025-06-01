import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from 'react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { contentAPI } from '../../services/api';
import { colors } from '../../utils/theme';
import PlatformPreview from '../../components/content/PlatformPreview';

const ContentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { contentId } = route.params as { contentId: string };

  const { data: content, isLoading, error } = useQuery(
    ['content', contentId],
    () => contentAPI.getContentById(contentId)
  );

  const navigateToApproval = () => {
    navigation.navigate('Approval' as never, { contentId } as never);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>Failed to load content</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const contentData = content?.data?.data;

  return (
    <ScrollView style={styles.container}>
      {/* Content Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.statusContainer}>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(contentData?.status) },
                ]}
                textStyle={styles.statusText}
              >
                {contentData?.status}
              </Chip>
              {contentData?.status === 'pending' && (
                <Button
                  mode="contained"
                  icon="check-circle"
                  onPress={navigateToApproval}
                  style={styles.approvalButton}
                >
                  Review
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Content Text */}
      <Card style={styles.contentCard}>
        <Card.Title title="Content" />
        <Card.Content>
          <Text style={styles.contentText}>{contentData?.text}</Text>
        </Card.Content>
      </Card>

      {/* Platforms */}
      <Card style={styles.platformCard}>
        <Card.Title title="Target Platforms" />
        <Card.Content>
          <View style={styles.platformsContainer}>
            {contentData?.platforms?.map((platform: any) => (
              <Chip
                key={platform.platform}
                icon={getPlatformIcon(platform.platform)}
                style={styles.platformChip}
              >
                {platform.platform}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Hashtags */}
      {contentData?.hashtags && contentData.hashtags.length > 0 && (
        <Card style={styles.hashtagCard}>
          <Card.Title title="Hashtags" />
          <Card.Content>
            <View style={styles.hashtagsContainer}>
              {contentData.hashtags.map((hashtag: string, index: number) => (
                <Chip key={index} style={styles.hashtagChip}>
                  #{hashtag}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Schedule Information */}
      {contentData?.scheduledAt && (
        <Card style={styles.scheduleCard}>
          <Card.Title title="Scheduled" />
          <Card.Content>
            <View style={styles.scheduleInfo}>
              <Icon name="calendar-clock" size={24} color={colors.warning} />
              <View style={styles.scheduleText}>
                <Text style={styles.scheduleDate}>
                  {new Date(contentData.scheduledAt).toLocaleDateString()}
                </Text>
                <Text style={styles.scheduleTime}>
                  {new Date(contentData.scheduledAt).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Platform Previews */}
      {contentData?.platforms && (
        <Card style={styles.previewCard}>
          <Card.Title title="Platform Previews" />
          <Card.Content>
            {contentData.platforms.map((platform: any) => (
              <View key={platform.platform} style={styles.previewSection}>
                <Text style={styles.previewTitle}>
                  {platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)}
                </Text>
                <PlatformPreview
                  platform={platform.platform}
                  content={contentData.text}
                  hashtags={contentData.hashtags}
                />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Metadata */}
      <Card style={styles.metadataCard}>
        <Card.Title title="Details" />
        <Card.Content>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Created:</Text>
            <Text style={styles.metadataValue}>
              {new Date(contentData?.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Updated:</Text>
            <Text style={styles.metadataValue}>
              {new Date(contentData?.updatedAt).toLocaleString()}
            </Text>
          </View>
          {contentData?.campaign && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Campaign:</Text>
              <Text style={styles.metadataValue}>{contentData.campaign.name}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Feedback */}
      {contentData?.feedbackNotes && (
        <Card style={styles.feedbackCard}>
          <Card.Title title="Feedback" />
          <Card.Content>
            <Text style={styles.feedbackText}>{contentData.feedbackNotes}</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'published':
      return colors.success + '20';
    case 'scheduled':
      return colors.warning + '20';
    case 'approved':
      return colors.info + '20';
    case 'pending':
      return colors.error + '20';
    case 'draft':
      return '#f0f0f0';
    case 'rejected':
      return colors.error + '30';
    default:
      return colors.primary + '20';
  }
};

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'linkedin':
      return 'linkedin';
    case 'twitter':
    case 'x':
      return 'twitter';
    case 'instagram':
      return 'instagram';
    case 'tiktok':
      return 'music-note';
    case 'youtube':
      return 'youtube';
    default:
      return 'earth';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginVertical: 16,
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusChip: {
    height: 32,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  approvalButton: {
    backgroundColor: colors.success,
  },
  contentCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  platformCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformChip: {
    marginBottom: 8,
  },
  hashtagCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagChip: {
    backgroundColor: colors.primary + '10',
    marginBottom: 8,
  },
  scheduleCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
    backgroundColor: colors.warning + '05',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    marginLeft: 12,
  },
  scheduleDate: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.warning,
  },
  scheduleTime: {
    fontSize: 14,
    color: colors.warning,
  },
  previewCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  metadataCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  metadataValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  feedbackCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    elevation: 2,
    backgroundColor: colors.error + '05',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
    fontStyle: 'italic',
  },
});

export default ContentDetailScreen;
