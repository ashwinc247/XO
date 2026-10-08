const maintenanceService = require('../services/maintenanceService');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const checkMaintenance = async (req, res, next) => {
  try {
    const status = await maintenanceService.getStatus();
    
    if (status.enabled) {
      // Attempt to decode user from token manually since this middleware runs globally before 'protect'
      let user = req.user;
      if (!user && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_access_token_key_12345');
          const foundUser = await userRepository.findById(decoded.userId);
          if (foundUser) user = foundUser;
        } catch (err) {
          // Ignore invalid token, will fall through to blocking
        }
      }

      // Allow admins to bypass maintenance mode entirely so they can access all APIs
      if (user && user.role === 'admin') {
        req.user = user; // Attach for convenience
        return next();
      }

      // Bypass auth routes so users and admins can login. 
      // (Regular users will still be blocked on subsequent non-auth API calls)
      if (req.originalUrl.startsWith('/api/v1/auth')) {
        return next();
      }

      // Bypass public routes
      if (req.originalUrl.startsWith('/api/v1/maintenance') || req.originalUrl.startsWith('/api/v1/health')) {
        return next();
      }

      return res.status(503).json({
        success: false,
        message: 'Platform under maintenance',
        maintenance: {
          title: status.title,
          description: status.description,
          startTime: status.startTime,
          endTime: status.endTime
        }
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkMaintenance;
