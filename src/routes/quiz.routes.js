const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { verifyToken, isInstructor, isAdmin } = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/optional-auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Quiz:
 *       type: object
 *       required:
 *         - lessonId
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the quiz
 *         lessonId:
 *           type: integer
 *           description: The ID of the lesson this quiz belongs to
 *         title:
 *           type: string
 *           description: The title of the quiz
 *         description:
 *           type: string
 *           description: The description of the quiz
 *         timeLimit:
 *           type: integer
 *           description: Time limit in minutes
 *         passingScore:
 *           type: integer
 *           description: Minimum percentage required to pass
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the quiz was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the quiz was last updated
 *     QuizQuestion:
 *       type: object
 *       required:
 *         - quizId
 *         - questionText
 *         - questionType
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the question
 *         quizId:
 *           type: integer
 *           description: The ID of the quiz this question belongs to
 *         questionText:
 *           type: string
 *           description: The text of the question
 *         questionType:
 *           type: string
 *           enum: [multiple_choice, single_choice, true_false, fill_blank]
 *           description: The type of question
 *         points:
 *           type: integer
 *           description: Points awarded for correct answer
 *         explanation:
 *           type: string
 *           description: Explanation shown after answering
 *         position:
 *           type: integer
 *           description: The position of the question in the quiz
 *     QuizAnswer:
 *       type: object
 *       required:
 *         - questionId
 *         - answerText
 *         - isCorrect
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the answer
 *         questionId:
 *           type: integer
 *           description: The ID of the question this answer belongs to
 *         answerText:
 *           type: string
 *           description: The text of the answer
 *         isCorrect:
 *           type: boolean
 *           description: Whether this is the correct answer
 *         explanation:
 *           type: string
 *           description: Explanation for this specific answer
 *     QuizAttempt:
 *       type: object
 *       required:
 *         - quizId
 *         - startedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the attempt
 *         userId:
 *           type: integer
 *           description: The ID of the user who made the attempt (can be null for anonymous users)
 *         quizId:
 *           type: integer
 *           description: The ID of the quiz
 *         score:
 *           type: integer
 *           description: Total score achieved
 *         maxScore:
 *           type: integer
 *           description: Maximum possible score
 *         percentageScore:
 *           type: number
 *           format: float
 *           description: Percentage score
 *         passed:
 *           type: boolean
 *           description: Whether the user passed the quiz
 *         startedAt:
 *           type: string
 *           format: date-time
 *           description: When the attempt was started
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: When the attempt was completed
 *         timeSpentSeconds:
 *           type: integer
 *           description: Time spent in seconds
 */

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Get all quizzes with optional filtering
 *     tags: [Quizzes]
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title (partial match)
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: integer
 *         description: Filter by lesson ID
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
 *         description: A list of quizzes
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
 *                     quizzes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Quiz'
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
router.get('/', quizController.getAllQuizzes);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get a quiz by ID
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The quiz ID
 *     responses:
 *       200:
 *         description: Quiz details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: Quiz not found
 */
router.get('/:id', quizController.getQuizById);

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create a new quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lessonId
 *               - title
 *               - questions
 *             properties:
 *               lessonId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               timeLimit:
 *                 type: integer
 *               passingScore:
 *                 type: integer
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
 *         description: Quiz created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, isInstructor, quizController.createQuiz);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   put:
 *     summary: Update a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The quiz ID
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
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       404:
 *         description: Quiz not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', verifyToken, isInstructor, quizController.updateQuiz);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   delete:
 *     summary: Delete a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The quiz ID
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *       400:
 *         description: Cannot delete quiz with existing attempts
 *       404:
 *         description: Quiz not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', verifyToken, isInstructor, quizController.deleteQuiz);

/**
 * @swagger
 * /api/quizzes/attempts/submit:
 *   post:
 *     summary: Submit a quiz attempt (works for both logged-in and anonymous users)
 *     tags: [Quiz Attempts]
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
 *         description: Quiz attempt submitted successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Quiz not found
 */
router.post('/attempts/submit', optionalAuth, quizController.submitQuizAttempt);

/**
 * @swagger
 * /api/quizzes/attempts/user:
 *   get:
 *     summary: Get quiz attempts for the logged-in user
 *     tags: [Quiz Attempts]
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
 *         description: A list of quiz attempts
 *       401:
 *         description: Unauthorized
 */
router.get('/attempts/user', verifyToken, quizController.getUserQuizAttempts);

/**
 * @swagger
 * /api/quizzes/attempts/{id}:
 *   get:
 *     summary: Get a specific quiz attempt
 *     tags: [Quiz Attempts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The attempt ID
 *     responses:
 *       200:
 *         description: Quiz attempt details
 *       404:
 *         description: Quiz attempt not found
 *       403:
 *         description: Not authorized to view this attempt
 */
router.get('/attempts/:id', optionalAuth, quizController.getQuizAttempt);

/**
 * @swagger
 * /api/quizzes/{id}/statistics:
 *   get:
 *     summary: Get quiz statistics
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The quiz ID
 *     responses:
 *       200:
 *         description: Quiz statistics
 *       404:
 *         description: Quiz not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/statistics', verifyToken, isInstructor, quizController.getQuizStatistics);

module.exports = router;