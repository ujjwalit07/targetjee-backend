const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraper.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     ScrapingStatus:
 *       type: object
 *       properties:
 *         scheduledJobs:
 *           type: object
 *           description: Status of scheduled jobs
 *         nextExecutions:
 *           type: object
 *           description: Next execution times for jobs
 *         scrapingInterval:
 *           type: string
 *           description: Current scraping interval
 *         cleanupInterval:
 *           type: string
 *           description: Current cleanup interval
 *         timezone:
 *           type: string
 *           description: Server timezone
 *         lastUpdate:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/scraper/trigger:
 *   post:
 *     summary: Manually trigger question scraping
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scraping started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/trigger', verifyToken, isAdmin, scraperController.triggerScraping);

/**
 * @swagger
 * /api/scraper/status:
 *   get:
 *     summary: Get scraping status and scheduler information
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scraping status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScrapingStatus'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/status', verifyToken, isAdmin, scraperController.getScrapingStatus);

/**
 * @swagger
 * /api/scraper/configure:
 *   post:
 *     summary: Configure scraping settings
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableAutoScraping:
 *                 type: boolean
 *                 description: Enable or disable automatic scraping
 *               scrapingInterval:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 30
 *                 description: Scraping interval in days
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/configure', verifyToken, isAdmin, scraperController.configureScrapingSettings);

/**
 * @swagger
 * /api/scraper/stop:
 *   post:
 *     summary: Stop scheduled scraping
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduled scraping stopped successfully
 *       404:
 *         description: Scraping job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/stop', verifyToken, isAdmin, scraperController.stopScheduledScraping);

/**
 * @swagger
 * /api/scraper/start:
 *   post:
 *     summary: Start scheduled scraping
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduled scraping started successfully
 *       404:
 *         description: Scraping job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/start', verifyToken, isAdmin, scraperController.startScheduledScraping);

/**
 * @swagger
 * /api/scraper/cleanup:
 *   post:
 *     summary: Manually clean old questions
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Old questions cleaned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/cleanup', verifyToken, isAdmin, scraperController.cleanOldQuestions);

/**
 * @swagger
 * /api/scraper/logs:
 *   get:
 *     summary: Get scraping logs
 *     tags: [Question Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Log files content
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/logs', verifyToken, isAdmin, scraperController.getScrapingLogs);

module.exports = router;