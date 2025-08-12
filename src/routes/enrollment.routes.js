const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { verifyToken, isInstructor, isAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/enrollments/user:
 *   get:
 *     summary: Get all enrollments for the current user
 *     description: Retrieve all courses that the current user is enrolled in
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of enrollments
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
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/user', verifyToken, enrollmentController.getUserEnrollments);

/**
 * @swagger
 * /api/enrollments/course/{courseId}:
 *   get:
 *     summary: Get all enrollments for a course
 *     description: Retrieve all users enrolled in a specific course (requires instructor of the course or admin role)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The course ID
 *     responses:
 *       200:
 *         description: A list of enrollments
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
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.get('/course/:courseId', verifyToken, isInstructor, enrollmentController.getCourseEnrollments);

/**
 * @swagger
 * /api/enrollments/stats/{courseId}:
 *   get:
 *     summary: Get enrollment statistics for a course
 *     description: Retrieve enrollment statistics for a specific course (requires instructor of the course or admin role)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The course ID
 *     responses:
 *       200:
 *         description: Enrollment statistics
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
 *                     totalEnrollments:
 *                       type: integer
 *                     completedEnrollments:
 *                       type: integer
 *                     completionRate:
 *                       type: number
 *                     enrollmentsByMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           count:
 *                             type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.get('/stats/:courseId', verifyToken, isInstructor, enrollmentController.getEnrollmentStats);

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Create a new enrollment
 *     description: Enroll the current user in a course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: integer
 *                 description: The course ID
 *     responses:
 *       201:
 *         description: Enrollment created successfully
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
 *                   $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Already enrolled or course not published
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, enrollmentController.createEnrollment);

/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     summary: Get enrollment by ID
 *     description: Retrieve a specific enrollment by its ID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', verifyToken, enrollmentController.getEnrollmentById);

/**
 * @swagger
 * /api/enrollments/{id}/complete:
 *   put:
 *     summary: Mark a course as completed
 *     description: Mark a course enrollment as completed
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The enrollment ID
 *     responses:
 *       200:
 *         description: Course marked as completed
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
 *                   $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Server error
 */
router.put('/:id/complete', verifyToken, enrollmentController.markCourseCompleted);

module.exports = router;