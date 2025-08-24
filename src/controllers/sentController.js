// src/controllers/sentController.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient, DocumentStatus } = require('@prisma/client');
const admin = require('firebase-admin');
const isOfficer = require('../utils/isOfficer');
const prisma = new PrismaClient();

// services
const {
  getSentById: fetchSentById,
  getSentByIdWithChain,   // คืน chain พร้อม documents (จาก service)
  replyDocument,
  hasReplyInThread,
} = require('../services/sentService');

// zod schema
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

function toSafeFolderName(input, fallback) {
  if (!input) return fallback;
  const normalized = input.normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g, '');
  const cleaned = normalized.replace(/[^\p{L}\p{N} .\-_]/gu, '');
  const underscored = cleaned.trim().replace(/\s+/g, '_');
  return underscored || fallback;
}
function toSafeFileName(filename) {
  const base = path.basename(filename);
  const cleaned = base.normalize('NFKC').replace(/[^\p{L}\p{N} ._\-]/gu, '');
  return cleaned.trim() || 'file';
}
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

// รวมไฟล์จาก payload รองรับ file หรือ files และ single/array
function collectFiles(payload) {
  const out = [];
  const push = (f) => { if (f && f.filename) out.push(f); };
  if (payload?.file)  Array.isArray(payload.file)  ? payload.file.forEach(push)  : push(payload.file);
  if (payload?.files) Array.isArray(payload.files) ? payload.files.forEach(push) : push(payload.files);
  return out;
}

// เติม documents[] ให้เรคคอร์ด sent โดยอ่านจาก field documentIds (หรือ fallback documentId)

/* -------------------------------- Handlers --------------------------------- */

