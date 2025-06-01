import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class NotificationService {
  private async requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }

  private async getFCMToken() {
    let fcmToken = await AsyncStorage.getItem('fcmToken');

    if (!fcmToken) {
      try {
        fcmToken = await messaging().getToken();
        if (fcmToken) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
        }
      } catch (error) {
        console.log('Failed to get FCM token:', error);
      }
    }

    return fcmToken;
  }

  private async onDisplayNotification(remoteMessage: any) {
    // Handle foreground messages
    console.log('Received foreground message:', remoteMessage);
  }

  public async initialize() {
    if (Platform.OS === 'ios') {
      await this.requestUserPermission();
    }

    // Get FCM token
    const token = await this.getFCMToken();
    console.log('FCM Token:', token);

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      await this.onDisplayNotification(remoteMessage);
    });

    // Handle background/quit state messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Received background message:', remoteMessage);
    });

    // Handle notification open
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
    });

    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from quit state:', remoteMessage);
        }
      });
  }

  public async updateFCMToken() {
    try {
      const token = await this.getFCMToken();
      // Here you would typically send the token to your backend
      console.log('Updated FCM Token:', token);
    } catch (error) {
      console.log('Failed to update FCM token:', error);
    }
  }
}

export const notificationService = new NotificationService(); 