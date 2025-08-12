const { Enrollment, Course, User, Progress, Lesson, Module, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all enrollments for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserEnrollments = async (req, res) => {
  try {
    const userId = req.userId;

    const enrollments = await Enrollment.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'description', 'thumbnailUrl', 'level', 'durationHours'],
          include: [
            {
              model: User,
              as: 'instructor',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['enrolledAt', 'DESC']]
    });

    // Get progress information for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = enrollment.courseId;
        
        // Get all lessons for this course
        const modules = await Module.findAll({
          where: { courseId },
          include: [
            {
              model: Lesson,
              as: 'lessons',
              attributes: ['id']
            }
          ]
        });

        // Extract all lesson IDs
        const lessonIds = modules.flatMap(module => 
          module.lessons.map(lesson => lesson.id)
        );

        // Get completed lessons count
        const completedLessons = await Progress.count({
          where: {
            userId,
            lessonId: { [Op.in]: lessonIds },
            status: 'completed'
          }
        });

        // Calculate progress percentage
        const totalLessons = lessonIds.length;
        const progressPercentage = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0;

        return {
          ...enrollment.toJSON(),
          progress: {
            completedLessons,
            totalLessons,
            progressPercentage
          }
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enrollmentsWithProgress
    });
  } catch (error) {
    console.error('Get user enrollments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get enrollments',
      error: error.message
    });
  }
};

/**
 * Get enrollment by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const enrollment = await Enrollment.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [
            {
              model: User,
              as: 'instructor',
              attributes: ['id', 'name']
            },
            {
              model: Module,
              as: 'modules',
              include: [
                {
                  model: Lesson,
                  as: 'lessons',
                  attributes: ['id', 'title', 'contentType', 'durationMinutes', 'isFree']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if the enrollment belongs to the requesting user or user is admin
    if (enrollment.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this enrollment'
      });
    }

    // Get progress for all lessons in this course
    const lessonIds = enrollment.course.modules.flatMap(module => 
      module.lessons.map(lesson => lesson.id)
    );

    const progressRecords = await Progress.findAll({
      where: {
        userId,
        lessonId: { [Op.in]: lessonIds }
      }
    });

    // Map progress to lessons
    const modulesWithProgress = enrollment.course.modules.map(module => {
      const lessonsWithProgress = module.lessons.map(lesson => {
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

      return {
        ...module.toJSON(),
        lessons: lessonsWithProgress
      };
    });

    // Calculate overall course progress
    const completedLessons = progressRecords.filter(p => p.status === 'completed').length;
    const totalLessons = lessonIds.length;
    const progressPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    const enrollmentWithProgress = {
      ...enrollment.toJSON(),
      course: {
        ...enrollment.course.toJSON(),
        modules: modulesWithProgress
      },
      progress: {
        completedLessons,
        totalLessons,
        progressPercentage
      }
    };

    return res.status(200).json({
      success: true,
      data: enrollmentWithProgress
    });
  } catch (error) {
    console.error('Get enrollment by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get enrollment',
      error: error.message
    });
  }
};

/**
 * Create a new enrollment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createEnrollment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.userId;

    // Check if course exists
    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is published
    if (!course.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll in an unpublished course'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        userId,
        courseId
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course',
        data: existingEnrollment
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      userId,
      courseId,
      enrolledAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Enrolled in course successfully',
      data: enrollment
    });
  } catch (error) {
    console.error('Create enrollment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to enroll in course',
      error: error.message
    });
  }
};

/**
 * Mark a course as completed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markCourseCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const enrollment = await Enrollment.findByPk(id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if the enrollment belongs to the requesting user
    if (enrollment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this enrollment'
      });
    }

    // Update enrollment
    enrollment.completedAt = new Date();
    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: 'Course marked as completed',
      data: enrollment
    });
  } catch (error) {
    console.error('Mark course completed error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark course as completed',
      error: error.message
    });
  }
};

/**
 * Get course enrollments (for admin and instructors)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Check if course exists
    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (userRole !== 'admin' && course.instructorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view enrollments for this course'
      });
    }

    // Get enrollments with user information
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['enrolledAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get course enrollments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get course enrollments',
      error: error.message
    });
  }
};

/**
 * Get enrollment statistics (for admin and instructors)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEnrollmentStats = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Check if course exists
    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (userRole !== 'admin' && course.instructorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view statistics for this course'
      });
    }

    // Get total enrollments
    const totalEnrollments = await Enrollment.count({
      where: { courseId }
    });

    // Get completed enrollments
    const completedEnrollments = await Enrollment.count({
      where: { 
        courseId,
        completedAt: { [Op.ne]: null }
      }
    });

    // Get enrollments by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentsByMonth = await Enrollment.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('enrolledAt'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { 
        courseId,
        enrolledAt: { [Op.gte]: sixMonthsAgo }
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('enrolledAt'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('enrolledAt'), '%Y-%m'), 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        totalEnrollments,
        completedEnrollments,
        completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
        enrollmentsByMonth: enrollmentsByMonth.map(item => ({
          month: item.getDataValue('month'),
          count: parseInt(item.getDataValue('count'))
        }))
      }
    });
  } catch (error) {
    console.error('Get enrollment stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get enrollment statistics',
      error: error.message
    });
  }
};