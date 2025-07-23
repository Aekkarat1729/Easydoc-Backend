const { loginUser } = require('../controllers/authController');  // นำเข้าฟังก์ชัน loginUser จาก authController

module.exports = [
  {
    method: 'POST',
    path: '/auth/login',
    options: loginUser,  // กำหนด handler สำหรับ POST /auth/login เป็น loginUser
  },
  
  // คุณสามารถเพิ่ม route อื่น ๆ สำหรับการลงทะเบียน หรือฟังก์ชันที่เกี่ยวข้องกับผู้ใช้ได้ที่นี่
];
