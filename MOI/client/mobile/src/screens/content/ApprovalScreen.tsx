import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { contentAPI } from '../../services/api';
import { colors } from '../../utils/theme';
import PlatformPreview from '../../components/content/PlatformPreview';

const ApprovalScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { contentId } = route.params as { contentId: string };

  const [editedText, setEditedText] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch content details
  const { data: content, isLoading, error } = useQuery(
    ['content', contentId],
    () => contentAPI.getContentById(contentId),
    {
      onSuccess: (data) => {
        const contentData = data.data.data;
        setEditedText(contentData.text);
        setSelectedPlatform(contentData.platforms[0]?.platform || '');
      },
    }
  );

  // Mutations
  const approveMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => contentAPI.approveContent(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['content']);
        navigation.goBack();
        Alert.alert('Success', 'Content approved successfully');
      },
      onError: () => {
        Alert.alert('Error', 'Failed to approve content');
      },
    }
  );

  const rejectMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => contentAPI.rejectContent(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['content']);
        navigation.goBack();
        Alert.alert('Success', 'Content rejected');
      },
      onError: () => {
        Alert.alert('Error', 'Failed to reject content');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => contentAPI.updateContent(id, data),
    {
      onError: () => {
        Alert.alert('Error', 'Failed to update content');
      },
    }
  );

  const handleApprove = async () => {
    try {
      // Update content if edited
      if (editedText !== content?.data?.data?.text) {
        await updateMutation.mutateAsync({
          id: contentId,
          data: { text: editedText },
        });
      }

      const approvalData: any = {
        platforms: content?.data?.data?.platforms || [],
      };

      if (isScheduling) {
        approvalData.scheduledAt = scheduledDate.toISOString();
      }

      approveMutation.mutate({ id: contentId, data: approvalData });
    } catch (error) {
      Alert.alert('Error', 'Failed to approve content');
    }
  };

  const handleReject = async () => {
    if (!feedbackNotes.trim()) {
      Alert.alert('Error', 'Please provide feedback for rejection');
      return;
    }

    rejectMutation.mutate({
      id: contentId,
      data: { feedbackNotes: feedbackNotes.trim() },
    });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatform(platform);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
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
      <Card style={styles.card}>
        <Card.Title title="Review Content" />
        <Card.Content>
          <TextInput
            label="Content"
            mode="outlined"
            value={editedText}
            onChangeText={setEditedText}
            multiline
            numberOfLines={6}
            style={styles.textInput}
          />

          <Text style={styles.sectionTitle}>Platforms</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.platformsContainer}
          >
            {contentData?.platforms?.map((platform: any) => (
              <Chip
                key={platform.platform}
                selected={selectedPlatform === platform.platform}
                onPress={() => togglePlatform(platform.platform)}
                style={styles.platformChip}
                icon={getPlatformIcon(platform.platform)}
              >
                {platform.platform}
              </Chip>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.previewToggle}
            onPress={() => setShowPreview(!showPreview)}
          >
            <Text style={styles.previewToggleText}>
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Text>
            <Icon
              name={showPreview ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showPreview && selectedPlatform && (
            <View style={styles.previewContainer}>
              <PlatformPreview
                platform={selectedPlatform}
                content={editedText}
                hashtags={contentData?.hashtags}
              />
            </View>
          )}

          <View style={styles.schedulingContainer}>
            <View style={styles.schedulingToggle}>
              <Text style={styles.schedulingToggleText}>Schedule for later</Text>
              <Switch
                value={isScheduling}
                onValueChange={setIsScheduling}
                color={colors.primary}
              />
            </View>

            {isScheduling && (
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={24} color={colors.primary} />
                  <Text style={styles.datePickerText}>
                    {scheduledDate.toLocaleString()}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode="datetime"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>
            )}
          </View>

          <TextInput
            label="Feedback Notes (required for rejection)"
            mode="outlined"
            value={feedbackNotes}
            onChangeText={setFeedbackNotes}
            multiline
            numberOfLines={3}
            style={styles.feedbackInput}
            placeholder="Provide feedback for improvements..."
          />
        </Card.Content>
      </Card>

      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={approveMutation.isLoading || rejectMutation.isLoading}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleReject}
          style={styles.rejectButton}
          disabled={!feedbackNotes.trim() || approveMutation.isLoading || rejectMutation.isLoading}
          loading={rejectMutation.isLoading}
        >
          Reject
        </Button>
        <Button
          mode="contained"
          onPress={handleApprove}
          style={styles.approveButton}
          disabled={approveMutation.isLoading || rejectMutation.isLoading}
          loading={approveMutation.isLoading}
        >
          {isScheduling ? 'Schedule' : 'Approve'}
        </Button>
      </View>
    </ScrollView>
  );
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
  card: {
    margin: 16,
    elevation: 4,
  },
  textInput: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  platformsContainer: {
    marginBottom: 16,
  },
  platformChip: {
    marginRight: 8,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  previewToggleText: {
    color: colors.primary,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  previewContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.surface,
  },
  schedulingContainer: {
    marginBottom: 16,
  },
  schedulingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  schedulingToggleText: {
    fontSize: 16,
    color: colors.primary,
  },
  datePickerContainer: {
    marginLeft: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  datePickerText: {
    marginLeft: 8,
    fontSize: 16,
    color: colors.primary,
  },
  feedbackInput: {
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: colors.error,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.success,
  },
});

export default ApprovalScreen;
