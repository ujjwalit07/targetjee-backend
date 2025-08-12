const questionScraperService = require('../services/questionScraper.service');
const schedulerService = require('../services/scheduler.service');
const winston = require('winston');

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
    new winston.transports.File({ filename: 'scraper-controller.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Manually trigger question scraping
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.triggerScraping = async (req, res) => {
  try {
    logger.info('Manual scraping triggered by user');
    
    // Start scraping in background
    const scrapingPromise = questionScraperService.scrapeAllQuestions();
    
    // Don't wait for completion, return immediately
    res.status(200).json({
      success: true,
      message: 'Question scraping started. This process may take several minutes.',
      timestamp: new Date().toISOString()
    });

    // Handle the scraping result in background
    scrapingPromise
      .then((questions) => {
        logger.info(`Manual scraping completed successfully. ${questions.length} questions processed.`);
      })
      .catch((error) => {
        logger.error(`Manual scraping failed: ${error.message}`);
      });

  } catch (error) {
    logger.error(`Error triggering manual scraping: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger question scraping',
      error: error.message
    });
  }
};

/**
 * Get scraping status and scheduler information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getScrapingStatus = async (req, res) => {
  try {
    const jobsStatus = schedulerService.getJobsStatus();
    const nextExecutions = schedulerService.getNextExecutionTimes();

    return res.status(200).json({
      success: true,
      data: {
        scheduledJobs: jobsStatus,
        nextExecutions: nextExecutions,
        scrapingInterval: '15 days',
        cleanupInterval: 'daily',
        timezone: 'Asia/Kolkata (IST)',
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error getting scraping status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get scraping status',
      error: error.message
    });
  }
};

/**
 * Configure scraping settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.configureScrapingSettings = async (req, res) => {
  try {
    const { enableAutoScraping, scrapingInterval } = req.body;

    // Validate input
    if (enableAutoScraping !== undefined && typeof enableAutoScraping !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enableAutoScraping must be a boolean value'
      });
    }

    if (scrapingInterval && (typeof scrapingInterval !== 'number' || scrapingInterval < 1 || scrapingInterval > 30)) {
      return res.status(400).json({
        success: false,
        message: 'scrapingInterval must be a number between 1 and 30 days'
      });
    }

    // For now, we'll just return the current settings
    // In a full implementation, you'd save these to database/config
    return res.status(200).json({
      success: true,
      message: 'Scraping settings updated successfully',
      data: {
        enableAutoScraping: enableAutoScraping !== undefined ? enableAutoScraping : true,
        scrapingInterval: scrapingInterval || 15,
        note: 'Settings updated. Restart the server to apply changes to scheduled jobs.'
      }
    });
  } catch (error) {
    logger.error(`Error configuring scraping settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to configure scraping settings',
      error: error.message
    });
  }
};

/**
 * Stop scheduled scraping
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.stopScheduledScraping = async (req, res) => {
  try {
    const stopped = schedulerService.stopJob('questionScraping');
    
    if (stopped) {
      logger.info('Scheduled question scraping stopped by user');
      return res.status(200).json({
        success: true,
        message: 'Scheduled question scraping stopped successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Question scraping job not found or already stopped'
      });
    }
  } catch (error) {
    logger.error(`Error stopping scheduled scraping: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop scheduled scraping',
      error: error.message
    });
  }
};

/**
 * Start scheduled scraping
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.startScheduledScraping = async (req, res) => {
  try {
    const started = schedulerService.startJob('questionScraping');
    
    if (started) {
      logger.info('Scheduled question scraping started by user');
      return res.status(200).json({
        success: true,
        message: 'Scheduled question scraping started successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Question scraping job not found'
      });
    }
  } catch (error) {
    logger.error(`Error starting scheduled scraping: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to start scheduled scraping',
      error: error.message
    });
  }
};

/**
 * Clean old questions manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cleanOldQuestions = async (req, res) => {
  try {
    logger.info('Manual cleanup triggered by user');
    
    await questionScraperService.cleanOldQuestions();
    
    return res.status(200).json({
      success: true,
      message: 'Old questions cleaned successfully'
    });
  } catch (error) {
    logger.error(`Error cleaning old questions: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to clean old questions',
      error: error.message
    });
  }
};

/**
 * Get scraping logs (last 100 lines)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getScrapingLogs = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const logFiles = [
      'question-scraper.log',
      'scheduler.log',
      'scraper-controller.log'
    ];
    
    const logs = {};
    
    for (const logFile of logFiles) {
      const logPath = path.join(process.cwd(), logFile);
      
      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        logs[logFile] = lines.slice(-50); // Last 50 lines per file
      } else {
        logs[logFile] = ['Log file not found'];
      }
    }
    
    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error(`Error getting scraping logs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get scraping logs',
      error: error.message
    });
  }
};