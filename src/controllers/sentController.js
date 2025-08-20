// src/controllers/sentController.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient, DocumentStatus } = require('@prisma/client');
const admin = require('firebase-admin');
const isOfficer = require('../utils/isOfficer');
const prisma = new PrismaClient();

// ✅ services
const {
  getSentById: fetchSentById,
  getSentByIdWithChain,
  replyDocument,       // ใช้สร้างเรคคอร์ด reply
} = require('../services/sentService');

// ✅ zod schema
const { idParamSchema, replySchema } = require('../validations/sentValidation');

/* -------------------------- Firebase Initialization ------------------------- */
function ensureFirebaseInit() {
  if (admin.apps.length) return;

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('Missing FIREBASE_STORAGE_BUCKET (e.g. your-project-id.appspot.com)');
  }

  if (process.env.FIREBASE_SA_BASE64) {
    const json = JSON.parse(
      Buffer.from(process.env.FIREBASE_SA_BASE64, 'base64').toString('utf8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(json),
      storageBucket: bucketName,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS.replace(/\\/g, '/');
    if (!fs.existsSync(credPath)) {
      throw new Error(`Service account file not found: ${credPath}`);
    }
    const serviceAccount = require(credPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });
  } else {
    throw new Error(
      'No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SA_BASE64 in .env'
    );
  }
}
ensureFirebaseInit();

const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);

/* --------------------------------- Helpers --------------------------------- */

// ทำชื่อโฟลเดอร์ให้ปลอดภัย (รองรับไทย, เว้นวรรค -> _)
function toSafeFolderName(input, fallback) {
  if (!input) return fallback;
  const normalized = input.normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g, '');
  const cleaned = normalized.replace(/[^\p{L}\p{N} .\-_]/gu, '');
  const underscored = cleaned.trim().replace(/\s+/g, '_');
  return underscored || fallback;
}

// คงชื่อไฟล์เดิมให้ปลอดภัย
function toSafeFileName(filename) {
  const base = path.basename(filename);
  const cleaned = base.normalize('NFKC').replace(/[^\p{L}\p{N} ._\-]/gu, '');
  return cleaned.trim() || 'file';
}

