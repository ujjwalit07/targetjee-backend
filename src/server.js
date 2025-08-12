const express = require('express');
const cors = require('cors');
// const morgan = require('morgan');  // Remove this line
const { sequelize } = require('./models');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');
require('dotenv').config();
const winston = require('winston'); // Add this line

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const courseRoutes = require('./routes/course.routes');
const categoryRoutes = require('./routes/category.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const lessonRoutes = require('./routes/lesson.routes');
const reviewRoutes = require('./routes/review.routes');
const quizRoutes = require('./routes/quiz.routes');
const mocktestRoutes = require('./routes/mocktest.routes');
const uploadRoutes = require('./routes/upload.routes');
const scraperRoutes = require('./routes/scraper.routes');

// Import services
const schedulerService = require('./services/scheduler.service');

// Initialize express app
const app = express();

// Middleware
const corsOptions = {
  origin: ['https://targetjee.com', 'https://www.targetjee.com', 'http://targetjee.com', 'http://www.targetjee.com'], // Multiple allowed origins
  methods: 'GET, POST, PUT, DELETE, OPTIONS', // Allowed HTTP methods
  allowedHeaders: 'Content-Type, Authorization', // Allowed headers
  credentials: true // Allow credentials
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev')); // Remove this line

// Configure Winston
const logger = winston.createLogger({
  level: 'info', // Set the logging level (e.g., info, warn, error)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }), // Log errors to a file
    new winston.transports.File({ filename: 'combined.log' }), // Log all messages to a file
    new winston.transports.Console(), // Log to the console
  ],
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TargetJEE API',
      version: '1.0.0',
      description: 'API documentation for TargetJEE platform',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/mocktests', mocktestRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/scraper', scraperRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to TargetJEE API' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'TargetJEE API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack); // Log the error using Winston
  res.status(500).json({
    message: err.message || 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Start server (with graceful database handling)
const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`); // Log server start using Winston
    console.log(`Server running on port ${PORT}`);
    
    // Initialize scheduler after server starts
    try {
      schedulerService.initializeScheduler();
      logger.info('Question scraping scheduler initialized successfully');
      console.log('Question scraping scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      console.error('Failed to initialize scheduler:', error);
    }
  });
};

// Try to sync database, but start server regardless
sequelize
  .sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => {
    logger.info('Database connected and synchronized successfully');
    console.log('Database connected and synchronized successfully');
    startServer();
  })
  .catch((err) => {
    logger.error('Unable to connect to the database:', err); // Log database connection errors
    console.error('Unable to connect to the database:', err);
    console.log('Starting server without database connection...');
    startServer(); // Start server anyway for testing purposes
  });

module.exports = app; // For testing purposes
