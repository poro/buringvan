const Metric = require('../models/metric.model');
const { getRedisClient } = require('../config/redis');
const { startOfDay, endOfDay, subDays, format } = require('date-fns');
const _ = require('lodash');

class AnalyticsService {
  constructor() {
    this.redis = null;
    this.initRedis();
  }

  async initRedis() {
    try {
      this.redis = getRedisClient();
    } catch (error) {
      console.warn('Redis not available, using without cache');
    }
  }

  async recordMetric(data) {
    try {
      const {
        userId,
        contentId,
        campaignId,
        platform,
        postId,
        metricType,
        value,
        metadata = {}
      } = data;

      // Get previous value for trend calculation
      const previousMetric = await Metric.findOne({
        userId,
        platform,
        metricType,
        ...(contentId && { contentId }),
        ...(postId && { postId })
      }).sort({ date: -1 });

      const metric = new Metric({
        userId,
        contentId,
        campaignId,
        platform,
        postId,
        metricType,
        value,
        previousValue: previousMetric ? previousMetric.value : 0,
        metadata
      });

      await metric.save();

      // Invalidate relevant cache
      if (this.redis) {
        const cacheKeys = [
          `analytics:${userId}:overview`,
          `analytics:${userId}:platform:${platform}`,
          `analytics:${userId}:content:${contentId}`,
          `analytics:${userId}:campaign:${campaignId}`
        ];
        
        await Promise.all(
          cacheKeys.map(key => this.redis.del(key).catch(() => {}))
        );
      }

      return metric;
    } catch (error) {
      throw new Error(`Failed to record metric: ${error.message}`);
    }
  }

  async batchRecordMetrics(metrics) {
    try {
      const operations = metrics.map(data => ({
        insertOne: {
          document: {
            ...data,
            hourOfDay: new Date(data.date || Date.now()).getHours(),
            dayOfWeek: new Date(data.date || Date.now()).getDay()
          }
        }
      }));

      await Metric.bulkWrite(operations);

      // Invalidate cache for affected users
      if (this.redis) {
        const userIds = [...new Set(metrics.map(m => m.userId))];
        const cacheKeys = userIds.map(userId => `analytics:${userId}:*`);
        
        for (const pattern of cacheKeys) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(keys);
          }
        }
      }

