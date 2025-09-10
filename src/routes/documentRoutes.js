// documentRoutes.js
const { uploadDocument, getDocumentById, deleteDocument, updateDocument } = require('../controllers/documentController');

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
  {
    method: 'DELETE',
    path: '/documents/{id}',
    options: deleteDocument
  },
  {
    method: 'PUT',
    path: '/documents/{id}',
    options: {
      auth: 'jwt',
      payload: {
        maxBytes: 10 * 1024 * 1024,
        output: 'file',
        parse: true,
        allow: 'multipart/form-data',
        multipart: { output: 'file' }
      },
      handler: updateDocument.handler
    }
  },
];
