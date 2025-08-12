const express = require('express');
const courseController = require('../controllers/course.controller');
const { verifyToken, isInstructor } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses with optional filtering
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by course title
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: instructorId
 *         schema:
 *           type: integer
 *         description: Filter by instructor ID
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by course level
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Filter by minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Filter by maximum price
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filter by published status (admin only)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of courses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of courses to skip
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', courseController.getAllCourses);



/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       404:
 *         description: Course not found
 *       403:
 *         description: Course not published
 *       500:
 *         description: Server error
 */
router.get('/:id', courseController.getCourseById);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
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
 *               - description
 *               - categoryId
 *               - price
 *               - level
 *               - durationHours
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               thumbnailUrl:
 *                 type: string
 *               price:
 *                 type: number
 *               discountPrice:
 *                 type: number
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               durationHours:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Course created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires instructor role
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, isInstructor, courseController.createCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
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
 *               categoryId:
 *                 type: integer
 *               thumbnailUrl:
 *                 type: string
 *               price:
 *                 type: number
 *               discountPrice:
 *                 type: number
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               durationHours:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires instructor role or ownership
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, courseController.updateCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires instructor role or ownership
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, courseController.deleteCourse);

/**
 * @swagger
 * /api/courses/featured:
 *   get:
 *     summary: Get featured courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of courses to return
 *     responses:
 *       200:
 *         description: Featured courses retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/featured', courseController.getFeaturedCourses);

/**
 * @swagger
 * /api/courses/instructor/{instructorId}:
 *   get:
 *     summary: Get courses by instructor
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: instructorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Instructor ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of courses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of courses to skip
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/instructor/:instructorId', courseController.getCoursesByInstructor);

/**
 * @swagger
 * /api/courses/category/{categoryId}:
 *   get:
 *     summary: Get courses by category
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of courses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of courses to skip
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/category/:categoryId', courseController.getCoursesByCategory);

module.exports = router;