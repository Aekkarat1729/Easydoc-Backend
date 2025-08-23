// src/services/userService.js
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { mapRoleToNumber, mapNumberToRole } = require('../utils/roleMapper');

const prisma = new PrismaClient();

/* ------------------------------ Helpers ------------------------------ */

function toEnumRole(input) {
  if (input == null) return undefined;

  if (typeof input === 'number' || /^[0-9]+$/.test(String(input))) {
    const mapped = mapNumberToRole(Number(input));
    if (!mapped) throw new Error('Invalid role number. Use 1=ADMIN, 2=OFFICER, 3=USER');
    return mapped;
  }

  const r = String(input).trim().toUpperCase();
  if (['ADMIN', 'OFFICER', 'USER'].includes(r)) return r;

  throw new Error('Invalid role. Use ADMIN/OFFICER/USER or 1/2/3');
}

function sanitizeUser(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return { ...rest, role: user.role, roleNumber: mapRoleToNumber(user.role), position: user.position, profileImage: user.profileImage };
}

/* ------------------------------- Services ------------------------------- */

// สำหรับ Officer/Admin ใช้กับ /userforofficer
const getUsersForOfficer = async () => {
  try {
    const users = await prisma.user.findMany({
  select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true }
    });
    return users;
  } catch (err) {
    throw new Error('Failed to fetch users for officer: ' + err.message);
  }
};

const getAllUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
  id: true, firstName: true, lastName: true, email: true,
  phoneNumber: true, role: true, position: true, profileImage: true, createdAt: true, updatedAt: true,
      }
    });
    return users.map(sanitizeUser);
  } catch (err) {
    throw new Error('Failed to fetch users: ' + err.message);
  }
};

const getUserById = async (id) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
  id: true, firstName: true, lastName: true, email: true,
  phoneNumber: true, role: true, position: true, profileImage: true, createdAt: true, updatedAt: true,
      }
    });
    if (!user) throw new Error('User not found');
    return sanitizeUser(user);
  } catch (err) {
    throw new Error('Failed to fetch user: ' + err.message);
  }
};

const createUser = async ({ firstName, lastName, email, phoneNumber, password, role, position = '' }) => {
  // หรือรับจาก destructuring parameter
  // const { position = '' } = arguments[0];
  // หรือถ้าแก้ parameter destructuring ให้รับ position ด้วย
  // const createUser = async ({ firstName, lastName, email, phoneNumber, password, role, position = '' }) => {
  // ...
  // }
  if (!firstName || !lastName || !email || !phoneNumber || !password || role == null) {
    throw new Error('Missing required fields');
  }
  try {
    const enumRole = toEnumRole(role);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { firstName, lastName, email, phoneNumber, password: hashedPassword, role: enumRole, position },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phoneNumber: true, role: true, position: true, profileImage: true, createdAt: true, updatedAt: true,
      }
    });
    return sanitizeUser(user);
  } catch (err) {
    if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
      throw new Error('Email already exists');
    }
    throw new Error('Failed to create user: ' + err.message);
  }
};

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
        id: true, firstName: true, lastName: true, email: true,
        phoneNumber: true, role: true, position: true, profileImage: true, createdAt: true, updatedAt: true,
      }
    });
    return sanitizeUser(user);
  } catch (err) {
    if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
      throw new Error('Email already exists');
    }
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

// ใช้ตอน login
const getUserByEmail = async (email) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phoneNumber: true, password: true, role: true, position: true, profileImage: true,
        createdAt: true, updatedAt: true,
      }
    });
    if (!user) throw new Error('User not found');
    return user;
  } catch (err) {
    throw new Error('Failed to fetch user by email: ' + err.message);
  }
};

module.exports = {
  getUsersForOfficer,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
};