// เดา content-type
function guessContentType(ext) {
  switch ((ext || '').toLowerCase()) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

// แปลง/ตรวจ status ให้ตรง enum Prisma
function normalizeStatus(input) {
  const DEFAULT = DocumentStatus.SENT;
  if (input == null) return DEFAULT;
  const raw = String(input).trim();
  if (!raw) return DEFAULT;

  const upper = raw.toUpperCase();
  if (Object.values(DocumentStatus).includes(upper)) return upper;
  if (DocumentStatus[upper]) return DocumentStatus[upper];

  const thMap = {
    'รอส่ง': DocumentStatus.PENDING,
    'ส่งแล้ว': DocumentStatus.SENT,
    'ได้รับ': DocumentStatus.RECEIVED,
    'อ่านแล้ว': DocumentStatus.READ,
    'เสร็จสิ้น': DocumentStatus.DONE,
    'เก็บถาวร': DocumentStatus.ARCHIVED,
  };
  if (thMap[raw]) return thMap[raw];

  return DEFAULT;
}

// อัปโหลดขึ้น Firebase แล้วคืน public URL
async function uploadToFirebase(localPath, destPath, contentType) {
  await bucket.upload(localPath, {
    destination: destPath,
    resumable: false,
    metadata: {
      contentType: contentType || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000',
    },
  });
  const file = bucket.file(destPath);
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
}

/* -------------------------------- Handlers --------------------------------- */

/** ======================== ส่งเอกสารใหม่ (มีไฟล์) ======================== */
const sendDocumentWithFile = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    output: 'file',
    parse: true,
    allow: 'multipart/form-data',
    maxBytes: 10 * 1024 * 1024, // 10MB
    multipart: { output: 'file' },
  },
  handler: async (request, h) => {
    const tempFile = request.payload?.file;
    try {
      isOfficer(request); // ตรวจสอบว่าเป็น Officer หรือไม่
      const senderId = request.auth.credentials.userId;

      const { receiverEmail, number, category, description, subject, remark, status } = request.payload;
      const file = tempFile;

      if (!file || !file.filename) {
        throw new Error('Failed to upload document: No file uploaded.');
      }

      // ตรวจชนิดไฟล์
      const originalName = toSafeFileName(file.filename);
      const parts = originalName.split('.');
      const ext = parts.length > 1 ? parts.pop() : '';
      const baseName = parts.join('.');
      const fileType = (ext || '').toLowerCase();
      if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
        throw new Error('Unsupported file type.');
      }

      // ผู้รับ
      const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
      if (!receiver) throw new Error('Receiver not found.');

      // โฟลเดอร์ผู้ส่ง
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      });
      const fullNameRaw = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ').trim();
      const folderName = toSafeFolderName(fullNameRaw, String(senderId));

      const safeFileName = originalName;
      const destPath = `sent/${folderName}/${safeFileName}`;

      const contentType = file.headers?.['content-type'] || guessContentType(fileType);
      const fileUrl = await uploadToFirebase(file.path, destPath, contentType);

      try { fs.unlinkSync(file.path); } catch (_) {}

      // บันทึก document
      const document = await prisma.document.create({
        data: {
          name: baseName,
          fileType,
          fileUrl,
          userId: senderId,
          uploadedAt: new Date(),
        }
      });

      // สร้าง sent (root)
      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const createData = {
        documentId: document.id,
        senderId,
        receiverId: receiver.id,
        number,
        category,
        description,
        subject,
        remark,
        status: statusNormalized,
        isForwarded: false,
        parentSentId: null,
        threadId: null,
        depth: 0,
        sentAt: now,
        statusById: senderId,
        statusChangedAt: now,
      };
      if (statusNormalized === DocumentStatus.RECEIVED) createData.receivedAt = now;
      if (statusNormalized === DocumentStatus.READ) {
        createData.receivedAt = createData.receivedAt ?? now;
        createData.readAt = now;
      }
      if (statusNormalized === DocumentStatus.ARCHIVED) createData.archivedAt = now;

      const created = await prisma.sent.create({ data: createData });

      await prisma.$transaction([
        prisma.sent.update({
          where: { id: created.id },
          data: { threadId: created.id }
        }),
        prisma.sentStatusHistory.create({
          data: {
            sentId: created.id,
            from: DocumentStatus.PENDING,
            to: statusNormalized,
            changedById: senderId,
          }
        })
      ]);

      return h.response({
        success: true,
        message: 'Document sent successfully',
        data: created
      }).code(201);

    } catch (err) {
      console.error('Error sending document:', err);
      if (tempFile?.path) { try { fs.unlinkSync(tempFile.path); } catch (_) {} }
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** ============================== ส่งต่อ =============================== */
const forwardDocument = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    parse: true,
    output: 'data',
    allow: ['application/json', 'application/x-www-form-urlencoded'],
    multipart: false,
  },
  handler: async (request, h) => {
    try {
      const senderId = request.auth.credentials.userId;
      const {
        parentSentId,
        documentId,
        receiverEmail,
        number,
        category,
        description,
        subject,
        remark,
        status
      } = request.payload || {};

      if (!receiverEmail) throw new Error('receiverEmail is required.');

      // หา document ต้นทาง + parent
      let sourceDocumentId;
      let parent = null;

      if (parentSentId != null) {
        parent = await prisma.sent.findUnique({
          where: { id: Number(parentSentId) },
          include: { document: true }
        });
        if (!parent) throw new Error('parentSentId not found.');
        sourceDocumentId = parent.documentId;
      } else if (documentId != null) {
        const doc = await prisma.document.findUnique({ where: { id: Number(documentId) } });
        if (!doc) throw new Error('documentId not found.');
        sourceDocumentId = doc.id;

        parent = await prisma.sent.findFirst({
          where: { documentId: doc.id },
          orderBy: { sentAt: 'desc' }
        }); // อาจเป็น null ถ้ายังไม่เคยส่ง
      } else {
        throw new Error('Either parentSentId or documentId is required.');
      }

      // ผู้รับ
      const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
      if (!receiver) throw new Error('Receiver not found.');

      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const data = {
        documentId: sourceDocumentId,
        senderId,
        receiverId: receiver.id,
        number,
        category,
        description,
        subject,
        remark,
        status: statusNormalized,
        isForwarded: true,
        parentSentId: parent?.id ?? null,
        threadId: parent?.threadId ?? parent?.id ?? null,
        depth: (parent?.depth ?? -1) + 1,
        sentAt: now,
        statusById: senderId,
        statusChangedAt: now,
      };
      if (statusNormalized === DocumentStatus.RECEIVED) data.receivedAt = now;
      if (statusNormalized === DocumentStatus.READ) {
        data.receivedAt = data.receivedAt ?? now;
        data.readAt = now;
      }
      if (statusNormalized === DocumentStatus.ARCHIVED) data.archivedAt = now;

      let created = await prisma.sent.create({ data });

      if (!created.threadId) {
        created = await prisma.sent.update({
          where: { id: created.id },
          data: { threadId: created.id, depth: 0 }
        });
      }

      await prisma.sentStatusHistory.create({
        data: {
          sentId: created.id,
          from: DocumentStatus.PENDING,
          to: statusNormalized,
          changedById: senderId,
        }
      });

      return h.response({
        success: true,
        message: 'Document forwarded successfully',
        data: created
      }).code(201);
    } catch (err) {
      console.error('Error forwarding document:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** ============================== ตอบกลับ ============================== */
/**
 * POST /sent/reply  (multipart/form-data)
 * body: { parentSentId, message, remark?, subject?, number?, category?, status? , file? }
 */
const replyToSent = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    output: 'file',
    parse: true,
    allow: 'multipart/form-data',
    maxBytes: 10 * 1024 * 1024,
    multipart: { output: 'file' },
  },
  handler: async (request, h) => {
    const tempFile = request.payload?.file;
    try {
      const senderId = request.auth.credentials.userId;

      // validate เบื้องต้นด้วย zod
      const parsed = replySchema.safeParse(request.payload);
      if (!parsed.success) {
        return h.response({
          success: false,
          message: parsed.error.issues?.[0]?.message || 'Invalid payload'
        }).code(400);
      }
      const { parentSentId, message, remark, subject, number, category, status } = parsed.data;

      // 👉 หา parent + thread root (คนแรกของ chain)
      // 👉 หา parent + thread root (คนแรกของ chain)
const parent = await prisma.sent.findUnique({
  where: { id: Number(parentSentId) },
  select: {
    id: true,
    documentId: true,
    senderId: true,
    receiverId: true,
    threadId: true,
    depth: true
  }
});
if (!parent) {
  return h.response({ success: false, message: 'parentSentId not found' }).code(404);
}

const rootId = parent.threadId ?? parent.id;
const root = await prisma.sent.findUnique({
  where: { id: rootId },
  select: { senderId: true }
});
if (!root?.senderId) {
  return h.response({ success: false, message: 'Root sender not found' }).code(400);
}

// ✅ ผู้รับ = ผู้ส่งคนแรกของทั้งเธรด
let receiverId = root.senderId;
// กันเคสตอบหาตัวเอง
if (receiverId === senderId) {
  receiverId = parent.senderId;
}


      // documentId: ถ้ามีไฟล์ => อัปโหลด + สร้าง document ใหม่, ถ้าไม่ => ใช้ของเดิม
      let documentId = parent.documentId;
      const file = tempFile;

      if (file && file.filename) {
        const originalName = toSafeFileName(file.filename);
        const parts = originalName.split('.');
        const ext = parts.length > 1 ? parts.pop() : '';
        const baseName = parts.join('.');
        const fileType = (ext || '').toLowerCase();
        if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
          throw new Error('Unsupported file type.');
        }

        const senderProfile = await prisma.user.findUnique({
          where: { id: senderId },
          select: { firstName: true, lastName: true },
        });
        const folderName = toSafeFolderName(
          [senderProfile?.firstName, senderProfile?.lastName].filter(Boolean).join(' ').trim(),
          String(senderId)
        );
        const destPath = `replies/${folderName}/${originalName}`;
        const contentType = file.headers?.['content-type'] || guessContentType(fileType);
        const fileUrl = await uploadToFirebase(file.path, destPath, contentType);
        try { fs.unlinkSync(file.path); } catch (_) {}

        const doc = await prisma.document.create({
          data: {
            name: baseName,
            fileType,
            fileUrl,
            userId: senderId,
            uploadedAt: new Date(),
          }
        });
        documentId = doc.id;
      }

      // สร้างเรคคอร์ด reply
      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const replyData = {
        documentId,
        senderId,
        receiverId,                 // ✅ เปลี่ยนมาใช้ root sender
        number,
        category,
        description: message,
        subject,
        remark,
        status: statusNormalized,
        isForwarded: false,
        parentSentId: parent.id,
        threadId: rootId,           // ✅ ผูกกับ root เดิมของเธรด
        depth: (parent.depth ?? 0) + 1,
        sentAt: now,
        statusById: senderId,
        statusChangedAt: now,
      };
      if (statusNormalized === DocumentStatus.RECEIVED) replyData.receivedAt = now;
      if (statusNormalized === DocumentStatus.READ) {
        replyData.receivedAt = replyData.receivedAt ?? now;
        replyData.readAt = now;
      }
      if (statusNormalized === DocumentStatus.ARCHIVED) replyData.archivedAt = now;

      const created = await replyDocument(replyData);

      await prisma.sentStatusHistory.create({
        data: {
          sentId: created.id,
          from: DocumentStatus.PENDING,
          to: statusNormalized,
          changedById: senderId,
        }
      });

      return h.response({
        success: true,
        message: 'Reply sent successfully',
        data: created
      }).code(201);
    } catch (err) {
      console.error('Error replying document:', err);
      if (tempFile?.path) { try { fs.unlinkSync(tempFile.path); } catch (_) {} }
      return h.response({ success: false, message: err.message || String(err) }).code(500);
    }
  }
};

