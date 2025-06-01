import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

const API_URL = 'http://localhost:3000/api';

export interface SocialAccount {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  username: string;
  profileImage?: string;
  connectedAt: string;
}

export interface ConnectionResponse {
  authUrl: string;
  state: string;
}

class SocialService {
  private getAuthHeader() {
    const { token } = useAuthStore.getState();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getConnectedAccounts(): Promise<SocialAccount[]> {
    try {
      const response = await axios.get(
        `${API_URL}/social/accounts`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch connected accounts');
    }
  }

  async initiateConnection(platform: string): Promise<ConnectionResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/social/connect/${platform}`,
        {},
        this.getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to initiate ${platform} connection`);
    }
  }

  async handleCallback(platform: string, code: string, state: string): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/social/callback/${platform}`,
        { code, state },
        this.getAuthHeader()
      );
    } catch (error) {
      throw new Error(`Failed to complete ${platform} connection`);
    }
  }

  async disconnectAccount(accountId: string): Promise<void> {
    try {
      await axios.delete(
        `${API_URL}/social/accounts/${accountId}`,
        this.getAuthHeader()
      );
    } catch (error) {
      throw new Error('Failed to disconnect account');
    }
  }
}

export const socialService = new SocialService(); 