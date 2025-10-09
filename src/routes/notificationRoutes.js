const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOld
} = require('../controllers/notificationController');

module.exports = [
  {
    method: 'GET',
    path: '/notifications',
    options: getNotifications
  },
  {
    method: 'GET',
    path: '/notifications/unread-count',
    options: getUnreadCount
  },
  {
    method: 'PUT',
    path: '/notifications/{id}/read',
    options: markAsRead
  },
  {
    method: 'PUT',
    path: '/notifications/mark-all-read',
    options: markAllAsRead
  },
  {
    method: 'DELETE',
    path: '/notifications/{id}',
    options: deleteNotification
  },
  {
    method: 'DELETE',
    path: '/notifications/cleanup',
    options: cleanupOld
  }
];