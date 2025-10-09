const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token missing'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    
    console.log(`Socket authenticated: User ${decoded.userId} (${decoded.role})`);
    next();
    
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Authentication failed'));
  }
};

module.exports = socketAuth;