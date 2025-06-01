const NotificationService = require('../services/notification.service');
const EmailService = require('../services/email.service');
const PushService = require('../services/push.service');
const SmsService = require('../services/sms.service');
const { setDeviceToken, removeDeviceToken } = require('../config/redis');

class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
    this.pushService = new PushService();
    this.smsService = new SmsService();
  }

  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type,
        startDate,
        endDate
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unreadOnly === 'true',
        type,
        startDate,
        endDate
      };

      const result = await this.notificationService.getUserNotifications(userId, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting user notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: error.message
      });
    }
  }

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await this.notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const notification = await this.notificationService.markNotificationAsRead(
        notificationId, 
        userId
      );

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.notificationService.markAllNotificationsAsRead(userId);

      res.json({
        success: true,
        data: { modifiedCount: result.modifiedCount }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const deleted = await this.notificationService.deleteNotification(
        notificationId, 
        userId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }

  // Create notification (admin/system use)
  async createNotification(req, res) {
    try {
      const {
        userId,
        type,
        data,
        channels,
        priority,
        scheduledAt
      } = req.body;

      const notification = await this.notificationService.createNotification({
        userId,
        type,
        data,
        channels,
        priority,
        scheduledAt
      });

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error.message
      });
    }
  }

  // Send test notification
  async sendTestNotification(req, res) {
    try {
      const userId = req.user.id;
      const { type = 'system_announcement', channels = ['in_app'] } = req.body;

      const notification = await this.notificationService.createNotification({
        userId,
        type,
        data: {
          message: 'This is a test notification',
          timestamp: new Date().toISOString()
        },
        channels,
        priority: 'normal'
      });

      res.json({
        success: true,
        data: notification,
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  }

  // Register device token for push notifications
  async registerDeviceToken(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId, token, platform } = req.body;

      await setDeviceToken(userId, deviceId, token, platform);

      res.json({
        success: true,
        message: 'Device token registered successfully'
      });
    } catch (error) {
      console.error('Error registering device token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register device token',
        error: error.message
      });
    }
  }

  // Unregister device token
  async unregisterDeviceToken(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;

      await removeDeviceToken(userId, deviceId);

      res.json({
        success: true,
        message: 'Device token unregistered successfully'
      });
    } catch (error) {
      console.error('Error unregistering device token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unregister device token',
        error: error.message
      });
    }
  }

  // Update notification preferences
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { email, push, sms, inApp } = req.body;

      // This would typically update user preferences in the auth service
      // For now, we'll just acknowledge the request
      
      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          email: email !== undefined ? email : true,
          push: push !== undefined ? push : true,
          sms: sms !== undefined ? sms : false,
          inApp: inApp !== undefined ? inApp : true
        }
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: error.message
      });
    }
  }

  // Get notification preferences
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;

      // This would typically get user preferences from the auth service
      // For now, return default preferences
      
      res.json({
        success: true,
        data: {
          email: true,
          push: true,
          sms: false,
          inApp: true
        }
      });
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences',
        error: error.message
      });
    }
  }

  // Handle email unsubscribe
  async handleEmailUnsubscribe(req, res) {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Unsubscribe token is required'
        });
      }

      // Decode email from token
      const email = Buffer.from(token, 'base64').toString();
      
      const result = await this.emailService.unsubscribeUser(email);
      
      if (result) {
        res.json({
          success: true,
          message: 'Successfully unsubscribed from email notifications'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to unsubscribe'
        });
      }
    } catch (error) {
      console.error('Error handling email unsubscribe:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process unsubscribe request',
        error: error.message
      });
    }
  }

  // Handle SMS webhook
  async handleSmsWebhook(req, res) {
    try {
      const result = await this.smsService.handleWebhook(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error handling SMS webhook:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle incoming SMS
  async handleIncomingSms(req, res) {
    try {
      const result = await this.smsService.handleIncomingMessage(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get notification statistics
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const stats = await this.notificationService.getNotificationStats(
        userId, 
        parseInt(days)
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting notification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: error.message
      });
    }
  }

  // Send bulk notifications (admin only)
  async sendBulkNotifications(req, res) {
    try {
      const { notifications } = req.body;

      if (!Array.isArray(notifications)) {
        return res.status(400).json({
          success: false,
          message: 'Notifications must be an array'
        });
      }

      const results = await this.notificationService.createBulkNotifications(notifications);

      const successCount = results.filter(r => r && !r.error).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        data: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          results
        }
      });
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notifications',
        error: error.message
      });
    }
  }

  // Subscribe to push topic
  async subscribeTopic(req, res) {
    try {
      const { topic, deviceTokens } = req.body;

      const result = await this.pushService.subscribeToTopic(deviceTokens, topic);

      res.json({
        success: result.success,
        data: result
      });
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe to topic',
        error: error.message
      });
    }
  }

  // Unsubscribe from push topic
  async unsubscribeTopic(req, res) {
    try {
      const { topic, deviceTokens } = req.body;

      const result = await this.pushService.unsubscribeFromTopic(deviceTokens, topic);

      res.json({
        success: result.success,
        data: result
      });
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unsubscribe from topic',
        error: error.message
      });
    }
  }

  // Send topic notification (admin only)
  async sendTopicNotification(req, res) {
    try {
      const { topic, title, body, data, imageUrl } = req.body;

      const result = await this.pushService.sendToTopic(topic, {
        title,
        body,
        data,
        imageUrl
      });

      res.json({
        success: result.success,
        data: result
      });
    } catch (error) {
      console.error('Error sending topic notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send topic notification',
        error: error.message
      });
    }
  }
}

module.exports = NotificationController;
