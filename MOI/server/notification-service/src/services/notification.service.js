const Notification = require('../models/notification.model');
const NotificationTemplate = require('../models/notificationTemplate.model');
const EmailService = require('./email.service');
const PushService = require('./push.service');
const SmsService = require('./sms.service');
const {
  setUserNotificationThrottle,
  getUserNotificationThrottle,
  addToQueue,
  getFromQueue,
  getQueueLength
} = require('../config/redis');

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.pushService = new PushService();
    this.smsService = new SmsService();
  }

  async createNotification(options) {
    try {
      const {
        userId,
        type,
        data = {},
        channels = [],
        priority = 'normal',
        scheduledAt = null,
        preferences = {}
      } = options;

      // Get notification template
      const template = await NotificationTemplate.getTemplate(type);
      if (!template) {
        throw new Error(`Notification template not found for type: ${type}`);
      }

      // Validate template variables
      const validationErrors = template.validateVariables(data);
      if (validationErrors.length > 0) {
        throw new Error(`Template validation failed: ${validationErrors.join(', ')}`);
      }

      // Determine channels to use
      const finalChannels = channels.length > 0 ? channels : template.defaultChannels;

      // Check throttling for high-volume notification types
      if (template.settings.throttle.enabled) {
        const currentCount = await getUserNotificationThrottle(userId, type);
        if (currentCount >= template.settings.throttle.maxPerHour) {
          console.warn(`Notification throttled for user ${userId}, type ${type}`);
          return null;
        }
      }

      // Render templates for each channel
      const renderedTemplates = {};
      for (const channel of finalChannels) {
        try {
          renderedTemplates[channel] = template.renderTemplate(channel, data);
        } catch (error) {
          console.error(`Failed to render template for channel ${channel}:`, error);
        }
      }

      // Create notification record
      const notification = new Notification({
        userId,
        type,
        title: renderedTemplates.in_app?.title || template.templates.in_app?.title || 'Notification',
        message: renderedTemplates.in_app?.message || template.templates.in_app?.message || 'You have a new notification',
        data,
        channels: finalChannels,
        priority: priority || template.priority,
        scheduledAt,
        preferences,
        metadata: {
          templateId: template._id,
          renderedTemplates
        }
      });

      await notification.save();

      // Update throttle counter
      if (template.settings.throttle.enabled) {
        await setUserNotificationThrottle(userId, type, template.settings.throttle.maxPerHour);
      }

      // Send immediately or schedule
      if (scheduledAt && new Date(scheduledAt) > new Date()) {
        await this.scheduleNotification(notification);
      } else {
        await this.sendNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendNotification(notification) {
    try {
      const results = {};
      const renderedTemplates = notification.metadata?.renderedTemplates || {};

      // Send to each channel
      for (const channel of notification.channels) {
        try {
          switch (channel) {
            case 'in_app':
              // In-app notifications are stored in database and marked as sent
              results[channel] = { success: true, message: 'Stored in database' };
              break;

            case 'email':
              if (renderedTemplates.email) {
                results[channel] = await this.emailService.sendEmail({
                  userId: notification.userId,
                  subject: renderedTemplates.email.subject,
                  html: renderedTemplates.email.html,
                  text: renderedTemplates.email.text,
                  fromName: renderedTemplates.email.fromName
                });
              }
              break;

            case 'push':
              if (renderedTemplates.push) {
                results[channel] = await this.pushService.sendPush({
                  userId: notification.userId,
                  title: renderedTemplates.push.title,
                  body: renderedTemplates.push.body,
                  icon: renderedTemplates.push.icon,
                  badge: renderedTemplates.push.badge,
                  sound: renderedTemplates.push.sound,
                  data: notification.data
                });
              }
              break;

            case 'sms':
              if (renderedTemplates.sms) {
                results[channel] = await this.smsService.sendSms({
                  userId: notification.userId,
                  message: renderedTemplates.sms.message
                });
              }
              break;

            default:
              console.warn(`Unsupported notification channel: ${channel}`);
          }
        } catch (error) {
          console.error(`Failed to send notification via ${channel}:`, error);
          results[channel] = { success: false, error: error.message };
        }
      }

      // Update notification status
      const hasSuccessfulSend = Object.values(results).some(result => result?.success);
      if (hasSuccessfulSend) {
        notification.status = 'sent';
        notification.sentAt = new Date();
      } else {
        notification.status = 'failed';
        notification.errorMessage = 'All delivery channels failed';
      }

      notification.metadata.deliveryResults = results;
      await notification.save();

      return results;
    } catch (error) {
      console.error('Error sending notification:', error);
      await notification.markAsFailed(error.message);
      throw error;
    }
  }

  async scheduleNotification(notification) {
    try {
      const scheduledTime = new Date(notification.scheduledAt).getTime();
      const priority = this.getPriorityScore(notification.priority);

      await addToQueue('scheduled_notifications', {
        notificationId: notification._id.toString(),
        scheduledTime,
        userId: notification.userId.toString(),
        type: notification.type
      }, scheduledTime + priority);

      console.log(`Notification ${notification._id} scheduled for ${notification.scheduledAt}`);
      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  async processScheduledNotifications() {
    try {
      const currentTime = Date.now();
      const queueLength = await getQueueLength('scheduled_notifications');
      
      if (queueLength === 0) {
        return 0;
      }

      const scheduledItems = await getFromQueue('scheduled_notifications', Math.min(queueLength, 100));
      let processedCount = 0;

      for (const item of scheduledItems) {
        if (item.scheduledTime <= currentTime) {
          try {
            const notification = await Notification.findById(item.notificationId);
            if (notification && notification.status === 'pending') {
              await this.sendNotification(notification);
              processedCount++;
            }
          } catch (error) {
            console.error(`Error processing scheduled notification ${item.notificationId}:`, error);
          }
        } else {
          // Put back in queue if not ready
          await addToQueue('scheduled_notifications', item, item.scheduledTime);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      return 0;
    }
  }

  async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.find({
        status: 'failed',
        deliveryAttempts: { $lt: 3 },
        lastAttemptAt: {
          $lt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        }
      }).limit(50);

      let retriedCount = 0;

      for (const notification of failedNotifications) {
        try {
          await this.sendNotification(notification);
          retriedCount++;
        } catch (error) {
          console.error(`Retry failed for notification ${notification._id}:`, error);
        }
      }

      return retriedCount;
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      return 0;
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type = null,
        startDate = null,
        endDate = null
      } = options;

      const query = { userId };

      if (unreadOnly) {
        query.readAt = { $exists: false };
      }

      if (type) {
        query.type = type;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      query.status = { $in: ['sent', 'delivered'] };

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-metadata.renderedTemplates'); // Exclude large template data

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.markAsRead();
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(daysOld = 90) {
    try {
      const result = await Notification.cleanupOldNotifications(daysOld);
      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  getPriorityScore(priority) {
    const scores = {
      urgent: 1000,
      high: 100,
      normal: 10,
      low: 1
    };
    return scores[priority] || scores.normal;
  }

  // Bulk notification methods
  async createBulkNotifications(notifications) {
    try {
      const results = [];
      const batchSize = 10;
      
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const batchPromises = batch.map(notification => 
          this.createNotification(notification).catch(error => ({ error }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  async getNotificationStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await Notification.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              type: '$type',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.type',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
