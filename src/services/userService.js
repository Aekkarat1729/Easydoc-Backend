const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
const getAllUsers = async () => {
  try {
    return await prisma.user.findMany();
  } catch (err) {
    throw new Error('Failed to fetch users: ' + err.message);
  }
};

const getUserById = async (id) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) throw new Error('User not found');
    return user;
  } catch (err) {
    throw new Error('Failed to fetch user: ' + err.message);
  }
};

// ฟังก์ชันสำหรับสร้างผู้ใช้ใหม่
const createUser = async ({ firstName, lastName, email, phoneNumber, password, role }) => {
  if (!firstName || !lastName || !email || !phoneNumber || !password || !role) {
    throw new Error('Missing required fields');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // แฮชรหัสผ่านก่อนบันทึก

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber,
        password: hashedPassword, // ใช้รหัสผ่านที่แฮชแล้ว
        role
      }
    });
    return user;
  } catch (err) {
    throw new Error('Failed to create user: ' + err.message);
  }
};

const updateUser = async (id, data) => {
  try {
    return await prisma.user.update({
      where: { id: Number(id) },
      data
    });
  } catch (err) {
    throw new Error('Failed to update user: ' + err.message);
  }
};

const deleteUser = async (id) => {
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    return { message: 'User deleted' };
  } catch (err) {
    throw new Error('Failed to delete user: ' + err.message);
  }
};

const getUserByEmail = async (email) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');
    return user;
  } catch (err) {
    throw new Error('Failed to fetch user by email: ' + err.message);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, getUserByEmail };
