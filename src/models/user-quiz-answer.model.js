'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserQuizAnswer extends Model {
    static associate(models) {
      // UserQuizAnswer belongs to a quiz attempt
      UserQuizAnswer.belongsTo(models.QuizAttempt, {
        foreignKey: 'attemptId',
        as: 'attempt'
      });

      // UserQuizAnswer belongs to a question
      UserQuizAnswer.belongsTo(models.QuizQuestion, {
        foreignKey: 'questionId',
        as: 'question'
      });

      // UserQuizAnswer belongs to an answer (for multiple choice questions)
      UserQuizAnswer.belongsTo(models.QuizAnswer, {
        foreignKey: 'answerId',
        as: 'answer'
      });
    }
  }

  UserQuizAnswer.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    attemptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'attempt_id',
      references: {
        model: 'quiz_attempts',
        key: 'id'
      }
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'question_id',
      references: {
        model: 'quiz_questions',
        key: 'id'
      }
    },
    answerId: {
      type: DataTypes.INTEGER,
      field: 'answer_id',
      references: {
        model: 'quiz_answers',
        key: 'id'
      },
      comment: 'For multiple choice questions'
    },
    textAnswer: {
      type: DataTypes.TEXT,
      field: 'text_answer',
      comment: 'For fill in the blank questions'
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      field: 'is_correct',
      comment: 'Whether the answer was correct'
    },
    pointsEarned: {
      type: DataTypes.INTEGER,
      field: 'points_earned',
      comment: 'Points earned for this answer'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    sequelize,
    modelName: 'UserQuizAnswer',
    tableName: 'user_quiz_answers',
    timestamps: true,
    updatedAt: false
  });

  return UserQuizAnswer;
};