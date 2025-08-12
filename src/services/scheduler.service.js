const cron = require('node-cron');
const winston = require('winston');
const questionScraperService = require('./questionScraper.service');
const scraperConfig = require('../config/scraper.config');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'scheduler.log' }),
    new winston.transports.Console()
  ]
});

class SchedulerService {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Initialize all scheduled jobs
   */
  init() {
    logger.info('Initializing scheduler service...');
    
    // Schedule question scraping every 15 days at 2 AM
    this.scheduleQuestionScraping();
    
    // Schedule daily cleanup at 3 AM
    this.scheduleDailyCleanup();
    
    logger.info('All scheduled jobs initialized successfully');
  }

  /**
   * Initialize scheduler (alias for init method)
   */
  initializeScheduler() {
    return this.init();
  }

  /**
   * Schedule question scraping based on configuration
   */
  scheduleQuestionScraping() {
    const scrapingJob = cron.schedule(scraperConfig.scheduler.scrapingCron, async () => {
      logger.info('Starting scheduled question scraping...');
      
      try {
        await questionScraperService.scrapeAllQuestions();
        logger.info('Scheduled question scraping completed successfully');
      } catch (error) {
        logger.error(`Scheduled question scraping failed: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: scraperConfig.scheduler.timezone
    });

    this.jobs.set('questionScraping', scrapingJob);
    logger.info(`Question scraping job scheduled with pattern: ${scraperConfig.scheduler.scrapingCron} in timezone: ${scraperConfig.scheduler.timezone}`);
  }

  /**
   * Schedule daily cleanup of old questions based on configuration
   */
  scheduleDailyCleanup() {
    const cleanupJob = cron.schedule(scraperConfig.scheduler.cleanupCron, async () => {
      logger.info('Starting scheduled cleanup...');
      
      try {
        await questionScraperService.cleanOldQuestions();
        logger.info('Scheduled cleanup completed successfully');
      } catch (error) {
        logger.error(`Scheduled cleanup failed: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: scraperConfig.scheduler.timezone
    });

    this.jobs.set('dailyCleanup', cleanupJob);
    logger.info(`Daily cleanup job scheduled with pattern: ${scraperConfig.scheduler.cleanupCron} in timezone: ${scraperConfig.scheduler.timezone}`);
  }

  /**
   * Schedule immediate question scraping (for testing or manual trigger)
   */
  scheduleImmediateScraping() {
    logger.info('Scheduling immediate question scraping...');
    
    // Run in 10 seconds
    const immediateJob = cron.schedule('*/10 * * * * *', async () => {
      logger.info('Running immediate question scraping...');
      
      try {
        await questionScraperService.scrapeAllQuestions();
        logger.info('Immediate question scraping completed successfully');
        
        // Stop this job after running once
        immediateJob.stop();
        this.jobs.delete('immediateScraping');
      } catch (error) {
        logger.error(`Immediate question scraping failed: ${error.message}`);
        immediateJob.stop();
        this.jobs.delete('immediateScraping');
      }
    }, {
      scheduled: true
    });

    this.jobs.set('immediateScraping', immediateJob);
    return immediateJob;
  }

  /**
   * Get status of all scheduled jobs
   */
  getJobsStatus() {
    const status = {};
    
    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        running: job.running,
        scheduled: job.scheduled,
        destroyed: job.destroyed
      };
    }
    
    return status;
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      logger.info(`Job '${jobName}' stopped`);
      return true;
    }
    return false;
  }

  /**
   * Start a specific job
   */
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      logger.info(`Job '${jobName}' started`);
      return true;
    }
    return false;
  }

  /**
   * Stop all jobs
   */
  stopAllJobs() {
    for (const [jobName, job] of this.jobs) {
      job.stop();
      logger.info(`Job '${jobName}' stopped`);
    }
  }

  /**
   * Destroy all jobs
   */
  destroyAllJobs() {
    for (const [jobName, job] of this.jobs) {
      job.destroy();
      logger.info(`Job '${jobName}' destroyed`);
    }
    this.jobs.clear();
  }

  /**
   * Get next execution times for all jobs
   */
  getNextExecutionTimes() {
    const times = {};
    
    for (const [jobName, job] of this.jobs) {
      if (job.scheduled && !job.destroyed) {
        // Note: node-cron doesn't provide direct access to next execution time
        // This is a simplified representation
        times[jobName] = {
          status: 'scheduled',
          pattern: this.getJobPattern(jobName)
        };
      }
    }
    
    return times;
  }

  /**
   * Get cron pattern for a job
   */
  getJobPattern(jobName) {
    const patterns = {
      'questionScraping': '0 2 */15 * * (Every 15 days at 2:00 AM IST)',
      'dailyCleanup': '0 3 * * * (Daily at 3:00 AM IST)',
      'immediateScraping': '*/10 * * * * * (Every 10 seconds - temporary)'
    };
    
    return patterns[jobName] || 'Unknown pattern';
  }
}

module.exports = new SchedulerService();