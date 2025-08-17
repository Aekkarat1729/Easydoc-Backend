// src/controllers/documentController.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');

const { documentSchema, idParamSchema } = require('../validations/documentValidation');
const validateZod = require('../validations/validateZod');
const { success, created, notFound, error } = require('../utils/responseFormatter');

const prisma = new PrismaClient();

/* -------------------------- Firebase Initialization ------------------------- */
function ensureFirebaseInit() {
  if (admin.apps.length) return;

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('Missing FIREBASE_STORAGE_BUCKET (e.g. your-project-id.appspot.com)');
  }

  if (process.env.FIREBASE_SA_BASE64) {
    // ใช้ BASE64 หากตั้งไว้ใน .env
    const json = JSON.parse(
      Buffer.from(process.env.FIREBASE_SA_BASE64, 'base64').toString('utf8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(json),
      storageBucket: bucketName,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // ใช้ไฟล์ service account โดยอ้างจากพาธใน .env
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

// ทำชื่อโฟลเดอร์ให้ปลอดภัย (รองรับไทย, ตัดอักขระควบคุม/ต้องห้าม, เว้นวรรค -> _)
function toSafeFolderName(input, fallback) {
  if (!input) return fallback;
  const normalized = input.normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g, '');
  const cleaned = normalized.replace(/[^\p{L}\p{N} .\-_]/gu, '');
  const underscored = cleaned.trim().replace(/\s+/g, '_');
  return underscored || fallback;
}

// ทำชื่อไฟล์ให้ปลอดภัย (คงชื่อเดิมไว้มากที่สุด)
function toSafeFileName(filename) {
  // ตัด path ออกเผื่อบาง client ส่ง full path มา
  const base = path.basename(filename);
  // อนุญาตเฉพาะอักษร/ตัวเลข/ไทย/เว้นวรรค/จุด/ขีด/ขีดล่าง
  const cleaned = base.normalize('NFKC').replace(/[^\p{L}\p{N} ._\-]/gu, '');
  // กันชื่อว่างเปล่า
  return cleaned.trim() || 'file';
}

// เดา content-type จากนามสกุล (กันกรณี header ไม่มี)
function guessContentType(ext) {
  switch (ext.toLowerCase()) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

// อัปโหลดขึ้น Firebase Storage แล้วคืน public URL
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
  await file.makePublic(); // ให้เข้าถึงได้ทันทีผ่าน URL

  return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
}

/* -------------------------------- Handlers --------------------------------- */

// อัปโหลดเอกสาร (คงชื่อไฟล์เดิม & โฟลเดอร์เป็นชื่อ-นามสกุลผู้ใช้)
const uploadDocument = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: { payload: validateZod(documentSchema) },
  handler: async (request, h) => {
    const tempFile = request.payload?.file;
    try {
      const userId = request.auth.credentials.userId;
      const file = tempFile;

      if (!file || !file.filename) {
        throw new Error('Failed to upload document: No file uploaded.');
      }

      // แยกชื่อ–นามสกุลไฟล์
      const originalName = toSafeFileName(file.filename);
      const parts = originalName.split('.');
      const ext = parts.length > 1 ? parts.pop() : '';
      const baseName = parts.join('.');

      const fileType = ext.toLowerCase();
      if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
        throw new Error('Unsupported file type.');
      }

      // ดึงชื่อ–นามสกุลผู้ใช้จากฐานข้อมูล (ปรับ fields ให้ตรง schema ของคุณ)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const fullNameRaw = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      const folderName = toSafeFolderName(fullNameRaw, String(userId));

      // ✅ คงชื่อไฟล์เดิมใน Firebase (เช่น "Aekkarat.pdf")
      const safeFileName = originalName; // ผ่าน toSafeFileName แล้ว
      const destPath = `uploads/${folderName}/${safeFileName}`;

      // อัปโหลดไป Firebase Storage
      const contentType =
        file.headers?.['content-type'] || guessContentType(fileType);
      const fileUrl = await uploadToFirebase(file.path, destPath, contentType);

      // บันทึก DB ผ่าน Prisma
      const documentData = {
        name: baseName,       // ชื่อไฟล์ไม่รวมนามสกุล (ใช้ตามเดิมของคุณ)
        fileType: fileType,
        fileUrl,              // รูปใช้ <img>, PDF ใช้ Google Docs Viewer ฝั่ง frontend ได้
        userId,
        uploadedAt: new Date(),
      };

      const document = await prisma.document.create({ data: documentData });

      // ลบ temp file
      try { fs.unlinkSync(file.path); } catch (_) {}

      return created(h, document);
    } catch (err) {
      console.error('Error uploading document:', err);
      if (tempFile?.path) { try { fs.unlinkSync(tempFile.path); } catch (_) {} }
      return error(h, { success: false, message: err.message });
    }
  }
};

// ดึงเอกสารตาม ID
const getDocumentById = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: { params: validateZod(idParamSchema) },
  handler: async (request, h) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id: Number(request.params.id) }
      });
      if (!document) return notFound(h);
      return success(h, document);
    } catch (err) {
      return error(h, err.message);
    }
  }
};

module.exports = { uploadDocument, getDocumentById };
