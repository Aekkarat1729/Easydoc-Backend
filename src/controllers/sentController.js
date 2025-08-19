// src/controllers/sentController.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient, DocumentStatus } = require('@prisma/client');
const admin = require('firebase-admin');
const isOfficer = require('../utils/isOfficer');
const prisma = new PrismaClient();

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

/**
 * ส่งเอกสารพร้อมแนบไฟล์ (อัปโหลดไฟล์ใหม่ขึ้น Firebase)
 * Method: POST /sent  (multipart/form-data)
 */
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

      // 👇 อ่าน subject / remark เพิ่มจาก payload
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

      // ชื่อโฟลเดอร์ = ชื่อ-นามสกุลของ "ผู้ส่ง"
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      });
      const fullNameRaw = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ').trim();
      const folderName = toSafeFolderName(fullNameRaw, String(senderId));

      // คงชื่อไฟล์เดิม
      const safeFileName = originalName;
      const destPath = `sent/${folderName}/${safeFileName}`;

      // อัปโหลด
      const contentType = file.headers?.['content-type'] || guessContentType(fileType);
      const fileUrl = await uploadToFirebase(file.path, destPath, contentType);

      // ลบไฟล์ temp
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

      // บันทึกการส่ง (root ของ thread)
      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const createData = {
        documentId: document.id,
        senderId,
        receiverId: receiver.id,
        number,
        category,
        description,
        // 👇 บันทึกฟิลด์ใหม่
        subject,
        remark,
        status: statusNormalized,
        isForwarded: false,
        parentSentId: null,
        threadId: null, // อัปเดตทีหลังให้เท่ากับ id ตัวเอง
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

      // ตั้ง threadId = id ของตัวเอง + เขียน history
      await prisma.$transaction([
        prisma.sent.update({
          where: { id: created.id },
          data: { threadId: created.id }
        }),
        prisma.sentStatusHistory.create({
          data: {
            sentId: created.id,
            from: DocumentStatus.PENDING, // ถือว่าก่อนสร้างอยู่สถานะ PENDING
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

/**
 * ส่งต่อเอกสารโดยใช้ไฟล์เดิม (ไม่อัปโหลดใหม่)
 * Method: POST /sent/forward  (application/json หรือ x-www-form-urlencoded)
 * Body: { parentSentId? , documentId? , receiverEmail, number?, category?, description?, subject?, remark?, status? }
 */
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
        // 👇 อ่านฟิลด์ใหม่
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
        // 👇 ใส่ฟิลด์ใหม่
        subject,
        remark,
        status: statusNormalized,
        isForwarded: true,
        parentSentId: parent?.id ?? null,
        threadId: parent?.threadId ?? parent?.id ?? null, // ถ้าไม่มี parent = root ใหม่
        depth: (parent?.depth ?? -1) + 1, // parent null => depth 0
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

      // ถ้าเป็น root ใหม่ (ไม่มี parent) ให้ตั้ง threadId = id ตัวเอง
      if (!created.threadId) {
        created = await prisma.sent.update({
          where: { id: created.id },
          data: { threadId: created.id, depth: 0 }
        });
      }

      // เขียน history (จาก PENDING -> statusNormalized)
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

/**
 * อัปเดตสถานะ (พร้อมบันทึกเวลา + history)
 * PATCH /sent/{id}/status
 * Body: { status: "RECEIVED" | "READ" | "DONE" | "ARCHIVED" | ... }
 */
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

/**
 * ดูทั้งเธรด (จาก root) ของรายการที่ระบุ
 * GET /sent/{id}/thread
 */
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

/**
 * ประวัติการเปลี่ยนสถานะของรายการ
 * GET /sent/{id}/history
 */
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

// ทั้งหมด (inbox + sent)
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

// inbox
const getInbox = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const userId = request.auth.credentials.userId;
      const inboxDocuments = await prisma.sent.findMany({
        where: { receiverId: userId },
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      return h.response({ success: true, data: inboxDocuments }).code(200);
    } catch (err) {
      console.error('Error fetching inbox:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

// sent
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

module.exports = {
  sendDocumentWithFile,
  forwardDocument,
  updateSentStatus,
  getThreadBySentId,
  getStatusHistory,
  getAllMail,
  getInbox,
  getSentMail,
};
