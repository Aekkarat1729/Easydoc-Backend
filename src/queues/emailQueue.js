const Bull = require('bull');
const emailService = require('../services/emailService');

// สร้าง Queue สำหรับส่งอีเมล
const emailQueue = new Bull('email-notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  },
  defaultJobOptions: {
    attempts: 3, // พยายามส่งซ้ำ 3 ครั้งถ้าล้มเหลว
    backoff: {
      type: 'exponential',
      delay: 5000 // เพิ่มเป็น 5 วินาที
    },
    removeOnComplete: 100, // เก็บประวัติงานที่สำเร็จไว้ 100 งาน
    removeOnFail: 500, // เก็บประวัติงานที่ล้มเหลวไว้ 500 งาน
    timeout: 60000 // เพิ่ม timeout เป็น 60 วินาที
  }
});

// Process: ส่งอีเมลแจ้งเตือนเอกสาร
emailQueue.process('send-document-notification', async (job) => {
  const { recipientEmail, recipientName, documentTitle, senderName, documentType } = job.data;
  
  console.log(`📧 [Queue] Processing email to: ${recipientEmail}`);
  
  try {
    const result = await emailService.sendDocumentNotification(
      recipientEmail,
      recipientName,
      documentTitle,
      senderName,
      documentType
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log(`✅ [Queue] Email sent successfully to: ${recipientEmail}`);
    return result;
    
  } catch (error) {
    console.error(`❌ [Queue] Failed to send email to ${recipientEmail}:`, error.message);
    throw error; // Bull จะทำการ retry ตาม config
  }
});

// Process: ส่งอีเมลหลายคนพร้อมกัน
emailQueue.process('send-bulk-notification', async (job) => {
  const { recipients, documentTitle, senderName, documentType } = job.data;
  
  console.log(`📧 [Queue] Processing bulk emails for ${recipients.length} recipients`);
  
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await emailService.sendDocumentNotification(
        recipient.email,
        recipient.name,
        documentTitle,
        senderName,
        documentType
      );
      
      results.push({
        ...result,
        recipientEmail: recipient.email
      });
      
      // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ spam
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ [Queue] Failed to send to ${recipient.email}:`, error.message);
      results.push({
        success: false,
        error: error.message,
        recipientEmail: recipient.email
      });
    }
  }
  
  console.log(`✅ [Queue] Bulk email completed: ${results.filter(r => r.success).length}/${recipients.length} successful`);
  return results;
});

// Event Listeners
emailQueue.on('completed', (job, result) => {
  console.log(`✅ [Queue] Job ${job.id} completed successfully`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ [Queue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`⚠️ [Queue] Job ${job.id} has stalled`);
});

// Helper Functions
const addEmailToQueue = async (recipientEmail, recipientName, documentTitle, senderName, documentType = 'เอกสาร') => {
  try {
    const job = await emailQueue.add('send-document-notification', {
      recipientEmail,
      recipientName,
      documentTitle,
      senderName,
      documentType
    }, {
      priority: 1, // ความสำคัญสูง
      timeout: 60000, // เพิ่มเป็น 60 วินาที
      removeOnComplete: true, // ลบทันทีเมื่อสำเร็จ
      removeOnFail: false // เก็บไว้เพื่อ debug
    });
    
    console.log(`📋 [Queue] Email job added to queue: ${job.id}`);
    return {
      success: true,
      jobId: job.id
    };
    
  } catch (error) {
    console.error('❌ [Queue] Failed to add email to queue:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const addBulkEmailToQueue = async (recipients, documentTitle, senderName, documentType = 'เอกสาร') => {
  try {
    const job = await emailQueue.add('send-bulk-notification', {
      recipients,
      documentTitle,
      senderName,
      documentType
    }, {
      priority: 2, // ความสำคัญปานกลาง
      timeout: 60000 // timeout 60 วินาที
    });
    
    console.log(`📋 [Queue] Bulk email job added to queue: ${job.id}`);
    return {
      success: true,
      jobId: job.id
    };
    
  } catch (error) {
    console.error('❌ [Queue] Failed to add bulk email to queue:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ดูสถานะของ Queue
const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount()
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
};

// ล้าง Queue (ใช้เมื่อต้องการ reset)
const clearQueue = async () => {
  try {
    await emailQueue.empty();
    console.log('✅ Queue cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear queue:', error);
    return false;
  }
};

// Graceful shutdown
const closeQueue = async () => {
  try {
    await emailQueue.close();
    console.log('✅ Email queue closed');
  } catch (error) {
    console.error('❌ Error closing queue:', error);
  }
};

module.exports = {
  emailQueue,
  addEmailToQueue,
  addBulkEmailToQueue,
  getQueueStats,
  clearQueue,
  closeQueue
};
