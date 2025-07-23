// routes/documentRoutes.js
const { uploadDocument, getDocumentById } = require('../controllers/documentController');

module.exports = [
  {
    method: 'POST',
    path: '/documents',
    options: {
      auth: 'jwt',
      payload: {
        maxBytes: 10485760,  // ขีดจำกัดขนาดไฟล์ 10MB
        output: 'stream',
        parse: true,  // ใช้ parse เพื่อให้รับการส่ง multipart/form-data ได้
        allow: 'multipart/form-data'  // ยอมรับการส่งข้อมูลแบบ multipart/form-data
      },
      handler: uploadDocument.handler
    }
  },
  {
    method: 'GET',
    path: '/documents/{id}',
    options: getDocumentById
  },
];
