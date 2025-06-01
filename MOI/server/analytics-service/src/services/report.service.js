const Report = require('../models/report.model');
const analyticsService = require('./analytics.service');
const PDFDocument = require('pdflib').PDFDocument;
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;
const path = require('path');
const { format, parseISO } = require('date-fns');

class ReportService {
  constructor() {
    this.chartRenderer = new ChartJSNodeCanvas({ width: 800, height: 400 });
    this.reportsDir = process.env.REPORTS_DIR || path.join(__dirname, '../../uploads/reports');
    this.ensureReportsDirectory();
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  async createReport(userId, reportData) {
    try {
      const report = new Report({
        userId,
        ...reportData,
        status: 'pending'
      });

      // Set scheduled date if not provided
      if (!report.scheduledFor) {
        report.scheduledFor = new Date();
      }

      // Calculate next run date for recurring reports
      if (report.isRecurring) {
        report.nextRunDate = report.calculateNextRunDate();
      }

      await report.save();
      return report;
    } catch (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  async generateReport(reportId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      if (report.status === 'processing') {
        throw new Error('Report is already being processed');
      }

      const startTime = Date.now();
      
      // Update status to processing
      report.status = 'processing';
      await report.save();

      try {
        // Gather data based on report filters
        const data = await this.gatherReportData(report);
        
        // Generate file based on format
        let filePath;
        switch (report.format) {
          case 'pdf':
            filePath = await this.generatePDFReport(report, data);
            break;
          case 'excel':
            filePath = await this.generateExcelReport(report, data);
            break;
          case 'csv':
            filePath = await this.generateCSVReport(report, data);
            break;
          case 'json':
            filePath = await this.generateJSONReport(report, data);
            break;
          default:
            throw new Error(`Unsupported report format: ${report.format}`);
        }

        // Get file size
        const stats = await fs.stat(filePath);
        
        // Update report with file details
        report.status = 'completed';
        report.fileUrl = filePath;
        report.fileSize = stats.size;
        report.generatedAt = new Date();
        report.processingTime = Date.now() - startTime;
        report.data = data;

        // Schedule next run for recurring reports
        if (report.isRecurring) {
          report.nextRunDate = report.calculateNextRunDate();
        }

        await report.save();
        return report;
      } catch (error) {
        // Update status to failed
        report.status = 'failed';
        report.errorMessage = error.message;
        report.processingTime = Date.now() - startTime;
        await report.save();
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  async gatherReportData(report) {
    const { userId, filters } = report;
    const data = {};

    // Set date range
    const { startDate, endDate } = filters.dateRange || {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date()
    };

    // Overview metrics
    if (report.template.sections.includes('overview')) {
      data.overview = await analyticsService.getOverviewMetrics(userId, 30);
    }

    // Platform performance
    if (report.template.sections.includes('platform_performance')) {
      data.platformPerformance = {};
      
      const platforms = filters.platforms || ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'];
      for (const platform of platforms) {
        data.platformPerformance[platform] = await analyticsService.getPlatformAnalytics(
          userId, platform, startDate, endDate
        );
      }
    }

    // Content performance
    if (report.template.sections.includes('content_performance')) {
      data.topContent = await analyticsService.getTopPerformingContent(
        userId, null, 'engagement', 20, 30
      );
    }

    // Engagement analysis
    if (report.template.sections.includes('engagement_analysis')) {
      data.engagementRates = await analyticsService.getEngagementRate(
        userId, null, null, startDate, endDate
      );
    }

    // Audience insights
    if (report.template.sections.includes('audience_insights')) {
      data.audienceInsights = await analyticsService.getAudienceInsights(userId, null, 30);
    }

    // Campaign performance (if campaign filter specified)
    if (filters.campaigns && filters.campaigns.length > 0) {
      data.campaignPerformance = {};
      for (const campaignId of filters.campaigns) {
        data.campaignPerformance[campaignId] = await analyticsService.getCampaignAnalytics(
          userId, campaignId
        );
      }
    }

    return data;
  }

  async generatePDFReport(report, data) {
    try {
      const fileName = `report_${report._id}_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);

      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([612, 792]); // Letter size

      const { width, height } = page.getSize();
      let yPosition = height - 50;

      // Add title
      page.drawText(report.title, {
        x: 50,
        y: yPosition,
        size: 24,
        color: { r: 0.2, g: 0.2, b: 0.2 }
      });
      yPosition -= 40;

      // Add description
      if (report.description) {
        page.drawText(report.description, {
          x: 50,
          y: yPosition,
          size: 12,
          maxWidth: width - 100
        });
        yPosition -= 30;
      }

      // Add generated date
      page.drawText(`Generated: ${format(new Date(), 'PPP')}`, {
        x: 50,
        y: yPosition,
        size: 10
      });
      yPosition -= 40;

      // Add overview section
      if (data.overview) {
        page.drawText('Overview', {
          x: 50,
          y: yPosition,
          size: 18,
          color: { r: 0.3, g: 0.3, b: 0.3 }
        });
        yPosition -= 25;

        const totalMetrics = data.overview.totalMetrics;
        Object.entries(totalMetrics).forEach(([metric, values]) => {
          if (yPosition < 100) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = height - 50;
          }
          
          page.drawText(`${metric}: ${values.total.toLocaleString()}`, {
            x: 70,
            y: yPosition,
            size: 12
          });
          yPosition -= 20;
        });
        yPosition -= 20;
      }

      // Add platform performance charts if enabled
      if (report.template.includeCharts && data.platformPerformance) {
        await this.addChartsToPage(pdfDoc, data.platformPerformance, yPosition);
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(filePath, pdfBytes);

      return filePath;
    } catch (error) {
      throw new Error(`Failed to generate PDF report: ${error.message}`);
    }
  }

  async generateExcelReport(report, data) {
    try {
      const fileName = `report_${report._id}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MOI Analytics';
      workbook.created = new Date();

      // Overview sheet
      if (data.overview) {
        const overviewSheet = workbook.addWorksheet('Overview');
        
        // Add headers
        overviewSheet.addRow(['Metric', 'Total', 'Average', 'Max', 'Min']);
        overviewSheet.getRow(1).font = { bold: true };

        // Add data
        Object.entries(data.overview.totalMetrics).forEach(([metric, values]) => {
          overviewSheet.addRow([
            metric,
            values.total,
            Math.round(values.average * 100) / 100,
            values.max,
            values.min
          ]);
        });

        // Auto-fit columns
        overviewSheet.columns.forEach(column => {
          column.width = 15;
        });
      }

      // Platform performance sheets
      if (data.platformPerformance) {
        Object.entries(data.platformPerformance).forEach(([platform, platformData]) => {
          const sheet = workbook.addWorksheet(platform.charAt(0).toUpperCase() + platform.slice(1));
          
          // Time series data
          if (platformData.timeSeries && platformData.timeSeries.length > 0) {
            sheet.addRow(['Date', 'Platform', 'Metric Type', 'Value']);
            sheet.getRow(1).font = { bold: true };

            platformData.timeSeries.forEach(item => {
              sheet.addRow([
                item._id.date,
                item._id.platform,
                item._id.metricType,
                item.totalValue
              ]);
            });
          }

          // Auto-fit columns
          sheet.columns.forEach(column => {
            column.width = 15;
          });
        });
      }

      // Top content sheet
      if (data.topContent) {
        const contentSheet = workbook.addWorksheet('Top Content');
        contentSheet.addRow(['Content ID', 'Platform', 'Total Engagement', 'Total Impressions', 'Engagement Rate']);
        contentSheet.getRow(1).font = { bold: true };

        data.topContent.forEach(item => {
          contentSheet.addRow([
            item._id.contentId,
            item._id.platform,
            item.totalValue,
            item.totalImpressions || 0,
            Math.round((item.engagementRate || 0) * 100) / 100
          ]);
        });

        contentSheet.columns.forEach(column => {
          column.width = 20;
        });
      }

      await workbook.xlsx.writeFile(filePath);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to generate Excel report: ${error.message}`);
    }
  }

  async generateCSVReport(report, data) {
    try {
      const fileName = `report_${report._id}_${Date.now()}.csv`;
      const filePath = path.join(this.reportsDir, fileName);

      const csvData = [];

      // Add overview data
      if (data.overview && data.overview.totalMetrics) {
        Object.entries(data.overview.totalMetrics).forEach(([metric, values]) => {
          csvData.push({
            section: 'Overview',
            metric,
            total: values.total,
            average: Math.round(values.average * 100) / 100,
            max: values.max,
            min: values.min
          });
        });
      }

      // Add platform data
      if (data.platformPerformance) {
        Object.entries(data.platformPerformance).forEach(([platform, platformData]) => {
          if (platformData.timeSeries) {
            platformData.timeSeries.forEach(item => {
              csvData.push({
                section: 'Platform Performance',
                platform: item._id.platform,
                date: item._id.date,
                metric: item._id.metricType,
                value: item.totalValue
              });
            });
          }
        });
      }

      // Write CSV
      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'section', title: 'Section' },
          { id: 'platform', title: 'Platform' },
          { id: 'date', title: 'Date' },
          { id: 'metric', title: 'Metric' },
          { id: 'value', title: 'Value' },
          { id: 'total', title: 'Total' },
          { id: 'average', title: 'Average' },
          { id: 'max', title: 'Max' },
          { id: 'min', title: 'Min' }
        ]
      });

      await csvWriter.writeRecords(csvData);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to generate CSV report: ${error.message}`);
    }
  }

  async generateJSONReport(report, data) {
    try {
      const fileName = `report_${report._id}_${Date.now()}.json`;
      const filePath = path.join(this.reportsDir, fileName);

      const reportData = {
        metadata: {
          reportId: report._id,
          title: report.title,
          description: report.description,
          type: report.type,
          generatedAt: new Date(),
          dateRange: report.filters.dateRange,
          platforms: report.filters.platforms
        },
        data
      };

      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
      return filePath;
    } catch (error) {
      throw new Error(`Failed to generate JSON report: ${error.message}`);
    }
  }

  async addChartsToPage(pdfDoc, platformData, startY) {
    try {
      // Generate chart for each platform
      for (const [platform, data] of Object.entries(platformData)) {
        if (data.timeSeries && data.timeSeries.length > 0) {
          // Prepare chart data
          const chartData = this.prepareChartData(data.timeSeries);
          
          // Generate chart image
          const chartBuffer = await this.chartRenderer.renderToBuffer({
            type: 'line',
            data: chartData,
            options: {
              title: {
                display: true,
                text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Performance`
              },
              scales: {
                x: {
                  display: true,
                  title: {
                    display: true,
                    text: 'Date'
                  }
                },
                y: {
                  display: true,
                  title: {
                    display: true,
                    text: 'Value'
                  }
                }
              }
            }
          });

          // Embed chart in PDF (simplified - would need proper image embedding)
          // This is a placeholder for actual chart embedding logic
        }
      }
    } catch (error) {
      console.warn('Failed to add charts to PDF:', error.message);
    }
  }

  prepareChartData(timeSeries) {
    const labels = [...new Set(timeSeries.map(item => item._id.date))].sort();
    const metricTypes = [...new Set(timeSeries.map(item => item._id.metricType))];

    const datasets = metricTypes.map((metricType, index) => {
      const data = labels.map(date => {
        const item = timeSeries.find(ts => ts._id.date === date && ts._id.metricType === metricType);
        return item ? item.totalValue : 0;
      });

      return {
        label: metricType,
        data,
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
        fill: false
      };
    });

    return { labels, datasets };
  }

  async getReports(userId, page = 1, limit = 10, type = null) {
    try {
      const reports = await Report.getUserReports(userId, page, limit, type);
      const total = await Report.countDocuments({ 
        userId, 
        ...(type && { type }) 
      });

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }

  async getReport(reportId, userId) {
    try {
      const report = await Report.findOne({ _id: reportId, userId });
      if (!report) {
        throw new Error('Report not found');
      }
      return report;
    } catch (error) {
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  async downloadReport(reportId, userId) {
    try {
      const report = await this.getReport(reportId, userId);
      
      if (report.status !== 'completed') {
        throw new Error('Report is not ready for download');
      }

      if (!report.fileUrl) {
        throw new Error('Report file not found');
      }

      // Increment download count
      report.downloadCount += 1;
      await report.save();

      return {
        filePath: report.fileUrl,
        fileName: path.basename(report.fileUrl),
        mimeType: this.getMimeType(report.format),
        size: report.fileSize
      };
    } catch (error) {
      throw new Error(`Failed to download report: ${error.message}`);
    }
  }

  async shareReport(reportId, userId, email, accessLevel = 'view') {
    try {
      const report = await this.getReport(reportId, userId);
      
      // Check if already shared with this email
      const existingShare = report.sharedWith.find(share => share.email === email);
      if (existingShare) {
        existingShare.accessLevel = accessLevel;
        existingShare.sharedAt = new Date();
      } else {
        report.sharedWith.push({
          email,
          accessLevel,
          sharedAt: new Date()
        });
      }

      await report.save();
      return report;
    } catch (error) {
      throw new Error(`Failed to share report: ${error.message}`);
    }
  }

  async deleteReport(reportId, userId) {
    try {
      const report = await this.getReport(reportId, userId);
      
      // Delete file if exists
      if (report.fileUrl) {
        try {
          await fs.unlink(report.fileUrl);
        } catch (error) {
          console.warn('Failed to delete report file:', error.message);
        }
      }

      await Report.findByIdAndDelete(reportId);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  async processPendingReports() {
    try {
      const pendingReports = await Report.getPendingReports();
      console.log(`Processing ${pendingReports.length} pending reports`);

      for (const report of pendingReports) {
        try {
          await this.generateReport(report._id);
          console.log(`Successfully generated report ${report._id}`);
        } catch (error) {
          console.error(`Failed to generate report ${report._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Failed to process pending reports:', error.message);
    }
  }

  getMimeType(format) {
    const mimeTypes = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}

module.exports = new ReportService();
