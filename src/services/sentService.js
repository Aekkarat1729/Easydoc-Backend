const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendDocument = async (data) => {
  try {
    return await prisma.sent.create({
      data
    });
  } catch (err) {
    throw new Error('Failed to send document: ' + err.message);
  }
};

module.exports = { sendDocument };
