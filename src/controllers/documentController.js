require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');

const { documentSchema, idParamSchema } = require('../validations/documentValidation');
const validateZod = require('../validations/validateZod');
const { success, created, notFound, error } = require('../utils/responseFormatter');

const prisma = new PrismaClient();

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
    return;
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

const uploadDocument = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: { payload: validateZod(documentSchema) },
  handler: async (request, h) => {
    const tempFile = request.payload?.file;
    const nameInput = request.payload?.name;
    try {
      const userId = request.auth.credentials.userId;
      const file = tempFile;

      if (!file || !file.filename) {
        throw new Error('Failed to upload document: No file uploaded.');
      }

      const originalName = toSafeFileName(file.filename);
      const parts = originalName.split('.');
      const ext = parts.length > 1 ? parts.pop() : '';
      const baseName = parts.join('.');

      const fileType = ext.toLowerCase();
      if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
        throw new Error('Unsupported file type.');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const fullNameRaw = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      const folderName = toSafeFolderName(fullNameRaw, String(userId));

      const safeFileName = originalName;
      const destPath = `uploads/${folderName}/${safeFileName}`;

      const contentType =
        file.headers?.['content-type'] || guessContentType(fileType);
      const fileUrl = await uploadToFirebase(file.path, destPath, contentType);

      const documentName = nameInput && nameInput.trim() ? nameInput.trim() : baseName;

      const documentData = {
        name: documentName,
        fileType: fileType,
        fileUrl,
        userId,
        uploadedAt: new Date(),
      };

      const document = await prisma.document.create({ data: documentData });

      try { fs.unlinkSync(file.path); } catch (_) {}

      return created(h, document);
    } catch (err) {
      if (tempFile?.path) { try { fs.unlinkSync(tempFile.path); } catch (_) {} }
      return error(h, { success: false, message: err.message });
    }
  }
};
const deleteDocument = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: { params: validateZod(idParamSchema) },
  handler: async (request, h) => {
    try {
      const id = Number(request.params.id);
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return notFound(h);
      await prisma.document.delete({ where: { id } });
      return success(h, { message: 'Document deleted', id });
    } catch (err) {
      return error(h, err.message);
    }
  }
};

const updateDocument = {
  auth: 'jwt',
  tags: ['api', 'documents'],
  validate: { params: validateZod(idParamSchema) },
  handler: async (request, h) => {
    const tempFile = request.payload?.file;
    const nameInput = request.payload?.name;
    try {
      const id = Number(request.params.id);
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return notFound(h);

      let fileUrl = doc.fileUrl;
      let fileType = doc.fileType;
      if (tempFile && tempFile.path && tempFile.filename) {
        const originalName = toSafeFileName(tempFile.filename);
        const parts = originalName.split('.');
        const ext = parts.length > 1 ? parts.pop() : '';
        fileType = ext.toLowerCase();
        if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileType)) {
          throw new Error('Unsupported file type.');
        }
        const safeFileName = originalName;
        const destPath = `uploads/update/${safeFileName}`;
        const contentType = tempFile.headers?.['content-type'] || guessContentType(fileType);
        fileUrl = await uploadToFirebase(tempFile.path, destPath, contentType);
        try { fs.unlinkSync(tempFile.path); } catch (_) {}
      }
      const documentName = nameInput && nameInput.trim() ? nameInput.trim() : doc.name;
      const updated = await prisma.document.update({
        where: { id },
        data: {
          name: documentName,
          fileType,
          fileUrl,
        }
      });
      return success(h, updated);
    } catch (err) {
      return error(h, err.message);
    }
  }
};

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

module.exports = { uploadDocument, getDocumentById, deleteDocument, updateDocument };
