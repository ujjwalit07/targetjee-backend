const { Course, Category, User, Module, Lesson, Review } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all courses with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllCourses = async (req, res) => {
  try {
    const {
      title,
      categoryId,
      instructorId,
      level,
      minPrice,
      maxPrice,
      isFeatured,
      isPublished,
      limit = 10,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build filter conditions
    const whereConditions = {};
    
    if (title) {
      whereConditions.title = { [Op.like]: `%${title}%` };
    }
    
    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }
    
    if (instructorId) {
      whereConditions.instructorId = instructorId;
    }
    
    if (level) {
      whereConditions.level = level;
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.price = {};
      if (minPrice !== undefined) {
        whereConditions.price[Op.gte] = minPrice;
      }
      if (maxPrice !== undefined) {
        whereConditions.price[Op.lte] = maxPrice;
      }
    }
    
    if (isFeatured !== undefined) {
      whereConditions.isFeatured = isFeatured === 'true';
    }
    
    // For non-admin users, only show published courses
    if (req.userRole !== 'admin') {
      whereConditions.isPublished = true;
    } else if (isPublished !== undefined) {
      whereConditions.isPublished = isPublished === 'true';
    }

    // Query courses with pagination and sorting
    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: {
        courses,
        totalCount: count,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all courses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get courses',
      error: error.message
    });
  }
};

/**
 * Get course by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'fullName']
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
        },
        {
          model: Review,
          as: 'reviews',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'fullName']
            }
          ]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // If course is not published and user is not admin or the instructor
    if (!course.isPublished && 
        req.userRole !== 'admin' && 
        req.userId !== course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'This course is not published yet'
      });
    }

    return res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get course',
      error: error.message
    });
  }
};

/**
 * Create a new course
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      thumbnailUrl,
      price,
      discountPrice,
      level,
      durationHours,
      isFeatured,
      isPublished
    } = req.body;

    // Set instructor ID to current user
    const instructorId = req.userId;

    // Create course
    const course = await Course.create({
      title,
      description,
      instructorId,
      categoryId,
      thumbnailUrl,
      price,
      discountPrice,
      level,
      durationHours,
      isFeatured: isFeatured || false,
      isPublished: isPublished || false
    });

    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message
    });
  }
};

/**
 * Update a course
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      categoryId,
      thumbnailUrl,
      price,
      discountPrice,
      level,
      durationHours,
      isFeatured,
      isPublished
    } = req.body;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (req.userRole !== 'admin' && req.userId !== course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this course'
      });
    }

    // Update course fields
    if (title) course.title = title;
    if (description) course.description = description;
    if (categoryId) course.categoryId = categoryId;
    if (thumbnailUrl) course.thumbnailUrl = thumbnailUrl;
    if (price !== undefined) course.price = price;
    if (discountPrice !== undefined) course.discountPrice = discountPrice;
    if (level) course.level = level;
    if (durationHours !== undefined) course.durationHours = durationHours;
    if (isFeatured !== undefined) course.isFeatured = isFeatured;
    if (isPublished !== undefined) course.isPublished = isPublished;

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Update course error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message
    });
  }
};

/**
 * Delete a course
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is admin or the instructor of the course
    if (req.userRole !== 'admin' && req.userId !== course.instructorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this course'
      });
    }

    await course.destroy();

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message
    });
  }
};

/**
 * Get featured courses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getFeaturedCourses = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const courses = await Course.findAll({
      where: {
        isFeatured: true,
        isPublished: true
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Get featured courses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get featured courses',
      error: error.message
    });
  }
};

/**
 * Get courses by instructor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCoursesByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const whereConditions = {
      instructorId
    };

    // For non-admin users and not the instructor, only show published courses
    if (req.userRole !== 'admin' && req.userId !== parseInt(instructorId)) {
      whereConditions.isPublished = true;
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: {
        courses,
        totalCount: count,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get courses by instructor error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get courses by instructor',
      error: error.message
    });
  }
};

/**
 * Get courses by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCoursesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const { count, rows: courses } = await Course.findAndCountAll({
      where: {
        categoryId,
        isPublished: true
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: {
        courses,
        totalCount: count,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get courses by category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get courses by category',
      error: error.message
    });
  }
};