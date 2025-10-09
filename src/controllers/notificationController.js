const NotificationService = require('../services/notificationService');
const NotificationEmitter = require('../utils/notificationEmitter');

const getNotifications = {
  auth: 'jwt',
  tags: ['api', 'notification'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const { limit = 20, offset = 0 } = request.query || {};

      const notifications = await NotificationService.getUserNotifications(
        userId, 
        Number(limit), 
        Number(offset)
      );

      return h.response({
        success: true,
        data: notifications,
        count: notifications.length
      }).code(200);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to fetch notifications'
      }).code(500);
    }
  }
};

const getUnreadCount = {
  auth: 'jwt',
  tags: ['api', 'notification'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const count = await NotificationService.getUnreadCount(userId);

      return h.response({
        success: true,
        count
      }).code(200);

    } catch (error) {
      console.error('Error fetching unread count:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to fetch unread count'
      }).code(500);
    }
  }
};

const markAsRead = {
  auth: 'jwt',
  tags: ['api', 'notification'],
  payload: {
    output: 'data',
    parse: true,
    allow: ['application/json'],
  },
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const notificationId = Number(request.params.id);

      const notification = await NotificationService.markAsRead(notificationId, userId);

      await NotificationEmitter.updateUnreadCount(userId);

      return h.response({
        success: true,
        data: notification
      }).code(200);

    } catch (error) {
      console.error('Error marking notification as read:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to mark notification as read'
      }).code(500);
    }
  }
};

const markAllAsRead = {
  auth: 'jwt',
  tags: ['api', 'notification'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;

      const result = await NotificationService.markAllAsRead(userId);

      await NotificationEmitter.updateUnreadCount(userId);

      return h.response({
        success: true,
        data: result
      }).code(200);

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to mark all notifications as read'
      }).code(500);
    }
  }
};

const deleteNotification = {
  auth: 'jwt',
  tags: ['api', 'notification'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const notificationId = Number(request.params.id);

      const result = await NotificationService.deleteNotification(notificationId, userId);

      await NotificationEmitter.updateUnreadCount(userId);

      return h.response({
        success: true,
        data: result
      }).code(200);

    } catch (error) {
      console.error('Error deleting notification:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to delete notification'
      }).code(500);
    }
  }
};

const cleanupOld = {
  auth: 'jwt',
  tags: ['api', 'notification'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const { keepCount = 100 } = request.query || {};

      const result = await NotificationService.cleanupOldNotifications(userId, Number(keepCount));

      return h.response({
        success: true,
        data: result,
        message: `Cleaned up ${result.count} old notifications`
      }).code(200);

    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to cleanup notifications'
      }).code(500);
    }
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOld
};