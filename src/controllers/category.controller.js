const { Category, Course, sequelize } = require('../models');

/**
 * Get all categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
};

/**
 * Get category by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get category',
      error: error.message
    });
  }
};

/**
 * Create a new category (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category
    const category = await Category.create({
      name,
      description,
      imageUrl
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Update a category (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: { name }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update category fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Delete a category (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has associated courses
    const courseCount = await Course.count({
      where: { categoryId: id }
    });

    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with associated courses (${courseCount} courses found)`
      });
    }

    await category.destroy();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

/**
 * Get categories with course count
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCategoriesWithCourseCount = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: {
        include: [
          [
            // Count published courses in this category
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM courses
              WHERE courses.category_id = Category.id
              AND courses.is_published = true
            )`),
            'courseCount'
          ]
        ]
      },
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories with course count error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get categories with course count',
      error: error.message
    });
  }
};