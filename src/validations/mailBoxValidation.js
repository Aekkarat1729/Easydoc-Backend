const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const mailBoxSchema = z.object({
  name: z.string().min(1),
  userId: z.coerce.number().int().positive()
});

module.exports = { idParamSchema, mailBoxSchema };
