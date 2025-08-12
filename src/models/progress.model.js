'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Progress extends Model {
    static associate(models) {
      // Progress belongs to a user
      Progress.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      // Progress belongs to a lesson
      Progress.belongsTo(models.Lesson, {
        foreignKey: 'lessonId',
        as: 'lesson'
      });
    }
  }

  Progress.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    lessonId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'lesson_id',
      references: {
        model: 'lessons',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
      defaultValue: 'not_started'
    },
    progressPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'progress_percentage',
      validate: {
        min: 0,
        max: 100
      }
    },
    lastPositionSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'last_position_seconds'
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'Progress',
    tableName: 'progress',
    timestamps: true,
    createdAt: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'lesson_id']
      }
    ]
  });

  return Progress;
};