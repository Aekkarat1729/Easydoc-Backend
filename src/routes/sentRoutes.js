// src/routes/sentRoutes.js
const {
  sendDocumentWithFile,
  forwardDocument,
  updateSentStatus,
  getThreadBySentId,
  getStatusHistory,
  getAllMail,
  getInbox,
  getSentMail,
  // ใหม่
  getSentChainById,
  getSentById,
  replyToSent,
} = require('../controllers/sentController');

module.exports = [
  { method: 'POST',  path: '/sent',               options: sendDocumentWithFile },
  { method: 'POST',  path: '/sent/forward',       options: forwardDocument },
  { method: 'POST',  path: '/sent/reply',         options: replyToSent },

  { method: 'PATCH', path: '/sent/{id}/status',   options: updateSentStatus },

  { method: 'GET',   path: '/sent/chain/{id}',    options: getSentChainById },
  { method: 'GET',   path: '/sent/{id}/thread',   options: getThreadBySentId },
  { method: 'GET',   path: '/sent/{id}/history',  options: getStatusHistory },
  { method: 'GET',   path: '/allmail',            options: getAllMail },
  { method: 'GET',   path: '/inbox',              options: getInbox },
  { method: 'GET',   path: '/sentmail',           options: getSentMail },

  { method: 'GET',   path: '/sent/{id}',          options: getSentById },
];
