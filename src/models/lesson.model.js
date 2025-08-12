'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Lesson extends Model {
    static associate(models) {
      // Lesson belongs to a module
      Lesson.belongsTo(models.Module, {
        foreignKey: 'moduleId',
        as: 'module'
      });

      // Lesson has many progress records
      Lesson.hasMany(models.Progress, {
        foreignKey: 'lessonId',
        as: 'progress'
      });

      // Lesson has one quiz
      Lesson.hasOne(models.Quiz, {
        foreignKey: 'lessonId',
        as: 'quiz'
      });
    }
  }

  Lesson.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    moduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'module_id',
      references: {
        model: 'modules',
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
    contentType: {
      type: DataTypes.ENUM('video', 'document', 'quiz'),
      allowNull: false,
      field: 'content_type'
    },
    contentUrl: {
      type: DataTypes.STRING(255),
      field: 'content_url'
    },
    content: {
      type: DataTypes.TEXT
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      field: 'duration_minutes'
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isFree: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_free'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    sequelize,
    modelName: 'Lesson',
    tableName: 'lessons',
    timestamps: true,
    updatedAt: false
  });

  return Lesson;
};