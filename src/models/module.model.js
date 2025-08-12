'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Module extends Model {
    static associate(models) {
      // Module belongs to a course
      Module.belongsTo(models.Course, {
        foreignKey: 'courseId',
        as: 'course'
      });

      // Module has many lessons
      Module.hasMany(models.Lesson, {
        foreignKey: 'moduleId',
        as: 'lessons'
      });
    }
  }

  Module.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'course_id',
      references: {
        model: 'courses',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    sequelize,
    modelName: 'Module',
    tableName: 'modules',
    timestamps: true,
    updatedAt: false
  });

  return Module;
};