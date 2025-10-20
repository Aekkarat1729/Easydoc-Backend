const { getQueueStats, clearQueue } = require('../queues/emailQueue');
const isAdmin = require('../utils/isAdmin');

const routes = [
  // ดูสถานะของ Email Queue (เฉพาะ Admin)
  {
    method: 'GET',
    path: '/api/queue/stats',
    options: {
      auth: 'jwt',
      tags: ['queue'],
      pre: [isAdmin],
      description: 'Get email queue statistics',
    },
    handler: async (request, h) => {
      try {
        const stats = await getQueueStats();
        
        if (!stats) {
          return h.response({
            success: false,
            message: 'Failed to get queue statistics'
          }).code(500);
        }
        
        return h.response({
          success: true,
          data: stats,
          message: 'Queue statistics retrieved successfully'
        }).code(200);
        
      } catch (error) {
        console.error('Error getting queue stats:', error);
        return h.response({
          success: false,
          message: 'Failed to retrieve queue statistics',
          error: error.message
        }).code(500);
      }
    }
  },

  // ล้าง Queue (เฉพาะ Admin - ใช้ระวัง!)
  {
    method: 'POST',
    path: '/api/queue/clear',
    options: {
      auth: 'jwt',
      tags: ['queue'],
      pre: [isAdmin],
      description: 'Clear all jobs from email queue',
    },
    handler: async (request, h) => {
      try {
        const result = await clearQueue();
        
        if (!result) {
          return h.response({
            success: false,
            message: 'Failed to clear queue'
          }).code(500);
        }
        
        return h.response({
          success: true,
          message: 'Queue cleared successfully'
        }).code(200);
        
      } catch (error) {
        console.error('Error clearing queue:', error);
        return h.response({
          success: false,
          message: 'Failed to clear queue',
          error: error.message
        }).code(500);
      }
    }
  }
];

module.exports = routes;
