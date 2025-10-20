const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');
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

  // ฟังก์ชันใหม่สำหรับสร้างแจ้งเตือนเอกสารใหม่พร้อมส่งอีเมล
  static async createDocumentNotification(recipientUserId, senderUserId, documentTitle, documentType = 'เอกสาร') {
    try {
      // ดึงข้อมูล recipient และ sender
      const [recipient, sender] = await Promise.all([
        prisma.user.findUnique({
          where: { id: recipientUserId },
          select: { id: true, firstName: true, lastName: true, email: true }
        }),
        prisma.user.findUnique({
          where: { id: senderUserId },
          select: { id: true, firstName: true, lastName: true, email: true }
        })
      ]);

      if (!recipient || !sender) {
        throw new Error('Recipient or sender not found');
      }

      const recipientName = `${recipient.firstName} ${recipient.lastName}`;
      const senderName = `${sender.firstName} ${sender.lastName}`;

      // สร้างแจ้งเตือนในระบบ
      const notification = await this.createNotification(
        recipientUserId,
        'DOCUMENT_RECEIVED',
        '📄 มีเอกสารใหม่เข้าระบบ',
        `คุณได้รับเอกสาร "${documentTitle}" จาก ${senderName}`,
        {
          documentTitle,
          documentType,
          senderId: senderUserId,
          senderName,
          timestamp: new Date().toISOString()
        }
      );

      // ส่งอีเมลแจ้งเตือน (รอให้ส่งเสร็จก่อน)
      try {
        const emailResult = await emailService.sendDocumentNotification(
          recipient.email,
          recipientName,
          documentTitle,
          senderName,
          documentType
        );

        if (emailResult.success) {
          console.log(`✅ Email notification sent to ${recipient.email}`);
        } else {
          console.error(`❌ Failed to send email to ${recipient.email}:`, emailResult.error);
        }
      } catch (error) {
        console.error(`❌ Email notification error for ${recipient.email}:`, error);
      }

      return {
        notification,
        recipient: {
          id: recipient.id,
          name: recipientName,
          email: recipient.email
        },
        sender: {
          id: sender.id,
          name: senderName,
          email: sender.email
        }
      };

    } catch (error) {
      console.error('Error creating document notification:', error);
      throw error;
    }
  }

  // ส่งแจ้งเตือนหลายคนพร้อมกัน
  static async createBulkDocumentNotifications(recipientUserIds, senderUserId, documentTitle, documentType = 'เอกสาร') {
    try {
      const results = [];

      for (const recipientId of recipientUserIds) {
        try {
          const result = await this.createDocumentNotification(
            recipientId,
            senderUserId,
            documentTitle,
            documentType
          );
          results.push(result);
        } catch (error) {
          console.error(`Failed to create notification for user ${recipientId}:`, error);
          results.push({
            error: error.message,
            recipientId
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error creating bulk document notifications:', error);
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
      // ตรวจสอบว่า notification มีอยู่จริงและเป็นของ user หรือไม่
      const existingNotification = await prisma.notification.findFirst({
        where: { 
          id: notificationId,
          userId: userId 
        }
      });

      if (!existingNotification) {
        console.warn(`Notification ${notificationId} not found for user ${userId}`);
        // return null หรือ throw error ตามต้องการ
        return null;
      }

      if (existingNotification.isRead) {
        console.log(`Notification ${notificationId} is already marked as read`);
        return existingNotification;
      }

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

  static async updateNotificationData(notificationId, data) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { 
          data: data ? JSON.stringify(data) : null 
        }
      });

      return notification;
    } catch (error) {
      console.error('Error updating notification data:', error);
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