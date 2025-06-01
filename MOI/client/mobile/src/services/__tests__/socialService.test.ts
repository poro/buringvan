import axios from 'axios';
import { socialService } from '../socialService';
import { useAuthStore } from '../../stores/authStore';

jest.mock('axios');
jest.mock('../../stores/authStore');

describe('SocialService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore.getState as jest.Mock).mockReturnValue({ token: 'mock-token' });
  });

  describe('getConnectedAccounts', () => {
    it('should fetch connected accounts successfully', async () => {
      const mockAccounts = [
        {
          id: '1',
          platform: 'twitter',
          username: 'testuser',
          connectedAt: '2024-01-01',
        },
      ];

      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockAccounts });

      const result = await socialService.getConnectedAccounts();
      expect(result).toEqual(mockAccounts);
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/social/accounts',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    it('should throw error when fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(socialService.getConnectedAccounts()).rejects.toThrow(
        'Failed to fetch connected accounts'
      );
    });
  });

  describe('initiateConnection', () => {
    it('should initiate connection successfully', async () => {
      const mockResponse = {
        authUrl: 'https://example.com/auth',
        state: 'mock-state',
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await socialService.initiateConnection('twitter');
      expect(result).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/social/connect/twitter',
        {},
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    it('should throw error when connection initiation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(socialService.initiateConnection('twitter')).rejects.toThrow(
        'Failed to initiate twitter connection'
      );
    });
  });

  describe('disconnectAccount', () => {
    it('should disconnect account successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValueOnce({});

      await socialService.disconnectAccount('account-1');
      expect(axios.delete).toHaveBeenCalledWith(
        'http://localhost:3000/api/social/accounts/account-1',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    it('should throw error when disconnection fails', async () => {
      (axios.delete as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(socialService.disconnectAccount('account-1')).rejects.toThrow(
        'Failed to disconnect account'
      );
    });
  });
}); 