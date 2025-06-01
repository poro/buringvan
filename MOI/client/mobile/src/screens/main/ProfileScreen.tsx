import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Button,
  Divider,
  Switch,
  List,
  Portal,
  Modal,
  TextInput,
  Chip,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joinDate: string;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    autoApproval: boolean;
    defaultPlatforms: string[];
  };
  stats: {
    totalContent: number;
    approvedContent: number;
    pendingContent: number;
    totalCampaigns: number;
  };
}

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock user profile data - in real app this would come from API
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '1',
    name: user?.name || 'John Doe',
    email: user?.email || 'john.doe@example.com',
    avatar: undefined,
    role: 'Content Manager',
    joinDate: '2024-01-15',
    preferences: {
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      autoApproval: false,
      defaultPlatforms: ['LinkedIn', 'Twitter'],
    },
    stats: {
      totalContent: 45,
      approvedContent: 38,
      pendingContent: 7,
      totalCampaigns: 12,
    },
  });

  const [editForm, setEditForm] = useState({
    name: profile.name,
    email: profile.email,
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfile(prev => ({
        ...prev,
        name: editForm.name,
        email: editForm.email,
      }));

      setEditModalVisible(false);
      showNotification('Profile updated successfully', 'success');
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  const toggleNotificationSetting = (type: keyof typeof profile.preferences.notifications) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: {
          ...prev.preferences.notifications,
          [type]: !prev.preferences.notifications[type],
        },
      },
    }));
  };

  const togglePlatform = (platform: string) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        defaultPlatforms: prev.preferences.defaultPlatforms.includes(platform)
          ? prev.preferences.defaultPlatforms.filter(p => p !== platform)
          : [...prev.preferences.defaultPlatforms, platform],
      },
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const platforms = ['LinkedIn', 'Twitter', 'Instagram', 'TikTok', 'YouTube'];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.profileName}>
                {profile.name}
              </Text>
              <Text variant="bodyMedium" style={styles.profileEmail}>
                {profile.email}
              </Text>
              <Text variant="bodySmall" style={styles.profileRole}>
                {profile.role}
              </Text>
              <Text variant="bodySmall" style={styles.joinDate}>
                Joined {formatDate(profile.joinDate)}
              </Text>
            </View>
            <IconButton
              icon="pencil"
              size={24}
              onPress={() => setEditModalVisible(true)}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Stats */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {profile.stats.totalContent}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Total Content
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statNumber, { color: colors.success }]}>
                {profile.stats.approvedContent}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Approved
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statNumber, { color: colors.warning }]}>
                {profile.stats.pendingContent}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Pending
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statNumber, { color: colors.primary }]}>
                {profile.stats.totalCampaigns}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Campaigns
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Settings
          </Text>
          
          <List.Item
            title="Notifications"
            description="Manage notification preferences"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setSettingsModalVisible(true)}
          />
          
          <Divider style={styles.divider} />
          
          <List.Item
            title="Auto Approval"
            description="Automatically approve AI-generated content"
            left={(props) => <List.Icon {...props} icon="check-circle" />}
            right={() => (
              <Switch
                value={profile.preferences.autoApproval}
                onValueChange={(value) =>
                  setProfile(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, autoApproval: value },
                  }))
                }
              />
            )}
          />
          
          <Divider style={styles.divider} />
          
          <List.Item
            title="Default Platforms"
            description="Set default social media platforms"
            left={(props) => <List.Icon {...props} icon="account-group" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Show platform selection
            }}
          />
          
          <View style={styles.platformChips}>
            {platforms.map((platform) => (
              <Chip
                key={platform}
                selected={profile.preferences.defaultPlatforms.includes(platform)}
                onPress={() => togglePlatform(platform)}
                style={styles.platformChip}
              >
                {platform}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Button
            mode="outlined"
            icon="help-circle"
            style={styles.actionButton}
            onPress={() => {
              // Navigate to help
            }}
          >
            Help & Support
          </Button>
          
          <Button
            mode="outlined"
            icon="shield-check"
            style={styles.actionButton}
            onPress={() => {
              // Navigate to privacy settings
            }}
          >
            Privacy & Security
          </Button>
          
          <Button
            mode="contained"
            icon="logout"
            style={[styles.actionButton, styles.logoutButton]}
            buttonColor={colors.error}
            onPress={handleLogout}
          >
            Logout
          </Button>
        </Card.Content>
      </Card>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Edit Profile
          </Text>
          
          <TextInput
            label="Name"
            value={editForm.name}
            onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
            style={styles.input}
          />
          
          <TextInput
            label="Email"
            value={editForm.email}
            onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            style={styles.input}
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setEditModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={loading}
              style={styles.modalButton}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Notification Settings Modal */}
      <Portal>
        <Modal
          visible={settingsModalVisible}
          onDismiss={() => setSettingsModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Notification Settings
          </Text>
          
          <List.Item
            title="Email Notifications"
            description="Receive notifications via email"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={profile.preferences.notifications.email}
                onValueChange={() => toggleNotificationSetting('email')}
              />
            )}
          />
          
          <List.Item
            title="Push Notifications"
            description="Receive push notifications on this device"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={profile.preferences.notifications.push}
                onValueChange={() => toggleNotificationSetting('push')}
              />
            )}
          />
          
          <List.Item
            title="SMS Notifications"
            description="Receive notifications via SMS"
            left={(props) => <List.Icon {...props} icon="message-text" />}
            right={() => (
              <Switch
                value={profile.preferences.notifications.sms}
                onValueChange={() => toggleNotificationSetting('sms')}
              />
            )}
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="contained"
              onPress={() => setSettingsModalVisible(false)}
              style={styles.modalButton}
            >
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    margin: spacing.md,
    elevation: 2,
  },
  profileContent: {
    padding: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  profileName: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  profileEmail: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  profileRole: {
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  joinDate: {
    color: colors.onSurfaceVariant,
  },
  statsCard: {
    margin: spacing.md,
    marginTop: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  settingsCard: {
    margin: spacing.md,
    marginTop: 0,
    elevation: 2,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  platformChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  platformChip: {
    marginBottom: spacing.sm,
  },
  actionsCard: {
    margin: spacing.md,
    marginTop: 0,
    marginBottom: spacing.xl,
    elevation: 2,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  logoutButton: {
    marginBottom: 0,
  },
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    minWidth: 80,
  },
});

export default ProfileScreen;
