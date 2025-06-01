const admin = require('firebase-admin');
const { getDeviceTokens, removeDeviceToken, setCache, getCache } = require('../config/redis');

class PushService {
  constructor() {
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      if (!admin.apps.length) {
        // Initialize Firebase Admin SDK
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : {
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });

        console.log('Firebase Admin SDK initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendPush(options) {
    try {
      const {
        userId,
        deviceTokens,
        title,
        body,
        icon = '/icons/notification.png',
        badge = '/icons/badge.png',
        sound = 'default',
        data = {},
        imageUrl = null,
        clickAction = null
      } = options;

      // Get device tokens if not provided
      let tokens = deviceTokens;
      if (!tokens && userId) {
        const deviceData = await getDeviceTokens(userId);
        tokens = deviceData.map(device => device.token);
      }

      if (!tokens || tokens.length === 0) {
        console.log(`No device tokens found for user ${userId}`);
        return { success: false, reason: 'No device tokens' };
      }

      // Check if user has disabled push notifications
      const pushDisabled = await this.isPushDisabled(userId);
      if (pushDisabled) {
        console.log(`Push notifications disabled for user ${userId}`);
        return { success: false, reason: 'Push notifications disabled' };
      }

      // Rate limiting check
      const rateLimitKey = `push_rate_limit:${userId}:${new Date().getHours()}`;
      const pushCount = await this.getPushCount(rateLimitKey);
      const maxPushPerHour = parseInt(process.env.MAX_PUSH_PER_HOUR) || 20;
      
      if (pushCount >= maxPushPerHour) {
        console.log(`Push rate limit exceeded for user ${userId}`);
        return { success: false, reason: 'Rate limit exceeded' };
      }

      // Prepare notification payload
      const notification = {
        title,
        body,
        icon,
        badge,
        sound
      };

      // Add image if provided
      if (imageUrl) {
        notification.imageUrl = imageUrl;
      }

      // Prepare data payload
      const dataPayload = {
        ...data,
        userId: userId?.toString(),
        timestamp: Date.now().toString(),
        clickAction: clickAction || 'FLUTTER_NOTIFICATION_CLICK'
      };

      // Convert all data values to strings (FCM requirement)
      Object.keys(dataPayload).forEach(key => {
        if (typeof dataPayload[key] !== 'string') {
          dataPayload[key] = JSON.stringify(dataPayload[key]);
        }
      });

      const message = {
        notification,
        data: dataPayload,
        tokens: Array.isArray(tokens) ? tokens : [tokens],
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4285F4',
            sound: sound !== 'default' ? sound : undefined,
            clickAction: clickAction || 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'default'
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body
              },
              badge: 1,
              sound: sound !== 'default' ? sound : 'default',
              'content-available': 1
            }
          },
          headers: {
            'apns-priority': '10'
          }
        },
        webpush: {
          notification: {
            title,
            body,
            icon,
            badge,
            image: imageUrl,
            requireInteraction: true,
            actions: [
              {
                action: 'view',
                title: 'View',
                icon: '/icons/view.png'
              }
            ]
          },
          fcmOptions: {
            link: clickAction
          }
        }
      };

      // Send notification
      const response = await admin.messaging().sendMulticast(message);

      // Process results
      const results = {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens: [],
        errors: []
      };

      // Handle failed sends and invalid tokens
      if (response.responses) {
        for (let i = 0; i < response.responses.length; i++) {
          const result = response.responses[i];
          if (!result.success && result.error) {
            const token = tokens[i];
            const errorCode = result.error.code;

            if (errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token') {
              // Remove invalid token
              await this.removeInvalidToken(userId, token);
              results.invalidTokens.push(token);
            } else {
              results.errors.push({
                token,
                error: result.error.message
              });
            }
          }
        }
      }

      // Update rate limit counter
      if (results.successCount > 0) {
        await this.incrementPushCount(rateLimitKey);
      }

      console.log(`Push notification sent to user ${userId}: ${results.successCount}/${tokens.length} successful`);

      return results;

    } catch (error) {
      console.error('Failed to send push notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendToTopic(topic, options) {
    try {
      const {
        title,
        body,
        icon = '/icons/notification.png',
        data = {},
        imageUrl = null
      } = options;

      const message = {
        topic,
        notification: {
          title,
          body,
          icon,
          imageUrl
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4285F4',
            channelId: 'announcements'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              badge: 1,
              sound: 'default'
            }
          }
        }
      };

      // Convert data values to strings
      Object.keys(message.data).forEach(key => {
        if (typeof message.data[key] !== 'string') {
          message.data[key] = JSON.stringify(message.data[key]);
        }
      });

      const response = await admin.messaging().send(message);
      console.log(`Topic notification sent to ${topic}: ${response}`);

      return {
        success: true,
        messageId: response
      };

    } catch (error) {
      console.error('Failed to send topic notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async subscribeToTopic(tokens, topic) {
    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      console.log(`Subscribed ${response.successCount} tokens to topic ${topic}`);
      
      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async unsubscribeFromTopic(tokens, topic) {
    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      console.log(`Unsubscribed ${response.successCount} tokens from topic ${topic}`);
      
      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async isPushDisabled(userId) {
    try {
      const cacheKey = `push_disabled:${userId}`;
      const disabled = await getCache(cacheKey);
      return disabled === true;
    } catch (error) {
      console.error('Error checking push disabled status:', error);
      return false;
    }
  }

  async disablePush(userId) {
    try {
      const cacheKey = `push_disabled:${userId}`;
      await setCache(cacheKey, true, 365 * 24 * 3600); // Cache for 1 year
      console.log(`Push notifications disabled for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      return false;
    }
  }

  async enablePush(userId) {
    try {
      const cacheKey = `push_disabled:${userId}`;
      await setCache(cacheKey, false, 365 * 24 * 3600);
      console.log(`Push notifications enabled for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      return false;
    }
  }

  async getPushCount(rateLimitKey) {
    try {
      const count = await getCache(rateLimitKey);
      return count || 0;
    } catch (error) {
      console.error('Error getting push count:', error);
      return 0;
    }
  }

  async incrementPushCount(rateLimitKey) {
    try {
      const currentCount = await this.getPushCount(rateLimitKey);
      await setCache(rateLimitKey, currentCount + 1, 3600); // 1 hour expiry
      return currentCount + 1;
    } catch (error) {
      console.error('Error incrementing push count:', error);
      return 0;
    }
  }

  async removeInvalidToken(userId, token) {
    try {
      // Find device ID from token and remove
      const deviceData = await getDeviceTokens(userId);
      const device = deviceData.find(d => d.token === token);
      
      if (device) {
        // Extract device ID from cache key pattern
        const deviceId = device.deviceId;
        if (deviceId) {
          await removeDeviceToken(userId, deviceId);
          console.log(`Removed invalid token for user ${userId}, device ${deviceId}`);
        }
      }
    } catch (error) {
      console.error('Error removing invalid token:', error);
    }
  }

  async sendBulkPush(notifications, options = {}) {
    try {
      const { batchSize = 500, delayBetweenBatches = 1000 } = options;
      const results = [];

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        const batchPromises = batch.map(notification => 
          this.sendPush(notification).catch(error => ({ 
            success: false, 
            error: error.message,
            userId: notification.userId 
          }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Delay between batches to avoid rate limiting
        if (i + batchSize < notifications.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  async validateToken(token) {
    try {
      // Try to send a test message to validate token
      const message = {
        token,
        data: {
          test: 'true'
        },
        dryRun: true // Don't actually send
      };

      await admin.messaging().send(message);
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  async getTopicSubscriptions(topic) {
    try {
      // Note: FCM doesn't provide direct API to get topic subscriptions
      // This would require maintaining your own subscription tracking
      console.log(`Getting subscriptions for topic: ${topic}`);
      return {
        success: false,
        message: 'Topic subscription listing not supported by FCM'
      };
    } catch (error) {
      console.error('Error getting topic subscriptions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PushService;
