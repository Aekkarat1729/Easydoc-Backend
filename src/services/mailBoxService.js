const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createMailBox = async (data) => {
  try {
    return await prisma.mailBox.create({
      data
    });
  } catch (err) {
    throw new Error('Failed to create mailbox: ' + err.message);
  }
};

const getMailBoxById = async (id) => {
  try {
    const mailBox = await prisma.mailBox.findUnique({ where: { id: Number(id) } });
    if (!mailBox) throw new Error('MailBox not found');
    return mailBox;
  } catch (err) {
    throw new Error('Failed to fetch mailbox: ' + err.message);
  }
};

const updateMailBox = async (id, data) => {
  try {
    return await prisma.mailBox.update({
      where: { id: Number(id) },
      data
    });
  } catch (err) {
    throw new Error('Failed to update mailbox: ' + err.message);
  }
};

const deleteMailBox = async (id) => {
  try {
    await prisma.mailBox.delete({ where: { id: Number(id) } });
    return { message: 'MailBox deleted' };
  } catch (err) {
    throw new Error('Failed to delete mailbox: ' + err.message);
  }
};

module.exports = { createMailBox, getMailBoxById, updateMailBox, deleteMailBox };
