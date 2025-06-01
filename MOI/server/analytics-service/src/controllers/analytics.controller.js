const analyticsService = require('../services/analytics.service');
const reportService = require('../services/report.service');
const { validationResult } = require('express-validator');

class AnalyticsController {
  async recordMetric(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const metricData = {
        userId,
        ...req.body
      };

      const metric = await analyticsService.recordMetric(metricData);

      res.status(201).json({
        success: true,
        message: 'Metric recorded successfully',
        data: { metric }
      });
    } catch (error) {
      console.error('Record metric error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record metric'
      });
    }
  }

  async batchRecordMetrics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const { metrics } = req.body;

      // Add userId to all metrics
      const metricsWithUserId = metrics.map(metric => ({
        ...metric,
        userId
      }));

      const result = await analyticsService.batchRecordMetrics(metricsWithUserId);

      res.status(201).json({
        success: true,
        message: 'Metrics recorded successfully',
        data: result
      });
    } catch (error) {
      console.error('Batch record metrics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record metrics'
      });
    }
  }

  async getOverview(req, res) {
    try {
      const { userId } = req.user;
      const { days = 30 } = req.query;

      const overview = await analyticsService.getOverviewMetrics(userId, parseInt(days));

      res.json({
        success: true,
        data: { overview }
      });
    } catch (error) {
      console.error('Get overview error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get overview'
      });
    }
  }

  async getPlatformAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const { platform } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const analytics = await analyticsService.getPlatformAnalytics(userId, platform, start, end);

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      console.error('Get platform analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get platform analytics'
      });
    }
  }

  async getContentAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const { contentId } = req.params;
      const { detailed = false } = req.query;

      const analytics = await analyticsService.getContentAnalytics(
        userId, 
        contentId, 
        detailed === 'true'
      );

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      console.error('Get content analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get content analytics'
      });
    }
  }

  async getCampaignAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const { campaignId } = req.params;

      const analytics = await analyticsService.getCampaignAnalytics(userId, campaignId);

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get campaign analytics'
      });
    }
  }

  async getEngagementRate(req, res) {
    try {
      const { userId } = req.user;
      const { contentId, platform, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const engagementRates = await analyticsService.getEngagementRate(
        userId, 
        contentId, 
        platform, 
        start, 
        end
      );

      res.json({
        success: true,
        data: { engagementRates }
      });
    } catch (error) {
      console.error('Get engagement rate error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get engagement rate'
      });
    }
  }

  async getTopContent(req, res) {
    try {
      const { userId } = req.user;
      const { 
        platform, 
        metricType = 'engagement', 
        limit = 10, 
        days = 30 
      } = req.query;

      const topContent = await analyticsService.getTopPerformingContent(
        userId, 
        platform, 
        metricType, 
        parseInt(limit), 
        parseInt(days)
      );

      res.json({
        success: true,
        data: { topContent }
      });
    } catch (error) {
      console.error('Get top content error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get top content'
      });
    }
  }

  async getAudienceInsights(req, res) {
    try {
      const { userId } = req.user;
      const { platform, days = 30 } = req.query;

      const insights = await analyticsService.getAudienceInsights(
        userId, 
        platform, 
        parseInt(days)
      );

      res.json({
        success: true,
        data: { insights }
      });
    } catch (error) {
      console.error('Get audience insights error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get audience insights'
      });
    }
  }

  async compareContent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const { contentIds, metricTypes = ['engagement', 'reach'] } = req.body;

      const comparison = await analyticsService.getPerformanceComparison(
        userId, 
        contentIds, 
        metricTypes
      );

      res.json({
        success: true,
        data: { comparison }
      });
    } catch (error) {
      console.error('Compare content error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to compare content'
      });
    }
  }

  // Report endpoints
  async createReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.user;
      const report = await reportService.createReport(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Report created successfully',
        data: { report }
      });
    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create report'
      });
    }
  }

  async generateReport(req, res) {
    try {
      const { reportId } = req.params;
      const { userId } = req.user;

      // Verify ownership
      const report = await reportService.getReport(reportId, userId);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Generate report asynchronously
      reportService.generateReport(reportId).catch(error => {
        console.error('Report generation failed:', error);
      });

      res.json({
        success: true,
        message: 'Report generation started',
        data: { reportId }
      });
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate report'
      });
    }
  }

  async getReports(req, res) {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 10, type } = req.query;

      const result = await reportService.getReports(
        userId, 
        parseInt(page), 
        parseInt(limit), 
        type
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reports'
      });
    }
  }

  async getReport(req, res) {
    try {
      const { reportId } = req.params;
      const { userId } = req.user;

      const report = await reportService.getReport(reportId, userId);

      res.json({
        success: true,
        data: { report }
      });
    } catch (error) {
      console.error('Get report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get report'
      });
    }
  }

  async downloadReport(req, res) {
    try {
      const { reportId } = req.params;
      const { userId } = req.user;

      const downloadInfo = await reportService.downloadReport(reportId, userId);

      res.setHeader('Content-Type', downloadInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
      res.setHeader('Content-Length', downloadInfo.size);

      const fs = require('fs');
      const fileStream = fs.createReadStream(downloadInfo.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download report'
      });
    }
  }

  async shareReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { reportId } = req.params;
      const { userId } = req.user;
      const { email, accessLevel = 'view' } = req.body;

      const report = await reportService.shareReport(reportId, userId, email, accessLevel);

      res.json({
        success: true,
        message: 'Report shared successfully',
        data: { report }
      });
    } catch (error) {
      console.error('Share report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to share report'
      });
    }
  }

  async deleteReport(req, res) {
    try {
      const { reportId } = req.params;
      const { userId } = req.user;

      await reportService.deleteReport(reportId, userId);

      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete report'
      });
    }
  }

  async getReportStatus(req, res) {
    try {
      const { reportId } = req.params;
      const { userId } = req.user;

      const report = await reportService.getReport(reportId, userId);

      res.json({
        success: true,
        data: {
          reportId: report._id,
          status: report.status,
          progress: report.status === 'completed' ? 100 : 
                   report.status === 'processing' ? 50 : 0,
          errorMessage: report.errorMessage,
          generatedAt: report.generatedAt,
          processingTime: report.processingTime
        }
      });
    } catch (error) {
      console.error('Get report status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get report status'
      });
    }
  }
}

module.exports = new AnalyticsController();
