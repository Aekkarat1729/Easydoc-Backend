const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.error('[SOCKET AUTH] Authentication token missing');
      return next(new Error('Authentication token missing'));
    }

    if (typeof token !== 'string') {
      console.error('[SOCKET AUTH] Invalid token format');
      return next(new Error('Invalid token format'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    
    if (!decoded.userId || !decoded.role) {
      console.error('[SOCKET AUTH] Invalid token payload');
      return next(new Error('Invalid token payload'));
    }
    
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    
    console.log(`[SOCKET AUTH] User ${decoded.userId} (${decoded.role}) authenticated successfully`);
    next();
    
  } catch (error) {
    console.error('[SOCKET AUTH] Authentication failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      next(new Error('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new Error('Invalid token'));
    } else {
      next(new Error('Authentication failed'));
    }
  }
};

module.exports = socketAuth;