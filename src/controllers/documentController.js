require('dotenv').config();
const documentService = require('../services/documentService');
const { documentSchema, idParamSchema } = require('../validations/documentValidation');
const validateZod = require('../validations/validateZod');
const { success, created, notFound, error } = require('../utils/responseFormatter');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { PrismaClient } = require('@prisma/client');  // ติดตั้ง Prisma Client

const prisma = new PrismaClient();

// ฟังก์ชันอัปโหลดเอกสารแบบ Multipart HTTP
const uploadToUploadcare = async (filePath, originalFilename) => {
  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();

  form.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUBLIC_KEY);
  form.append('UPLOADCARE_STORE', '1'); // store permanently
  form.append('file', fileStream, originalFilename); // ระบุชื่อไฟล์ชัดเจน

  const response = await axios.post('https://upload.uploadcare.com/base/', form, {
    headers: form.getHeaders()
  });

  return response.data; // { file: uuid }
};

// ฟังก์ชันอัปโหลดเอกสาร
const uploadDocument = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: { payload: validateZod(documentSchema) },
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const file = request.payload.file;

      if (!file || !file.filename) {
        throw new Error('Failed to upload document: No file uploaded.');
      }

      const filenameParts = file.filename.split('.');
      const fileType = filenameParts.pop().toLowerCase();
      const name = filenameParts.join('.');

      if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg'].includes(fileType)) {
        throw new Error('Unsupported file type.');
      }

      // อัปโหลดแบบ multipart และได้ UUID กลับมา
      const result = await uploadToUploadcare(file.path, file.filename);
      const fileUuid = result.file;

      // สร้างลิงก์ CDN พร้อม modifier ตามชนิดไฟล์
      let fileUrl = `https://ucarecdn.com/${fileUuid}/`;

      if (fileType === 'jpg' || fileType === 'jpeg') {
        fileUrl += '/-/preview/';
      } else if (fileType === 'pdf') {
        fileUrl += '';
      } else if (fileType === 'doc' || fileType === 'docx') {
        fileUrl += '';
      }

      // บันทึกเอกสารลงในฐานข้อมูลด้วย Prisma
      const documentData = {
        name,
        fileType,
        fileUrl,
        userId,
        uploadedAt: new Date()
      };

      const document = await prisma.document.create({
        data: documentData
      });

      return created(h, document);
    } catch (err) {
      console.error('Error uploading document:', err);
      const tempFile = request.payload.file;
      if (tempFile && tempFile.path) {
        try {
          fs.unlinkSync(tempFile.path); // ลบไฟล์ temp
        } catch (unlinkErr) {
          console.error('Failed to delete temp file:', unlinkErr);
        }
      }
      return error(h, { success: false, message: err.message });
    }
  }
};

// ฟังก์ชันดึงเอกสารตาม ID
const getDocumentById = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: {
    params: validateZod(idParamSchema),
  },
  handler: async (request, h) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id: Number(request.params.id) }
      });
      if (!document) return notFound(h);
      return success(h, document);
    } catch (err) {
      return error(h, err.message);
    }
  }
};

module.exports = { uploadDocument, getDocumentById };
