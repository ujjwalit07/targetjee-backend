const { Module, Course, Lesson, sequelize } = require('../models');

/**
 * Get all modules for a course
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getModulesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findByPk(courseId);

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

    const modules = await Module.findAll({
      where: { courseId },
      include: [
        {
          model: Lesson,
          as: 'lessons',
          attributes: ['id', 'title', 'contentType', 'durationMinutes', 'isFree']
        }
      ],
      order: [['position', 'ASC'], [{ model: Lesson, as: 'lessons' }, 'position', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('Get modules by course error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get modules',
      error: error.message
    });
  }
};

/**
 * Get module by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getModuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const module = await Module.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'instructorId', 'isPublished']
        },
        {
          model: Lesson,
          as: 'lessons',
          attributes: ['id', 'title', 'contentType', 'durationMinutes', 'isFree', 'position']
        }
      ]
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

    return res.status(200).json({
      success: true,
      data: module
    });
  } catch (error) {
    console.error('Get module by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get module',
      error: error.message
    });
  }
};

/**
 * Create a new module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createModule = async (req, res) => {
  try {
    const { courseId, title, description, position } = req.body;

    // Check if course exists
    const course = await Course.findByPk(courseId);

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
        message: 'You do not have permission to add modules to this course'
      });
    }

    // If position is not provided, get the highest position and add 1
    let modulePosition = position;
    if (modulePosition === undefined) {
      const lastModule = await Module.findOne({
        where: { courseId },
        order: [['position', 'DESC']]
      });

      modulePosition = lastModule ? lastModule.position + 1 : 0;
    }

    // Create module
    const module = await Module.create({
      courseId,
      title,
      description,
      position: modulePosition
    });

    return res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: module
    });
  } catch (error) {
    console.error('Create module error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create module',
      error: error.message
    });
  }
};

/**
 * Update a module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, position } = req.body;

    const module = await Module.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['instructorId']
        }
      ]
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
        message: 'You do not have permission to update this module'
      });
    }

    // Update module fields
    if (title) module.title = title;
    if (description !== undefined) module.description = description;
    if (position !== undefined) module.position = position;

    await module.save();

    return res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: module
    });
  } catch (error) {
    console.error('Update module error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update module',
      error: error.message
    });
  }
};

/**
 * Delete a module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    const module = await Module.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['instructorId']
        },
        {
          model: Lesson,
          as: 'lessons'
        }
      ]
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
        message: 'You do not have permission to delete this module'
      });
    }

    // Check if module has lessons
    if (module.lessons && module.lessons.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete module with associated lessons (${module.lessons.length} lessons found)`
      });
    }

    await module.destroy();

    return res.status(200).json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.error('Delete module error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete module',
      error: error.message
    });
  }
};

/**
 * Reorder modules
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.reorderModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleOrder } = req.body;

    if (!moduleOrder || !Array.isArray(moduleOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Module order must be an array of module IDs'
      });
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);

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
        message: 'You do not have permission to reorder modules in this course'
      });
    }

    // Update module positions in a transaction
    await sequelize.transaction(async (t) => {
      for (let i = 0; i < moduleOrder.length; i++) {
        await Module.update(
          { position: i },
          { 
            where: { 
              id: moduleOrder[i],
              courseId: courseId
            },
            transaction: t
          }
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Modules reordered successfully'
    });
  } catch (error) {
    console.error('Reorder modules error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder modules',
      error: error.message
    });
  }
};