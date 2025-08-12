'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuizAnswer extends Model {
    static associate(models) {
      // QuizAnswer belongs to a question
      QuizAnswer.belongsTo(models.QuizQuestion, {
        foreignKey: 'questionId',
        as: 'question'
      });

      // QuizAnswer has many user answers
      QuizAnswer.hasMany(models.UserQuizAnswer, {
        foreignKey: 'answerId',
        as: 'userAnswers'
      });
    }
  }

  QuizAnswer.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    answerText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'answer_text'
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_correct'
    },
    explanation: {
      type: DataTypes.TEXT,
      comment: 'Explanation for this specific answer'
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
    modelName: 'QuizAnswer',
    tableName: 'quiz_answers',
    timestamps: true
  });

  return QuizAnswer;
};