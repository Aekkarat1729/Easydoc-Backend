const { PrismaClient } = require('@prisma/client');
const NotificationService = require('../services/notificationService');

const prisma = new PrismaClient();

const getDashboardData = {
  auth: 'jwt',
  tags: ['api', 'dashboard'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;

      // Get stats for documents received by user
      const receivedDocs = await prisma.sent.findMany({
        where: { receiverId: userId },
        select: {
          id: true,
          status: true,
          threadId: true,
          isForwarded: true
        }
      });

      // Calculate stats
      let waitingReply = 0;
      let sentReply = 0;
      let sentForward = 0;
      let alreadySent = 0;

      for (const doc of receivedDocs) {
        // Check if has reply
        const hasReply = await prisma.sent.findFirst({
          where: {
            parentSentId: doc.id,
            isForwarded: false
          }
        });

        // Check if has forward
        const hasForward = await prisma.sent.findFirst({
          where: {
            parentSentId: doc.id,
            isForwarded: true
          }
        });

        if (hasReply) {
          sentReply++;
        } else if (hasForward) {
          sentForward++;
        } else if (['SENT', 'RECEIVED'].includes(doc.status)) {
          waitingReply++;
        } else if (doc.status === 'DONE') {
          alreadySent++;
        }
      }

      const stats = {
        'กำลังรอตอบกลับ': { count: waitingReply },
        'ตอบกลับแล้ว': { count: sentReply },
        'ส่งต่อแล้ว': { count: sentForward },
        'ส่งถึงแล้ว': { count: alreadySent }
      };

      // Get recent documents (inbox)
      const recentDocuments = await prisma.sent.findMany({
        where: { receiverId: userId },
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } }
        },
        orderBy: { sentAt: 'desc' },
        take: 3
      });

      // Enrich documents with file sizes
      const enrichedRecentDocuments = await Promise.all(
        recentDocuments.map(async (doc) => {
          const docIds = doc.documentIds?.length ? doc.documentIds : [doc.documentId];
          const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
          const docsWithSize = await Promise.all(docs.map(async d => {
            try {
              const res = await fetch(d.fileUrl, { method: 'HEAD' });
              const size = res.headers.get('content-length');
              return { ...d, fileSize: size ? Number(size) : null };
            } catch { return { ...d, fileSize: null }; }
          }));

          return {
            ...doc,
            documents: docsWithSize,
            document: docsWithSize.find(d => d.id === doc.documentId) || doc.document
          };
        })
      );

      // Get pending documents (documents waiting for reply)
      const pendingDocuments = await prisma.sent.findMany({
        where: {
          receiverId: userId,
          status: { in: ['SENT', 'RECEIVED'] }
        },
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } }
        },
        orderBy: { sentAt: 'asc' }, // Oldest first
      });

      // Filter out documents that have replies or forwards
      const filteredPendingDocuments = [];
      for (const doc of pendingDocuments) {
        const hasReply = await prisma.sent.findFirst({
          where: {
            parentSentId: doc.id,
            isForwarded: false
          }
        });

        const hasForward = await prisma.sent.findFirst({
          where: {
            parentSentId: doc.id,
            isForwarded: true
          }
        });

        if (!hasReply && !hasForward) {
          const docIds = doc.documentIds?.length ? doc.documentIds : [doc.documentId];
          const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
          const docsWithSize = await Promise.all(docs.map(async d => {
            try {
              const res = await fetch(d.fileUrl, { method: 'HEAD' });
              const size = res.headers.get('content-length');
              return { ...d, fileSize: size ? Number(size) : null };
            } catch { return { ...d, fileSize: null }; }
          }));

          filteredPendingDocuments.push({
            ...doc,
            documents: docsWithSize,
            document: docsWithSize.find(d => d.id === doc.documentId) || doc.document
          });
        }
      }

      // Get recent notifications
      const notifications = await NotificationService.getUserNotifications(userId, 3, 0);

      return h.response({
        success: true,
        data: {
          stats,
          recentDocuments: enrichedRecentDocuments,
          recentNotifications: notifications,
          pendingDocuments: filteredPendingDocuments
        }
      }).code(200);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return h.response({
        success: false,
        message: error.message || 'Failed to fetch dashboard data'
      }).code(500);
    }
  }
};

module.exports = {
  getDashboardData
};