      return { success: true, recordsInserted: metrics.length };
    } catch (error) {
      throw new Error(`Failed to batch record metrics: ${error.message}`);
    }
  }

  async getOverviewMetrics(userId, dateRange = 30) {
    const cacheKey = `analytics:${userId}:overview:${dateRange}`;
    
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis get failed:', error.message);
      }
    }

    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, dateRange));

      // Get total metrics
      const totalMetrics = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$metricType',
            total: { $sum: '$value' },
            average: { $avg: '$value' },
            max: { $max: '$value' },
            min: { $min: '$value' }
          }
        }
      ]);

      // Get platform breakdown
      const platformMetrics = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              platform: '$platform',
              metricType: '$metricType'
            },
            total: { $sum: '$value' }
          }
        },
        {
          $group: {
            _id: '$_id.platform',
            metrics: {
              $push: {
                type: '$_id.metricType',
                value: '$total'
              }
            }
          }
        }
      ]);

      // Get daily trends
      const dailyTrends = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              metricType: '$metricType'
            },
            total: { $sum: '$value' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            metrics: {
              $push: {
                type: '$_id.metricType',
                value: '$total'
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Calculate engagement rate
      const engagementData = await this.getEngagementRate(userId, null, null, startDate, endDate);
      const avgEngagementRate = engagementData.length > 0
        ? engagementData.reduce((acc, item) => acc + item.engagementRate, 0) / engagementData.length
        : 0;

      const overview = {
        totalMetrics: _.keyBy(totalMetrics, '_id'),
        platformBreakdown: _.keyBy(platformMetrics, '_id'),
        dailyTrends,
        averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
        dateRange: { startDate, endDate },
        generatedAt: new Date()
      };

      // Cache for 1 hour
      if (this.redis) {
        try {
          await this.redis.setEx(cacheKey, 3600, JSON.stringify(overview));
        } catch (error) {
          console.warn('Redis set failed:', error.message);
        }
      }

      return overview;
    } catch (error) {
      throw new Error(`Failed to get overview metrics: ${error.message}`);
    }
  }

  async getPlatformAnalytics(userId, platform, startDate, endDate) {
    const cacheKey = `analytics:${userId}:platform:${platform}:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}`;
    
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis get failed:', error.message);
      }
    }

    try {
      // Platform summary
      const summary = await Metric.getPlatformSummary(userId, startDate, endDate);
      const platformSummary = summary.find(item => item._id === platform);

      // Time series data
      const timeSeries = await Metric.getMetricsByDateRange(userId, startDate, endDate, platform);

      // Best performing content
      const topContent = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            platform,
            date: { $gte: startDate, $lte: endDate },
            contentId: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$contentId',
            totalEngagement: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'engagement'] }, '$value', 0]
              }
            },
            totalImpressions: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'impressions'] }, '$value', 0]
              }
            },
            totalReach: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'reach'] }, '$value', 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            totalEngagement: 1,
            totalImpressions: 1,
            totalReach: 1,
            engagementRate: {
              $cond: [
                { $gt: ['$totalImpressions', 0] },
                { $multiply: [{ $divide: ['$totalEngagement', '$totalImpressions'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { engagementRate: -1 } },
        { $limit: 10 }
      ]);

      // Hour of day analysis
      const hourlyPerformance = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            platform,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$hourOfDay',
            avgEngagement: {
              $avg: {
                $cond: [{ $eq: ['$metricType', 'engagement'] }, '$value', 0]
              }
            },
            totalPosts: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Day of week analysis
      const dailyPerformance = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            platform,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$dayOfWeek',
            avgEngagement: {
              $avg: {
                $cond: [{ $eq: ['$metricType', 'engagement'] }, '$value', 0]
              }
            },
            totalPosts: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      const analytics = {
        platform,
        summary: platformSummary?.metrics || [],
        timeSeries,
        topContent,
        hourlyPerformance,
        dailyPerformance,
        dateRange: { startDate, endDate },
        generatedAt: new Date()
      };

      // Cache for 30 minutes
      if (this.redis) {
        try {
          await this.redis.setEx(cacheKey, 1800, JSON.stringify(analytics));
        } catch (error) {
          console.warn('Redis set failed:', error.message);
        }
      }

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get platform analytics: ${error.message}`);
    }
  }

  async getContentAnalytics(userId, contentId, detailed = false) {
    const cacheKey = `analytics:${userId}:content:${contentId}:${detailed}`;
    
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis get failed:', error.message);
      }
    }

    try {
      // Content metrics summary
      const summary = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            contentId: new mongoose.Types.ObjectId(contentId)
          }
        },
        {
          $group: {
            _id: {
              platform: '$platform',
              metricType: '$metricType'
            },
            total: { $sum: '$value' },
            latest: { $last: '$value' },
            peak: { $max: '$value' },
            firstRecorded: { $min: '$date' },
            lastRecorded: { $max: '$date' }
          }
        },
        {
          $group: {
            _id: '$_id.platform',
            metrics: {
              $push: {
                type: '$_id.metricType',
                total: '$total',
                latest: '$latest',
                peak: '$peak'
              }
            },
            firstRecorded: { $min: '$firstRecorded' },
            lastRecorded: { $max: '$lastRecorded' }
          }
        }
      ]);

      let timeSeries = [];
      let comparisons = {};

      if (detailed) {
        // Time series for detailed view
        timeSeries = await Metric.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              contentId: new mongoose.Types.ObjectId(contentId)
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$date' } },
                platform: '$platform',
                metricType: '$metricType'
              },
              value: { $sum: '$value' }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]);

        // Compare with average content performance
        const avgPerformance = await Metric.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              contentId: { $ne: new mongoose.Types.ObjectId(contentId) },
              date: { 
                $gte: summary.length > 0 ? summary[0].firstRecorded : subDays(new Date(), 30) 
              }
            }
          },
          {
            $group: {
              _id: {
                platform: '$platform',
                metricType: '$metricType'
              },
              avgValue: { $avg: '$value' }
            }
          }
        ]);

        comparisons = _.groupBy(avgPerformance, '_id.platform');
      }

      const analytics = {
        contentId,
        summary: _.keyBy(summary, '_id'),
        timeSeries: detailed ? timeSeries : undefined,
        comparisons: detailed ? comparisons : undefined,
        generatedAt: new Date()
      };

      // Cache for 15 minutes
      if (this.redis) {
        try {
          await this.redis.setEx(cacheKey, 900, JSON.stringify(analytics));
        } catch (error) {
          console.warn('Redis set failed:', error.message);
        }
      }

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get content analytics: ${error.message}`);
    }
  }

  async getCampaignAnalytics(userId, campaignId) {
    try {
      // Campaign overview
      const overview = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            campaignId: new mongoose.Types.ObjectId(campaignId)
          }
        },
        {
          $group: {
            _id: null,
            totalImpressions: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'impressions'] }, '$value', 0]
              }
            },
            totalEngagement: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'engagement'] }, '$value', 0]
              }
            },
            totalReach: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'reach'] }, '$value', 0]
              }
            },
            totalClicks: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'clicks'] }, '$value', 0]
              }
            },
            uniqueContent: { $addToSet: '$contentId' },
            platforms: { $addToSet: '$platform' },
            firstPost: { $min: '$date' },
            lastPost: { $max: '$date' }
          }
        },
        {
          $project: {
            _id: 0,
            totalImpressions: 1,
            totalEngagement: 1,
            totalReach: 1,
            totalClicks: 1,
            contentCount: { $size: '$uniqueContent' },
            platformCount: { $size: '$platforms' },
            platforms: 1,
            duration: {
              $divide: [
                { $subtract: ['$lastPost', '$firstPost'] },
                86400000 // Convert to days
              ]
            },
            engagementRate: {
              $cond: [
                { $gt: ['$totalImpressions', 0] },
                { $multiply: [{ $divide: ['$totalEngagement', '$totalImpressions'] }, 100] },
                0
              ]
            },
            clickThroughRate: {
              $cond: [
                { $gt: ['$totalImpressions', 0] },
                { $multiply: [{ $divide: ['$totalClicks', '$totalImpressions'] }, 100] },
                0
              ]
            }
          }
        }
      ]);

      // Platform performance
      const platformPerformance = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            campaignId: new mongoose.Types.ObjectId(campaignId)
          }
        },
        {
          $group: {
            _id: {
              platform: '$platform',
              metricType: '$metricType'
            },
            total: { $sum: '$value' },
            avg: { $avg: '$value' },
            max: { $max: '$value' }
          }
        },
        {
          $group: {
            _id: '$_id.platform',
            metrics: {
              $push: {
                type: '$_id.metricType',
                total: '$total',
                average: '$avg',
                peak: '$max'
              }
            }
          }
        }
      ]);

      // Content performance ranking
      const contentRanking = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            campaignId: new mongoose.Types.ObjectId(campaignId),
            contentId: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$contentId',
            totalEngagement: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'engagement'] }, '$value', 0]
              }
            },
            totalImpressions: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'impressions'] }, '$value', 0]
              }
            },
            totalReach: {
              $sum: {
                $cond: [{ $eq: ['$metricType', 'reach'] }, '$value', 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            totalEngagement: 1,
            totalImpressions: 1,
            totalReach: 1,
            engagementRate: {
              $cond: [
                { $gt: ['$totalImpressions', 0] },
                { $multiply: [{ $divide: ['$totalEngagement', '$totalImpressions'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { engagementRate: -1 } }
      ]);

      return {
        campaignId,
        overview: overview[0] || {},
        platformPerformance: _.keyBy(platformPerformance, '_id'),
        contentRanking,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get campaign analytics: ${error.message}`);
    }
  }

  async getEngagementRate(userId, contentId = null, platform = null, startDate, endDate) {
    try {
      return await Metric.getEngagementRate(userId, contentId, platform, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get engagement rate: ${error.message}`);
    }
  }

  async getTopPerformingContent(userId, platform = null, metricType = 'engagement', limit = 10, days = 30) {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const match = {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        metricType,
        contentId: { $exists: true }
      };

      if (platform) match.platform = platform;

      const topContent = await Metric.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              contentId: '$contentId',
              platform: '$platform'
            },
            totalValue: { $sum: '$value' },
            avgValue: { $avg: '$value' },
            maxValue: { $max: '$value' },
            postCount: { $sum: 1 }
          }
        },
        { $sort: { totalValue: -1 } },
        { $limit: limit }
      ]);

      return topContent;
    } catch (error) {
      throw new Error(`Failed to get top performing content: ${error.message}`);
    }
  }

  async getAudienceInsights(userId, platform = null, days = 30) {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const match = {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      };

      if (platform) match.platform = platform;

      // Best posting times
      const bestTimes = await Metric.aggregate([
        { $match: { ...match, metricType: 'engagement' } },
        {
          $group: {
            _id: {
              hour: '$hourOfDay',
              day: '$dayOfWeek'
            },
            avgEngagement: { $avg: '$value' },
            totalPosts: { $sum: 1 }
          }
        },
        { $sort: { avgEngagement: -1 } },
        { $limit: 10 }
      ]);

      // Growth trends
      const growthTrends = await Metric.aggregate([
        { 
          $match: { 
            ...match, 
            metricType: { $in: ['followers_gained', 'followers_lost'] } 
          } 
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              metricType: '$metricType'
            },
            total: { $sum: '$value' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            followersGained: {
              $sum: {
                $cond: [{ $eq: ['$_id.metricType', 'followers_gained'] }, '$total', 0]
              }
            },
            followersLost: {
              $sum: {
                $cond: [{ $eq: ['$_id.metricType', 'followers_lost'] }, '$total', 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            followersGained: 1,
            followersLost: 1,
            netGrowth: { $subtract: ['$followersGained', '$followersLost'] }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      return {
        bestPostingTimes: bestTimes,
        growthTrends,
        platform: platform || 'all',
        dateRange: { startDate, endDate },
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get audience insights: ${error.message}`);
    }
  }

  async getPerformanceComparison(userId, contentIds, metricTypes = ['engagement', 'reach']) {
    try {
      const comparison = await Metric.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            contentId: { $in: contentIds.map(id => new mongoose.Types.ObjectId(id)) },
            metricType: { $in: metricTypes }
          }
        },
        {
          $group: {
            _id: {
              contentId: '$contentId',
              metricType: '$metricType'
            },
            total: { $sum: '$value' },
            average: { $avg: '$value' },
            max: { $max: '$value' },
            min: { $min: '$value' }
          }
        },
        {
          $group: {
            _id: '$_id.contentId',
            metrics: {
              $push: {
                type: '$_id.metricType',
                total: '$total',
                average: '$average',
                max: '$max',
                min: '$min'
              }
            }
          }
        }
      ]);

      return comparison;
    } catch (error) {
      throw new Error(`Failed to get performance comparison: ${error.message}`);
    }
  }

  async deleteUserMetrics(userId) {
    try {
      const result = await Metric.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      
      // Clear cache
      if (this.redis) {
        const keys = await this.redis.keys(`analytics:${userId}:*`);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to delete user metrics: ${error.message}`);
    }
  }
}

module.exports = new AnalyticsService();
