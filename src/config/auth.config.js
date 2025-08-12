/**
 * Authentication configuration
 */
module.exports = {
  // JWT secret key (should be set from environment variable in production)
  jwtSecret: process.env.JWT_SECRET || 'targetjee-secret-key',
  
  // JWT expiration time (in seconds)
  jwtExpiration: process.env.JWT_EXPIRATION || 86400, // 24 hours
  
  // JWT refresh expiration (in seconds)
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || 604800, // 7 days
  
  // Password hash rounds
  saltRounds: 10
};