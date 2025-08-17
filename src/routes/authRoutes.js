const { loginUser } = require('../controllers/authController');

module.exports = [
  {
    method: 'POST',
    path: '/auth/login',
    options: loginUser, // ใช้ options ที่กำหนด payload ไว้ใน controller แล้ว
  },
  // เพิ่ม route อื่น ๆ ได้ตามต้องการ
];
