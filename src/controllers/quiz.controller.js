const { Quiz, QuizQuestion, QuizAnswer, QuizAttempt, UserQuizAnswer, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all quizzes with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllQuizzes = async (req, res) => {
  try {
    const { title, lessonId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = {};
    
    if (title) {
      whereConditions.title = { [Op.like]: `%${title}%` };
    }
    
    if (lessonId) {
      whereConditions.lessonId = lessonId;
    }
    
    // Get quizzes with pagination
    const { count, rows: quizzes } = await Quiz.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: QuizQuestion,
          as: 'questions',
          attributes: ['id', 'questionText', 'questionType', 'points'],
          include: [
            {
              model: QuizAnswer,
              as: 'answers',
              attributes: ['id', 'answerText']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        quizzes,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error getting quizzes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get quizzes',
      error: error.message
    });
  }
};

/**
 * Seeded random number generator for consistent randomization
 * @param {string} seed - Seed string for randomization
 * @returns {function} Random number generator function
 */
function createSeededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

/**
 * Shuffle array using seeded random generator
 * @param {Array} array - Array to shuffle
 * @param {function} random - Seeded random function
 * @returns {Array} Shuffled array
 */
function shuffleArray(array, random) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get a quiz by ID with optional question randomization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      randomize = 'false', 
      questionCount, 
      userSeed,
      shuffleAnswers = 'false'
    } = req.query;
    
    // Get quiz with questions and answers
    const quiz = await Quiz.findByPk(id, {
      include: [
        {
          model: QuizQuestion,
          as: 'questions',
          attributes: ['id', 'questionText', 'questionType', 'points', 'position'],
          include: [
            {
              model: QuizAnswer,
              as: 'answers',
              attributes: ['id', 'answerText']
            }
          ]
        }
      ],
      order: [
        [{ model: QuizQuestion, as: 'questions' }, 'position', 'ASC'],
        [{ model: QuizQuestion, as: 'questions' }, { model: QuizAnswer, as: 'answers' }, 'id', 'ASC']
      ]
    });
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    let questions = quiz.questions;
    
    // Apply randomization if requested
    if (randomize === 'true' && questions.length > 0) {
      // Create seed from user identifier, quiz ID, and optional user seed
      const userId = req.userId || req.ip || 'anonymous';
      const seed = `${userId}-${id}-${userSeed || 'default'}`;
      const random = createSeededRandom(seed);
      
      // Shuffle questions
      questions = shuffleArray(questions, random);
      
      // Limit question count if specified
      if (questionCount && parseInt(questionCount) > 0) {
        const count = Math.min(parseInt(questionCount), questions.length);
        questions = questions.slice(0, count);
      }
      
      // Shuffle answer options if requested
      if (shuffleAnswers === 'true') {
        questions = questions.map(question => {
          if (question.answers && question.answers.length > 0) {
            const shuffledAnswers = shuffleArray(question.answers, random);
            return {
              ...question.toJSON(),
              answers: shuffledAnswers
            };
          }
          return question;
        });
      }
      
      // Update positions to reflect new order
      questions = questions.map((question, index) => ({
        ...question.toJSON ? question.toJSON() : question,
        position: index
      }));
    }
    
    // Create response with potentially modified questions
    const responseData = {
      ...quiz.toJSON(),
      questions: questions,
      metadata: {
        totalAvailableQuestions: quiz.questions.length,
        returnedQuestions: questions.length,
        randomized: randomize === 'true',
        answersShuffled: shuffleAnswers === 'true',
        seed: randomize === 'true' ? `${req.userId || req.ip || 'anonymous'}-${id}-${userSeed || 'default'}` : null
      }
    };
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get quiz',
      error: error.message
    });
  }
};

