const cron = require('node-cron');
const reportService = require('../services/report.service');
const Report = require('../models/report.model');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.initializeJobs();
  }

  initializeJobs() {
    // Process pending reports every 5 minutes
    this.scheduleJob('process-pending-reports', '*/5 * * * *', async () => {
      try {
        await reportService.processPendingReports();
      } catch (error) {
        console.error('Failed to process pending reports:', error);
      }
    });

    // Process recurring reports every hour
    this.scheduleJob('process-recurring-reports', '0 * * * *', async () => {
      try {
        await this.processRecurringReports();
      } catch (error) {
        console.error('Failed to process recurring reports:', error);
      }
    });

    // Cleanup old report files daily at 2 AM
    this.scheduleJob('cleanup-old-reports', '0 2 * * *', async () => {
      try {
        await this.cleanupOldReports();
      } catch (error) {
        console.error('Failed to cleanup old reports:', error);
      }
    });

    // Update report schedules daily at 1 AM
    this.scheduleJob('update-report-schedules', '0 1 * * *', async () => {
      try {
        await this.updateRecurringReportSchedules();
      } catch (error) {
        console.error('Failed to update report schedules:', error);
      }
    });

    console.log('Cron jobs initialized successfully');
  }

  scheduleJob(name, schedule, task) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
    }

    const job = cron.schedule(schedule, task, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set(name, job);
    console.log(`Scheduled job: ${name} with pattern: ${schedule}`);
  }

  async processRecurringReports() {
    try {
      const now = new Date();
      
      // Find recurring reports that need to be generated
      const dueReports = await Report.find({
        isRecurring: true,
        status: { $ne: 'processing' },
        nextRunDate: { $lte: now }
      });

      console.log(`Found ${dueReports.length} recurring reports due for generation`);

      for (const report of dueReports) {
        try {
          // Create a new report instance for the current run
          const newReport = new Report({
            userId: report.userId,
            title: `${report.title} - ${new Date().toISOString().split('T')[0]}`,
            description: report.description,
            type: report.type,
            format: report.format,
            status: 'pending',
            scheduledFor: new Date(),
            isRecurring: false, // This is a generated instance, not the template
            filters: report.filters,
            template: report.template
          });

          await newReport.save();

          // Generate the report
          await reportService.generateReport(newReport._id);

          // Update the original report's next run date
          report.nextRunDate = report.calculateNextRunDate();
          await report.save();

          console.log(`Generated recurring report: ${newReport._id} for template: ${report._id}`);
        } catch (error) {
          console.error(`Failed to process recurring report ${report._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process recurring reports:', error);
    }
  }

  async cleanupOldReports() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Delete completed reports older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const oldReports = await Report.find({
        status: 'completed',
        createdAt: { $lt: cutoffDate }
      });

      console.log(`Found ${oldReports.length} old reports to cleanup`);

      for (const report of oldReports) {
        try {
          // Delete the file if it exists
          if (report.fileUrl) {
            try {
              await fs.unlink(report.fileUrl);
              console.log(`Deleted file: ${report.fileUrl}`);
            } catch (fileError) {
              console.warn(`Failed to delete file ${report.fileUrl}:`, fileError.message);
            }
          }

          // Delete the report record
          await Report.findByIdAndDelete(report._id);
          console.log(`Deleted report record: ${report._id}`);
        } catch (error) {
          console.error(`Failed to cleanup report ${report._id}:`, error);
        }
      }

      // Also cleanup failed reports older than 7 days
      const failedCutoffDate = new Date();
      failedCutoffDate.setDate(failedCutoffDate.getDate() - 7);

      const failedReports = await Report.find({
        status: 'failed',
        createdAt: { $lt: failedCutoffDate }
      });

      for (const report of failedReports) {
        await Report.findByIdAndDelete(report._id);
      }

      console.log(`Cleaned up ${failedReports.length} failed reports`);
    } catch (error) {
      console.error('Failed to cleanup old reports:', error);
    }
  }

  async updateRecurringReportSchedules() {
    try {
      // Find all recurring reports without a next run date
      const reportsToUpdate = await Report.find({
        isRecurring: true,
        $or: [
          { nextRunDate: { $exists: false } },
          { nextRunDate: null }
        ]
      });

      console.log(`Updating schedules for ${reportsToUpdate.length} recurring reports`);

      for (const report of reportsToUpdate) {
        try {
          report.nextRunDate = report.calculateNextRunDate();
          await report.save();
          console.log(`Updated next run date for report ${report._id}: ${report.nextRunDate}`);
        } catch (error) {
          console.error(`Failed to update schedule for report ${report._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to update recurring report schedules:', error);
    }
  }

  // Method to manually trigger a job
  async triggerJob(jobName) {
    try {
      switch (jobName) {
        case 'process-pending-reports':
          await reportService.processPendingReports();
          break;
        case 'process-recurring-reports':
          await this.processRecurringReports();
          break;
        case 'cleanup-old-reports':
          await this.cleanupOldReports();
          break;
        case 'update-report-schedules':
          await this.updateRecurringReportSchedules();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
      console.log(`Manually triggered job: ${jobName}`);
    } catch (error) {
      console.error(`Failed to trigger job ${jobName}:`, error);
      throw error;
    }
  }

  // Get job status
  getJobStatus(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      return { exists: false };
    }

    return {
      exists: true,
      running: job.running,
      scheduled: job.scheduled
    };
  }

  // List all jobs
  listJobs() {
    const jobList = [];
    for (const [name, job] of this.jobs.entries()) {
      jobList.push({
        name,
        running: job.running,
        scheduled: job.scheduled
      });
    }
    return jobList;
  }

  // Stop a specific job
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      console.log(`Stopped job: ${jobName}`);
      return true;
    }
    return false;
  }

  // Start a specific job
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`Started job: ${jobName}`);
      return true;
    }
    return false;
  }

  // Stop all jobs
  stopAllJobs() {
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`Stopped job: ${name}`);
    }
  }

  // Start all jobs
  startAllJobs() {
    for (const [name, job] of this.jobs.entries()) {
      job.start();
      console.log(`Started job: ${name}`);
    }
  }
}

module.exports = new CronService();
