const { PrismaClient } = require('@prisma/client');
const jwt = require('../utils/jwt'); // เผื่อไว้หากมีที่อื่นเรียกใช้ wrapper นี้
const prisma = new PrismaClient();

const getUserByEmail = async (email) => {
  // เลือกเฉพาะ field ที่จำเป็น (ต้องมี password สำหรับ compare)
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      password: true
    }
  });
};

const createUser = async (data) => {
  return prisma.user.create({ data });
};

// utility เผื่อใช้ภายนอก
const generateToken = (user) => {
  return jwt.sign({ userId: user.id, role: user.role });
};

module.exports = {
  getUserByEmail,
  createUser,
  generateToken,
};
