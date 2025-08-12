const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { uploadQuestionFile } = require('../middleware/upload.middleware');
const { verifyToken, isInstructor, isAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/uploads/questions:
 *   post:
 *     summary: Upload a question file (docx or pdf) to create a mock test
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - questionFile
 *               - title
 *             properties:
 *               questionFile:
 *                 type: string
 *                 format: binary
 *                 description: The question file (docx or pdf)
 *               title:
 *                 type: string
 *                 description: The title of the mock test
 *               description:
 *                 type: string
 *                 description: The description of the mock test
 *               timeLimit:
 *                 type: integer
 *                 description: Time limit in minutes
 *               passingScore:
 *                 type: integer
 *                 description: Minimum percentage required to pass
 *               category:
 *                 type: string
 *                 description: The category of the mock test (e.g., Physics, Chemistry, Mathematics)
 *               difficulty:
 *                 type: string
 *                 description: The difficulty level of the mock test (e.g., Easy, Medium, Hard)
 *     responses:
 *       201:
 *         description: File uploaded and mock test created successfully
 *       400:
 *         description: Invalid input or file type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires instructor or admin role
 */
router.post('/questions', verifyToken, isInstructor, uploadQuestionFile, uploadController.uploadQuestionFile);

/**
 * @swagger
 * /api/uploads/questions:
 *   get:
 *     summary: Get a list of uploaded question files
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of uploaded files
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires instructor or admin role
 */
router.get('/questions', verifyToken, isInstructor, uploadController.getUploadedFiles);

/**
 * @swagger
 * /api/uploads/questions/{fileName}:
 *   delete:
 *     summary: Delete an uploaded question file
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         schema:
 *           type: string
 *         required: true
 *         description: The file name to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires instructor or admin role
 *       404:
 *         description: File not found
 */
router.delete('/questions/:fileName', verifyToken, isInstructor, uploadController.deleteUploadedFile);

module.exports = router;