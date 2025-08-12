const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/module.controller');
const { verifyToken, isInstructor } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/modules/course/{courseId}:
 *   get:
 *     summary: Get all modules for a course
 *     description: Retrieve all modules for a specific course with their lessons
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The course ID
 *     responses:
 *       200:
 *         description: A list of modules
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
 *                     $ref: '#/components/schemas/Module'
 *       404:
 *         description: Course not found
 *       403:
 *         description: Course not published
 *       500:
 *         description: Server error
 */
router.get('/course/:courseId', moduleController.getModulesByCourse);

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Get module by ID
 *     description: Retrieve a specific module by its ID with associated lessons
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The module ID
 *     responses:
 *       200:
 *         description: Module details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Module'
 *       404:
 *         description: Module not found
 *       403:
 *         description: Course not published
 *       500:
 *         description: Server error
 */
router.get('/:id', moduleController.getModuleById);

/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Create a new module
 *     description: Create a new module for a course (requires instructor or admin role)
 *     tags: [Modules]
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
 *               - title
 *             properties:
 *               courseId:
 *                 type: integer
 *                 description: The course ID
 *               title:
 *                 type: string
 *                 description: Module title
 *               description:
 *                 type: string
 *                 description: Module description
 *               position:
 *                 type: integer
 *                 description: Module position in the course (optional)
 *     responses:
 *       201:
 *         description: Module created successfully
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
 *                   $ref: '#/components/schemas/Module'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, isInstructor, moduleController.createModule);

/**
 * @swagger
 * /api/modules/{id}:
 *   put:
 *     summary: Update a module
 *     description: Update a module's details (requires instructor of the course or admin role)
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               title:
 *                 type: string
 *                 description: Module title
 *               description:
 *                 type: string
 *                 description: Module description
 *               position:
 *                 type: integer
 *                 description: Module position in the course
 *     responses:
 *       200:
 *         description: Module updated successfully
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
 *                   $ref: '#/components/schemas/Module'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, isInstructor, moduleController.updateModule);

/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     description: Delete a module (requires instructor of the course or admin role)
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The module ID
 *     responses:
 *       200:
 *         description: Module deleted successfully
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
 *         description: Cannot delete module with lessons
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, isInstructor, moduleController.deleteModule);

/**
 * @swagger
 * /api/modules/reorder/{courseId}:
 *   put:
 *     summary: Reorder modules
 *     description: Reorder modules in a course (requires instructor of the course or admin role)
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleOrder
 *             properties:
 *               moduleOrder:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of module IDs in the desired order
 *     responses:
 *       200:
 *         description: Modules reordered successfully
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
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.put('/reorder/:courseId', verifyToken, isInstructor, moduleController.reorderModules);



module.exports = router;