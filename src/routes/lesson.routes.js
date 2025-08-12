const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lesson.controller');
const { verifyToken, isInstructor } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/lessons/module/{moduleId}:
 *   get:
 *     summary: Get all lessons for a module
 *     description: Retrieve all lessons for a specific module
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The module ID
 *     responses:
 *       200:
 *         description: A list of lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Module not found
 *       403:
 *         description: Course not published
 *       500:
 *         description: Server error
 */
router.get('/module/:moduleId', lessonController.getLessonsByModule);

/**
 * @swagger
 * /api/lessons/reorder/{moduleId}:
 *   put:
 *     summary: Reorder lessons
 *     description: Reorder lessons in a module (requires instructor of the course or admin role)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lessonOrder
 *             properties:
 *               lessonOrder:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of lesson IDs in the desired order
 *     responses:
 *       200:
 *         description: Lessons reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Server error
 */
router.put('/reorder/:moduleId', verifyToken, isInstructor, lessonController.reorderLessons);

/**
 * @swagger
 * /api/lessons/{lessonId}/progress:
 *   put:
 *     summary: Update lesson progress
 *     description: Update a user's progress for a specific lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [not-started, in-progress, completed]
 *                 description: Progress status
 *               progressPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Percentage of lesson completed
 *               lastPositionSeconds:
 *                 type: number
 *                 minimum: 0
 *                 description: Last position in the lesson (in seconds)
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Progress'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Course not published
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.put('/:lessonId/progress', verifyToken, lessonController.updateProgress);

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a new lesson
 *     description: Create a new lesson for a module (requires instructor or admin role)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleId
 *               - title
 *               - contentType
 *             properties:
 *               moduleId:
 *                 type: integer
 *                 description: The module ID
 *               title:
 *                 type: string
 *                 description: Lesson title
 *               contentType:
 *                 type: string
 *                 enum: [video, text, pdf, quiz]
 *                 description: Type of lesson content
 *               contentUrl:
 *                 type: string
 *                 description: URL to lesson content (for video, pdf)
 *               content:
 *                 type: string
 *                 description: Text content (for text lessons)
 *               durationMinutes:
 *                 type: number
 *                 description: Duration of the lesson in minutes
 *               position:
 *                 type: integer
 *                 description: Lesson position in the module (optional)
 *               isFree:
 *                 type: boolean
 *                 description: Whether the lesson is free to access
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, isInstructor, lessonController.createLesson);

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get lesson by ID
 *     description: Retrieve a specific lesson by its ID
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The lesson ID
 *     responses:
 *       200:
 *         description: Lesson details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Lesson'
 *       401:
 *         description: Authentication required for premium content
 *       404:
 *         description: Lesson not found
 *       403:
 *         description: Course not published
 *       500:
 *         description: Server error
 */
router.get('/:id', lessonController.getLessonById);

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     description: Update a lesson's details (requires instructor of the course or admin role)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Lesson title
 *               contentType:
 *                 type: string
 *                 enum: [video, text, pdf, quiz]
 *                 description: Type of lesson content
 *               contentUrl:
 *                 type: string
 *                 description: URL to lesson content (for video, pdf)
 *               content:
 *                 type: string
 *                 description: Text content (for text lessons)
 *               durationMinutes:
 *                 type: number
 *                 description: Duration of the lesson in minutes
 *               position:
 *                 type: integer
 *                 description: Lesson position in the module
 *               isFree:
 *                 type: boolean
 *                 description: Whether the lesson is free to access
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, isInstructor, lessonController.updateLesson);

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     description: Delete a lesson (requires instructor of the course or admin role)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The lesson ID
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, isInstructor, lessonController.deleteLesson);

module.exports = router;