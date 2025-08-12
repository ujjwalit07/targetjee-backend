'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Quiz extends Model {
    static associate(models) {
      // Quiz belongs to a lesson
      Quiz.belongsTo(models.Lesson, {
        foreignKey: 'lessonId',
        as: 'lesson'
      });

      // Quiz has many questions
      Quiz.hasMany(models.QuizQuestion, {
        foreignKey: 'quizId',
        as: 'questions'
      });

      // Quiz has many attempts
      Quiz.hasMany(models.QuizAttempt, {
        foreignKey: 'quizId',
        as: 'attempts'
      });
    }
  }

  Quiz.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lessonId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for standalone mock tests
      field: 'lesson_id',
      references: {
        model: 'lessons',
        key: 'id'
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Category for mock tests (e.g., Physics, Chemistry, Mathematics)'
    },
    difficulty: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Difficulty level for mock tests (e.g., Easy, Medium, Hard)'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      field: 'time_limit',
      comment: 'Time limit in minutes'
    },
    passingScore: {
      type: DataTypes.INTEGER,
      field: 'passing_score',
      comment: 'Minimum percentage required to pass'
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
    modelName: 'Quiz',
    tableName: 'quizzes',
    timestamps: true
  });

  return Quiz;
};