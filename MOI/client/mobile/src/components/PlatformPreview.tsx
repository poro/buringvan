import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { Card, Text, Avatar, IconButton, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../utils/theme';

const { width: screenWidth } = Dimensions.get('window');

interface ContentData {
  id: string;
  text: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
  }[];
  hashtags?: string[];
  mentions?: string[];
}

interface PlatformPreviewProps {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'tiktok' | 'youtube';
  content: ContentData;
  author?: {
    name: string;
    avatar?: string;
    handle?: string;
  };
}

const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  platform,
  content,
  author = { name: 'Your Brand', handle: '@yourbrand' },
}) => {
  const renderLinkedInPreview = () => (
    <Card style={styles.linkedinCard}>
      <Card.Content style={styles.linkedinContent}>
        <View style={styles.linkedinHeader}>
          <Avatar.Text
            size={40}
            label={author.name.split(' ').map(n => n[0]).join('')}
            style={styles.linkedinAvatar}
          />
          <View style={styles.linkedinAuthor}>
            <Text variant="bodyMedium" style={styles.linkedinName}>
              {author.name}
            </Text>
            <Text variant="bodySmall" style={styles.linkedinTime}>
              Now • 🌐
            </Text>
          </View>
          <IconButton icon="dots-horizontal" size={20} />
        </View>
        
        <Text variant="bodyMedium" style={styles.linkedinText}>
          {content.text}
        </Text>
        
        {content.hashtags && content.hashtags.length > 0 && (
          <Text variant="bodySmall" style={styles.linkedinHashtags}>
            {content.hashtags.map(tag => `#${tag}`).join(' ')}
          </Text>
        )}
        
        {content.media && content.media.length > 0 && (
          <Image
            source={{ uri: content.media[0].url }}
            style={styles.linkedinImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.linkedinActions}>
          <View style={styles.linkedinAction}>
            <Icon name="thumb-up-outline" size={20} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Like</Text>
          </View>
          <View style={styles.linkedinAction}>
            <Icon name="comment-outline" size={20} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Comment</Text>
          </View>
          <View style={styles.linkedinAction}>
            <Icon name="share-outline" size={20} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Share</Text>
          </View>
          <View style={styles.linkedinAction}>
            <Icon name="send-outline" size={20} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Send</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderTwitterPreview = () => (
    <Card style={styles.twitterCard}>
      <Card.Content style={styles.twitterContent}>
        <View style={styles.twitterHeader}>
          <Avatar.Text
            size={40}
            label={author.name.split(' ').map(n => n[0]).join('')}
            style={styles.twitterAvatar}
          />
          <View style={styles.twitterAuthor}>
            <View style={styles.twitterNameRow}>
              <Text variant="bodyMedium" style={styles.twitterName}>
                {author.name}
              </Text>
              <Icon name="check-decagram" size={16} color="#1DA1F2" />
              <Text variant="bodySmall" style={styles.twitterHandle}>
                {author.handle}
              </Text>
              <Text variant="bodySmall" style={styles.twitterTime}>
                · now
              </Text>
            </View>
          </View>
          <IconButton icon="dots-horizontal" size={20} />
        </View>
        
        <Text variant="bodyMedium" style={styles.twitterText}>
          {content.text}
        </Text>
        
        {content.media && content.media.length > 0 && (
          <Image
            source={{ uri: content.media[0].url }}
            style={styles.twitterImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.twitterActions}>
          <View style={styles.twitterAction}>
            <Icon name="comment-outline" size={18} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Reply</Text>
          </View>
          <View style={styles.twitterAction}>
            <Icon name="repeat" size={18} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Retweet</Text>
          </View>
          <View style={styles.twitterAction}>
            <Icon name="heart-outline" size={18} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Like</Text>
          </View>
          <View style={styles.twitterAction}>
            <Icon name="share-outline" size={18} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall">Share</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderInstagramPreview = () => (
    <Card style={styles.instagramCard}>
      <Card.Content style={styles.instagramContent}>
        <View style={styles.instagramHeader}>
          <Avatar.Text
            size={32}
            label={author.name.split(' ').map(n => n[0]).join('')}
            style={styles.instagramAvatar}
          />
          <View style={styles.instagramAuthor}>
            <Text variant="bodyMedium" style={styles.instagramName}>
              {author.handle?.replace('@', '') || 'yourbrand'}
            </Text>
          </View>
          <IconButton icon="dots-horizontal" size={20} />
        </View>
        
        {content.media && content.media.length > 0 && (
          <Image
            source={{ uri: content.media[0].url }}
            style={styles.instagramImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.instagramActions}>
          <View style={styles.instagramLeftActions}>
            <Icon name="heart-outline" size={24} color={colors.onSurface} />
            <Icon name="comment-outline" size={24} color={colors.onSurface} />
            <Icon name="send-outline" size={24} color={colors.onSurface} />
          </View>
          <Icon name="bookmark-outline" size={24} color={colors.onSurface} />
        </View>
        
        <Text variant="bodySmall" style={styles.instagramLikes}>
          Liked by others
        </Text>
        
        <View style={styles.instagramCaption}>
          <Text variant="bodyMedium">
            <Text style={styles.instagramUsername}>{author.handle?.replace('@', '') || 'yourbrand'}</Text>
            {' '}
            {content.text}
          </Text>
        </View>
        
        {content.hashtags && content.hashtags.length > 0 && (
          <Text variant="bodySmall" style={styles.instagramHashtags}>
            {content.hashtags.map(tag => `#${tag}`).join(' ')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderTikTokPreview = () => (
    <Card style={styles.tiktokCard}>
      <Card.Content style={styles.tiktokContent}>
        <View style={styles.tiktokHeader}>
          <Avatar.Text
            size={32}
            label={author.name.split(' ').map(n => n[0]).join('')}
            style={styles.tiktokAvatar}
          />
          <View style={styles.tiktokAuthor}>
            <Text variant="bodyMedium" style={styles.tiktokName}>
              {author.handle?.replace('@', '') || 'yourbrand'}
            </Text>
            <Text variant="bodySmall" style={styles.tiktokHandle}>
              {author.name}
            </Text>
          </View>
        </View>
        
        {content.media && content.media.length > 0 && (
          <View style={styles.tiktokVideoContainer}>
            <Image
              source={{ uri: content.media[0].url }}
              style={styles.tiktokVideo}
              resizeMode="cover"
            />
            <View style={styles.tiktokPlayButton}>
              <Icon name="play" size={40} color="white" />
            </View>
          </View>
        )}
        
        <Text variant="bodyMedium" style={styles.tiktokText}>
          {content.text}
        </Text>
        
        {content.hashtags && content.hashtags.length > 0 && (
          <View style={styles.tiktokHashtags}>
            {content.hashtags.map((tag, index) => (
              <Chip key={index} mode="outlined" compact style={styles.tiktokHashtag}>
                #{tag}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderYouTubePreview = () => (
    <Card style={styles.youtubeCard}>
      <Card.Content style={styles.youtubeContent}>
        {content.media && content.media.length > 0 && (
          <View style={styles.youtubeThumbnailContainer}>
            <Image
              source={{ uri: content.media[0].url }}
              style={styles.youtubeThumbnail}
              resizeMode="cover"
            />
            <View style={styles.youtubePlayButton}>
              <Icon name="play" size={40} color="white" />
            </View>
            <View style={styles.youtubeDuration}>
              <Text variant="bodySmall" style={styles.youtubeDurationText}>
                0:30
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.youtubeInfo}>
          <Avatar.Text
            size={36}
            label={author.name.split(' ').map(n => n[0]).join('')}
            style={styles.youtubeAvatar}
          />
          <View style={styles.youtubeDetails}>
            <Text variant="bodyMedium" style={styles.youtubeTitle} numberOfLines={2}>
              {content.text}
            </Text>
            <Text variant="bodySmall" style={styles.youtubeChannel}>
              {author.name} • 0 views • now
            </Text>
          </View>
          <IconButton icon="dots-vertical" size={20} />
        </View>
      </Card.Content>
    </Card>
  );

  const renderPreview = () => {
    switch (platform) {
      case 'linkedin':
        return renderLinkedInPreview();
      case 'twitter':
        return renderTwitterPreview();
      case 'instagram':
        return renderInstagramPreview();
      case 'tiktok':
        return renderTikTokPreview();
      case 'youtube':
        return renderYouTubePreview();
      default:
        return renderTwitterPreview();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.platformHeader}>
        <Chip icon={getPlatformIcon(platform)} mode="outlined">
          {platform.charAt(0).toUpperCase() + platform.slice(1)} Preview
        </Chip>
      </View>
      {renderPreview()}
    </View>
  );
};

const getPlatformIcon = (platform: string) => {
  const iconMap = {
    linkedin: 'linkedin',
    twitter: 'twitter',
    instagram: 'instagram',
    tiktok: 'music-note',
    youtube: 'youtube',
  };
  return iconMap[platform as keyof typeof iconMap] || 'web';
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  platformHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  // LinkedIn Styles
  linkedinCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
  },
  linkedinContent: {
    padding: spacing.md,
  },
  linkedinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  linkedinAvatar: {
    backgroundColor: '#0077B5',
  },
  linkedinAuthor: {
    flex: 1,
    marginLeft: spacing.md,
  },
  linkedinName: {
    fontWeight: 'bold',
    color: '#000',
  },
  linkedinTime: {
    color: '#666',
  },
  linkedinText: {
    color: '#000',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  linkedinHashtags: {
    color: '#0077B5',
    marginBottom: spacing.md,
  },
  linkedinImage: {
    width: '100%',
    height: 200,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  linkedinActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
  },
  linkedinAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Twitter Styles
  twitterCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
  },
  twitterContent: {
    padding: spacing.md,
  },
  twitterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  twitterAvatar: {
    backgroundColor: '#1DA1F2',
  },
  twitterAuthor: {
    flex: 1,
    marginLeft: spacing.md,
  },
  twitterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  twitterName: {
    fontWeight: 'bold',
    color: '#000',
  },
  twitterHandle: {
    color: '#536471',
  },
  twitterTime: {
    color: '#536471',
  },
  twitterText: {
    color: '#000',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  twitterImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  twitterActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  twitterAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Instagram Styles
  instagramCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
  },
  instagramContent: {
    padding: 0,
  },
  instagramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  instagramAvatar: {
    backgroundColor: '#E4405F',
  },
  instagramAuthor: {
    flex: 1,
    marginLeft: spacing.md,
  },
  instagramName: {
    fontWeight: 'bold',
    color: '#000',
  },
  instagramImage: {
    width: '100%',
    height: screenWidth - 32,
  },
  instagramActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  instagramLeftActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  instagramLikes: {
    paddingHorizontal: spacing.md,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: spacing.xs,
  },
  instagramCaption: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  instagramUsername: {
    fontWeight: 'bold',
    color: '#000',
  },
  instagramHashtags: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    color: '#00376B',
  },

  // TikTok Styles
  tiktokCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
  },
  tiktokContent: {
    padding: spacing.md,
  },
  tiktokHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tiktokAvatar: {
    backgroundColor: '#000',
  },
  tiktokAuthor: {
    marginLeft: spacing.md,
  },
  tiktokName: {
    fontWeight: 'bold',
    color: '#000',
  },
  tiktokHandle: {
    color: '#666',
  },
  tiktokVideoContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  tiktokVideo: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  tiktokPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiktokText: {
    color: '#000',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  tiktokHashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tiktokHashtag: {
    height: 28,
  },

  // YouTube Styles
  youtubeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
  },
  youtubeContent: {
    padding: 0,
  },
  youtubeThumbnailContainer: {
    position: 'relative',
  },
  youtubeThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  youtubePlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeDuration: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  youtubeDurationText: {
    color: 'white',
    fontSize: 12,
  },
  youtubeInfo: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  youtubeAvatar: {
    backgroundColor: '#FF0000',
  },
  youtubeDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  youtubeTitle: {
    color: '#000',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  youtubeChannel: {
    color: '#606060',
  },
});

export default PlatformPreview;