/** ======================== ส่งเอกสารใหม่ (หลายไฟล์) ======================== */
const sendDocumentWithFile = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    output: 'file',
    parse: true,
    allow: 'multipart/form-data',
    maxBytes: 20 * 1024 * 1024, // เพิ่มเพดานเผื่อหลายไฟล์
    multipart: { output: 'file' },
  },
  handler: async (request, h) => {
    const tempFiles = collectFiles(request.payload);
    try {
      isOfficer(request);
      const senderId = request.auth.credentials.userId;

      const { receiverEmail, number, category, description, subject, remark, status } = request.payload;

      if (!tempFiles.length) {
        throw new Error('Failed to upload document: No file uploaded.');
      }

      // ผู้รับ (case-insensitive)
      const receiver = await prisma.user.findFirst({ where: { email: { equals: receiverEmail, mode: 'insensitive' } } });
      if (!receiver) {
        return h.response({ success: false, message: 'Receiver not found.' }).code(400);
      }

      // โฟลเดอร์ผู้ส่ง
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      });
      const fullNameRaw = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ').trim();
      const folderName = toSafeFolderName(fullNameRaw, String(senderId));

      // อัปโหลดทุกไฟล์ + สร้าง document ทุกไฟล์
      const createdDocs = [];
      for (const file of tempFiles) {
        const originalName = toSafeFileName(file.filename);
        const parts = originalName.split('.');
        const ext = parts.length > 1 ? parts.pop() : '';
        const baseName = parts.join('.');
        const fileType = (ext || '').toLowerCase();
        if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
          throw new Error(`Unsupported file type: ${fileType}`);
        }

        const destPath = `sent/${folderName}/${Date.now()}_${originalName}`;
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
        createdDocs.push(doc);
      }

      // ใช้ไฟล์แรกเป็น document หลักของ sent + เก็บ array ทั้งหมดใน documentIds
      const docIds = createdDocs.map(d => d.id);
      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const createData = {
        documentId: docIds[0],
        documentIds: docIds,            // ✅ เก็บหลายไฟล์
        senderId,
        receiverId: receiver.id,
        number,
        category: typeof category === 'string' ? parseInt(category) : category,
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
        prisma.sent.update({ where: { id: created.id }, data: { threadId: created.id } }),
        prisma.sentStatusHistory.create({
          data: { sentId: created.id, from: DocumentStatus.PENDING, to: statusNormalized, changedById: senderId }
        })
      ]);

      // ตรวจว่ามี reply ในเธรดนี้ไหม (เพิ่งสร้าง = false)
      const isReply = await hasReplyInThread(created.id);

      return h.response({
        success: true,
        message: 'Document sent successfully',
        isreply: isReply,
        isReply: isReply,
        data: created,
        documents: createdDocs
      }).code(201);

    } catch (err) {
      console.error('Error sending document:', err);
      // ลบ temp ที่ยังเหลือ
      for (const f of tempFiles) { try { fs.unlinkSync(f.path); } catch (_) {} }
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** ============================== ส่งต่อ =============================== */
const forwardDocument = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    output: 'file',
    parse: true,
    allow: 'multipart/form-data',
    maxBytes: 20 * 1024 * 1024,
    multipart: { output: 'file' },
  },
  handler: async (request, h) => {
    const tempFiles = collectFiles(request.payload);
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

      // Debug receiverEmail
      const emailToFind = String(receiverEmail).trim();
      console.log('receiverEmail (raw):', receiverEmail);
      console.log('receiverEmail (trim):', emailToFind);

      // ผู้รับ (case-insensitive, trim)
      const receiver = await prisma.user.findFirst({ where: { email: { equals: emailToFind, mode: 'insensitive' } } });
      if (!receiver) {
        return h.response({ success: false, message: 'Receiver not found.' }).code(400);
      }

      // ...existing code...
      let sourceDocumentId;
      let sourceDocumentIds = [];
      let parent = null;

      if (parentSentId != null) {
        parent = await prisma.sent.findUnique({
          where: { id: Number(parentSentId) },
          select: { id: true, documentId: true, documentIds: true, threadId: true, depth: true }
        });
        if (!parent) throw new Error('parentSentId not found.');
        sourceDocumentId  = parent.documentId;
        sourceDocumentIds = parent.documentIds?.length ? parent.documentIds : [parent.documentId];
      } else if (documentId != null) {
        const doc = await prisma.document.findUnique({ where: { id: Number(documentId) } });
        if (!doc) throw new Error('documentId not found.');
        sourceDocumentId  = doc.id;
        sourceDocumentIds = [doc.id];
        parent = await prisma.sent.findFirst({
          where: { documentId: doc.id },
          orderBy: { sentAt: 'desc' }
        }); // อาจเป็น null
      } else {
        throw new Error('Either parentSentId or documentId is required.');
      }

      // ...existing code...
      const createdDocs = [];
      if (tempFiles.length) {
        const senderProfile = await prisma.user.findUnique({
          where: { id: senderId },
          select: { firstName: true, lastName: true },
        });
        const folderName = toSafeFolderName(
          [senderProfile?.firstName, senderProfile?.lastName].filter(Boolean).join(' ').trim(),
          String(senderId)
        );
        for (const file of tempFiles) {
          const originalName = toSafeFileName(file.filename);
          const parts = originalName.split('.');
          const ext = parts.length > 1 ? parts.pop() : '';
          const baseName = parts.join('.');
          const fileType = (ext || '').toLowerCase();
          if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
            throw new Error(`Unsupported file type: ${fileType}`);
          }
          const destPath = `forwarded/${folderName}/${Date.now()}_${originalName}`;
          const contentType = file.headers?.['content-type'] || guessContentType(fileType);
          const fileUrl = await uploadToFirebase(file.path, destPath, contentType);
          try { fs.unlinkSync(file.path); } catch (_) {}
          const doc = await prisma.document.create({
            data: { name: baseName, fileType, fileUrl, userId: senderId, uploadedAt: new Date() }
          });
          createdDocs.push(doc);
        }
      }

      // ...existing code...
      const docIds = createdDocs.length > 0
        ? createdDocs.map(d => d.id)
        : sourceDocumentIds;

      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const data = {
        documentId: docIds[0],
        documentIds: docIds, // ✅ เก็บหลายไฟล์
        senderId,
        receiverId: receiver.id,
        number,
        category: typeof category === 'string' ? parseInt(category) : category,
        description,
        subject,
        remark,
        status: statusNormalized,
        isForwarded: true,
        parentSentId: parent?.id ?? null,
        threadId: parent?.threadId ?? parent?.id ?? null, // ถ้าไม่มี parent = root
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

      // ...existing code...
      const existed = await prisma.sent.findFirst({
        where: { parentSentId: parent?.id ?? null, senderId },
      });
      if (existed) {
        return h.response({
          success: false,
          message: 'คุณได้ Action กับเอกสารนี้ไปแล้ว',
          data: existed
        }).code(400);
      }

      let created = await prisma.sent.create({ data });

      // ...existing code...
      if (!created.threadId) {
        created = await prisma.sent.update({
          where: { id: created.id },
          data: { threadId: created.id, depth: 0 }
        });
      }

      await prisma.sentStatusHistory.create({
        data: { sentId: created.id, from: DocumentStatus.PENDING, to: statusNormalized, changedById: senderId }
      });

      const isReply = await hasReplyInThread(created.threadId);

      return h.response({
        success: true,
        message: 'Document forwarded successfully',
        isreply: isReply,
        isReply: isReply,
        data: created,
        documents: createdDocs
      }).code(201);
    } catch (err) {
      console.error('Error forwarding document:', err);
      for (const f of tempFiles) { try { fs.unlinkSync(f.path); } catch (_) {} }
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** ============================== ตอบกลับ (หลายไฟล์) ============================== */
/**
 * POST /sent/reply  (multipart/form-data)
 * body: { parentSentId, message, remark?, subject?, number?, category?, status? , file/files? }
 */
const replyToSent = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  payload: {
    output: 'file',
    parse: true,
    allow: 'multipart/form-data',
    maxBytes: 20 * 1024 * 1024,
    multipart: { output: 'file' },
  },
  handler: async (request, h) => {
    const tempFiles = collectFiles(request.payload);
    try {
      const senderId = request.auth.credentials.userId;

      const parsed = replySchema.safeParse(request.payload);
      if (!parsed.success) {
        return h.response({
          success: false,
          message: parsed.error.issues?.[0]?.message || 'Invalid payload'
        }).code(400);
      }
      const { parentSentId, message, remark, subject, number, category, status } = parsed.data;

      // หา parent + คนแรกของ chain
      const parent = await prisma.sent.findUnique({
        where: { id: Number(parentSentId) },
        select: { id: true, documentId: true, documentIds: true, senderId: true, receiverId: true, threadId: true, depth: true }
      });
      if (!parent) return h.response({ success: false, message: 'parentSentId not found' }).code(404);

      const rootId = parent.threadId ?? parent.id;
      const root = await prisma.sent.findUnique({ where: { id: rootId }, select: { senderId: true } });
      if (!root?.senderId) return h.response({ success: false, message: 'Root sender not found' }).code(400);

      // ผู้รับ = ผู้ส่งคนแรกของเธรด (กันเคสตอบหาตัวเอง -> ส่งกลับไปหาคนก่อนหน้า)
      let receiverId = root.senderId;
      if (receiverId === senderId) receiverId = parent.senderId;

      // อัปโหลดหลายไฟล์ (ถ้ามี) สร้าง document หลายตัว
      const createdDocs = [];
      if (tempFiles.length) {
        const senderProfile = await prisma.user.findUnique({
          where: { id: senderId },
          select: { firstName: true, lastName: true },
        });
        const folderName = toSafeFolderName(
          [senderProfile?.firstName, senderProfile?.lastName].filter(Boolean).join(' ').trim(),
          String(senderId)
        );

        for (const file of tempFiles) {
          const originalName = toSafeFileName(file.filename);
          const parts = originalName.split('.');
          const ext = parts.length > 1 ? parts.pop() : '';
          const baseName = parts.join('.');
          const fileType = (ext || '').toLowerCase();
          if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
            throw new Error(`Unsupported file type: ${fileType}`);
          }

          const destPath = `replies/${folderName}/${Date.now()}_${originalName}`;
          const contentType = file.headers?.['content-type'] || guessContentType(fileType);
          const fileUrl = await uploadToFirebase(file.path, destPath, contentType);
          try { fs.unlinkSync(file.path); } catch (_) {}

          const doc = await prisma.document.create({
            data: { name: baseName, fileType, fileUrl, userId: senderId, uploadedAt: new Date() }
          });
          createdDocs.push(doc);
        }
      }

      // documents ของ reply = ถ้ามีอัปโหลดใหม่ ใช้ชุดใหม่; ถ้าไม่มี ใช้ชุดของ parent (หรืออย่างน้อยไฟล์หลัก)
      const docIds = createdDocs.length
        ? createdDocs.map(d => d.id)
        : (parent.documentIds?.length ? parent.documentIds : [parent.documentId]);

      // ตรวจสอบ action ซ้ำ: senderId เดิม action กับ parentSentId เดิม
      const existed = await prisma.sent.findFirst({
        where: { parentSentId: parent.id, senderId },
      });
      if (existed) {
        return h.response({
          success: false,
          message: 'คุณได้ Action กับเอกสารนี้ไปแล้ว',
          data: existed
        }).code(400);
      }

      // สร้างเรคคอร์ด reply
      const now = new Date();
      const statusNormalized = normalizeStatus(status || 'SENT');
      const replyData = {
        documentId: docIds[0],
        documentIds: docIds,    // ✅ เก็บหลายไฟล์
        senderId,
        receiverId,
        number,
        category,
        description: message,
        subject,
        remark,
        status: statusNormalized,
        isForwarded: false,
        parentSentId: parent.id,
        threadId: rootId,
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
        data: { sentId: created.id, from: DocumentStatus.PENDING, to: statusNormalized, changedById: senderId }
      });

      const isReply = await hasReplyInThread(rootId);

      return h.response({
        success: true,
        message: 'Reply sent successfully',
        isreply: isReply,
        isReply: isReply,
        data: created,
        documents: createdDocs
      }).code(201);
    } catch (err) {
      console.error('Error replying document:', err);
      for (const f of tempFiles) { try { fs.unlinkSync(f.path); } catch (_) {} }
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
          data: { sentId: sent.id, from: sent.status, to: next, changedById: userId }
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
          sender:   { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileimage: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileimage: true } },
        }
      });

      async function enrichNode(node) {
        const docIds = node.documentIds?.length ? node.documentIds : [node.documentId];
        const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
        const docsWithSize = await Promise.all(docs.map(async d => {
          try {
            const res = await fetch(d.fileUrl, { method: 'HEAD' });
            const size = res.headers.get('content-length');
            return { ...d, fileSize: size ? Number(size) : null };
          } catch { return { ...d, fileSize: null }; }
        }));
        let docSingle = node.document;
        if (docSingle && docSingle.id) {
          const found = docsWithSize.find(d => d.id === docSingle.id);
          if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
        }
        let sender = node.sender;
        let receiver = node.receiver;
        if (sender && sender.id) {
          const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
          if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
        }
        if (receiver && receiver.id) {
          const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
          if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
        }
        return { ...node, documents: docsWithSize, document: docSingle, sender, receiver };
      }
      const threadWithDocs = await Promise.all(thread.map(enrichNode));
      // เติม kind และ hasReply
      const withKind = threadWithDocs.map(x => ({
        ...x,
        kind: x.parentSentId == null ? 'root' : (x.isForwarded ? 'forward' : 'reply'),
      }));
      const hasReply = withKind.some(x => x.kind === 'reply');
      return h.response({ success: true, rootId, hasReply, data: withKind }).code(200);
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
          sender:   { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      async function enrichNode(node) {
        const docIds = node.documentIds?.length ? node.documentIds : [node.documentId];
        const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
        const docsWithSize = await Promise.all(docs.map(async d => {
          try {
            const res = await fetch(d.fileUrl, { method: 'HEAD' });
            const size = res.headers.get('content-length');
            return { ...d, fileSize: size ? Number(size) : null };
          } catch { return { ...d, fileSize: null }; }
        }));
        let docSingle = node.document;
        if (docSingle && docSingle.id) {
          const found = docsWithSize.find(d => d.id === docSingle.id);
          if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
        }
        let sender = node.sender;
        let receiver = node.receiver;
        if (sender && sender.id) {
          const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
          if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
        }
        if (receiver && receiver.id) {
          const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
          if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
        }
        return { ...node, documents: docsWithSize, document: docSingle, sender, receiver };
      }
      const data = await Promise.all(sentDocuments.map(enrichNode));
      // เพิ่ม isReply ให้แต่ละรายการ
      const withIsReply = await Promise.all(
        data.map(async (item) => {
          const isReply = await require('../services/sentService').hasReplyInThread(item.threadId);
          return { ...item, isReply };
        })
      );
      return h.response({ success: true, data: withIsReply }).code(200);
    } catch (err) {
      console.error('Error fetching all mail:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

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

      const inboxDocuments = await prisma.sent.findMany({
        where,
        include: {
          document: true,
          sender:   { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      async function enrichNode(node) {
        const docIds = node.documentIds?.length ? node.documentIds : [node.documentId];
        const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
        const docsWithSize = await Promise.all(docs.map(async d => {
          try {
            const res = await fetch(d.fileUrl, { method: 'HEAD' });
            const size = res.headers.get('content-length');
            return { ...d, fileSize: size ? Number(size) : null };
          } catch { return { ...d, fileSize: null }; }
        }));
        let docSingle = node.document;
        if (docSingle && docSingle.id) {
          const found = docsWithSize.find(d => d.id === docSingle.id);
          if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
        }
        let sender = node.sender;
        let receiver = node.receiver;
        if (sender && sender.id) {
          const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
          if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
        }
        if (receiver && receiver.id) {
          const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
          if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
        }
        return { ...node, documents: docsWithSize, document: docSingle, sender, receiver };
      }
      const withDocs = await Promise.all(inboxDocuments.map(enrichNode));
      const withKind = await Promise.all(
        withDocs.map(async (x) => {
            const kind = x.parentSentId == null ? 'root' : (x.isForwarded ? 'forward' : 'reply');
            const isReply = await require('../services/sentService').hasReplyInThread(x.threadId);
            return { ...x, kind, isReply, isForward: x.isForwarded };
        })
      );
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
          sender:   { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } }
        },
        orderBy: { sentAt: 'desc' }
      });

      async function enrichNode(node) {
        const docIds = node.documentIds?.length ? node.documentIds : [node.documentId];
        const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
        const docsWithSize = await Promise.all(docs.map(async d => {
          try {
            const res = await fetch(d.fileUrl, { method: 'HEAD' });
            const size = res.headers.get('content-length');
            return { ...d, fileSize: size ? Number(size) : null };
          } catch { return { ...d, fileSize: null }; }
        }));
        let docSingle = node.document;
        if (docSingle && docSingle.id) {
          const found = docsWithSize.find(d => d.id === docSingle.id);
          if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
        }
        let sender = node.sender;
        let receiver = node.receiver;
        if (sender && sender.id) {
          const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
          if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
        }
        if (receiver && receiver.id) {
          const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
          if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
        }
        return { ...node, documents: docsWithSize, document: docSingle, sender, receiver };
      }
      const data = await Promise.all(sentDocuments.map(enrichNode));
      // เพิ่ม isReply ให้แต่ละรายการ
      const withIsReply = await Promise.all(
        data.map(async (item) => {
          const isReply = await require('../services/sentService').hasReplyInThread(item.threadId);
          return { ...item, isReply };
        })
      );
      return h.response({ success: true, data: withIsReply }).code(200);
    } catch (err) {
      console.error('Error fetching sent mail:', err);
      return h.response({ success: false, message: err.message }).code(500);
    }
  }
};

