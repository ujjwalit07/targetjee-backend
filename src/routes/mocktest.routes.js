const express = require('express');
const router = express.Router();
const mocktestController = require('../controllers/mocktest.controller');
const { verifyToken, isInstructor, isAdmin } = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/optional-auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     MockTest:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the mock test
 *         title:
 *           type: string
 *           description: The title of the mock test
 *         description:
 *           type: string
 *           description: The description of the mock test
 *         timeLimit:
 *           type: integer
 *           description: Time limit in minutes
 *         passingScore:
 *           type: integer
 *           description: Minimum percentage required to pass
 *         category:
 *           type: string
 *           description: The category of the mock test (e.g., Physics, Chemistry, Mathematics)
 *         difficulty:
 *           type: string
 *           description: The difficulty level of the mock test (e.g., Easy, Medium, Hard)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the mock test was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the mock test was last updated
 */

/**
 * @swagger
 * /api/mocktests:
 *   get:
 *     summary: Get all mock tests with optional filtering
 *     tags: [Mock Tests]
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title (partial match)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *         description: Filter by difficulty level
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of mock tests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     mockTests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MockTest'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
router.get('/', mocktestController.getAllMockTests);

/**
 * @swagger
 * /api/mocktests/{id}:
 *   get:
 *     summary: Get a mock test by ID
 *     tags: [Mock Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The mock test ID
 *     responses:
 *       200:
 *         description: Mock test details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MockTest'
 *       404:
 *         description: Mock test not found
 */
router.get('/:id', mocktestController.getMockTestById);

/**
 * @swagger
 * /api/mocktests:
 *   post:
 *     summary: Create a new mock test
 *     tags: [Mock Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               timeLimit:
 *                 type: integer
 *               passingScore:
 *                 type: integer
 *               category:
 *                 type: string
 *               difficulty:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionText
 *                     - questionType
 *                     - answers
 *                   properties:
 *                     questionText:
 *                       type: string
 *                     questionType:
 *                       type: string
 *                       enum: [multiple_choice, single_choice, true_false, fill_blank]
 *                     points:
 *                       type: integer
 *                     explanation:
 *                       type: string
 *                     answers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - answerText
 *                           - isCorrect
 *                         properties:
 *                           answerText:
 *                             type: string
 *                           isCorrect:
 *                             type: boolean
 *                           explanation:
 *                             type: string
 *     responses:
 *       201:
 *         description: Mock test created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, isInstructor, mocktestController.createMockTest);

/**
 * @swagger
 * /api/mocktests/{id}:
 *   put:
 *     summary: Update a mock test
 *     tags: [Mock Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The mock test ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               timeLimit:
 *                 type: integer
 *               passingScore:
 *                 type: integer
 *               category:
 *                 type: string
 *               difficulty:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mock test updated successfully
 *       404:
 *         description: Mock test not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', verifyToken, isInstructor, mocktestController.updateMockTest);

/**
 * @swagger
 * /api/mocktests/{id}:
 *   delete:
 *     summary: Delete a mock test
 *     tags: [Mock Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The mock test ID
 *     responses:
 *       200:
 *         description: Mock test deleted successfully
 *       400:
 *         description: Cannot delete mock test with existing attempts
 *       404:
 *         description: Mock test not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', verifyToken, isInstructor, mocktestController.deleteMockTest);

/**
 * @swagger
 * /api/mocktests/attempts/submit:
 *   post:
 *     summary: Submit a mock test attempt (works for both logged-in and anonymous users)
 *     tags: [Mock Test Attempts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quizId
 *               - startedAt
 *               - answers
 *             properties:
 *               quizId:
 *                 type: integer
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                     answerId:
 *                       type: integer
 *                     textAnswer:
 *                       type: string
 *     responses:
 *       201:
 *         description: Mock test attempt submitted successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Mock test not found
 */
router.post('/attempts/submit', optionalAuth, mocktestController.submitMockTestAttempt);

/**
 * @swagger
 * /api/mocktests/attempts/user:
 *   get:
 *     summary: Get mock test attempts for the logged-in user
 *     tags: [Mock Test Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: quizId
 *         schema:
 *           type: integer
 *         description: Filter by quiz ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of mock test attempts
 *       401:
 *         description: Unauthorized
 */
router.get('/attempts/user', verifyToken, mocktestController.getUserMockTestAttempts);

/**
 * @swagger
 * /api/mocktests/attempts/{id}:
 *   get:
 *     summary: Get a specific mock test attempt
 *     tags: [Mock Test Attempts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The attempt ID
 *     responses:
 *       200:
 *         description: Mock test attempt details
 *       404:
 *         description: Mock test attempt not found
 *       403:
 *         description: Not authorized to view this attempt
 */
router.get('/attempts/:id', optionalAuth, mocktestController.getMockTestAttempt);

/**
 * @swagger
 * /api/mocktests/{id}/statistics:
 *   get:
 *     summary: Get mock test statistics
 *     tags: [Mock Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The mock test ID
 *     responses:
 *       200:
 *         description: Mock test statistics
 *       404:
 *         description: Mock test not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/statistics', verifyToken, isInstructor, mocktestController.getMockTestStatistics);

module.exports = router;