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
  status: z.nativeEnum(DocumentStatus).optional(),
  isForwarded: z.boolean().optional(),
  parentSentId: z.coerce.number().int().optional(),
});

module.exports = { idParamSchema, sentSchema };
