const { loginUser } = require('../controllers/authController');

module.exports = [
  {
    method: 'POST',
    path: '/auth/login',
    options: loginUser, 
  },
];
