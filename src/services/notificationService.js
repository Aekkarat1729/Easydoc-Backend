const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NotificationService {
  static async createNotification(userId, type, title, message, data = null) {
    try {

      if (!userId) {
        throw new Error('userId is required for creating notification');
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          isRead: false
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const notification = await prisma.notification.update({
        where: { 
          id: notificationId,
          userId: userId 
        },
        data: { isRead: true }
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: { 
          userId,
          isRead: false
        },
        data: { isRead: true }
      });

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await prisma.notification.delete({
        where: { 
          id: notificationId,
          userId: userId 
        }
      });

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const count = await prisma.notification.count({
        where: { 
          userId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  static async cleanupOldNotifications(userId, keepCount = 100) {
    try {
      const oldNotifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: keepCount,
        select: { id: true }
      });

      if (oldNotifications.length > 0) {
        const idsToDelete = oldNotifications.map(n => n.id);
        const result = await prisma.notification.deleteMany({
          where: { 
            id: { in: idsToDelete },
            userId
          }
        });

        return result;
      }

      return { count: 0 };
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;