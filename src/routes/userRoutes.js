const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
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
  }
];
