const { uploadDocument, getDocumentById } = require('../controllers/documentController');

module.exports = [
  {
    method: 'POST',
    path: '/documents',
    options: {
      auth: 'jwt',
      payload: {
        maxBytes: 10485760,
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
        multipart: {
          output: 'file'
        }
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