/**
 * Create a new quiz
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createQuiz = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { lessonId, title, description, timeLimit, passingScore, questions } = req.body;
    
    // Validate required fields
    if (!lessonId || !title || !questions || !Array.isArray(questions) || questions.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lessonId, title, and questions array'
      });
    }
    
    // Create quiz
    const quiz = await Quiz.create({
      lessonId,
      title,
      description,
      timeLimit,
      passingScore
    }, { transaction });
    
    // Create questions and answers
    for (let i = 0; i < questions.length; i++) {
      const { questionText, questionType, points, explanation, answers } = questions[i];
      
      // Validate question
      if (!questionText || !questionType || !answers || !Array.isArray(answers)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid question at index ${i}: missing required fields`
        });
      }
      
      // Create question
      const question = await QuizQuestion.create({
        quizId: quiz.id,
        questionText,
        questionType,
        points: points || 1,
        explanation,
        position: i
      }, { transaction });
      
      // Create answers
      for (const answer of answers) {
        const { answerText, isCorrect, explanation: answerExplanation } = answer;
        
        // Validate answer
        if (!answerText || isCorrect === undefined) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid answer: missing required fields'
          });
        }
        
        await QuizAnswer.create({
          questionId: question.id,
          answerText,
          isCorrect,
          explanation: answerExplanation
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Get the created quiz with all related data
    const createdQuiz = await Quiz.findByPk(quiz.id, {
      include: [
        {
          model: QuizQuestion,
          as: 'questions',
          include: [
            {
              model: QuizAnswer,
              as: 'answers'
            }
          ]
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: createdQuiz
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message
    });
  }
};

/**
 * Update a quiz
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateQuiz = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { title, description, timeLimit, passingScore } = req.body;
    
    // Find quiz
    const quiz = await Quiz.findByPk(id);
    
    if (!quiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // Update quiz
    await quiz.update({
      title: title || quiz.title,
      description: description !== undefined ? description : quiz.description,
      timeLimit: timeLimit !== undefined ? timeLimit : quiz.timeLimit,
      passingScore: passingScore !== undefined ? passingScore : quiz.passingScore
    }, { transaction });
    
    await transaction.commit();
    
    // Get updated quiz
    const updatedQuiz = await Quiz.findByPk(id, {
      include: [
        {
          model: QuizQuestion,
          as: 'questions',
          include: [
            {
              model: QuizAnswer,
              as: 'answers'
            }
          ]
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: updatedQuiz
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: error.message
    });
  }
};

/**
 * Delete a quiz
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteQuiz = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find quiz
    const quiz = await Quiz.findByPk(id);
    
    if (!quiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // Check if there are any attempts
    const attemptCount = await QuizAttempt.count({ where: { quizId: id } });
    
    if (attemptCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete quiz with existing attempts'
      });
    }
    
    // Get all questions
    const questions = await QuizQuestion.findAll({ where: { quizId: id } });
    
    // Delete answers for each question
    for (const question of questions) {
      await QuizAnswer.destroy({ where: { questionId: question.id }, transaction });
    }
    
    // Delete questions
    await QuizQuestion.destroy({ where: { quizId: id }, transaction });
    
    // Delete quiz
    await quiz.destroy({ transaction });
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
      error: error.message
    });
  }
};

/**
 * Submit a quiz attempt
 * This endpoint can be used by both logged-in and anonymous users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitQuizAttempt = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { quizId, startedAt, answers } = req.body;
    const userId = req.userId; // Will be undefined for anonymous users
    
    // Validate required fields
    if (!quizId || !startedAt || !answers || !Array.isArray(answers)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: quizId, startedAt, and answers array'
      });
    }
    
    // Find quiz
    const quiz = await Quiz.findByPk(quizId, {
      include: [
        {
          model: QuizQuestion,
          as: 'questions',
          include: [
            {
              model: QuizAnswer,
              as: 'answers'
            }
          ]
        }
      ]
    });
    
    if (!quiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // Calculate time spent
    const completedAt = new Date();
    const startTime = new Date(startedAt);
    const timeSpentSeconds = Math.floor((completedAt - startTime) / 1000);
    
    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    
    // Create attempt
    const attempt = await QuizAttempt.create({
      quizId,
      userId, // Can be null for anonymous users
      startedAt,
      completedAt,
      timeSpentSeconds
    }, { transaction });
    
    // Process answers
    for (const answer of answers) {
      const { questionId, answerId, textAnswer } = answer;
      
      // Find question
      const question = quiz.questions.find(q => q.id === parseInt(questionId));
      
      if (!question) {
        continue; // Skip invalid questions
      }
      
      maxScore += question.points;
      
      // Determine if answer is correct
      let isCorrect = false;
      let pointsEarned = 0;
      
      if (question.questionType === 'fill_blank') {
        // For fill in the blank, check if text answer matches any correct answer
        const correctAnswers = question.answers
          .filter(a => a.isCorrect)
          .map(a => a.answerText.toLowerCase().trim());
        
        if (textAnswer && correctAnswers.includes(textAnswer.toLowerCase().trim())) {
          isCorrect = true;
          pointsEarned = question.points;
          totalScore += pointsEarned;
        }
      } else {
        // For multiple choice, check if selected answer is correct
        const selectedAnswer = question.answers.find(a => a.id === parseInt(answerId));
        
        if (selectedAnswer && selectedAnswer.isCorrect) {
          isCorrect = true;
          pointsEarned = question.points;
          totalScore += pointsEarned;
        }
      }
      
      // Save user answer
      await UserQuizAnswer.create({
        attemptId: attempt.id,
        questionId,
        answerId: answerId || null,
        textAnswer: textAnswer || null,
        isCorrect,
        pointsEarned
      }, { transaction });
    }
    
    // Calculate percentage score
    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    // Determine if passed
    const passed = quiz.passingScore ? percentageScore >= quiz.passingScore : true;
    
    // Update attempt with score
    await attempt.update({
      score: totalScore,
      maxScore,
      percentageScore,
      passed
    }, { transaction });
    
    await transaction.commit();
    
    // Get the complete attempt with answers
    const completedAttempt = await QuizAttempt.findByPk(attempt.id, {
      include: [
        {
          model: UserQuizAnswer,
          as: 'userAnswers',
          include: [
            {
              model: QuizQuestion,
              as: 'question',
              include: [
                {
                  model: QuizAnswer,
                  as: 'answers'
                }
              ]
            },
            {
              model: QuizAnswer,
              as: 'answer'
            }
          ]
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: 'Quiz attempt submitted successfully',
      data: {
        attempt: completedAttempt,
        result: {
          score: totalScore,
          maxScore,
          percentageScore,
          passed,
          timeSpentSeconds
        },
        requiresLogin: !userId && passed // Indicate if user should login to save results
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting quiz attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit quiz attempt',
      error: error.message
    });
  }
};

/**
 * Get quiz attempts for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserQuizAttempts = async (req, res) => {
  try {
    const userId = req.userId;
    const { quizId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = { userId };
    
    if (quizId) {
      whereConditions.quizId = quizId;
    }
    
    // Get attempts with pagination
    const { count, rows: attempts } = await QuizAttempt.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title', 'description', 'passingScore']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['completedAt', 'DESC']]
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        attempts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error getting user quiz attempts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user quiz attempts',
      error: error.message
    });
  }
};

/**
 * Get a specific quiz attempt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getQuizAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Find attempt
    const attempt = await QuizAttempt.findByPk(id, {
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title', 'description', 'passingScore']
        },
        {
          model: UserQuizAnswer,
          as: 'userAnswers',
          include: [
            {
              model: QuizQuestion,
              as: 'question',
              include: [
                {
                  model: QuizAnswer,
                  as: 'answers'
                }
              ]
            },
            {
              model: QuizAnswer,
              as: 'answer'
            }
          ]
        }
      ]
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }
    
    // Check if user is authorized to view this attempt
    // If the attempt belongs to a user, only that user or an admin can view it
    // If the attempt is anonymous (userId is null), anyone can view it
    if (attempt.userId && (!userId || (attempt.userId !== userId && req.userRole !== 'admin'))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this attempt'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: attempt
    });
  } catch (error) {
    console.error('Error getting quiz attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get quiz attempt',
      error: error.message
    });
  }
};

/**
 * Get quiz statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getQuizStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find quiz
    const quiz = await Quiz.findByPk(id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // Get attempt statistics
    const totalAttempts = await QuizAttempt.count({ where: { quizId: id } });
    const passedAttempts = await QuizAttempt.count({ where: { quizId: id, passed: true } });
    const averageScore = await QuizAttempt.findOne({
      where: { quizId: id },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('percentage_score')), 'averageScore']
      ],
      raw: true
    });
    
    // Get question statistics
    const questions = await QuizQuestion.findAll({
      where: { quizId: id },
      attributes: ['id', 'questionText', 'questionType', 'points'],
      include: [
        {
          model: UserQuizAnswer,
          as: 'userAnswers',
          attributes: ['isCorrect']
        }
      ]
    });
    
    const questionStats = questions.map(question => {
      const totalAnswers = question.userAnswers.length;
      const correctAnswers = question.userAnswers.filter(a => a.isCorrect).length;
      const correctPercentage = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
      
      return {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        points: question.points,
        totalAnswers,
        correctAnswers,
        correctPercentage
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        quizId: id,
        totalAttempts,
        passedAttempts,
        passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
        averageScore: averageScore.averageScore || 0,
        questionStats
      }
    });
  } catch (error) {
    console.error('Error getting quiz statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get quiz statistics',
      error: error.message
    });
  }
};