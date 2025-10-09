const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const { success, error } = require('../utils/responseFormatter');
const jwt = require('jsonwebtoken');
const { mapRoleToNumber } = require('../utils/roleMapper');


const loginUser = {
  auth: false,
  tags: ['api', 'auth'],
  payload: {
    parse: true,
    output: 'data',
    allow: ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'],
    multipart: true
  },
  handler: async (request, h) => {
    const { email, password } = request.payload || {};

    try {
      if (!email || !password) {
        return error(h, 'email & password are required', 400);
      }

      const user = await userService.getUserByEmail(email);
      if (!user) {
        return error(h, 'User not found', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return error(h, 'Invalid password', 401);
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );

      const roleNumber = mapRoleToNumber(user.role);

      return success(h, {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roleNumber,
        email: user.email,
        phoneNumber: user.phoneNumber,
        position: user.position,
        profileImage: user.profileImage,
        token
      });
    } catch (err) {
      return error(h, err.message || 'Internal Server Error', 500);
    }
  },
};



module.exports = { loginUser };
