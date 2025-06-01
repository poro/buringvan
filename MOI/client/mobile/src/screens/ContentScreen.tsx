import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

interface DraftPost {
  text: string;
  media: string[];
  platforms: string[];
  scheduledFor?: Date;
}

const ContentScreen = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [draftPost, setDraftPost] = useState<DraftPost>({
    text: '',
    media: [],
    platforms: [],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchConnectedPlatforms();
  }, []);

  const fetchConnectedPlatforms = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/social/accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlatforms(response.data);
    } catch (error) {
      console.error('Error fetching platforms:', error);
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setDraftPost(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(id => id !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const handleSchedulePress = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setScheduledDate(selectedDate);
      setDraftPost(prev => ({
        ...prev,
        scheduledFor: selectedDate
      }));
    }
  };

  const handlePost = async () => {
    if (!draftPost.text.trim()) {
      // Show error message
      return;
    }

    if (draftPost.platforms.length === 0) {
      // Show error message
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        'http://localhost:3000/api/content',
        draftPost,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Reset form
      setDraftPost({
        text: '',
        media: [],
        platforms: [],
      });
      setScheduledDate(null);

      // Show success message
    } catch (error) {
      console.error('Error creating post:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        {/* Platform Selection */}
        <View style={styles.platformsContainer}>
          <Text style={styles.sectionTitle}>Select Platforms</Text>
          <View style={styles.platformsGrid}>
            {platforms.map(platform => (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.platformButton,
                  draftPost.platforms.includes(platform.id) && styles.platformButtonSelected
                ]}
                onPress={() => handlePlatformToggle(platform.id)}
                disabled={!platform.connected}
              >
                <Icon
                  name={platform.icon}
                  size={24}
                  color={platform.connected ? '#007AFF' : '#CCCCCC'}
                />
                <Text
                  style={[
                    styles.platformName,
                    !platform.connected && styles.platformNameDisabled
                  ]}
                >
                  {platform.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content Input */}
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Create Post</Text>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="What's on your mind?"
            value={draftPost.text}
            onChangeText={text => setDraftPost(prev => ({ ...prev, text }))}
            maxLength={280}
          />
          <Text style={styles.characterCount}>
            {draftPost.text.length}/280
          </Text>
        </View>

        {/* Media Preview */}
        {draftPost.media.length > 0 && (
          <View style={styles.mediaContainer}>
            <Text style={styles.sectionTitle}>Media</Text>
            <ScrollView horizontal style={styles.mediaScroll}>
              {draftPost.media.map((uri, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image source={{ uri }} style={styles.mediaPreview} />
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => {
                      setDraftPost(prev => ({
                        ...prev,
                        media: prev.media.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    <Icon name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Schedule Options */}
        <View style={styles.scheduleContainer}>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={handleSchedulePress}
          >
            <Icon
              name={scheduledDate ? 'calendar-check' : 'calendar-plus'}
              size={24}
              color="#007AFF"
            />
            <Text style={styles.scheduleText}>
              {scheduledDate
                ? `Scheduled for ${scheduledDate.toLocaleString()}`
                : 'Schedule Post'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate || new Date()}
            mode="datetime"
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </ScrollView>

      {/* Post Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.postButton,
            (!draftPost.text.trim() || draftPost.platforms.length === 0) &&
              styles.postButtonDisabled
          ]}
          onPress={handlePost}
          disabled={!draftPost.text.trim() || draftPost.platforms.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="send" size={20} color="#FFFFFF" />
              <Text style={styles.postButtonText}>
                {scheduledDate ? 'Schedule' : 'Post Now'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  platformsContainer: {
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
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  platformButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  platformName: {
    marginTop: 8,
    fontSize: 12,
    color: '#1A1A1A',
  },
  platformNameDisabled: {
    color: '#CCCCCC',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    marginTop: 8,
    color: '#666666',
  },
  mediaContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  mediaScroll: {
    flexDirection: 'row',
  },
  mediaItem: {
    marginRight: 12,
    position: 'relative',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  scheduleText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#007AFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  postButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
  },
  postButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ContentScreen; 