/** ============================== อื่น ๆ เดิม ============================== */

const updateSentStatus = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    parse: true,
    output: 'data',
    allow: ['application/json', 'application/x-www-form-urlencoded'],
  },
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const sentId = Number(request.params.id);
      const requested = String(request.payload?.status || '').trim();
      if (!requested) throw new Error('status is required');

      const next = normalizeStatus(requested);

      const sent = await prisma.sent.findUnique({
        where: { id: sentId },
        select: {
          id: true, senderId: true, receiverId: true, status: true,
          receivedAt: true, readAt: true, archivedAt: true
        }
      });
      if (!sent) return h.response({ success: false, message: 'Not found' }).code(404);

      const role =
        userId === sent.receiverId ? 'receiver' :
        userId === sent.senderId   ? 'sender'   : 'other';

      if (role === 'other') {
        return h.response({ success: false, message: 'Forbidden' }).code(403);
      }

      const allowed = (cur, next, role) => {
        if (cur === next) return true; // idempotent
        if (role === 'receiver') {
          if (cur === 'SENT' && (next === 'RECEIVED' || next === 'READ' || next === 'DONE' || next === 'ARCHIVED')) return true;
          if (cur === 'RECEIVED' && (next === 'READ' || next === 'DONE' || next === 'ARCHIVED')) return true;
          if (cur === 'READ' && (next === 'DONE' || next === 'ARCHIVED')) return true;
          return false;
        }
        if (role === 'sender') {
          if (cur === 'PENDING' && next === 'SENT') return true;
          return false;
        }
        return false;
      };
      if (!allowed(sent.status, next, role)) {
        return h.response({
          success: false,
          message: `Transition not allowed: ${sent.status} -> ${next} by ${role}`
        }).code(400);
      }

      const now = new Date();
      const data = {
        status: next,
        statusChangedAt: now,
        statusById: userId,
      };
      if (next === DocumentStatus.RECEIVED && !sent.receivedAt) data.receivedAt = now;
      if (next === DocumentStatus.READ) data.readAt = now;
      if (next === DocumentStatus.ARCHIVED) data.archivedAt = now;

      const [updated] = await prisma.$transaction([
        prisma.sent.update({ where: { id: sent.id }, data }),
        prisma.sentStatusHistory.create({
          data: {
            sentId: sent.id,
            from: sent.status,
            to: next,
            changedById: userId,
          }
        })
      ]);

      return h.response({ success: true, data: updated }).code(200);
    } catch (err) {
      console.error('Error updating status:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

const getThreadBySentId = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const id = Number(request.params.id);
      const base = await prisma.sent.findUnique({ where: { id } });
      if (!base) return h.response({ success: false, message: 'Not found' }).code(404);

      const rootId = base.threadId ?? base.id;
      const thread = await prisma.sent.findMany({
        where: { threadId: rootId },
        orderBy: [{ depth: 'asc' }, { sentAt: 'asc' }],
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
        }
      });

      return h.response({ success: true, rootId, data: thread }).code(200);
    } catch (err) {
      console.error('Error fetching thread:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

const getStatusHistory = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const id = Number(request.params.id);
      const exists = await prisma.sent.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return h.response({ success: false, message: 'Not found' }).code(404);

      const history = await prisma.sentStatusHistory.findMany({
        where: { sentId: id },
        orderBy: { changedAt: 'asc' },
        include: { changedBy: { select: { id: true, email: true, firstName: true, lastName: true } } }
      });

      return h.response({ success: true, data: history }).code(200);
    } catch (err) {
      console.error('Error fetching status history:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

const getAllMail = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const sentDocuments = await prisma.sent.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      return h.response({ success: true, data: sentDocuments }).code(200);
    } catch (err) {
      console.error('Error fetching all mail:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

// src/controllers/sentController.js  (เฉพาะฟังก์ชัน getInbox)

const getInbox = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const only = String(request.query?.only || '').toLowerCase();

      const where = { receiverId: userId };
      if (only === 'reply') {
        where.parentSentId = { not: null };
        where.isForwarded = false;
      } else if (only === 'forward') {
        where.isForwarded = true;
      } else if (only === 'root') {
        where.parentSentId = null;
      }
      // else: ไม่ฟิลเตอร์ แสดงทั้งหมด

      const inboxDocuments = await prisma.sent.findMany({
        where,
        include: {
          document: true,
          sender:   { select: { id: true, email: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      // เติมฟิลด์ kind ให้ frontend ใช้ง่าย (root|forward|reply)
      const withKind = inboxDocuments.map(x => ({
        ...x,
        kind: x.parentSentId == null ? 'root' : (x.isForwarded ? 'forward' : 'reply'),
      }));

      return h.response({ success: true, data: withKind }).code(200);
    } catch (err) {
      console.error('Error fetching inbox:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};


const getSentMail = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const sentDocuments = await prisma.sent.findMany({
        where: { senderId: userId },
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      return h.response({ success: true, data: sentDocuments }).code(200);
    } catch (err) {
      console.error('Error fetching sent mail:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** chain เต็ม */
const getSentChainById = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return h.response({ success: false, message: 'Invalid id' }).code(400);
      }
      const { id } = parsed.data;

      const result = await getSentByIdWithChain(id);

      return h.response({
        success: true,
        rootId: result.rootId,
        threadCount: result.threadCount,
        data: {
          base: result.base,
          pathFromRoot: result.pathFromRoot,
          forwardsFromThis: result.forwardsFromThis,
          fullChain: result.fullChain,
        }
      }).code(200);
    } catch (err) {
      if (err.code === 'NOT_FOUND' || /Sent not found/i.test(err.message)) {
        return h.response({ success: false, message: 'Not found' }).code(404);
      }
      console.error('Error fetching sent chain:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** ดึงเรคคอร์ดเดียว */
const getSentById = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return h.response({ success: false, message: 'Invalid id' }).code(400);
      }
      const { id } = parsed.data;

      const data = await fetchSentById(id);
      return h.response({ success: true, data }).code(200);
    } catch (err) {
      if (/Sent not found/i.test(err.message)) {
        return h.response({ success: false, message: 'Not found' }).code(404);
      }
      console.error('Error fetching sent by id:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

module.exports = {
  sendDocumentWithFile,
  forwardDocument,
  replyToSent,           // ✅ export
  updateSentStatus,
  getSentChainById,
  getThreadBySentId,
  getStatusHistory,
  getAllMail,
  getInbox,
  getSentMail,
  getSentById
};
