const cron = require('node-cron');
const NotificationService = require('./notification.service');

class CronService {
  constructor() {
    this.notificationService = new NotificationService();
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Cron service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting notification cron service...');

    // Process scheduled notifications every minute
    this.scheduleJob('processScheduledNotifications', '* * * * *', async () => {
      try {
        const processed = await this.notificationService.processScheduledNotifications();
        if (processed > 0) {
          console.log(`Processed ${processed} scheduled notifications`);
        }
      } catch (error) {
        console.error('Error processing scheduled notifications:', error);
      }
    });

    // Retry failed notifications every 5 minutes
    this.scheduleJob('retryFailedNotifications', '*/5 * * * *', async () => {
      try {
        const retried = await this.notificationService.retryFailedNotifications();
        if (retried > 0) {
          console.log(`Retried ${retried} failed notifications`);
        }
      } catch (error) {
        console.error('Error retrying failed notifications:', error);
      }
    });

    // Clean up old notifications daily at 2 AM
    this.scheduleJob('cleanupOldNotifications', '0 2 * * *', async () => {
      try {
        const cleaned = await this.notificationService.cleanupOldNotifications(90);
        console.log(`Cleaned up ${cleaned} old notifications`);
      } catch (error) {
        console.error('Error cleaning up old notifications:', error);
      }
    });

    // Process notification analytics daily at 3 AM
    this.scheduleJob('processNotificationAnalytics', '0 3 * * *', async () => {
      try {
        await this.processNotificationAnalytics();
        console.log('Notification analytics processed');
      } catch (error) {
        console.error('Error processing notification analytics:', error);
      }
    });

    // Send weekly notification summaries on Mondays at 9 AM
    this.scheduleJob('sendWeeklySummaries', '0 9 * * 1', async () => {
      try {
        await this.sendWeeklySummaries();
        console.log('Weekly notification summaries sent');
      } catch (error) {
        console.error('Error sending weekly summaries:', error);
      }
    });

    // Health check every hour
    this.scheduleJob('healthCheck', '0 * * * *', async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Error performing health check:', error);
      }
    });

    // Reset rate limits every hour
    this.scheduleJob('resetRateLimits', '0 * * * *', async () => {
      try {
        await this.resetHourlyRateLimits();
      } catch (error) {
        console.error('Error resetting rate limits:', error);
      }
    });

    console.log('Notification cron service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Cron service is not running');
      return;
    }

    console.log('Stopping notification cron service...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped cron job: ${name}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Notification cron service stopped');
  }

  scheduleJob(name, schedule, task) {
    try {
      if (this.jobs.has(name)) {
        console.log(`Cron job ${name} already exists, stopping previous instance`);
        this.jobs.get(name).stop();
      }

      const job = cron.schedule(schedule, task, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });

      this.jobs.set(name, job);
      console.log(`Scheduled cron job: ${name} with pattern: ${schedule}`);
    } catch (error) {
      console.error(`Error scheduling cron job ${name}:`, error);
    }
  }

  async processNotificationAnalytics() {
    try {
      const { Notification } = require('../models/notification.model');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);

      // Aggregate daily notification metrics
      const metrics = await Notification.aggregate([
        {
          $match: {
            createdAt: {
              $gte: yesterday,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              type: '$type',
              status: '$status',
              channel: '$channels'
            },
            count: { $sum: 1 },
            avgDeliveryTime: {
              $avg: {
                $subtract: ['$sentAt', '$createdAt']
              }
            }
          }
        }
      ]);

      // Store metrics in cache for reporting
      const { setCache } = require('../config/redis');
      const metricsKey = `notification_metrics:${yesterday.toISOString().split('T')[0]}`;
      await setCache(metricsKey, metrics, 30 * 24 * 3600); // Keep for 30 days

      console.log(`Processed notification analytics for ${yesterday.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Error processing notification analytics:', error);
    }
  }

  async sendWeeklySummaries() {
    try {
      // This would typically get users who have opted in for weekly summaries
      // For now, we'll skip the actual implementation
      console.log('Weekly summary feature not fully implemented');
    } catch (error) {
      console.error('Error sending weekly summaries:', error);
    }
  }

  async performHealthCheck() {
    try {
      const { getRedisClient } = require('../config/redis');
      const mongoose = require('mongoose');

      const healthStatus = {
        timestamp: new Date(),
        services: {}
      };

      // Check MongoDB connection
      try {
        if (mongoose.connection.readyState === 1) {
          healthStatus.services.mongodb = { status: 'healthy' };
        } else {
          healthStatus.services.mongodb = { status: 'unhealthy', error: 'Not connected' };
        }
      } catch (error) {
        healthStatus.services.mongodb = { status: 'unhealthy', error: error.message };
      }

      // Check Redis connection
      try {
        const redisClient = getRedisClient();
        await redisClient.ping();
        healthStatus.services.redis = { status: 'healthy' };
      } catch (error) {
        healthStatus.services.redis = { status: 'unhealthy', error: error.message };
      }

      // Check notification queue
      try {
        const { getQueueLength } = require('../config/redis');
        const queueLength = await getQueueLength('scheduled_notifications');
        healthStatus.services.notificationQueue = { 
          status: 'healthy', 
          queueLength 
        };
      } catch (error) {
        healthStatus.services.notificationQueue = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }

      // Store health status
      const { setCache } = require('../config/redis');
      await setCache('notification_service_health', healthStatus, 3600);

      // Log critical issues
      const unhealthyServices = Object.entries(healthStatus.services)
        .filter(([, service]) => service.status === 'unhealthy');

      if (unhealthyServices.length > 0) {
        console.error('Health check found unhealthy services:', unhealthyServices);
      }

    } catch (error) {
      console.error('Error performing health check:', error);
    }
  }

  async resetHourlyRateLimits() {
    try {
      const { deleteCachePattern } = require('../config/redis');
      
      // Clean up old rate limit counters
      const currentHour = new Date().getHours();
      const previousHour = currentHour === 0 ? 23 : currentHour - 1;
      
      await deleteCachePattern(`*_rate_limit:*:${previousHour}`);
      
      console.log(`Reset rate limits for hour ${previousHour}`);
    } catch (error) {
      console.error('Error resetting rate limits:', error);
    }
  }

  getJobStatus() {
    const status = {
      isRunning: this.isRunning,
      jobs: {}
    };

    for (const [name, job] of this.jobs) {
      status.jobs[name] = {
        running: job.running || false,
        scheduled: true
      };
    }

    return status;
  }

  async getMetrics() {
    try {
      const { getCache } = require('../config/redis');
      
      // Get recent health status
      const health = await getCache('notification_service_health');
      
      // Get queue metrics
      const { getQueueLength } = require('../config/redis');
      const queueLength = await getQueueLength('scheduled_notifications');
      
      // Get recent notification counts
      const { Notification } = require('../models/notification.model');
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentCounts = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: last24h }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        health,
        queueLength,
        recentCounts: recentCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        jobStatus: this.getJobStatus()
      };
    } catch (error) {
      console.error('Error getting cron metrics:', error);
      return { error: error.message };
    }
  }

  // Manual trigger methods for testing
  async triggerScheduledNotifications() {
    try {
      const processed = await this.notificationService.processScheduledNotifications();
      return { success: true, processed };
    } catch (error) {
      console.error('Error triggering scheduled notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async triggerFailedRetry() {
    try {
      const retried = await this.notificationService.retryFailedNotifications();
      return { success: true, retried };
    } catch (error) {
      console.error('Error triggering failed retry:', error);
      return { success: false, error: error.message };
    }
  }

  async triggerCleanup() {
    try {
      const cleaned = await this.notificationService.cleanupOldNotifications(90);
      return { success: true, cleaned };
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CronService;
