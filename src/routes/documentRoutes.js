// documentRoutes.js
const { uploadDocument, getDocumentById } = require('../controllers/documentController');

module.exports = [
  {
    method: 'POST',
    path: '/documents',
    options: {
      auth: 'jwt',
      payload: {
        maxBytes: 10 * 1024 * 1024, // 10MB
        output: 'file',             // ให้ Hapi เขียนเป็นไฟล์ temp แล้วให้ path
        parse: true,
        allow: 'multipart/form-data',
        multipart: { output: 'file' }
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
