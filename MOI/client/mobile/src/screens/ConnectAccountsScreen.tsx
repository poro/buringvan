import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp } from '../contexts/AppContext';
import { socialService, SocialAccount } from '../services/socialService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  ConnectAccounts: undefined;
};

type ConnectAccountsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ConnectAccounts'>;
};

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter', icon: 'twitter' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
];

const ConnectAccountsScreen = ({ navigation }: ConnectAccountsScreenProps) => {
  const { setLoading, showError, showSuccess } = useApp();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const connectedAccounts = await socialService.getConnectedAccounts();
      setAccounts(connectedAccounts);
    } catch (error) {
      showError('Failed to fetch connected accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (platform: string) => {
    try {
      setLoading(true);
      const { authUrl, state } = await socialService.initiateConnection(platform);
      // Here you would typically open the auth URL in a WebView or browser
      // For now, we'll just show a success message
      showSuccess(`Initiating ${platform} connection`);
    } catch (error) {
      showError(`Failed to connect to ${platform}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
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
              setLoading(true);
              await socialService.disconnectAccount(accountId);
              await fetchAccounts();
              showSuccess('Account disconnected successfully');
            } catch (error) {
              showError('Failed to disconnect account');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isConnected = (platform: string) => {
    return accounts.some((account) => account.platform === platform);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connected Accounts</Text>
        <Text style={styles.subtitle}>
          Connect your social media accounts to start managing your content
        </Text>
      </View>

      <View style={styles.platformsContainer}>
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id);
          const account = accounts.find((acc) => acc.platform === platform.id);

          return (
            <View key={platform.id} style={styles.platformCard}>
              <View style={styles.platformInfo}>
                <Icon name={platform.icon} size={24} color="#007AFF" />
                <View style={styles.platformDetails}>
                  <Text style={styles.platformName}>{platform.name}</Text>
                  {account && (
                    <Text style={styles.accountInfo}>@{account.username}</Text>
                  )}
                </View>
              </View>

              {connected ? (
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() => handleDisconnect(account!.id)}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => handleConnect(platform.id)}
                >
                  <Text style={styles.connectButtonText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  platformsContainer: {
    padding: 16,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformDetails: {
    marginLeft: 12,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accountInfo: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConnectAccountsScreen; 