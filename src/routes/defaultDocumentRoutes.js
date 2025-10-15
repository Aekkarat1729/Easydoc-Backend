const { uploadDefaultDocument, listDefaultDocuments, listAllDefaultDocuments, getDefaultDocument, deleteDefaultDocumentHandler, updateDefaultDocumentHandler } = require('../controllers/defaultDocumentController');

module.exports = [
  {
    method: 'POST',
    path: '/defaultdocument/upload',
    options: {
      auth: 'jwt',
      payload: {
        output: 'file',
        parse: true,
        allow: 'multipart/form-data',
        maxBytes: 10 * 1024 * 1024 // 10MB
      },
      handler: uploadDefaultDocument
    }
  },
  {
    method: 'GET',
    path: '/defaultdocument',
    options: {
      auth: 'jwt',
      handler: listAllDefaultDocuments  // เปลี่ยนให้ใช้ listAllDefaultDocuments สำหรับ download page
    }
  },
  {
    method: 'GET',
    path: '/defaultdocument/user',
    options: {
      auth: 'jwt',
      handler: listDefaultDocuments  // endpoint ใหม่สำหรับ user-specific documents
    }
  },
  {
    method: 'GET',
    path: '/defaultdocument/{id}',
    options: {
      auth: 'jwt',
      handler: getDefaultDocument
    }
  },
  {
    method: 'DELETE',
    path: '/defaultdocument/{id}',
    options: {
      auth: 'jwt',
      handler: deleteDefaultDocumentHandler
    }
  },
  {
    method: 'PUT',
    path: '/defaultdocument/{id}',
    options: {
      auth: 'jwt',
      handler: updateDefaultDocumentHandler
    }
  },
];
