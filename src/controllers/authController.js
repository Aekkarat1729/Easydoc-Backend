// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const { success, error } = require('../utils/responseFormatter');
const jwt = require('jsonwebtoken');
const { mapRoleToNumber } = require('../utils/roleMapper');
const { id } = require('zod/v4/locales');

// ฟังก์ชัน login
const loginUser = {
  auth: false,
  tags: ['api', 'auth'],
  // รองรับทั้ง JSON, x-www-form-urlencoded และ form-data (field เท่านั้น)
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

      // ดึง user (รวม password สำหรับตรวจ)
      const user = await userService.getUserByEmail(email);
      if (!user) {
        return error(h, 'User not found', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return error(h, 'Invalid password', 401);
      }

      // สร้าง JWT token (เก็บ role เป็น string เอาไว้ใน token เพื่อความชัดเจน)
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );

      // แปลง role string -> number สำหรับ frontend ที่ต้องการตัวเลข
      const roleNumber = mapRoleToNumber(user.role);

      // ส่งข้อมูลที่ต้องการกลับไป
      return success(h, {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,        // string: 'ADMIN'|'OFFICER'|'USER' (เก็บไว้ด้วย)
        roleNumber,             // number: 1|2|3 เพื่อ frontend ใช้ง่าย
        email: user.email,
        token
      });
    } catch (err) {
      console.error('LOGIN_ERROR:', err);
      return error(h, err.message || 'Internal Server Error', 500);
    }
  },
};



module.exports = { loginUser };
