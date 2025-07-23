const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const sentSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
  sentAt: z.date().optional()
});

module.exports = { idParamSchema, sentSchema };
