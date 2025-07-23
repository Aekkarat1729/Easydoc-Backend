const {
  createMailBox,
  getMailBoxById,
  updateMailBox,
  deleteMailBox
} = require('../controllers/mailBoxController');

module.exports = [
  {
    method: 'POST',
    path: '/mailboxes',
    options: createMailBox
  },
  {
    method: 'GET',
    path: '/mailboxes/{id}',
    options: getMailBoxById
  },
  {
    method: 'PUT',
    path: '/mailboxes/{id}',
    options: updateMailBox
  },
  {
    method: 'DELETE',
    path: '/mailboxes/{id}',
    options: deleteMailBox
  }
];
