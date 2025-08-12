const { Lesson, Module, Course, Progress, sequelize } = require('../models');

/**
 * Get all lessons for a module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Check if module exists
    const module = await Module.findByPk(moduleId, {
      include: [{
        model: Course,
        as: 'course',
        attributes: ['instructorId', 'isPublished']
      }]
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // If course is not published and user is not admin or the instructor
    if (!module.course.isPublished && 
        req.userRole !== 'admin' && 
        req.userId !== module.course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'This course is not published yet'
      });
    }

    const lessons = await Lesson.findAll({
      where: { moduleId },
      order: [['position', 'ASC']]
    });

    // If user is authenticated, get their progress for these lessons
    let lessonsWithProgress = lessons;
    if (req.userId) {
      const lessonIds = lessons.map(lesson => lesson.id);
      const progressRecords = await Progress.findAll({
        where: {
          userId: req.userId,
          lessonId: lessonIds
        }
      });

      // Map progress to lessons
      lessonsWithProgress = lessons.map(lesson => {
        const progress = progressRecords.find(p => p.lessonId === lesson.id);
        return {
          ...lesson.toJSON(),
          progress: progress ? {
            status: progress.status,
            progressPercentage: progress.progressPercentage,
            lastPositionSeconds: progress.lastPositionSeconds,
            completedAt: progress.completedAt
          } : null
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: lessonsWithProgress
    });
  } catch (error) {
    console.error('Get lessons by module error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get lessons',
      error: error.message
    });
  }
};

/**
 * Get lesson by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findByPk(id, {
      include: [{
        model: Module,
        as: 'module',
        include: [{
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'instructorId', 'isPublished']
        }]
      }]
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // If course is not published and user is not admin or the instructor
    if (!lesson.module.course.isPublished && 
        req.userRole !== 'admin' && 
        req.userId !== lesson.module.course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'This course is not published yet'
      });
    }

    // If lesson is not free and user is not authenticated, restrict access
    if (!lesson.isFree && !req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access this lesson'
      });
    }

    // Get user progress if authenticated
    let lessonWithProgress = lesson;
    if (req.userId) {
      const progress = await Progress.findOne({
        where: {
          userId: req.userId,
          lessonId: id
        }
      });

      if (progress) {
        lessonWithProgress = {
          ...lesson.toJSON(),
          progress: {
            status: progress.status,
            progressPercentage: progress.progressPercentage,
            lastPositionSeconds: progress.lastPositionSeconds,
            completedAt: progress.completedAt
          }
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: lessonWithProgress
    });
  } catch (error) {
    console.error('Get lesson by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get lesson',
      error: error.message
    });
  }
};

/**
 * Create a new lesson
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createLesson = async (req, res) => {
  try {
    const { 
      moduleId, 
      title, 
      contentType, 
      contentUrl, 
      content, 
      durationMinutes, 
      position,
      isFree 
    } = req.body;

    // Check if module exists
    const module = await Module.findByPk(moduleId, {
      include: [{
        model: Course,
        as: 'course',
        attributes: ['instructorId']
      }]
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (req.userRole !== 'admin' && req.userId !== module.course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add lessons to this module'
      });
    }

    // If position is not provided, get the highest position and add 1
    let lessonPosition = position;
    if (lessonPosition === undefined) {
      const lastLesson = await Lesson.findOne({
        where: { moduleId },
        order: [['position', 'DESC']]
      });

      lessonPosition = lastLesson ? lastLesson.position + 1 : 0;
    }

    // Create lesson
    const lesson = await Lesson.create({
      moduleId,
      title,
      contentType,
      contentUrl,
      content,
      durationMinutes,
      position: lessonPosition,
      isFree: isFree !== undefined ? isFree : false
    });

    return res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create lesson',
      error: error.message
    });
  }
};

/**
 * Update a lesson
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      contentType, 
      contentUrl, 
      content, 
      durationMinutes, 
      position,
      isFree 
    } = req.body;

    const lesson = await Lesson.findByPk(id, {
      include: [{
        model: Module,
        as: 'module',
        include: [{
          model: Course,
          as: 'course',
          attributes: ['instructorId']
        }]
      }]
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (req.userRole !== 'admin' && req.userId !== lesson.module.course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this lesson'
      });
    }

    // Update lesson fields
    if (title) lesson.title = title;
    if (contentType) lesson.contentType = contentType;
    if (contentUrl !== undefined) lesson.contentUrl = contentUrl;
    if (content !== undefined) lesson.content = content;
    if (durationMinutes !== undefined) lesson.durationMinutes = durationMinutes;
    if (position !== undefined) lesson.position = position;
    if (isFree !== undefined) lesson.isFree = isFree;

    await lesson.save();

    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update lesson',
      error: error.message
    });
  }
};

/**
 * Delete a lesson
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findByPk(id, {
      include: [{
        model: Module,
        as: 'module',
        include: [{
          model: Course,
          as: 'course',
          attributes: ['instructorId']
        }]
      }]
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (req.userRole !== 'admin' && req.userId !== lesson.module.course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this lesson'
      });
    }

    await lesson.destroy();

    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete lesson',
      error: error.message
    });
  }
};

/**
 * Reorder lessons
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.reorderLessons = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { lessonOrder } = req.body;

    if (!lessonOrder || !Array.isArray(lessonOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Lesson order must be an array of lesson IDs'
      });
    }

    // Check if module exists
    const module = await Module.findByPk(moduleId, {
      include: [{
        model: Course,
        as: 'course',
        attributes: ['instructorId']
      }]
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (req.userRole !== 'admin' && req.userId !== module.course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder lessons in this module'
      });
    }

    // Update lesson positions in a transaction
    await sequelize.transaction(async (t) => {
      for (let i = 0; i < lessonOrder.length; i++) {
        await Lesson.update(
          { position: i },
          { 
            where: { 
              id: lessonOrder[i],
              moduleId: moduleId
            },
            transaction: t
          }
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Lessons reordered successfully'
    });
  } catch (error) {
    console.error('Reorder lessons error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder lessons',
      error: error.message
    });
  }
};

/**
 * Update lesson progress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { status, progressPercentage, lastPositionSeconds } = req.body;
    const userId = req.userId;

    // Check if lesson exists
    const lesson = await Lesson.findByPk(lessonId, {
      include: [{
        model: Module,
        as: 'module',
        include: [{
          model: Course,
          as: 'course',
          attributes: ['id', 'isPublished']
        }]
      }]
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // If course is not published, restrict access
    if (!lesson.module.course.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'This course is not published yet'
      });
    }

    // Find existing progress or create new one
    let progress = await Progress.findOne({
      where: {
        userId,
        lessonId
      }
    });

    // Calculate if lesson is completed
    let completedAt = null;
    if (status === 'completed' || progressPercentage >= 95) {
      completedAt = new Date();
    }

    if (progress) {
      // Update existing progress
      if (status) progress.status = status;
      if (progressPercentage !== undefined) progress.progressPercentage = progressPercentage;
      if (lastPositionSeconds !== undefined) progress.lastPositionSeconds = lastPositionSeconds;
      if (completedAt) progress.completedAt = completedAt;
      
      await progress.save();
    } else {
      // Create new progress
      progress = await Progress.create({
        userId,
        lessonId,
        status: status || 'in-progress',
        progressPercentage: progressPercentage || 0,
        lastPositionSeconds: lastPositionSeconds || 0,
        completedAt
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: progress
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message
    });
  }
};