const NotificationService = require('../services/notificationService');

class NotificationEmitter {
  static io = null;

  static setSocketIO(io) {
    this.io = io;
  }

  static async emitToUser(userId, notification) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', notification);
      
      await this.updateUnreadCount(userId);
    }
  }

  static async emitToUsers(userIds, notification) {
    if (this.io && Array.isArray(userIds)) {
      userIds.forEach(userId => {
        this.io.to(`user_${userId}`).emit('notification', notification);
      });
    }
  }

  static async notifyDocumentReceived(receiverId, senderName, documentTitle, sentId) {
    try {
      const notification = await NotificationService.createNotification(
        receiverId,
        'document_received',
        'มีเอกสารใหม่',
        `${senderName} ส่งเอกสาร "${documentTitle}" มาให้คุณ`,
        { sentId, type: 'document_received' }
      );
      
      await this.emitToUser(receiverId, notification);
      return notification;
    } catch (error) {
      throw error;
    }
  }

  static async notifyDocumentReplied(originalSenderId, replierName, documentTitle, sentId) {
    try {
      const notification = await NotificationService.createNotification(
        originalSenderId,
        'document_replied',
        'มีการตอบกลับเอกสาร',
        `${replierName} ตอบกลับเอกสาร "${documentTitle}" ของคุณแล้ว`,
        { sentId, type: 'document_replied' }
      );
      
      await this.emitToUser(originalSenderId, notification);
      return notification;
    } catch (error) {
    }
  }

  static async notifyDocumentForwarded(originalSenderId, forwarderName, receiverName, documentTitle, sentId) {
    try {
      const notification = await NotificationService.createNotification(
        originalSenderId,
        'document_forwarded',
        'เอกสารถูกส่งต่อ',
        `${forwarderName} ส่งต่อเอกสาร "${documentTitle}" ของคุณไปให้ ${receiverName}`,
        { sentId, type: 'document_forwarded' }
      );
      
      await this.emitToUser(originalSenderId, notification);
      return notification;
    } catch (error) {
    }
  }

  static async notifyDocumentStatusChanged(userId, changerName, documentTitle, oldStatus, newStatus, sentId) {
    try {
      const statusMap = {
        'PENDING': 'รอดำเนินการ',
        'SENT': 'ส่งแล้ว',
        'RECEIVED': 'ได้รับแล้ว',
        'READ': 'อ่านแล้ว',
        'DONE': 'เสร็จสิ้น',
        'ARCHIVED': 'เก็บถาวร'
      };

      const notification = await NotificationService.createNotification(
        userId,
        'status_changed',
        'สถานะเอกสารเปลี่ยนแปลง',
        `${changerName} เปลี่ยนสถานะเอกสาร "${documentTitle}" จาก ${statusMap[oldStatus]} เป็น ${statusMap[newStatus]}`,
        { sentId, oldStatus, newStatus, type: 'status_changed' }
      );
      
      await this.emitToUser(userId, notification);
      return notification;
    } catch (error) {
    }
  }

  static async notifySystemAlert(userIds, title, message, data = null) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        const notification = await NotificationService.createNotification(
          userId,
          'system_alert',
          title,
          message,
          { ...data, type: 'system_alert' }
        );
        notifications.push(notification);
      }
      
      await this.emitToUsers(userIds, notifications[0]);
      
      return notifications;
    } catch (error) {
    }
  }

  static async updateUnreadCount(userId) {
    try {
      const count = await NotificationService.getUnreadCount(userId);
      
      if (this.io) {
        this.io.to(`user_${userId}`).emit('unread_count_updated', { count });
      }
      
      return count;
    } catch (error) {
    }
  }
}

module.exports = NotificationEmitter;