const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultDocument({ name, fileType, fileUrl, userId }) {
  try {
    // Validate required fields
    if (!name || !fileType || !fileUrl || !userId) {
      const missing = [];
      if (!name) missing.push('name');
      if (!fileType) missing.push('fileType');
      if (!fileUrl) missing.push('fileUrl');
      if (!userId) missing.push('userId');
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate userId is a number
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      throw new Error('Invalid userId: must be a number');
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: { id: true }
    });

    if (!userExists) {
      throw new Error('User not found');
    }

    console.log('[createDefaultDocument] Creating document for user:', {
      userId: userIdNum,
      name,
      fileType,
      fileUrlLength: fileUrl.length
    });

    const document = await prisma.defaultDocument.create({
      data: { 
        name: name.trim(),
        fileType: fileType.toLowerCase().trim(),
        fileUrl,
        userId: userIdNum 
      }
    });

    console.log('[createDefaultDocument] Document created successfully:', document.id);
    return document;

  } catch (error) {
    console.error('[createDefaultDocument] Error:', error);
    
    // Re-throw with more specific error messages
    if (error.code === 'P2002') {
      throw new Error('A document with this name already exists');
    } else if (error.code === 'P2003') {
      throw new Error('Invalid user reference');
    } else if (error.message.includes('Missing required fields') || 
               error.message.includes('Invalid userId') ||
               error.message.includes('User not found')) {
      throw error; // Re-throw validation errors as-is
    } else {
      throw new Error('Failed to create document: Database error');
    }
  }
}

async function getDefaultDocumentsByUser(userId) {
  try {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      throw new Error('Invalid userId: must be a number');
    }

    console.log('[getDefaultDocumentsByUser] Fetching documents for user:', userIdNum);

    const documents = await prisma.defaultDocument.findMany({
      where: { userId: userIdNum },
      orderBy: { uploadedAt: 'desc' }
    });

    console.log('[getDefaultDocumentsByUser] Found documents:', documents.length);
    return documents;

  } catch (error) {
    console.error('[getDefaultDocumentsByUser] Error:', error);
    
    if (error.message.includes('Invalid userId')) {
      throw error;
    } else {
      throw new Error('Failed to fetch documents: Database error');
    }
  }
}

async function getDefaultDocumentById(id) {
  try {
    const docId = parseInt(id);
    if (isNaN(docId)) {
      throw new Error('Invalid document ID: must be a number');
    }

    console.log('[getDefaultDocumentById] Fetching document:', docId);

    const document = await prisma.defaultDocument.findUnique({
      where: { id: docId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return document;

  } catch (error) {
    console.error('[getDefaultDocumentById] Error:', error);
    
    if (error.message.includes('Invalid document ID') || 
        error.message.includes('Document not found')) {
      throw error;
    } else {
      throw new Error('Failed to fetch document: Database error');
    }
  }
}

async function deleteDefaultDocument(id) {
  try {
    const docId = parseInt(id);
    if (isNaN(docId)) {
      throw new Error('Invalid document ID: must be a number');
    }

    console.log('[deleteDefaultDocument] Deleting document:', docId);

    const document = await prisma.defaultDocument.delete({ 
      where: { id: docId } 
    });

    console.log('[deleteDefaultDocument] Document deleted successfully:', docId);
    return document;

  } catch (error) {
    console.error('[deleteDefaultDocument] Error:', error);
    
    if (error.code === 'P2025') {
      throw new Error('Document not found');
    } else if (error.message.includes('Invalid document ID')) {
      throw error;
    } else {
      throw new Error('Failed to delete document: Database error');
    }
  }
}

async function updateDefaultDocument(id, data) {
  try {
    const docId = parseInt(id);
    if (isNaN(docId)) {
      throw new Error('Invalid document ID: must be a number');
    }

    // Validate update data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid update data provided');
    }

    // Clean and validate the data
    const updateData = {};
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new Error('Name must be a non-empty string');
      }
      updateData.name = data.name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields provided for update');
    }

    console.log('[updateDefaultDocument] Updating document:', { id: docId, data: updateData });

    const document = await prisma.defaultDocument.update({
      where: { id: docId },
      data: updateData
    });

    console.log('[updateDefaultDocument] Document updated successfully:', docId);
    return document;

  } catch (error) {
    console.error('[updateDefaultDocument] Error:', error);
    
    if (error.code === 'P2025') {
      throw new Error('Document not found');
    } else if (error.message.includes('Invalid document ID') ||
               error.message.includes('Invalid update data') ||
               error.message.includes('Name must be') ||
               error.message.includes('No valid fields')) {
      throw error;
    } else {
      throw new Error('Failed to update document: Database error');
    }
  }
}

async function getAllDefaultDocuments() {
  try {
    console.log('[getAllDefaultDocuments] Fetching all default documents');

    const documents = await prisma.defaultDocument.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log('[getAllDefaultDocuments] Found documents:', documents.length);
    
    // เพิ่มข้อมูล fileSize และ format response
    const documentsWithFileSize = await Promise.all(
      documents.map(async (doc) => {
        let fileSize = null;
        
        // ลองดึง file size จาก URL (ถ้าเป็น Firebase Storage)
        try {
          if (doc.fileUrl) {
            const response = await fetch(doc.fileUrl, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            fileSize = contentLength ? parseInt(contentLength) : null;
          }
        } catch (error) {
          console.warn('[getAllDefaultDocuments] Could not fetch file size for:', doc.name);
        }
        
        return {
          id: doc.id,
          name: doc.name,
          fileType: doc.fileType,
          fileUrl: doc.fileUrl,
          fileSize: fileSize,
          uploadedAt: doc.uploadedAt,
          userId: doc.userId,
          uploader: {
            name: `${doc.user.firstName} ${doc.user.lastName}`,
            email: doc.user.email
          }
        };
      })
    );

    return documentsWithFileSize;

  } catch (error) {
    console.error('[getAllDefaultDocuments] Error:', error);
    throw new Error('Failed to fetch documents: Database error');
  }
}

module.exports = {
  createDefaultDocument,
  getDefaultDocumentsByUser,
  getAllDefaultDocuments,
  getDefaultDocumentById,
  deleteDefaultDocument,
  updateDefaultDocument
};
