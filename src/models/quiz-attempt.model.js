'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuizAttempt extends Model {
    static associate(models) {
      // QuizAttempt belongs to a user
      QuizAttempt.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      // QuizAttempt belongs to a quiz
      QuizAttempt.belongsTo(models.Quiz, {
        foreignKey: 'quizId',
        as: 'quiz'
      });

      // QuizAttempt has many user answers
      QuizAttempt.hasMany(models.UserQuizAnswer, {
        foreignKey: 'attemptId',
        as: 'userAnswers'
      });
    }
  }

  QuizAttempt.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for anonymous users
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    quizId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'quiz_id',
      references: {
        model: 'quizzes',
        key: 'id'
      }
    },
    score: {
      type: DataTypes.INTEGER,
      comment: 'Total score achieved'
    },
    maxScore: {
      type: DataTypes.INTEGER,
      field: 'max_score',
      comment: 'Maximum possible score'
    },
    percentageScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'percentage_score'
    },
    passed: {
      type: DataTypes.BOOLEAN,
      comment: 'Whether the user passed the quiz based on passing score'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'started_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at'
    },
    timeSpentSeconds: {
      type: DataTypes.INTEGER,
      field: 'time_spent_seconds'
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
    modelName: 'QuizAttempt',
    tableName: 'quiz_attempts',
    timestamps: true
  });

  return QuizAttempt;
};