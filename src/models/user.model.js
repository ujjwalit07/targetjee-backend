'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User has many courses (as instructor)
      User.hasMany(models.Course, {
        foreignKey: 'instructorId',
        as: 'courses'
      });

      // User has many enrollments
      User.hasMany(models.Enrollment, {
        foreignKey: 'userId',
        as: 'enrollments'
      });

      // User has many progress records
      User.hasMany(models.Progress, {
        foreignKey: 'userId',
        as: 'progress'
      });

      // User has many reviews
      User.hasMany(models.Review, {
        foreignKey: 'userId',
        as: 'reviews'
      });

      // User has many quiz attempts
      User.hasMany(models.QuizAttempt, {
        foreignKey: 'userId',
        as: 'quizAttempts'
      });
    }

    // Method to validate password
    async validatePassword(password) {
      return await bcrypt.compare(password, this.passwordHash);
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'full_name',
      validate: {
        notEmpty: true
      }
    },
    role: {
      type: DataTypes.ENUM('student', 'instructor', 'admin'),
      defaultValue: 'student'
    },
    profileImage: {
      type: DataTypes.STRING(255),
      field: 'profile_image'
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      }
    }
  });

  return User;
};