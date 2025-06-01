import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  IconButton,
  FAB,
  Searchbar,
  Menu,
  Button,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { contentAPI } from '../../services/api';
import { colors } from '../../utils/theme';

const ContentScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: contentData, isLoading, refetch } = useQuery(
    ['content', selectedStatus, searchQuery],
    () => contentAPI.getContent({
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      search: searchQuery || undefined,
      limit: 20,
      sort: '-createdAt',
    })
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateToDetail = (contentId: string) => {
    navigation.navigate('ContentDetail' as never, { contentId } as never);
  };

  const navigateToApproval = (contentId: string) => {
    navigation.navigate('Approval' as never, { contentId } as never);
  };

  const renderContentItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => navigateToDetail(item.id)}>
      <Card style={styles.contentCard}>
        <Card.Content>
          <View style={styles.contentHeader}>
            <View style={styles.contentInfo}>
              <Text style={styles.contentTitle} numberOfLines={2}>
                {item.title || item.text?.substring(0, 50) + '...'}
              </Text>
              <Text style={styles.contentPreview} numberOfLines={3}>
                {item.text}
              </Text>
            </View>
            <View style={styles.contentActions}>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
                textStyle={styles.chipText}
              >
                {item.status}
              </Chip>
              {item.status === 'pending' && (
                <IconButton
                  icon="check-circle"
                  size={20}
                  iconColor={colors.success}
                  onPress={() => navigateToApproval(item.id)}
                />
              )}
            </View>
          </View>

          <View style={styles.contentMeta}>
            <View style={styles.platforms}>
              {item.platforms?.map((platform: any) => (
                <Icon
                  key={platform.platform}
                  name={getPlatformIcon(platform.platform)}
                  size={16}
                  color={colors.primary}
                  style={styles.platformIcon}
                />
              ))}
            </View>
            <Text style={styles.contentDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {item.hashtags && item.hashtags.length > 0 && (
            <View style={styles.hashtags}>
              {item.hashtags.slice(0, 3).map((hashtag: string, index: number) => (
                <Chip key={index} style={styles.hashtagChip} textStyle={styles.hashtagText}>
                  #{hashtag}
                </Chip>
              ))}
              {item.hashtags.length > 3 && (
                <Text style={styles.moreHashtags}>
                  +{item.hashtags.length - 3} more
                </Text>
              )}
            </View>
          )}

          {item.scheduledAt && (
            <View style={styles.scheduledInfo}>
              <Icon name="calendar-clock" size={16} color={colors.warning} />
              <Text style={styles.scheduledText}>
                Scheduled for {new Date(item.scheduledAt).toLocaleString()}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Published', value: 'published' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search content..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Menu
          visible={filterVisible}
          onDismiss={() => setFilterVisible(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              size={24}
              onPress={() => setFilterVisible(true)}
            />
          }
        >
          {filterOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setSelectedStatus(option.value);
                setFilterVisible(false);
              }}
              title={option.label}
              leadingIcon={selectedStatus === option.value ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>

      {selectedStatus !== 'all' && (
        <View style={styles.filterInfo}>
          <Chip
            icon="filter"
            onClose={() => setSelectedStatus('all')}
            style={styles.filterChip}
          >
            {filterOptions.find(opt => opt.value === selectedStatus)?.label}
          </Chip>
        </View>
      )}

      <FlatList
        data={contentData?.data?.items || []}
        renderItem={renderContentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No content found</Text>
            <Text style={styles.emptySubtext}>
              Create your first piece of content to get started
            </Text>
          </View>
        }
      />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  filterInfo: {
    padding: 16,
    paddingTop: 8,
  },
  filterChip: {
    alignSelf: 'flex-start',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  contentCard: {
    marginBottom: 16,
    elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contentInfo: {
    flex: 1,
    marginRight: 12,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contentPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contentActions: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
  },
  contentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platforms: {
    flexDirection: 'row',
  },
  platformIcon: {
    marginRight: 8,
  },
  contentDate: {
    fontSize: 12,
    color: '#666',
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  hashtagChip: {
    marginRight: 8,
    marginBottom: 4,
    height: 24,
    backgroundColor: colors.primary + '10',
  },
  hashtagText: {
    fontSize: 12,
    color: colors.primary,
  },
  moreHashtags: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    padding: 8,
    borderRadius: 4,
  },
  scheduledText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default ContentScreen;
