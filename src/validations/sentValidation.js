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
  category: z.coerce.number().int().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  remark: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  isForwarded: z.boolean().optional(),
  parentSentId: z.coerce.number().int().optional(),
});

const replySchema = z.object({
  parentSentId: z.coerce.number().int().positive(),
  message: z.string().min(1, 'message is required'),
  remark: z.string().optional(),
  subject: z.string().optional(),
  number: z.string().optional(),
  category: z.coerce.number().int().optional(),
  status: z.nativeEnum(DocumentStatus).optional()
});

module.exports = { idParamSchema, sentSchema, replySchema };
