const { uploadDefaultDocument, listDefaultDocuments, getDefaultDocument } = require('../controllers/defaultDocumentController');

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
      handler: listDefaultDocuments
    }
  },
  {
    method: 'GET',
    path: '/defaultdocument/{id}',
    options: {
      auth: 'jwt',
      handler: getDefaultDocument
    }
  }
];
