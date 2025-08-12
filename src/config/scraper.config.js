module.exports = {
  // Scraping configuration
  scraping: {
    // Default interval for scraping (in days)
    defaultInterval: 15,
    
    // Maximum number of questions to scrape per source
    maxQuestionsPerSource: 50,
    
    // Timeout for HTTP requests (in milliseconds)
    requestTimeout: 30000,
    
    // Delay between requests to avoid being blocked (in milliseconds)
    requestDelay: 2000,
    
    // Maximum retries for failed requests
    maxRetries: 3,
    
    // User agent for web requests
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    
    // Puppeteer configuration
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      timeout: 60000
    }
  },
  
  // Cleanup configuration
  cleanup: {
    // Age threshold for cleaning old questions (in days)
    maxAge: 30,
    
    // Whether to keep at least one set of questions per subject
    keepMinimumQuestions: true,
    
    // Minimum number of questions to keep per subject
    minimumQuestionsPerSubject: 10
  },
  
  // Logging configuration
  logging: {
    // Log level (error, warn, info, debug)
    level: 'info',
    
    // Maximum log file size (in bytes)
    maxFileSize: 10 * 1024 * 1024, // 10MB
    
    // Maximum number of log files to keep
    maxFiles: 5,
    
    // Log directory
    directory: 'logs'
  },
  
  // Question sources configuration
  sources: [
    {
      name: 'embibe',
      url: 'https://www.embibe.com',
      enabled: true,
      subjects: ['physics', 'chemistry', 'mathematics'],
      selectors: {
        questionContainer: '.question-container',
        questionText: '.question-text',
        options: '.option',
        correctAnswer: '.correct-answer'
      }
    },
    {
      name: 'vedantu',
      url: 'https://www.vedantu.com',
      enabled: true,
      subjects: ['physics', 'chemistry', 'mathematics'],
      selectors: {
        questionContainer: '.mcq-question',
        questionText: '.question',
        options: '.option',
        correctAnswer: '.answer'
      }
    },
    {
      name: 'toppr',
      url: 'https://www.toppr.com',
      enabled: true,
      subjects: ['physics', 'chemistry', 'mathematics'],
      selectors: {
        questionContainer: '.question-block',
        questionText: '.question-content',
        options: '.choice',
        correctAnswer: '.correct'
      }
    }
  ],
  
  // Database configuration for scraped questions
  database: {
    // Default quiz title prefix for scraped questions
    quizTitlePrefix: 'JEE Practice Questions',
    
    // Default question type
    defaultQuestionType: 'multiple_choice',
    
    // Default points per question
    defaultPoints: 4,
    
    // Subject mapping
    subjectMapping: {
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'mathematics': 'Mathematics',
      'math': 'Mathematics'
    },
    
    // Difficulty mapping
    difficultyMapping: {
      'easy': 'Easy',
      'medium': 'Medium',
      'hard': 'Hard',
      'difficult': 'Hard'
    }
  },
  
  // Scheduler configuration
  scheduler: {
    // Timezone for cron jobs
    timezone: 'Asia/Kolkata',
    
    // Cron expression for scraping (every 15 days at 2:00 AM IST)
    scrapingCron: '0 2 */15 * *',
    
    // Cron expression for cleanup (daily at 3:00 AM IST)
    cleanupCron: '0 3 * * *',
    
    // Whether to run scraping immediately on startup (for testing)
    runOnStartup: false
  }
};