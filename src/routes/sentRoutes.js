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
  // ✅ ใหม่
  getSentChainById,
  getSentById,
  replyToSent,        // <== เพิ่ม handler ตอบกลับ
} = require('../controllers/sentController');

module.exports = [
  { method: 'POST',  path: '/sent',               options: sendDocumentWithFile },
  { method: 'POST',  path: '/sent/forward',       options: forwardDocument },
  // ✅ ใหม่: ตอบกลับ
  { method: 'POST',  path: '/sent/reply',         options: replyToSent },

  { method: 'PATCH', path: '/sent/{id}/status',   options: updateSentStatus },

  // ✅ chain แบบเต็ม (ancestor + descendants)
  { method: 'GET',   path: '/sent/chain/{id}',    options: getSentChainById },

  // ของเดิม
  { method: 'GET',   path: '/sent/{id}/thread',   options: getThreadBySentId },
  { method: 'GET',   path: '/sent/{id}/history',  options: getStatusHistory },
  { method: 'GET',   path: '/allmail',            options: getAllMail },
  { method: 'GET',   path: '/inbox',              options: getInbox },
  { method: 'GET',   path: '/sentmail',           options: getSentMail },

  // ✅ ดึงรายการเดียว
  { method: 'GET',   path: '/sent/{id}',          options: getSentById },
];
