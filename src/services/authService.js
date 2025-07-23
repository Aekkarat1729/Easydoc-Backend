const { PrismaClient } = require('@prisma/client');
const jwt = require('../utils/jwt');
const prisma = new PrismaClient();

const getUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

const createUser = async (data) => {
  return prisma.user.create({ data });
};

const generateToken = (user) => {
  return jwt.sign({ userId: user.id, role: user.role });
};

module.exports = {
  getUserByEmail,
  createUser,
  generateToken,
};
