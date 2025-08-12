const { Quiz, QuizQuestion, QuizAnswer, QuizAttempt, UserQuizAnswer, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all available mock tests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllMockTests = async (req, res) => {
  try {
    const { title, category, difficulty, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = {
      lessonId: null // Mock tests are not associated with lessons
    };
    
    if (title) {
      whereConditions.title = { [Op.like]: `%${title}%` };
    }
    
    if (category) {
      whereConditions.category = category;
    }
    
    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }
    
    // Get mock tests with pagination
    const { count, rows: mockTests } = await Quiz.findAndCountAll({
      where: whereConditions,
      attributes: [
        'id', 'title', 'description', 'timeLimit', 'passingScore', 
        'category', 'difficulty', 'createdAt'
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
        mockTests,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error getting mock tests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get mock tests',
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
 * Get a mock test by ID with optional question randomization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMockTestById = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      randomize = 'false', 
      questionCount, 
      userSeed,
      shuffleAnswers = 'false'
    } = req.query;
    
    // Get mock test with questions and answers
    const mockTest = await Quiz.findOne({
      where: {
        id,
        lessonId: null // Ensure it's a mock test
      },
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
    
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }
    
    let questions = mockTest.questions;
    
    // Apply randomization if requested
    if (randomize === 'true' && questions.length > 0) {
      // Create seed from user identifier, test ID, and optional user seed
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
      ...mockTest.toJSON(),
      questions: questions,
      metadata: {
        totalAvailableQuestions: mockTest.questions.length,
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
    console.error('Error getting mock test:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get mock test',
      error: error.message
    });
  }
};

/**
 * Create a new mock test
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createMockTest = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, description, timeLimit, passingScore, category, difficulty, questions } = req.body;
    
    // Validate required fields
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title and questions array'
      });
    }
    
    // Create mock test (with lessonId set to null)
    const mockTest = await Quiz.create({
      lessonId: null, // This indicates it's a mock test, not a lesson quiz
      title,
      description,
      timeLimit,
      passingScore,
      category,
      difficulty
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
        quizId: mockTest.id,
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
    
    // Get the created mock test with all related data
    const createdMockTest = await Quiz.findByPk(mockTest.id, {
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
      message: 'Mock test created successfully',
      data: createdMockTest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating mock test:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create mock test',
      error: error.message
    });
  }
};

/**
 * Update a mock test
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateMockTest = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { title, description, timeLimit, passingScore, category, difficulty } = req.body;
    
    // Find mock test
    const mockTest = await Quiz.findOne({
      where: {
        id,
        lessonId: null // Ensure it's a mock test
      }
    });
    
    if (!mockTest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }
    
    // Update mock test
    await mockTest.update({
      title: title || mockTest.title,
      description: description !== undefined ? description : mockTest.description,
      timeLimit: timeLimit !== undefined ? timeLimit : mockTest.timeLimit,
      passingScore: passingScore !== undefined ? passingScore : mockTest.passingScore,
      category: category !== undefined ? category : mockTest.category,
      difficulty: difficulty !== undefined ? difficulty : mockTest.difficulty
    }, { transaction });
    
    await transaction.commit();
    
    // Get updated mock test
    const updatedMockTest = await Quiz.findByPk(id, {
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
      message: 'Mock test updated successfully',
      data: updatedMockTest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating mock test:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update mock test',
      error: error.message
    });
  }
};

/**
 * Delete a mock test
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteMockTest = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find mock test
    const mockTest = await Quiz.findOne({
      where: {
        id,
        lessonId: null // Ensure it's a mock test
      }
    });
    
    if (!mockTest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }
    
    // Check if there are any attempts
    const attemptCount = await QuizAttempt.count({ where: { quizId: id } });
    
    if (attemptCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete mock test with existing attempts'
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
    
    // Delete mock test
    await mockTest.destroy({ transaction });
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      message: 'Mock test deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting mock test:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete mock test',
      error: error.message
    });
  }
};

/**
 * Submit a mock test attempt
 * This endpoint can be used by both logged-in and anonymous users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitMockTestAttempt = async (req, res) => {
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
    
    // Find mock test
    const mockTest = await Quiz.findOne({
      where: {
        id: quizId,
        lessonId: null // Ensure it's a mock test
      },
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
    
    if (!mockTest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
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
      const question = mockTest.questions.find(q => q.id === parseInt(questionId));
      
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
    const passed = mockTest.passingScore ? percentageScore >= mockTest.passingScore : true;
    
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
      message: 'Mock test attempt submitted successfully',
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
    console.error('Error submitting mock test attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit mock test attempt',
      error: error.message
    });
  }
};

/**
 * Get mock test attempts for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserMockTestAttempts = async (req, res) => {
  try {
    const userId = req.userId;
    const { quizId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = { userId };
    
    if (quizId) {
      whereConditions.quizId = quizId;
    }
    
    // Join condition to only get mock tests (where lessonId is null)
    const includeConditions = [
      {
        model: Quiz,
        as: 'quiz',
        attributes: ['id', 'title', 'description', 'passingScore', 'category', 'difficulty'],
        where: { lessonId: null }
      }
    ];
    
    // Get attempts with pagination
    const { count, rows: attempts } = await QuizAttempt.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
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
    console.error('Error getting user mock test attempts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user mock test attempts',
      error: error.message
    });
  }
};

/**
 * Get a specific mock test attempt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMockTestAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Find attempt
    const attempt = await QuizAttempt.findOne({
      where: { id },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title', 'description', 'passingScore', 'category', 'difficulty'],
          where: { lessonId: null } // Ensure it's a mock test
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
        message: 'Mock test attempt not found'
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
    console.error('Error getting mock test attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get mock test attempt',
      error: error.message
    });
  }
};

/**
 * Get mock test statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMockTestStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find mock test
    const mockTest = await Quiz.findOne({
      where: {
        id,
        lessonId: null // Ensure it's a mock test
      }
    });
    
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
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
    console.error('Error getting mock test statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get mock test statistics',
      error: error.message
    });
  }
};