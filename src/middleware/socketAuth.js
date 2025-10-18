const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    console.log('[SOCKET AUTH] Authentication attempt:', {
      hasToken: !!token,
      tokenType: typeof token,
      socketId: socket.id,
      userAgent: socket.handshake.headers['user-agent'],
      origin: socket.handshake.headers.origin
    });
    
    if (!token) {
      console.error('[SOCKET AUTH] Authentication token missing');
      const error = new Error('Authentication token missing');
      error.description = 'Authentication token missing';
      error.type = 'AuthenticationError';
      return next(error);
    }

    if (typeof token !== 'string') {
      console.error('[SOCKET AUTH] Invalid token format:', typeof token);
      const error = new Error('Invalid token format');
      error.description = 'Invalid token format';
      error.type = 'AuthenticationError';
      return next(error);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    
    if (!decoded.userId || !decoded.role) {
      console.error('[SOCKET AUTH] Invalid token payload:', {
        hasUserId: !!decoded.userId,
        hasRole: !!decoded.role,
        payload: decoded
      });
      const error = new Error('Invalid token payload');
      error.description = 'Invalid token payload';
      error.type = 'AuthenticationError';
      return next(error);
    }
    
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    
    console.log(`[SOCKET AUTH] User ${decoded.userId} (${decoded.role}) authenticated successfully`);
    next();
    
  } catch (error) {
    console.error('[SOCKET AUTH] Authentication failed:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    let customError;
    if (error.name === 'TokenExpiredError') {
      customError = new Error('Token expired');
      customError.description = 'Token expired';
      customError.type = 'TokenExpiredError';
    } else if (error.name === 'JsonWebTokenError') {
      customError = new Error('Invalid token');
      customError.description = 'Invalid token';
      customError.type = 'JsonWebTokenError';
    } else {
      customError = new Error('Authentication failed');
      customError.description = 'Authentication failed';
      customError.type = 'AuthenticationError';
    }
    
    next(customError);
  }
};

module.exports = socketAuth;