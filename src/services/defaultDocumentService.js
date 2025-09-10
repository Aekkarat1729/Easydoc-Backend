const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultDocument({ name, fileType, fileUrl, userId }) {
  return await prisma.defaultDocument.create({
    data: { name, fileType, fileUrl, userId }
  });
}

async function getDefaultDocumentsByUser(userId) {
  return await prisma.defaultDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: 'desc' }
  });
}

async function getDefaultDocumentById(id) {
  return await prisma.defaultDocument.findUnique({
    where: { id: Number(id) }
  });
}

async function deleteDefaultDocument(id) {
  return await prisma.defaultDocument.delete({ where: { id: Number(id) } });
}

async function updateDefaultDocument(id, data) {
  return await prisma.defaultDocument.update({
    where: { id: Number(id) },
    data
  });
}

module.exports = {
  createDefaultDocument,
  getDefaultDocumentsByUser,
  getDefaultDocumentById,
  deleteDefaultDocument,
  updateDefaultDocument
};