/** chain เต็ม (service จะเติม documents[] ให้แล้ว) */
const getSentChainById = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) return h.response({ success: false, message: 'Invalid id' }).code(400);
      const { id } = parsed.data;

      const result = await getSentByIdWithChain(id);
      async function enrichNode(node) {
        const docIds = node.documentIds?.length ? node.documentIds : [node.documentId];
        const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
        const docsWithSize = await Promise.all(docs.map(async d => {
          try {
            const res = await fetch(d.fileUrl, { method: 'HEAD' });
            const size = res.headers.get('content-length');
            return { ...d, fileSize: size ? Number(size) : null };
          } catch { return { ...d, fileSize: null }; }
        }));
        let docSingle = node.document;
        if (docSingle && docSingle.id) {
          const found = docsWithSize.find(d => d.id === docSingle.id);
          if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
        }
        let sender = node.sender;
        let receiver = node.receiver;
        if (sender && sender.id) {
          const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
          if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
        }
        if (receiver && receiver.id) {
          const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
          if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
        }
        return { ...node, documents: docsWithSize, document: docSingle, sender, receiver };
      }
      const base = await enrichNode(result.base);
      const pathFromRoot = await Promise.all(result.pathFromRoot.map(enrichNode));
      const forwardsFromThis = await Promise.all(result.forwardsFromThis.map(enrichNode));
      const fullChain = await Promise.all(result.fullChain.map(enrichNode));
      return h.response({
        success: true,
        rootId: result.rootId,
        threadCount: result.threadCount,
        hasReply: result.hasReply,
        data: {
          base,
          pathFromRoot,
          forwardsFromThis,
          fullChain,
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

/** ดึงเรคคอร์ดเดียว (service จะเติม documents[] ให้แล้ว) */
const getSentById = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  handler: async (request, h) => {
    try {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) return h.response({ success: false, message: 'Invalid id' }).code(400);
      const { id } = parsed.data;

      // กำหนด userId ปัจจุบันให้ global เพื่อให้ service ใช้ได้
      global._currentUserId = request.auth?.credentials?.userId || null;
      // ดึงข้อมูล base
      const record = await prisma.sent.findUnique({
        where: { id: Number(id) },
        include: {
          document: true,
          sender:  { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver:{ select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
        }
      });
      if (!record) return h.response({ success: false, message: 'Not found' }).code(404);
      // เติม documents, fileSize
      const docIds = record.documentIds?.length ? record.documentIds : [record.documentId];
      const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
      const docsWithSize = await Promise.all(docs.map(async d => {
        try {
          const res = await fetch(d.fileUrl, { method: 'HEAD' });
          const size = res.headers.get('content-length');
          return { ...d, fileSize: size ? Number(size) : null };
        } catch { return { ...d, fileSize: null }; }
      }));
      let docSingle = record.document;
      if (docSingle && docSingle.id) {
        const found = docsWithSize.find(d => d.id === docSingle.id);
        if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
      }
      let sender = record.sender;
      let receiver = record.receiver;
      if (sender && sender.id) {
        const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
        if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
      }
      if (receiver && receiver.id) {
        const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
        if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
      }
      // ดึง action จริง ๆ ที่เกี่ยวข้องกับผู้ใช้ (reply/forward) แบบเต็ม record
      const userId = request.auth?.credentials?.userId;
      let actions = [];
      let isReply = false;
      // ดึง action แค่ขั้นเดียว (เฉพาะที่ parentSentId = base id)
      const sentThread = await prisma.sent.findMany({
        where: {
          parentSentId: record.id
        },
        include: {
          document: true,
          sender:  { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
          receiver:{ select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
        },
        orderBy: { sentAt: 'asc' }
      });
      // enrich documents, fileSize, kind
      async function enrichNode(node) {
        const docIds = node.documentIds?.length ? node.documentIds : [node.documentId];
        const docs = await prisma.document.findMany({ where: { id: { in: docIds } } });
        const docsWithSize = await Promise.all(docs.map(async d => {
          try {
            const res = await fetch(d.fileUrl, { method: 'HEAD' });
            const size = res.headers.get('content-length');
            return { ...d, fileSize: size ? Number(size) : null };
          } catch { return { ...d, fileSize: null }; }
        }));
        let docSingle = node.document;
        if (docSingle && docSingle.id) {
          const found = docsWithSize.find(d => d.id === docSingle.id);
          if (found) docSingle = { ...docSingle, fileSize: found.fileSize };
        }
        let sender = node.sender;
        let receiver = node.receiver;
        if (sender && sender.id) {
          const s = await prisma.user.findUnique({ where: { id: sender.id }, select: { position: true, profileImage: true } });
          if (s) sender = { ...sender, position: s.position, profileImage: s.profileImage };
        }
        if (receiver && receiver.id) {
          const rcv = await prisma.user.findUnique({ where: { id: receiver.id }, select: { position: true, profileImage: true } });
          if (rcv) receiver = { ...receiver, position: rcv.position, profileImage: rcv.profileImage };
        }
        // kind
        const kind = node.parentSentId == null ? 'root' : (node.isForwarded ? 'forward' : 'reply');
        return { ...node, documents: docsWithSize, document: docSingle, sender, receiver, kind };
      }
  // filter เฉพาะ action ที่ user เป็น sender หรือ receiver และไม่ใช่ base record (kind !== 'root')
  const enrichedThread = await Promise.all(sentThread.map(enrichNode));
  actions = enrichedThread.filter(x => x.kind !== 'root');
  // isReply: ถ้ามี action ที่ kind === 'reply' ใน actions ให้เป็น true
  isReply = actions.some(a => a.kind === 'reply');
      // ลบ global หลังใช้เสร็จ
      delete global._currentUserId;
  return h.response({ success: true, isReply, data: { ...record, documents: docsWithSize, document: docSingle, sender, receiver, actions } }).code(200);
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
  replyToSent,
  updateSentStatus,
  getSentChainById,
  getThreadBySentId,
  getStatusHistory,
  getAllMail,
  getInbox,
  getSentMail,
  getSentById
};