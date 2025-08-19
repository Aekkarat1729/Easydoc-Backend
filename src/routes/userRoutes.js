const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  // ✅ ใหม่
  getUsersForOfficer,
} = require('../controllers/userController');

module.exports = [
  {
    method: 'GET',
    path: '/users',
    options: getAllUsers
  },
  {
    method: 'GET',
    path: '/users/{id}',
    options: getUserById
  },
  {
    method: 'POST',
    path: '/users',
    options: createUser
  },
  {
    method: 'PUT',
    path: '/users/{id}',
    options: updateUser
  },
  {
    method: 'DELETE',
    path: '/users/{id}',
    options: deleteUser
  },
  // ✅ ใหม่: Officer/Admin เท่านั้น, คืน id/email/firstName/lastName
  {
    method: 'GET',
    path: '/userforofficer',
    options: getUsersForOfficer
  }
];
