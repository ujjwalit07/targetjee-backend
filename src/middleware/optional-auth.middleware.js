const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/auth.config');

/**
 * Middleware to optionally verify JWT token
 * If token is provided and valid, sets user ID in request
 * If token is not provided or invalid, continues without setting user ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue as anonymous user
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Set user ID in request
      req.userId = decoded.id;
      
      // Check if user exists
      const user = await User.findByPk(decoded.id);
      
      if (user) {
        // Set user role in request
        req.userRole = user.role;
      }
    } catch (tokenError) {
      // Invalid token, continue as anonymous user
      console.log('Invalid token in optional auth:', tokenError.message);
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};