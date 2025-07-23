const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const { success, error } = require('../utils/responseFormatter');
const jwt = require('jsonwebtoken');

// ฟังก์ชัน login
const loginUser = {
  auth: false,
  tags: ['api', 'auth'],
  handler: async (request, h) => {
    const { email, password } = request.payload;

    try {
      // เรียกใช้งาน getUserByEmail
      const user = await userService.getUserByEmail(email);
      if (!user) {
        return error(h, 'User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return error(h, 'Invalid password');
      }

      // สร้าง JWT token
      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return success(h, { token });
    } catch (err) {
      return error(h, err.message);
    }
  },
};

module.exports = { loginUser };
