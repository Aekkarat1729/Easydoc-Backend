// src/services/userService.js
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { mapRoleToNumber, mapNumberToRole } = require('../utils/roleMapper');

const prisma = new PrismaClient();

/* ------------------------------ Helpers ------------------------------ */

// แปลงอินพุต role (string/number) -> enum string ของ Prisma
function toEnumRole(input) {
  if (input == null) return undefined;

  // ถ้าเป็นเลขหรือสตริงตัวเลข
  if (typeof input === 'number' || /^[0-9]+$/.test(String(input))) {
    const mapped = mapNumberToRole(Number(input));
    if (!mapped) throw new Error('Invalid role number. Use 1=ADMIN, 2=OFFICER, 3=USER');
    return mapped;
  }

  // ถ้าเป็นข้อความ
  const r = String(input).trim().toUpperCase();
  if (['ADMIN', 'OFFICER', 'USER'].includes(r)) return r;

  throw new Error('Invalid role. Use ADMIN/OFFICER/USER or 1/2/3');
}

// ตัด password ออกจากผลลัพธ์ + เพิ่ม roleNumber เพื่อให้ง่ายกับ frontend
function sanitizeUser(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return {
    ...rest,
    roleNumber: mapRoleToNumber(user.role), // 1|2|3
  };
}

/* ------------------------------- Services ------------------------------- */

// ดึงข้อมูลผู้ใช้ทั้งหมด (ไม่คืน password)
const getAllUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    return users.map(sanitizeUser);
  } catch (err) {
    throw new Error('Failed to fetch users: ' + err.message);
  }
};

// ดึงข้อมูลผู้ใช้ตาม id (ไม่คืน password)
const getUserById = async (id) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!user) throw new Error('User not found');
    return sanitizeUser(user);
  } catch (err) {
    throw new Error('Failed to fetch user: ' + err.message);
  }
};

// สร้างผู้ใช้ใหม่ (รับ role ได้ทั้งเลขและข้อความ), แฮชรหัสก่อนบันทึก
const createUser = async ({ firstName, lastName, email, phoneNumber, password, role }) => {
  if (!firstName || !lastName || !email || !phoneNumber || !password || role == null) {
    throw new Error('Missing required fields');
  }

  try {
    const enumRole = toEnumRole(role);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber,
        password: hashedPassword,
        role: enumRole,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return sanitizeUser(user);
  } catch (err) {
    throw new Error('Failed to create user: ' + err.message);
  }
};

// อัปเดตผู้ใช้ (ถ้ามี password ใหม่ให้แฮช, ถ้ามี role ใหม่รับได้ทั้งเลขและข้อความ)
const updateUser = async (id, data) => {
  try {
    const updateData = { ...data };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (updateData.role != null) {
      updateData.role = toEnumRole(updateData.role);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return sanitizeUser(user);
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

// ใช้ตอน login: ต้องคืน password เพื่อ compare
const getUserByEmail = async (email) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        password: true, // ต้องมีสำหรับ bcrypt.compare
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) throw new Error('User not found');
    return user; // **อย่าตัด password ที่นี่** authController ต้องใช้ compare
  } catch (err) {
    throw new Error('Failed to fetch user by email: ' + err.message);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
};
