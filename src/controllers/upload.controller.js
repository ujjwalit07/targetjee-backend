const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { Quiz, QuizQuestion, QuizAnswer } = require('../models');
const { sequelize } = require('../models');

/**
 * Upload a question file (docx or pdf) and parse it to create a mock test
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadQuestionFile = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get file details
    const { originalname, filename, path: filePath, mimetype } = req.file;
    
    // Get mock test details from request body
    const { title, description, timeLimit, passingScore, category, difficulty } = req.body;
    
    // Validate required fields
    if (!title) {
      await transaction.rollback();
      // Delete the uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Missing required field: title'
      });
    }
    
    // Parse the file to extract questions based on file type
    let extractedContent = '';
    
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Parse DOCX file
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      extractedContent = result.value;
    } else if (mimetype === 'application/pdf') {
      // Parse PDF file
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      extractedContent = data.text;
    } else {
      await transaction.rollback();
      // Delete the uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type'
      });
    }
    
    // Create mock test (with lessonId set to null)
    const mockTest = await Quiz.create({
      lessonId: null, // This indicates it's a mock test, not a lesson quiz
      title,
      description,
      timeLimit: timeLimit ? parseInt(timeLimit) : 60, // Default to 60 minutes
      passingScore: passingScore ? parseInt(passingScore) : 70, // Default to 70%
      category,
      difficulty
    }, { transaction });
    
    // Simple parsing logic - this should be enhanced for production use
    // This is a basic implementation that assumes a specific format:
    // 1. Questions start with "Q:" or "Question:"
    // 2. Answers start with "A:" or "Answer:" or are preceded by A), B), C), D)
    // 3. Correct answers are marked with "*" or "(correct)"
    
    const lines = extractedContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentQuestion = null;
    let currentAnswers = [];
    let position = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a new question
      if (line.match(/^(Q|Question)\s*\d*\s*[:.-]\s*/i)) {
        // Save previous question if exists
        if (currentQuestion && currentAnswers.length > 0) {
          await saveQuestion(mockTest.id, currentQuestion, currentAnswers, position++, transaction);
          currentAnswers = [];
        }
        
        // Extract question text
        const questionText = line.replace(/^(Q|Question)\s*\d*\s*[:.-]\s*/i, '').trim();
        currentQuestion = questionText;
      }
      // Check if this is an answer option
      else if (line.match(/^([A-D]\)|[A-D]\.\s|A:|Answer:)/i)) {
        const isCorrect = line.includes('*') || line.toLowerCase().includes('(correct)');
        const answerText = line
          .replace(/^([A-D]\)|[A-D]\.\s|A:|Answer:)/i, '')
          .replace(/\*|\(correct\)/i, '')
          .trim();
        
        if (answerText) {
          currentAnswers.push({
            answerText,
            isCorrect
          });
        }
      }
      // If not a question or answer marker, append to current question
      else if (currentQuestion && !line.match(/^([A-D]\)|[A-D]\.\s|A:|Answer:)/i)) {
        currentQuestion += ' ' + line;
      }
    }
    
    // Save the last question
    if (currentQuestion && currentAnswers.length > 0) {
      await saveQuestion(mockTest.id, currentQuestion, currentAnswers, position, transaction);
    }
    
    // Helper function to save a question and its answers
    async function saveQuestion(quizId, questionText, answers, position, transaction) {
      // Determine question type based on answers
      let questionType = 'multiple_choice';
      if (answers.filter(a => a.isCorrect).length === 1) {
        questionType = 'single_choice';
      }
      
      const question = await QuizQuestion.create({
        quizId,
        questionText,
        questionType,
        points: 1,
        position
      }, { transaction });
      
      for (const answer of answers) {
        await QuizAnswer.create({
          questionId: question.id,
          answerText: answer.answerText,
          isCorrect: answer.isCorrect
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    return res.status(201).json({
      success: true,
      message: 'File uploaded and mock test created successfully',
      data: {
        mockTestId: mockTest.id,
        fileName: filename,
        originalName: originalname,
        mimeType: mimetype,
        note: 'This is a placeholder implementation. In a real system, questions would be parsed from the file.'
      }
    });
  } catch (error) {
    await transaction.rollback();
    
    // Delete the uploaded file if it exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Error uploading question file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload question file',
      error: error.message
    });
  }
};

/**
 * Get a list of uploaded question files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUploadedFiles = async (req, res) => {
  try {
    const { questionUploadsDir } = require('../middleware/upload.middleware');
    
    // Read the directory
    const files = fs.readdirSync(questionUploadsDir);
    
    // Get file details
    const fileDetails = files.map(file => {
      const filePath = path.join(questionUploadsDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        fileName: file,
        size: stats.size,
        uploadedAt: stats.mtime
      };
    });
    
    return res.status(200).json({
      success: true,
      data: fileDetails
    });
  } catch (error) {
    console.error('Error getting uploaded files:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get uploaded files',
      error: error.message
    });
  }
};

/**
 * Delete an uploaded question file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteUploadedFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    const { questionUploadsDir } = require('../middleware/upload.middleware');
    
    const filePath = path.join(questionUploadsDir, fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting uploaded file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete uploaded file',
      error: error.message
    });
  }
};