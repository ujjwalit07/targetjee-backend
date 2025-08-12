'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      // Course belongs to a category
      Course.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category'
      });

      // Course belongs to an instructor (User)
      Course.belongsTo(models.User, {
        foreignKey: 'instructorId',
        as: 'instructor'
      });

      // Course has many modules
      Course.hasMany(models.Module, {
        foreignKey: 'courseId',
        as: 'modules'
      });

      // Course has many enrollments
      Course.hasMany(models.Enrollment, {
        foreignKey: 'courseId',
        as: 'enrollments'
      });

      // Course has many reviews
      Course.hasMany(models.Review, {
        foreignKey: 'courseId',
        as: 'reviews'
      });
    }
  }

  Course.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'instructor_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    thumbnailUrl: {
      type: DataTypes.STRING(255),
      field: 'thumbnail_url'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    discountPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'discount_price'
    },
    level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false
    },
    durationHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'duration_hours',
      validate: {
        min: 0
      }
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured'
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_published'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    timestamps: true
  });

  return Course;
};