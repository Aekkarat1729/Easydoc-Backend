const admin = require('../config/firebase');
const { createDefaultDocument, getDefaultDocumentsByUser, getDefaultDocumentById } = require('../services/defaultDocumentService');
const path = require('path');

const uploadDefaultDocument = async (request, h) => {
  try {
    const { file } = request.payload;
    const userId = request.auth.credentials.userId;
    if (!file) return h.response({ success: false, message: 'No file uploaded' }).code(400);

    if (!file || !file.path || !file.filename) {
      return h.response({ success: false, message: 'No file uploaded or missing filename.' }).code(400);
    }
    const ext = path.extname(file.filename);
    const fileType = ext.replace('.', '');
    const fileName = `${Date.now()}_${file.filename}`;
    const firebasePath = `defaultdocument/${fileName}`;

    // Upload to Firebase Storage (ใช้ไฟล์ temp path แบบ document ปกติ)
    const bucket = admin.storage().bucket();
    await bucket.upload(file.path, {
      destination: firebasePath,
      resumable: false,
      metadata: {
        contentType: file.headers?.['content-type'] || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
      },
    });
    const blob = bucket.file(firebasePath);
    await blob.makePublic();
    const fileUrl = blob.publicUrl();

    // ลบ temp file
    try { require('fs').unlinkSync(file.path); } catch (_) {}

    // Save to DB
    const doc = await createDefaultDocument({
      name: file.filename,
      fileType,
      fileUrl,
      userId
    });
    return h.response({ success: true, data: doc }).code(201);
  } catch (err) {
    console.error('Error uploading default document:', err);
    return h.response({ success: false, message: err.message }).code(500);
  }
};

const listDefaultDocuments = async (request, h) => {
  try {
    const userId = request.auth.credentials.userId;
    const docs = await getDefaultDocumentsByUser(userId);
    return h.response({ success: true, data: docs }).code(200);
  } catch (err) {
    return h.response({ success: false, message: err.message }).code(500);
  }
};

const getDefaultDocument = async (request, h) => {
  try {
    const { id } = request.params;
    const doc = await getDefaultDocumentById(id);
    if (!doc) return h.response({ success: false, message: 'Not found' }).code(404);
    return h.response({ success: true, data: doc }).code(200);
  } catch (err) {
    return h.response({ success: false, message: err.message }).code(500);
  }
};

module.exports = {
  uploadDefaultDocument,
  listDefaultDocuments,
  getDefaultDocument
};
