// controllers/documentController.js
const documentService = require('../services/documentService');
const { documentSchema, idParamSchema } = require('../validations/documentValidation');
const validateZod = require('../validations/validateZod');
const { success, created, notFound, error } = require('../utils/responseFormatter');

// ฟังก์ชันสำหรับอัปโหลดเอกสาร
const uploadDocument = {
  auth: 'jwt',  // ตรวจสอบ JWT
  tags: ['api', 'documents'],
  validate: { payload: validateZod(documentSchema) },
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;  // รับ userId จาก JWT
      const { name, fileType } = request.payload;  // รับข้อมูลจาก form
      const file = request.payload.file;  // รับไฟล์ที่อัปโหลด
      const documentData = { name, fileType, file, userId };  // เตรียมข้อมูลในการอัปโหลด
      const document = await documentService.uploadDocument(documentData); // อัปโหลดเอกสาร
      return created(h, document);  // ส่งคืนข้อมูลเอกสารที่ถูกอัปโหลด
    } catch (err) {
      return error(h, err.message);  // ส่งคืนข้อความผิดพลาด
    }
  }
};

// ฟังก์ชันดึงข้อมูลเอกสารตาม ID
const getDocumentById = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: {
    params: validateZod(idParamSchema),
  },
  handler: async (request, h) => {
    try {
      const document = await documentService.getDocumentById(Number(request.params.id));  // ค้นหาเอกสารตาม ID
      if (!document) return notFound(h);  // ถ้าไม่พบเอกสาร
      return success(h, document);  // ส่งคืนข้อมูลเอกสาร
    } catch (err) {
      return error(h, err.message);  // ส่งคืนข้อความผิดพลาด
    }
  }
};

module.exports = { uploadDocument, getDocumentById };
