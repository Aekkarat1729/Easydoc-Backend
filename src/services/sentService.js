// src/services/sentService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendDocument = async (data) => {
  try {
    if (data.isForwarded && data.parentSentId) {
      return await prisma.sent.create({
        data: {
          documentId: data.documentId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          number: data.number,
          category: data.category,
          description: data.description,
          status: data.status,
          isForwarded: true,
          parentSentId: data.parentSentId,
          forwarded: { connect: { id: data.parentSentId } },
          sentAt: new Date(),
        }
      });
    } else {
      return await prisma.sent.create({
        data: {
          documentId: data.documentId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          number: data.number,
          category: data.category,
          description: data.description,
          status: data.status,
          sentAt: new Date(),
        }
      });
    }
  } catch (err) {
    throw new Error('Failed to send document: ' + err.message);
  }
};

module.exports = { sendDocument };
