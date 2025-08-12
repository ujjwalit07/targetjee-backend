'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuizQuestion extends Model {
    static associate(models) {
      // QuizQuestion belongs to a quiz
      QuizQuestion.belongsTo(models.Quiz, {
        foreignKey: 'quizId',
        as: 'quiz'
      });

      // QuizQuestion has many answers
      QuizQuestion.hasMany(models.QuizAnswer, {
        foreignKey: 'questionId',
        as: 'answers'
      });

      // QuizQuestion has many user answers through UserQuizAnswer
      QuizQuestion.hasMany(models.UserQuizAnswer, {
        foreignKey: 'questionId',
        as: 'userAnswers'
      });
    }
  }

  QuizQuestion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'question_text'
    },
    questionType: {
      type: DataTypes.ENUM('multiple_choice', 'single_choice', 'true_false', 'fill_blank'),
      allowNull: false,
      field: 'question_type'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    explanation: {
      type: DataTypes.TEXT,
      comment: 'Explanation shown after answering'
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    modelName: 'QuizQuestion',
    tableName: 'quiz_questions',
    timestamps: true
  });

  return QuizQuestion;
};