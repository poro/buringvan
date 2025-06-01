import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  profileImage?: string;
  isActive: boolean;
  lastSync: string;
}

interface UserSettings {
  notifications: {
    newEngagement: boolean;
    postReminders: boolean;
    weeklyReport: boolean;
  };
  autoPost: boolean;
  defaultPlatforms: string[];
}

const ProfileScreen = () => {
  const { user, token, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      newEngagement: true,
      postReminders: true,
      weeklyReport: true,
    },
    autoPost: false,
    defaultPlatforms: [],
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [accountsRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:3000/api/social/accounts', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3000/api/user/settings', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setAccounts(accountsRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async (key: keyof UserSettings['notifications']) => {
    try {
      const newSettings = {
        ...settings,
        notifications: {
          ...settings.notifications,
          [key]: !settings.notifications[key],
        },
      };

      await axios.put(
        'http://localhost:3000/api/user/settings',
        newSettings,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleToggleAutoPost = async () => {
    try {
      const newSettings = {
        ...settings,
        autoPost: !settings.autoPost,
      };

      await axios.put(
        'http://localhost:3000/api/user/settings',
        newSettings,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating auto-post settings:', error);
      Alert.alert('Error', 'Failed to update auto-post settings');
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    Alert.alert(
      'Disconnect Account',
      'Are you sure you want to disconnect this account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(
                `http://localhost:3000/api/social/accounts/${accountId}`,
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              setAccounts(accounts.filter(acc => acc.id !== accountId));
            } catch (error) {
              console.error('Error disconnecting account:', error);
              Alert.alert('Error', 'Failed to disconnect account');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Profile */}
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: user?.profileImage || 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Connected Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Accounts</Text>
        {accounts.map(account => (
          <View key={account.id} style={styles.accountCard}>
            <View style={styles.accountInfo}>
              <Icon name={account.platform.toLowerCase()} size={24} color="#007AFF" />
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{account.username}</Text>
                <Text style={styles.accountPlatform}>{account.platform}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() => handleDisconnectAccount(account.id)}
            >
              <Icon name="link-variant-off" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.connectButton}>
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.connectButtonText}>Connect New Account</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>New Engagement</Text>
            <Text style={styles.settingDescription}>
              Get notified when your posts receive new engagement
            </Text>
          </View>
          <Switch
            value={settings.notifications.newEngagement}
            onValueChange={() => handleToggleNotification('newEngagement')}
            trackColor={{ false: '#E9ECEF', true: '#007AFF' }}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Post Reminders</Text>
            <Text style={styles.settingDescription}>
              Receive reminders for scheduled posts
            </Text>
          </View>
          <Switch
            value={settings.notifications.postReminders}
            onValueChange={() => handleToggleNotification('postReminders')}
            trackColor={{ false: '#E9ECEF', true: '#007AFF' }}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Weekly Report</Text>
            <Text style={styles.settingDescription}>
              Get a weekly summary of your performance
            </Text>
          </View>
          <Switch
            value={settings.notifications.weeklyReport}
            onValueChange={() => handleToggleNotification('weeklyReport')}
            trackColor={{ false: '#E9ECEF', true: '#007AFF' }}
          />
        </View>
      </View>

      {/* Posting Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Posting Settings</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Post</Text>
            <Text style={styles.settingDescription}>
              Automatically post to all connected accounts
            </Text>
          </View>
          <Switch
            value={settings.autoPost}
            onValueChange={handleToggleAutoPost}
            trackColor={{ false: '#E9ECEF', true: '#007AFF' }}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#FF3B30" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
  profileContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountDetails: {
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accountPlatform: {
    fontSize: 14,
    color: '#666666',
  },
  disconnectButton: {
    padding: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileScreen; 