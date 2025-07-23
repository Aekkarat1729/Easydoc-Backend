const {
  sendDocument
} = require('../controllers/sentController');

module.exports = [
  {
    method: 'POST',
    path: '/sent',
    options: sendDocument
  }
];
