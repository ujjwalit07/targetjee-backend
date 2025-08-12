const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/auth.config');

/**
 * Middleware to verify JWT token and set user ID in request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Set user ID in request
    req.userId = decoded.id;
    
    // Check if user exists
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set user role in request
    req.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Requires admin role'
    });
  }
  
  next();
};

/**
 * Middleware to check if user is an instructor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.isInstructor = (req, res, next) => {
  if (req.userRole !== 'instructor' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Requires instructor role'
    });
  }
  
  next();
};

/**
 * Middleware to check if user is the owner of a resource or an admin
 * @param {Function} getResourceOwnerId - Function to get the owner ID of the resource
 * @returns {Function} Middleware function
 */
exports.isOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // If user is admin, allow access
      if (req.userRole === 'admin') {
        return next();
      }
      
      // Get owner ID of the resource
      const ownerId = await getResourceOwnerId(req);
      
      // If user is the owner, allow access
      if (req.userId === ownerId) {
        return next();
      }
      
      // Otherwise, deny access
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    } catch (error) {
      console.error('isOwnerOrAdmin middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check resource ownership',
        error: error.message
      });
    }
  };
};