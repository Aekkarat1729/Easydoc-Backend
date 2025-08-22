// src/validations/sentValidation.js
const { z } = require('zod');
const { DocumentStatus } = require('@prisma/client');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const sentSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  senderId: z.coerce.number().int().positive(),
  receiverId: z.coerce.number().int().positive(),
  number: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  // เพิ่มใหม่
  subject: z.string().optional(),   // ชื่อเรื่อง
  remark: z.string().optional(),    // หมายเหตุ
  status: z.nativeEnum(DocumentStatus).optional(),
  isForwarded: z.boolean().optional(),
  parentSentId: z.coerce.number().int().optional(),
});

/** schema สำหรับการตอบกลับ */
const replySchema = z.object({
  parentSentId: z.coerce.number().int().positive(),
  message: z.string().min(1, 'message is required'), // map -> description
  remark: z.string().optional(),
  subject: z.string().optional(),
  number: z.string().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional()
});

module.exports = { idParamSchema, sentSchema, replySchema };
